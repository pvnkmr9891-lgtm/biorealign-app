import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export const medicalDocsKeys = {
  list:     (clientId: string) => ['medical_documents', clientId] as const,
  analyses: (clientId: string) => ['medical_analyses', clientId] as const,
  clientList:     (clientId: string) => ['coach_client', clientId, 'medical_documents'] as const,
  clientAnalyses: (clientId: string) => ['coach_client', clientId, 'medical_analyses'] as const,
  feedback: (documentId: string) => ['medical_document_feedback', documentId] as const,
};

export type DocumentCategory = 'blood_work' | 'imaging' | 'prescriptions' | 'other';

export interface MedicalDocument {
  id: string;
  client_id: string;
  storage_path: string;
  original_filename: string;
  file_type: string;
  category: DocumentCategory;
  category_reason: string | null;
  category_is_manual: boolean;
  analysis_id: string | null;
  uploaded_at: string;
  signedUrl?: string | null;
  client_has_unread_feedback: boolean;
  coach_has_unread_feedback: boolean;
  has_feedback: boolean;
  shared_with_coach: boolean;
}

export interface DocumentFeedback {
  id: string;
  document_id: string;
  client_id: string;
  sender_id: string;
  sender_role: 'coach' | 'client';
  message: string;
  created_at: string;
}

export interface LabValue { test: string; value: string; unit: string; referenceRange: string | null; status: 'in_range' | 'out_of_range' | 'unknown' }
export interface MedicationEntry { name: string; dosage: string; frequency: string }
export interface AnalysisDocResult { filename: string; category: DocumentCategory; labValues: LabValue[]; medications: MedicationEntry[]; notes: string }
export interface AnalysisResult { documents: AnalysisDocResult[]; summary: string }

export interface MedicalAnalysis {
  id: string;
  client_id: string;
  document_ids: string[];
  result: AnalysisResult;
  summary_text: string;
  sent_to_coach_at: string | null;
  sent_to_expert_at: string | null;
  coach_viewed_at: string | null;
  created_at: string;
}

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'docx'];

export function validateMedicalFile(name: string, sizeBytes?: number | null): string | null {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'dcm') return "DICOM (.dcm) files aren't supported — please upload a JPG/PNG export or a photo of the image instead.";
  if (!ALLOWED_EXTENSIONS.includes(ext)) return `Unsupported file type ".${ext}". Please upload a PDF, image (JPG/PNG/HEIC), or DOCX.`;
  if (sizeBytes != null && sizeBytes > MAX_FILE_BYTES) return 'File is too large — please keep uploads under 20MB.';
  return null;
}

// ── List this client's documents, grouped by category ───────────────────
export function useMedicalDocuments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: medicalDocsKeys.list(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_documents')
        .select('*')
        .eq('client_id', user!.id)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MedicalDocument[];
    },
  });
}

// ── Toggle whether the assigned coach can see a document (RLS-enforced) ──
export function useSetDocumentSharing() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, shared }: { id: string; shared: boolean }) => {
      const { error } = await supabase
        .from('medical_documents')
        .update({ shared_with_coach: shared })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: medicalDocsKeys.list(user.id) });
    },
  });
}

// ── Coach's read-only view of an assigned client's documents ────────────
export function useClientMedicalDocuments(clientId: string) {
  return useQuery({
    queryKey: medicalDocsKeys.clientList(clientId),
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_documents')
        .select('*')
        .eq('client_id', clientId)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MedicalDocument[];
    },
  });
}

// ── Upload a document, then kick off (fire-and-forget) auto-categorization ──
export function useUploadMedicalDocument() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, filename, mimeType }: { uri: string; filename: string; mimeType: string }) => {
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin';
      const path = `${user!.id}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const formData = new FormData();
      formData.append('file', { uri, name: filename, type: mimeType } as any);

      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/medical-documents/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'x-upsert': 'true' },
        body: formData,
      });
      if (!uploadRes.ok) throw new Error(`Upload failed: ${await uploadRes.text()}`);

      const { data, error } = await supabase
        .from('medical_documents')
        .insert({ client_id: user!.id, storage_path: path, original_filename: filename, file_type: mimeType || ext, category: 'other' })
        .select()
        .single();
      if (error) throw error;

      // Auto-categorize in the background — don't block the upload UI on it,
      // and a failure here shouldn't fail the upload itself.
      supabase.functions.invoke('medical-document-categorize', { body: { documentId: data.id } })
        .then(() => qc.invalidateQueries({ queryKey: medicalDocsKeys.list(user!.id) }))
        .catch((e) => console.warn('[useUploadMedicalDocument] categorize failed', e?.message));

      return data as MedicalDocument;
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: medicalDocsKeys.list(user.id) });
    },
  });
}

// ── Manually move a document to a different category ─────────────────────
export function useRecategorizeMedicalDocument() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, category }: { id: string; category: DocumentCategory }) => {
      const { error } = await supabase
        .from('medical_documents')
        .update({ category, category_is_manual: true, category_reason: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: medicalDocsKeys.list(user.id) });
    },
  });
}

// ── Delete a document (storage + row) ─────────────────────────────────────
export function useDeleteMedicalDocument() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (doc: { id: string; storage_path: string }) => {
      await supabase.storage.from('medical-documents').remove([doc.storage_path]);
      const { error } = await supabase.from('medical_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: medicalDocsKeys.list(user.id) });
    },
  });
}

// ── Acknowledge the non-diagnostic disclaimer (stored once per client) ───
export function useAcknowledgeDisclaimer() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ medical_disclaimer_acked_at: new Date().toISOString() })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      // Keep the zustand profile snapshot in sync so the disclaimer doesn't
      // re-prompt within the same session.
      import('@/store/authStore').then(({ useAuthStore }) => useAuthStore.getState().fetchProfile(user!.id));
    },
  });
}

// ── Run analysis for one document (or, with no documentId, the old
//    all-documents batch — kept for backward compatibility, not used by the
//    client UI anymore now that each document has its own Analyze button) ──
export function useRunMedicalAnalysis() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args?: { documentId?: string }) => {
      const { data, error } = await supabase.functions.invoke('medical-document-analyze', { body: { documentId: args?.documentId } });
      if (error) {
        const body = await (error as any)?.context?.json?.().catch(() => null);
        throw new Error(body?.debug ?? body?.detail ?? body?.error ?? error.message);
      }
      if (data?.error) throw new Error(data.detail ?? data.error);
      return data as MedicalAnalysis;
    },
    onSuccess: () => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: medicalDocsKeys.list(user.id) });
        qc.invalidateQueries({ queryKey: medicalDocsKeys.analyses(user.id) });
      }
    },
  });
}

// ── Latest analysis for this client — still used to gate the page-level
//    Send to Coach / Need Expert Opinion actions, which operate on whichever
//    document was most recently analyzed. ────────────────────────────────
export function useLatestMedicalAnalysis() {
  const { user } = useAuth();
  return useQuery({
    queryKey: medicalDocsKeys.analyses(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_analyses')
        .select('*')
        .eq('client_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as MedicalAnalysis | null;
    },
  });
}

// ── Every analysis this client has ever run — used to look up the specific
//    analysis a given document belongs to (via doc.analysis_id), since with
//    per-document analysis there's no longer one combined "the" analysis. ──
export function useMyMedicalAnalyses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...medicalDocsKeys.analyses(user?.id ?? ''), 'all'],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_analyses')
        .select('*')
        .eq('client_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MedicalAnalysis[];
    },
  });
}

// ── Coach's read-only view of an assigned client's analyses ─────────────
export function useClientMedicalAnalyses(clientId: string) {
  return useQuery({
    queryKey: medicalDocsKeys.clientAnalyses(clientId),
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_analyses')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MedicalAnalysis[];
    },
  });
}

// ── Send to coach — internal notification, same pattern as coach_request ──
export function useSendAnalysisToCoach() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ analysisId, coachId }: { analysisId: string; coachId: string }) => {
      const { error: updateErr } = await supabase
        .from('medical_analyses')
        .update({ sent_to_coach_at: new Date().toISOString() })
        .eq('id', analysisId);
      if (updateErr) throw updateErr;

      // Sending the summary is consent for the underlying documents too —
      // otherwise the coach gets a report referencing files they can't open.
      const { data: analysisRow } = await supabase
        .from('medical_analyses')
        .select('document_ids')
        .eq('id', analysisId)
        .single();
      if (analysisRow?.document_ids?.length) {
        await supabase
          .from('medical_documents')
          .update({ shared_with_coach: true })
          .in('id', analysisRow.document_ids);
      }

      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: coachId,
        title: 'Medical records shared',
        body: `${profile?.full_name ?? 'A client'} shared their medical document summary with you.`,
        type: 'alert',
        action_url: '/(coach)/client-overview',
      });
      if (notifErr) throw notifErr;
    },
    onSuccess: () => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: medicalDocsKeys.analyses(user.id) });
        qc.invalidateQueries({ queryKey: medicalDocsKeys.list(user.id) });
      }
    },
  });
}

// ── Need Expert Opinion — email + WhatsApp to BioRealign support ─────────
export function useSendAnalysisToExpert() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ analysisId }: { analysisId: string }) => {
      const { data, error } = await supabase.functions.invoke('medical-document-send-expert', { body: { analysisId } });
      if (error) {
        const body = await (error as any)?.context?.json?.().catch(() => null);
        throw new Error(body?.debug ?? body?.detail ?? body?.error ?? error.message);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: medicalDocsKeys.analyses(user.id) });
    },
  });
}

// ── Per-document feedback thread (two-way, coach <-> client) ─────────────
export function useDocumentFeedback(documentId: string) {
  return useQuery({
    queryKey: medicalDocsKeys.feedback(documentId),
    enabled: !!documentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_document_feedback')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DocumentFeedback[];
    },
  });
}

export function useSendDocumentFeedback() {
  const { user, role } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, clientId, coachId, message }: { documentId: string; clientId: string; coachId?: string; message: string }) => {
      const senderRole = role === 'coach' ? 'coach' : 'client';
      const { error } = await supabase.from('medical_document_feedback').insert({
        document_id: documentId,
        client_id: clientId,
        sender_id: user!.id,
        sender_role: senderRole,
        message,
      });
      if (error) throw error;

      // Flip the unread flag for whoever didn't just send it, and notify them.
      // has_feedback gates the client's "Coach Feedback" button — it only
      // ever flips on (never reset), since once a thread exists it stays visible.
      const unreadField = senderRole === 'coach' ? 'client_has_unread_feedback' : 'coach_has_unread_feedback';
      await supabase.from('medical_documents').update({ [unreadField]: true, has_feedback: true }).eq('id', documentId);

      const recipientId = senderRole === 'coach' ? clientId : coachId;
      if (recipientId) {
        await supabase.from('notifications').insert({
          user_id: recipientId,
          title: senderRole === 'coach' ? 'New feedback on your medical document' : 'Client replied on a medical document',
          body: message.slice(0, 120),
          type: 'alert',
          action_url: senderRole === 'coach' ? '/(client)/medical-records' : '/(coach)/client-overview',
        });
      }
    },
    onSuccess: (_data, { documentId, clientId }) => {
      qc.invalidateQueries({ queryKey: medicalDocsKeys.feedback(documentId) });
      qc.invalidateQueries({ queryKey: medicalDocsKeys.list(clientId) });
      qc.invalidateQueries({ queryKey: medicalDocsKeys.clientList(clientId) });
    },
  });
}

export function useMarkFeedbackRead() {
  const { role } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, clientId }: { documentId: string; clientId: string }) => {
      const unreadField = role === 'coach' ? 'coach_has_unread_feedback' : 'client_has_unread_feedback';
      const { error } = await supabase.from('medical_documents').update({ [unreadField]: false }).eq('id', documentId);
      if (error) throw error;
      return { clientId };
    },
    onSuccess: (_data, { clientId }) => {
      qc.invalidateQueries({ queryKey: medicalDocsKeys.list(clientId) });
      qc.invalidateQueries({ queryKey: medicalDocsKeys.clientList(clientId) });
    },
  });
}
