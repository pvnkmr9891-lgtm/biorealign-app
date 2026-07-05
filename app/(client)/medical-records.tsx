import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Pressable, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/hooks/useAuth';
import { useMyCoachStatus, useCoachProfile } from '@/hooks/useCoachDirectory';
import {
  useMedicalDocuments, useUploadMedicalDocument, useRecategorizeMedicalDocument, useDeleteMedicalDocument, useSetDocumentSharing,
  useAcknowledgeDisclaimer, useRunMedicalAnalysis, useLatestMedicalAnalysis, useSendAnalysisToCoach, useSendAnalysisToExpert,
  validateMedicalFile, DocumentCategory, MedicalDocument, AnalysisDocResult,
} from '@/hooks/useMedicalDocuments';
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_DISPLAY, SUPPORT_WHATSAPP_NUMBER } from '@/constants/contact';
import { THEME } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { FeedbackThreadModal } from '@/components/medical/FeedbackThreadModal';

const SUCCESS = THEME.colors.success ?? '#4CC986';

const CATEGORY_META: Record<DocumentCategory, { label: string; icon: string; color: string }> = {
  blood_work:    { label: 'Blood Work / Lab Reports', icon: '🩸', color: '#F87171' },
  imaging:       { label: 'Imaging / X-rays / Scans', icon: '🩻', color: '#60A5FA' },
  prescriptions: { label: 'Prescriptions / Medication', icon: '💊', color: '#A78BFA' },
  other:         { label: 'Other', icon: '📄', color: THEME.colors.textMuted },
};
const CATEGORY_ORDER: DocumentCategory[] = ['blood_work', 'imaging', 'prescriptions', 'other'];

function fileIcon(fileType: string, filename: string) {
  const t = fileType.toLowerCase();
  if (t.includes('pdf') || filename.toLowerCase().endsWith('.pdf')) return '📕';
  if (t.includes('word') || filename.toLowerCase().endsWith('.docx')) return '📘';
  return '🖼️';
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

// ── A single document row ─────────────────────────────────────────────────
function DocumentRow({
  doc, analysisDoc, onView, onSummary, onFeedback, onRecategorize, onDelete, onToggleShare,
}: {
  doc: MedicalDocument; analysisDoc?: AnalysisDocResult;
  onView: () => void; onSummary: () => void; onFeedback: () => void; onRecategorize: () => void; onDelete: () => void;
  onToggleShare: () => void;
}) {
  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 22 }}>{fileIcon(doc.file_type, doc.original_filename)}</Text>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{doc.original_filename}</Text>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
            {new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {doc.category_reason ? ` · ${doc.category_reason}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={onRecategorize} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
          <Text style={{ fontSize: 14 }}>📁</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
          <Text style={{ fontSize: 16, color: THEME.colors.textMuted }}>×</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: THEME.colors.border }}>
        <TouchableOpacity onPress={onView}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>View</Text>
        </TouchableOpacity>
        {analysisDoc && (
          <TouchableOpacity onPress={onSummary}>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Summary</Text>
          </TouchableOpacity>
        )}
        {doc.has_feedback && (
          <TouchableOpacity onPress={onFeedback} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Coach Feedback</Text>
            {doc.client_has_unread_feedback && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: THEME.colors.amber }} />}
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={onToggleShare} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: doc.shared_with_coach ? THEME.colors.teal : THEME.colors.textMuted }}>
            {doc.shared_with_coach ? '👁 Coach can see' : '🔒 Private'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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

export default function MedicalRecordsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { data: docs = [], isLoading: docsLoading } = useMedicalDocuments();
  const { data: coachStatus } = useMyCoachStatus();
  const assignedCoachId = coachStatus?.state === 'assigned' ? coachStatus.coachId : null;
  const { data: coach } = useCoachProfile(assignedCoachId ?? '');
  const { data: analysis, isLoading: analysisLoading } = useLatestMedicalAnalysis();

  const { mutateAsync: upload, isPending: uploading } = useUploadMedicalDocument();
  const { mutateAsync: recategorize } = useRecategorizeMedicalDocument();
  const { mutateAsync: deleteDoc } = useDeleteMedicalDocument();
  const { mutateAsync: acknowledge } = useAcknowledgeDisclaimer();
  const { mutateAsync: runAnalysis, isPending: analyzing } = useRunMedicalAnalysis();
  const { mutateAsync: sendToCoach, isPending: sendingToCoach } = useSendAnalysisToCoach();
  const { mutateAsync: sendToExpert, isPending: sendingToExpert } = useSendAnalysisToExpert();
  const { mutate: setSharing } = useSetDocumentSharing();

  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [recategorizeTarget, setRecategorizeTarget] = useState<MedicalDocument | null>(null);
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [showExpertConfirmation, setShowExpertConfirmation] = useState(false);
  const [coachSentConfirmation, setCoachSentConfirmation] = useState(false);
  const [summaryDoc, setSummaryDoc] = useState<AnalysisDocResult | null>(null);
  const [feedbackDoc, setFeedbackDoc] = useState<MedicalDocument | null>(null);

  const grouped: Record<DocumentCategory, MedicalDocument[]> = { blood_work: [], imaging: [], prescriptions: [], other: [] };
  docs.forEach((d) => grouped[d.category]?.push(d));

  function findAnalysisDoc(filename: string): AnalysisDocResult | undefined {
    return analysis?.result?.documents?.find((d) => d.filename === filename);
  }

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

  // Camera/library photos can be several MB at full resolution — downscaling
  // before upload keeps both the storage footprint and the edge function's
  // in-memory base64 payload (which is what was crashing analysis) small.
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
      { text: 'Delete', style: 'destructive', onPress: () => deleteDoc({ id: doc.id, storage_path: doc.storage_path }) },
    ]);
  }

  function onPerformAnalysisPress() {
    if (!profile?.medical_disclaimer_acked_at) {
      setShowDisclaimer(true);
      return;
    }
    runAnalysisNow();
  }

  async function runAnalysisNow() {
    try {
      await runAnalysis();
    } catch (e: any) {
      Alert.alert('Analysis failed', e.message ?? 'Please try again in a moment.');
    }
  }

  async function onAcknowledgeDisclaimer() {
    await acknowledge();
    setShowDisclaimer(false);
    runAnalysisNow();
  }

  async function onSendToCoach() {
    if (!analysis || !assignedCoachId) return;
    try {
      await sendToCoach({ analysisId: analysis.id, coachId: assignedCoachId });
      setCoachSentConfirmation(true);
    } catch (e: any) {
      Alert.alert('Could not send', e.message ?? 'Please try again.');
    }
  }

  async function onConfirmSendToExpert() {
    if (!analysis) return;
    try {
      await sendToExpert({ analysisId: analysis.id });
      setShowExpertModal(false);
      setShowExpertConfirmation(true);
    } catch (e: any) {
      Alert.alert('Could not send', e.message ?? 'Please try again.');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>Medical Records</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Framing note — this is an organizational aid, never a diagnosis */}
        <View style={{ backgroundColor: `${THEME.colors.teal}0D`, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: `${THEME.colors.teal}25`, marginBottom: 18, flexDirection: 'row', gap: 10 }}>
          <Text style={{ fontSize: 14 }}>ℹ️</Text>
          <Text style={{ flex: 1, fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 18 }}>
            Upload your medical documents to keep them organized in one place. Our AI can summarize them for easier reading — this is never a diagnosis.
          </Text>
        </View>

        <TouchableOpacity
          onPress={onAddPress}
          disabled={uploading}
          activeOpacity={0.85}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: THEME.colors.teal, borderRadius: 16, paddingVertical: 16, marginBottom: 22 }}
        >
          {uploading ? <ActivityIndicator color={THEME.colors.background} /> : (
            <>
              <Text style={{ fontSize: 18, color: '#000' }}>＋</Text>
              <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: '#000' }}>Add Document</Text>
            </>
          )}
        </TouchableOpacity>

        {docsLoading ? (
          <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 20 }} />
        ) : (
          CATEGORY_ORDER.map((cat) => (
            <View key={cat} style={{ marginBottom: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 15 }}>{CATEGORY_META[cat].icon}</Text>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: CATEGORY_META[cat].color }}>{CATEGORY_META[cat].label}</Text>
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>({grouped[cat].length})</Text>
              </View>
              {grouped[cat].length === 0 ? (
                <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: THEME.colors.border, borderStyle: 'dashed' }}>
                  <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center' }}>Nothing here yet</Text>
                </View>
              ) : (
                grouped[cat].map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    analysisDoc={findAnalysisDoc(doc.original_filename)}
                    onView={() => onViewDocument(doc)}
                    onSummary={() => setSummaryDoc(findAnalysisDoc(doc.original_filename) ?? null)}
                    onFeedback={() => setFeedbackDoc(doc)}
                    onRecategorize={() => setRecategorizeTarget(doc)}
                    onDelete={() => onDeletePress(doc)}
                    onToggleShare={() => setSharing({ id: doc.id, shared: !doc.shared_with_coach })}
                  />
                ))
              )}
            </View>
          ))
        )}

        {docs.length > 0 && (
          <TouchableOpacity
            onPress={onPerformAnalysisPress}
            disabled={analyzing}
            activeOpacity={0.85}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: THEME.colors.surface2, borderRadius: 16, paddingVertical: 16, marginBottom: 22, borderWidth: 1, borderColor: THEME.colors.teal }}
          >
            {analyzing ? <ActivityIndicator color={THEME.colors.teal} /> : (
              <>
                <Text style={{ fontSize: 16 }}>✨</Text>
                <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Analyze My Records</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Send to coach / expert opinion — only the actions, no aggregate dump */}
        {analysisLoading ? null : analysis && (
          <View style={{ marginBottom: 24 }}>
            {assignedCoachId ? (
              analysis.sent_to_coach_at || coachSentConfirmation ? (
                <View style={{ backgroundColor: `${SUCCESS}15`, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: `${SUCCESS}30` }}>
                  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: SUCCESS }}>✓ Sent to {coach?.full_name ?? 'your coach'}</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={onSendToCoach} disabled={sendingToCoach} activeOpacity={0.85} style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
                  {sendingToCoach ? <ActivityIndicator color={THEME.colors.background} /> : <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Send to Coach</Text>}
                </TouchableOpacity>
              )
            ) : (
              analysis.sent_to_expert_at || showExpertConfirmation ? (
                <View style={{ backgroundColor: `${SUCCESS}15`, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: `${SUCCESS}30` }}>
                  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: SUCCESS, marginBottom: 6 }}>✓ Shared with BioRealign's team</Text>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 18 }}>
                    Your documents and summary are handled securely and confidentially.{' '}
                    <Text style={{ color: THEME.colors.teal }} onPress={() => router.push('/(client)/privacy-policy')}>Read our Privacy Policy</Text>.
                  </Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setShowExpertModal(true)} activeOpacity={0.85} style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Need Expert Opinion?</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}
      </ScrollView>

      <DisclaimerModal visible={showDisclaimer} onAcknowledge={onAcknowledgeDisclaimer} onClose={() => setShowDisclaimer(false)} />
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
