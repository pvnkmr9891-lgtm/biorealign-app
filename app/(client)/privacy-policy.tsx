import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { THEME } from '@/constants/theme';
import { SUPPORT_EMAIL } from '@/constants/contact';

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 8 }}>{title}</Text>
      <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 21 }}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Section title="What we collect">
          {`We collect the information you provide directly — your profile details, body measurements, progress photos, workout and nutrition logs, check-ins, and any documents you choose to upload (including medical records). We also collect basic usage data needed to run the app reliably.`}
        </Section>

        <Section title="Medical documents specifically">
          {`Medical documents you upload are stored in a private, access-controlled location. Only you, your assigned coach (if any), and authorized BioRealign staff handling an expert-opinion request you've explicitly submitted can access them. They are never made public and are not used to train any AI model.`}
        </Section>

        <Section title="How AI analysis is used">
          {`If you use the "Perform Analysis" feature, your document content is sent securely to our AI provider solely to generate the organizational summary shown to you. This analysis is for your own readability — it is not a medical diagnosis, and BioRealign does not use it to make any decisions about your care. See the in-app disclaimer for full detail.`}
        </Section>

        <Section title="Who can see your data">
          {`Your coach can see data for the sole purpose of guiding your program — and only once you're assigned to them. If you have no assigned coach and request an expert opinion, the specific documents and summary involved in that request are shared with BioRealign's support team only, never with any other client or third party.`}
        </Section>

        <Section title="Your rights">
          {`You can access, correct, or request deletion of your data at any time, and withdraw consent for any optional feature (like medical document analysis) without affecting your ability to use the rest of the app.`}
        </Section>

        <Section title="Contact us">
          {`For any privacy questions or requests, reach us at ${SUPPORT_EMAIL}.`}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
