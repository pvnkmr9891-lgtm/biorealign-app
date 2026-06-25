import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { THEME } from '@/constants/theme';
import { CoachListing } from '@/hooks/useCoachDirectory';

// Shared resume rendering for a coach — used both on the client-facing
// coach-detail screen and the coach's own "view my public profile" screen,
// so the two never drift out of sync.
export function CoachProfileView({ coach }: { coach: CoachListing }) {
  return (
    <>
      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: `${THEME.colors.teal}20`, borderWidth: 2, borderColor: `${THEME.colors.teal}40`, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 30, fontFamily: THEME.fonts.serif, color: THEME.colors.teal }}>
            {coach.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </Text>
        </View>
        <Text style={{ fontSize: 24, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>{coach.full_name}</Text>
        {coach.tagline ? (
          <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, marginTop: 5, textAlign: 'center', paddingHorizontal: 20 }}>
            {coach.tagline}
          </Text>
        ) : (
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 4 }}>
            {coach.years_experience ?? '—'} years of coaching experience
          </Text>
        )}
        {coach.location && (
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 4 }}>📍 {coach.location}</Text>
        )}

        {!!(coach.social_links && Object.keys(coach.social_links).length) && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            {[
              { key: 'instagram', icon: '📷', url: coach.social_links.instagram },
              { key: 'linkedin', icon: '💼', url: coach.social_links.linkedin },
              { key: 'youtube', icon: '▶️', url: coach.social_links.youtube },
              { key: 'twitter', icon: '🐦', url: coach.social_links.twitter },
              { key: 'website', icon: '🌐', url: coach.social_links.website },
            ].filter((s) => s.url).map((s) => (
              <TouchableOpacity
                key={s.key}
                onPress={() => Linking.openURL(s.url!)}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
              >
                <Text style={{ fontSize: 15 }}>{s.icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <View style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <Text style={{ fontSize: 20, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>{coach.clients_served}</Text>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>Clients Served</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <Text style={{ fontSize: 20, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>{coach.years_experience ?? '—'}</Text>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>Years Experience</Text>
        </View>
      </View>

      {!!coach.specialties?.length && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 10 }}>CORE STRENGTHS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {coach.specialties.map((s) => (
              <View key={s} style={{ backgroundColor: `${THEME.colors.amber}15`, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 0.5, borderColor: `${THEME.colors.amber}30` }}>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {coach.bio && (
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 10 }}>ABOUT</Text>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 22 }}>{coach.bio}</Text>
        </View>
      )}

      {coach.coaching_philosophy && (
        <View style={{ marginBottom: 24, backgroundColor: `${THEME.colors.teal}0D`, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${THEME.colors.teal}25`, borderLeftWidth: 3, borderLeftColor: THEME.colors.teal }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, marginBottom: 8 }}>💬 COACHING PHILOSOPHY</Text>
          <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 21, fontStyle: 'italic' }}>"{coach.coaching_philosophy}"</Text>
        </View>
      )}

      {!!coach.achievements?.length && (
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 10 }}>🏅 ACHIEVEMENTS & RECOGNITION</Text>
          <View style={{ gap: 8 }}>
            {coach.achievements.map((a, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <Text style={{ fontSize: 18 }}>{a.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, flexShrink: 1 }}>{a.title}</Text>
                    {a.year && <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>· {a.year}</Text>}
                  </View>
                  {a.description && <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 3, lineHeight: 17 }}>{a.description}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {!!coach.experience_timeline?.length && (
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 10 }}>💼 EXPERIENCE</Text>
          <View>
            {coach.experience_timeline.map((e, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: i < coach.experience_timeline!.length - 1 ? 14 : 0 }}>
                <View style={{ alignItems: 'center', width: 14 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i === 0 ? THEME.colors.teal : THEME.colors.surface3, borderWidth: i === 0 ? 0 : 1.5, borderColor: THEME.colors.border, marginTop: 3 }} />
                  {i < coach.experience_timeline!.length - 1 && <View style={{ flex: 1, width: 1.5, backgroundColor: THEME.colors.border, marginTop: 4 }} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 2 }}>
                  <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{e.role}</Text>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginTop: 1 }}>
                    {e.organization} · {e.start_year}–{e.end_year ?? 'Present'}
                  </Text>
                  {e.description && <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 4, lineHeight: 17 }}>{e.description}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {!!coach.certifications?.length && (
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 10 }}>🎓 CERTIFICATIONS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {coach.certifications.map((c, i) => (
              <View key={i} style={{ flexBasis: '100%', backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{c.name}</Text>
                  <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>{c.issuer}</Text>
                </View>
                <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>{c.year}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {!!coach.education?.length && (
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 10 }}>📚 EDUCATION</Text>
          {coach.education.map((ed, i) => (
            <View key={i} style={{ marginBottom: i < coach.education!.length - 1 ? 8 : 0 }}>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{ed.degree}</Text>
              <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>{ed.institution} · {ed.year}</Text>
            </View>
          ))}
        </View>
      )}

      {!!coach.testimonials?.length && (
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 10 }}>⭐ CLIENT TESTIMONIALS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {coach.testimonials.map((t, i) => (
              <View key={i} style={{ width: 230, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <Text style={{ fontSize: 12, color: THEME.colors.amber, marginBottom: 6 }}>{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</Text>
                <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 18, fontStyle: 'italic' }}>"{t.quote}"</Text>
                <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginTop: 8 }}>— {t.client_name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}
