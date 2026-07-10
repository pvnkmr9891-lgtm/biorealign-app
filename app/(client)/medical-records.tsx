import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Pressable, Alert, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/hooks/useAuth';
import { useMyCoachStatus, useCoachProfile } from '@/hooks/useCoachDirectory';
import {
  useMedicalDocuments, useUploadMedicalDocument, useRecategorizeMedicalDocument, useDeleteMedicalDocument, useSetDocumentSharing,
  useAcknowledgeDisclaimer, useRunMedicalAnalysis, useMyMedicalAnalyses, useSendAnalysisToCoach, useSendAnalysisToExpert,
  validateMedicalFile, DocumentCategory, MedicalDocument, AnalysisDocResult, MedicalAnalysis,
} from '@/hooks/useMedicalDocuments';
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_DISPLAY, SUPPORT_WHATSAPP_NUMBER } from '@/constants/contact';
import { THEME } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { FeedbackThreadModal } from '@/components/medical/FeedbackThreadModal';

const SUCCESS = THEME.colors.success ?? '#4CC986';

const CATEGORY_META: Record<DocumentCategory, { label: string; icon: string; color: string }> = {
  blood_work:    { label: 'Blood Work', icon: '🩸', color: '#F87171' },
  imaging:       { label: 'X-Rays / Imaging', icon: '🩻', color: '#60A5FA' },
  prescriptions: { label: 'Prescriptions', icon: '💊', color: '#A78BFA' },
  other:         { label: 'Other', icon: '📄', color: THEME.colors.textMuted },
};
const CATEGORY_ORDER: DocumentCategory[] = ['blood_work', 'imaging', 'prescriptions', 'other'];

function fileIcon(fileType: string, filename: string) {
  const t = fileType.toLowerCase();
  if (t.includes('pdf') || filename.toLowerCase().endsWith('.pdf')) return '📕';
  if (t.includes('word') || filename.toLowerCase().endsWith('.docx')) return '📘';
  return '🖼️';
}

function isImageDoc(fileType: string, filename: string) {
  const t = fileType.toLowerCase();
  const f = filename.toLowerCase();
  return t.includes('image') || f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.heic');
}

// ── Disclaimer modal ──────────────────────────────────────────────────────
function DisclaimerModal({ visible, onAcknowledge, onClose }: { visible: boolean; onAcknowledge: () => void; onClose: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} onPress={onClose} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: THEME.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
        <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 14 }}>Before you continue</Text>
        <View style={{ gap: 12, marginBottom: 22 }}>
          <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 21 }}>
            This tool organizes and summarizes the documents you upload to make them easier to read and discuss.
          </Text>
          <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber, lineHeight: 21 }}>
            It is not a medical diagnosis and does not replace your doctor, your coach, or professional medical advice.
          </Text>
          <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 21 }}>
            Always consult a qualified healthcare professional about your results.
          </Text>
        </View>
        <TouchableOpacity onPress={onAcknowledge} activeOpacity={0.85} style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>I understand, continue</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Recategorize picker ───────────────────────────────────────────────────
function RecategorizeSheet({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (c: DocumentCategory) => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={onClose}>
        <Pressable style={{ backgroundColor: THEME.colors.surface, borderRadius: 18, padding: 18, gap: 8 }}>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 6 }}>Move to...</Text>
          {CATEGORY_ORDER.map((c) => (
            <TouchableOpacity key={c} onPress={() => onPick(c)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, backgroundColor: THEME.colors.surface2 }}>
              <Text style={{ fontSize: 16 }}>{CATEGORY_META[c].icon}</Text>
              <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{CATEGORY_META[c].label}</Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Per-document summary modal — shows only this document's extracted data ──
function DocumentSummaryModal({ doc, visible, onClose }: { doc: AnalysisDocResult | null; visible: boolean; onClose: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} onPress={onClose} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '80%', backgroundColor: THEME.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
        {doc && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text numberOfLines={2} style={{ fontSize: 16, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 14 }}>
              {CATEGORY_META[doc.category]?.icon} {doc.filename}
            </Text>
            {doc.labValues?.length > 0 && doc.labValues.map((lv, j) => <LabValueRow key={j} lv={lv} />)}
            {doc.medications?.length > 0 && doc.medications.map((m, j) => (
              <View key={j} style={{ paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{m.name}</Text>
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>{m.dosage} · {m.frequency}</Text>
              </View>
            ))}
            {doc.notes && <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, marginTop: 10, lineHeight: 20 }}>{doc.notes}</Text>}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ── Lab value indicator row ────────────────────────────────────────────────
function LabValueRow({ lv }: { lv: { test: string; value: string; unit: string; referenceRange: string | null; status: string } }) {
  const color = lv.status === 'out_of_range' ? THEME.colors.amber : lv.status === 'in_range' ? SUCCESS : THEME.colors.textMuted;
  const label = lv.status === 'out_of_range' ? 'Outside range' : lv.status === 'in_range' ? 'In range' : 'Unknown';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{lv.test}</Text>
        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>
          {lv.value}{lv.unit ? ` ${lv.unit}` : ''}{lv.referenceRange ? `  ·  Ref: ${lv.referenceRange}` : ''}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${color}18`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
        <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color }}>{label}</Text>
      </View>
    </View>
  );
}

// ── Category grid tile (like the Workout page hub tiles) ─────────────────
function CategoryTile({ category, count, onPress }: { category: DocumentCategory; count: number; onPress: () => void }) {
  const meta = CATEGORY_META[category];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ width: '48%', backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${meta.color}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
      </View>
      <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{meta.label}</Text>
      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 3 }}>
        {count} {count === 1 ? 'document' : 'documents'}
      </Text>
    </TouchableOpacity>
  );
}

// ── One document row inside a category list ───────────────────────────────
function DocumentListRow({ doc, onPress }: { doc: MedicalDocument; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 13, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 8 }}
    >
      <Text style={{ fontSize: 22 }}>{fileIcon(doc.file_type, doc.original_filename)}</Text>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{doc.original_filename}</Text>
        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
          {new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {doc.analysis_id ? ' · Analyzed' : ''}
        </Text>
      </View>
      {doc.has_feedback && doc.client_has_unread_feedback && (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.colors.amber }} />
      )}
      <Text style={{ color: THEME.colors.textMuted, fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  );
}

// ── Document detail view — View / Summary / Analyze / Coach Feedback ─────
function DocumentDetail({
  doc, analysisDoc, docAnalysis, assignedCoachId, coachName, onBack, onView, onSummary, onFeedback, onAnalyze, analyzing,
  onSendToCoach, sendingToCoach, onNeedExpertOpinion, onRecategorize, onDelete, onToggleShare,
}: {
  doc: MedicalDocument;
  analysisDoc: AnalysisDocResult | undefined;
  docAnalysis: MedicalAnalysis | null;
  assignedCoachId: string | null;
  coachName?: string;
  onBack: () => void;
  onView: () => void;
  onSummary: () => void;
  onFeedback: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
  onSendToCoach: () => void;
  sendingToCoach: boolean;
  onNeedExpertOpinion: () => void;
  onRecategorize: () => void;
  onDelete: () => void;
  onToggleShare: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const isImage = isImageDoc(doc.file_type, doc.original_filename);
  const isAnalyzed = !!doc.analysis_id;

  useEffect(() => {
    setSignedUrl(null);
    if (isImage) {
      supabase.storage.from('medical-documents').createSignedUrl(doc.storage_path, 60 * 10)
        .then(({ data }) => { if (data?.signedUrl) setSignedUrl(data.signedUrl); });
    }
  }, [doc.storage_path, isImage]);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
          <Text style={{ color: THEME.colors.teal, fontSize: 13, fontFamily: THEME.fonts.sansMedium }}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      {/* Preview */}
      <TouchableOpacity onPress={onView} activeOpacity={0.85} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16, overflow: 'hidden' }}>
        {isImage && signedUrl ? (
          <Image source={{ uri: signedUrl }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
        ) : (
          <View style={{ height: 140, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 44 }}>{fileIcon(doc.file_type, doc.original_filename)}</Text>
          </View>
        )}
        <View style={{ padding: 14 }}>
          <Text numberOfLines={2} style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{doc.original_filename}</Text>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 3 }}>
            {new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </TouchableOpacity>

      {/* The 4 actions for this document */}
      <View style={{ gap: 10, marginBottom: 20 }}>
        <TouchableOpacity onPress={onView} activeOpacity={0.85} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <Text style={{ fontSize: 16 }}>👁️</Text>
          <Text style={{ flex: 1, fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>View document</Text>
          <Text style={{ color: THEME.colors.textMuted, fontSize: 16 }}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSummary}
          disabled={!isAnalyzed}
          activeOpacity={0.85}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border, opacity: isAnalyzed ? 1 : 0.45 }}
        >
          <Text style={{ fontSize: 16 }}>📋</Text>
          <Text style={{ flex: 1, fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
            {isAnalyzed ? 'Summary' : 'Summary (analyze first)'}
          </Text>
          {isAnalyzed && <Text style={{ color: THEME.colors.textMuted, fontSize: 16 }}>›</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          testID="analyze-document-button"
          onPress={onAnalyze}
          disabled={isAnalyzed || analyzing}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 12, padding: 14,
            backgroundColor: isAnalyzed ? THEME.colors.surface2 : THEME.colors.teal,
            borderWidth: isAnalyzed ? 0.5 : 0, borderColor: THEME.colors.border,
          }}
        >
          {analyzing ? (
            <ActivityIndicator color={isAnalyzed ? THEME.colors.textMuted : THEME.colors.background} />
          ) : (
            <>
              <Text style={{ fontSize: 16 }}>{isAnalyzed ? '✓' : '✨'}</Text>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: isAnalyzed ? THEME.colors.textMuted : THEME.colors.background }}>
                {isAnalyzed ? 'Already Analyzed' : 'Analyze My Reports'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onFeedback} activeOpacity={0.85} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <Text style={{ fontSize: 16 }}>💬</Text>
          <Text style={{ flex: 1, fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Coach Feedback</Text>
          {doc.client_has_unread_feedback && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.colors.amber, marginRight: 4 }} />}
          <Text style={{ color: THEME.colors.textMuted, fontSize: 16 }}>›</Text>
        </TouchableOpacity>

        {/* Send to Coach / Need Expert Opinion — scoped to this document's
            own analysis now that analysis itself is per-document. Only
            meaningful once this document has been analyzed. */}
        {isAnalyzed && (
          assignedCoachId ? (
            docAnalysis?.sent_to_coach_at ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: `${SUCCESS}15`, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: `${SUCCESS}30` }}>
                <Text style={{ fontSize: 16 }}>✓</Text>
                <Text style={{ flex: 1, fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: SUCCESS }}>Sent to {coachName ?? 'your coach'}</Text>
              </View>
            ) : (
              <TouchableOpacity testID="send-to-coach-button" onPress={onSendToCoach} disabled={sendingToCoach} activeOpacity={0.85} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: THEME.colors.teal, borderRadius: 12, padding: 14 }}>
                {sendingToCoach ? <ActivityIndicator color={THEME.colors.background} /> : (
                  <>
                    <Text style={{ fontSize: 16 }}>📤</Text>
                    <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Send to Coach</Text>
                  </>
                )}
              </TouchableOpacity>
            )
          ) : (
            docAnalysis?.sent_to_expert_at ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: `${SUCCESS}15`, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: `${SUCCESS}30` }}>
                <Text style={{ fontSize: 16 }}>✓</Text>
                <Text style={{ flex: 1, fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: SUCCESS }}>Shared with BioRealign's team</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={onNeedExpertOpinion} activeOpacity={0.85} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: THEME.colors.teal, borderRadius: 12, padding: 14 }}>
                <Text style={{ fontSize: 16 }}>🎓</Text>
                <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Need Expert Opinion?</Text>
              </TouchableOpacity>
            )
          )
        )}
      </View>

      {/* Secondary management actions */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity onPress={onToggleShare} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: THEME.colors.surface2, borderRadius: 10, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: doc.shared_with_coach ? THEME.colors.teal : THEME.colors.textMuted }}>
            {doc.shared_with_coach ? '👁 Coach can see' : '🔒 Private'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRecategorize} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: THEME.colors.surface2, borderRadius: 10, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>📁 Move category</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: THEME.colors.surface2, borderRadius: 10, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: '#F87171' }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default function MedicalRecordsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { data: docs = [], isLoading: docsLoading } = useMedicalDocuments();
  const { data: coachStatus } = useMyCoachStatus();
  const assignedCoachId = coachStatus?.state === 'assigned' ? coachStatus.coachId : null;
  const { data: coach } = useCoachProfile(assignedCoachId ?? '');
  const { data: allAnalyses = [] } = useMyMedicalAnalyses();

  const { mutateAsync: upload, isPending: uploading } = useUploadMedicalDocument();
  const { mutateAsync: recategorize } = useRecategorizeMedicalDocument();
  const { mutateAsync: deleteDoc } = useDeleteMedicalDocument();
  const { mutateAsync: acknowledge } = useAcknowledgeDisclaimer();
  const { mutateAsync: runAnalysis, isPending: analyzing } = useRunMedicalAnalysis();
  const { mutateAsync: sendToCoach, isPending: sendingToCoach } = useSendAnalysisToCoach();
  const { mutateAsync: sendToExpert, isPending: sendingToExpert } = useSendAnalysisToExpert();
  const { mutate: setSharing } = useSetDocumentSharing();

  const [activeCategory, setActiveCategory] = useState<DocumentCategory | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [pendingAnalyzeDocId, setPendingAnalyzeDocId] = useState<string | null>(null);
  const [recategorizeTarget, setRecategorizeTarget] = useState<MedicalDocument | null>(null);
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [summaryDoc, setSummaryDoc] = useState<AnalysisDocResult | null>(null);
  const [feedbackDoc, setFeedbackDoc] = useState<MedicalDocument | null>(null);

  const grouped: Record<DocumentCategory, MedicalDocument[]> = { blood_work: [], imaging: [], prescriptions: [], other: [] };
  docs.forEach((d) => grouped[d.category]?.push(d));

  const activeDoc = docs.find((d) => d.id === activeDocId) ?? null;

  // A document's analysis lives in whichever specific analysis row its own
  // analysis_id points to — with per-document analysis, that's no longer
  // necessarily "the latest" analysis overall.
  function analysisRowFor(doc: MedicalDocument | null): MedicalAnalysis | null {
    if (!doc?.analysis_id) return null;
    return allAnalyses.find((a) => a.id === doc.analysis_id) ?? null;
  }
  function findAnalysisDocFor(doc: MedicalDocument): AnalysisDocResult | undefined {
    return analysisRowFor(doc)?.result?.documents?.find((d) => d.filename === doc.original_filename);
  }
  const activeDocAnalysis = analysisRowFor(activeDoc);

  async function onViewDocument(doc: MedicalDocument) {
    const { data, error } = await supabase.storage.from('medical-documents').createSignedUrl(doc.storage_path, 60 * 5);
    if (error || !data?.signedUrl) {
      Alert.alert('Could not open document', error?.message ?? 'Please try again.');
      return;
    }
    Linking.openURL(data.signedUrl);
  }

  async function pickAndUpload(asset: { uri: string; name: string; mimeType?: string | null }) {
    const err = validateMedicalFile(asset.name);
    if (err) { Alert.alert('Cannot add this file', err); return; }
    try {
      await upload({ uri: asset.uri, filename: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' });
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Please try again.');
    }
  }

  async function compressPhoto(uri: string): Promise<string> {
    const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG });
    return result.uri;
  }

  async function onAddFromCamera() {
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const uri = await compressPhoto(a.uri);
    await pickAndUpload({ uri, name: a.fileName ?? `photo-${Date.now()}.jpg`, mimeType: 'image/jpeg' });
  }
  async function onAddFromLibrary() {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const uri = await compressPhoto(a.uri);
    await pickAndUpload({ uri, name: a.fileName ?? `photo-${Date.now()}.jpg`, mimeType: 'image/jpeg' });
  }
  async function onAddFile() {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    await pickAndUpload({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream' });
  }

  function onAddPress() {
    Alert.alert('Add a document', 'Choose how to add it', [
      { text: 'Take Photo', onPress: onAddFromCamera },
      { text: 'Choose Photo', onPress: onAddFromLibrary },
      { text: 'Choose PDF / Word File', onPress: onAddFile },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function onRecategorizePick(category: DocumentCategory) {
    if (!recategorizeTarget) return;
    recategorize({ id: recategorizeTarget.id, category });
    setRecategorizeTarget(null);
  }

  function onDeletePress(doc: MedicalDocument) {
    Alert.alert('Delete document', `Remove "${doc.original_filename}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteDoc({ id: doc.id, storage_path: doc.storage_path }); setActiveDocId(null); } },
    ]);
  }

  function onAnalyzePress(doc: MedicalDocument) {
    if (!profile?.medical_disclaimer_acked_at) {
      setPendingAnalyzeDocId(doc.id);
      setShowDisclaimer(true);
      return;
    }
    runAnalysisFor(doc.id);
  }

  async function runAnalysisFor(documentId: string) {
    try {
      await runAnalysis({ documentId });
    } catch (e: any) {
      Alert.alert('Analysis failed', e.message ?? 'Please try again in a moment.');
    }
  }

  async function onAcknowledgeDisclaimer() {
    await acknowledge();
    setShowDisclaimer(false);
    if (pendingAnalyzeDocId) {
      runAnalysisFor(pendingAnalyzeDocId);
      setPendingAnalyzeDocId(null);
    }
  }

  async function onSendToCoach() {
    if (!activeDocAnalysis || !assignedCoachId) return;
    try {
      await sendToCoach({ analysisId: activeDocAnalysis.id, coachId: assignedCoachId });
    } catch (e: any) {
      Alert.alert('Could not send', e.message ?? 'Please try again.');
    }
  }

  async function onConfirmSendToExpert() {
    if (!activeDocAnalysis) return;
    try {
      await sendToExpert({ analysisId: activeDocAnalysis.id });
      setShowExpertModal(false);
    } catch (e: any) {
      Alert.alert('Could not send', e.message ?? 'Please try again.');
    }
  }

  const headerTitle = activeDoc ? (CATEGORY_META[activeDoc.category].label) : activeCategory ? CATEGORY_META[activeCategory].label : 'Medical Records';

  return (
    <SafeAreaView testID="medical-records-screen" style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => {
            if (activeDoc) setActiveDocId(null);
            else if (activeCategory) setActiveCategory(null);
            else router.back();
          }}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>{headerTitle}</Text>
      </View>

      {docsLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 60 }} />
      ) : activeDoc ? (
        <DocumentDetail
          doc={activeDoc}
          analysisDoc={findAnalysisDocFor(activeDoc)}
          docAnalysis={activeDocAnalysis}
          assignedCoachId={assignedCoachId}
          coachName={coach?.full_name}
          onBack={() => setActiveDocId(null)}
          onView={() => onViewDocument(activeDoc)}
          onSummary={() => setSummaryDoc(findAnalysisDocFor(activeDoc) ?? null)}
          onFeedback={() => setFeedbackDoc(activeDoc)}
          onAnalyze={() => onAnalyzePress(activeDoc)}
          analyzing={analyzing}
          onSendToCoach={onSendToCoach}
          sendingToCoach={sendingToCoach}
          onNeedExpertOpinion={() => setShowExpertModal(true)}
          onRecategorize={() => setRecategorizeTarget(activeDoc)}
          onDelete={() => onDeletePress(activeDoc)}
          onToggleShare={() => setSharing({ id: activeDoc.id, shared: !activeDoc.shared_with_coach })}
        />
      ) : activeCategory ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {grouped[activeCategory].length === 0 ? (
            <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 24, borderWidth: 0.5, borderColor: THEME.colors.border, borderStyle: 'dashed', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Nothing here yet</Text>
            </View>
          ) : (
            grouped[activeCategory].map((doc) => (
              <DocumentListRow key={doc.id} doc={doc} onPress={() => setActiveDocId(doc.id)} />
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: `${THEME.colors.teal}0D`, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: `${THEME.colors.teal}25`, marginBottom: 18, flexDirection: 'row', gap: 10 }}>
            <Text style={{ fontSize: 14 }}>ℹ️</Text>
            <Text style={{ flex: 1, fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 18 }}>
              Upload your medical documents to keep them organized in one place. Our AI can summarize each one for easier reading — this is never a diagnosis.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {CATEGORY_ORDER.map((cat) => (
              <CategoryTile key={cat} category={cat} count={grouped[cat].length} onPress={() => setActiveCategory(cat)} />
            ))}
          </View>

          <TouchableOpacity
            onPress={onAddPress}
            disabled={uploading}
            activeOpacity={0.85}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: THEME.colors.teal, borderRadius: 16, paddingVertical: 16, marginTop: 6, marginBottom: 24 }}
          >
            {uploading ? <ActivityIndicator color={THEME.colors.background} /> : (
              <>
                <Text style={{ fontSize: 18, color: '#000' }}>＋</Text>
                <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: '#000' }}>Add Documents</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      )}

      <DisclaimerModal visible={showDisclaimer} onAcknowledge={onAcknowledgeDisclaimer} onClose={() => { setShowDisclaimer(false); setPendingAnalyzeDocId(null); }} />
      <RecategorizeSheet visible={!!recategorizeTarget} onClose={() => setRecategorizeTarget(null)} onPick={onRecategorizePick} />
      <DocumentSummaryModal doc={summaryDoc} visible={!!summaryDoc} onClose={() => setSummaryDoc(null)} />
      <FeedbackThreadModal
        documentId={feedbackDoc?.id ?? null}
        clientId={user?.id ?? ''}
        coachId={assignedCoachId ?? undefined}
        filename={feedbackDoc?.original_filename}
        visible={!!feedbackDoc}
        onClose={() => setFeedbackDoc(null)}
      />

      {/* Need Expert Opinion modal */}
      <Modal transparent visible={showExpertModal} animationType="slide" onRequestClose={() => setShowExpertModal(false)} statusBarTranslucent>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} onPress={() => setShowExpertModal(false)} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: THEME.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 14 }}>Need an Expert Opinion?</Text>
          <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 21, marginBottom: 16 }}>
            Tapping "Send" will share your uploaded documents and the generated summary with BioRealign's team for an expert opinion.
          </Text>
          <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, marginBottom: 20, gap: 8 }}>
            <TouchableOpacity onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP_NUMBER.replace('+', '')}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14 }}>💬</Text>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>{SUPPORT_WHATSAPP_DISPLAY}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14 }}>✉️</Text>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>{SUPPORT_EMAIL}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onConfirmSendToExpert} disabled={sendingToExpert} activeOpacity={0.85} style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
            {sendingToExpert ? <ActivityIndicator color={THEME.colors.background} /> : <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Send</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
