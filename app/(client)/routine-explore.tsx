// app/(client)/routine-explore.tsx
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Modal, Animated, Pressable,
  ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/constants/theme';

type Program = {
  id: string; name: string; slug: string;
  level: string; goal: string; equipment_type: string;
  routine_count: number; thumbnail_text: string;
  thumbnail_color: string; description: string;
};

// ── Filter options ────────────────────────────────────────────
const LEVEL_OPTIONS     = [{ label: 'Beginner', key: 'beginner', icon: '📊' }, { label: 'Intermediate', key: 'intermediate', icon: '📈' }, { label: 'Advanced', key: 'advanced', icon: '🏆' }];
const GOAL_OPTIONS      = [{ label: 'Gain Muscle', key: 'gain_muscle', icon: '💪' }, { label: 'Strength', key: 'strength', icon: '🏋️' }, { label: 'Lose Weight', key: 'lose_weight', icon: '⚡' }, { label: 'General Fitness', key: 'general_fitness', icon: '🎯' }];
const EQUIPMENT_OPTIONS = [{ label: 'Gym', key: 'gym', icon: '🏢' }, { label: 'Dumbbells', key: 'dumbbells', icon: '🏋️' }, { label: 'Bodyweight', key: 'bodyweight', icon: '🧘' }, { label: 'Band', key: 'band', icon: '🎗️' }, { label: 'None', key: 'bodyweight', icon: '🚫' }];

const ROUTINE_CATEGORIES = [
  { label: 'At Home',        icon: '🏠',  key: 'at-home',       equipment: 'bodyweight' },
  { label: 'Travel',         icon: '✈️',  key: 'travel',        equipment: 'bodyweight' },
  { label: 'Dumbbells Only', icon: '🏋️', key: 'dumbbells',     equipment: 'dumbbells'  },
  { label: 'Band',           icon: '🎗️', key: 'band',          equipment: 'band'       },
  { label: 'Cardio & HIIT',  icon: '❤️',  key: 'cardio-hiit',   goal: 'lose_weight'     },
  { label: 'Gym',            icon: '🏢',  key: 'gym',           equipment: 'gym'        },
  { label: 'Bodyweight',     icon: '💪',  key: 'bodyweight',    equipment: 'bodyweight' },
  { label: 'Build Muscle',   icon: '🔥',  key: 'build-muscle',  goal: 'gain_muscle'     },
];

const INITIAL_SHOW = 3;

// ── Data ──────────────────────────────────────────────────────
function useExplorePrograms() {
  return useQuery({
    queryKey: ['explore_programs'],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('explore_programs').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return (data ?? []) as Program[];
    },
  });
}

// ── Program thumbnail ─────────────────────────────────────────
function ProgramThumbnail({ text, color }: { text: string; color: string }) {
  return (
    <View style={[th.wrap, { borderColor: `${color}35` }]}>
      <View style={[th.bar, { backgroundColor: color }]} />
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 6 }}>
        {text.split(' ').map((line, i) => (
          <Text key={i} style={[th.text, { color }]}>{line}</Text>
        ))}
      </View>
    </View>
  );
}
const th = StyleSheet.create({
  wrap: { width: 90, height: 80, borderRadius: 10, backgroundColor: '#1C1C22', borderWidth: 1, overflow: 'hidden', flexShrink: 0, flexDirection: 'row' },
  bar:  { width: 4, height: '100%' },
  text: { fontSize: 12, fontFamily: 'DMSans_700Bold', letterSpacing: 0.3, lineHeight: 16 },
});

// ── Program card ──────────────────────────────────────────────
function ProgramCard({ program }: { program: Program }) {
  return (
    <TouchableOpacity style={pc.card} activeOpacity={0.8}>
      <ProgramThumbnail text={program.thumbnail_text} color={program.thumbnail_color} />
      <View style={{ flex: 1 }}>
        <Text style={pc.name} numberOfLines={2}>{program.name}</Text>
        <Text style={pc.count}>{program.routine_count} routine{program.routine_count !== 1 ? 's' : ''}</Text>
      </View>
    </TouchableOpacity>
  );
}
const pc = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  name: { color: THEME.colors.textPrimary, fontSize: 14, fontFamily: THEME.fonts.sansMedium, marginBottom: 6, lineHeight: 20 },
  count:{ color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sans },
});

// ── Mini filter sheet (for individual chip taps) ──────────────
function MiniFilterSheet({ visible, onClose, title, options, selected, onSelect }: {
  visible: boolean; onClose: () => void; title: string;
  options: { label: string; key: string; icon: string }[];
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  const [show, setShow] = useState(visible);
  const slideY = useRef(new Animated.Value(500)).current;
  const fade   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShow(true);
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 90, friction: 12 }),
        Animated.timing(fade,   { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: 500, duration: 230, useNativeDriver: true }),
        Animated.timing(fade,   { toValue: 0,   duration: 180, useNativeDriver: true }),
      ]).start(() => setShow(false));
    }
  }, [visible]);

  return (
    <Modal transparent visible={show} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[mf.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[mf.panel, { transform: [{ translateY: slideY }] }]}>
        <View style={mf.handle} />
        <Text style={mf.title}>{title}</Text>
        <View style={mf.divider} />
        <View style={mf.grid}>
          {options.map(opt => {
            const isSelected = selected === opt.key;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[mf.tile, isSelected && mf.tileActive]}
                onPress={() => { onSelect(isSelected ? null : opt.key); onClose(); }}
                activeOpacity={0.75}
              >
                <Text style={mf.tileIcon}>{opt.icon}</Text>
                <Text style={[mf.tileLabel, isSelected && mf.tileLabelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={mf.bottomRow}>
          <TouchableOpacity style={mf.clearBtn} onPress={() => { onSelect(null); onClose(); }}>
            <Text style={mf.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}
const mf = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 200 },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#15151A', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    zIndex: 201, paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  title:    { color: THEME.colors.textPrimary, fontSize: 16, fontFamily: THEME.fonts.sansMedium, textAlign: 'center', paddingVertical: 12 },
  divider:  { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 16 },
  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  tile:     { flex: 1, minWidth: 90, aspectRatio: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingVertical: 12 },
  tileActive: { backgroundColor: `${THEME.colors.teal}18`, borderColor: `${THEME.colors.teal}60` },
  tileIcon:   { fontSize: 26 },
  tileLabel:  { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sansMedium, textAlign: 'center' },
  tileLabelActive: { color: THEME.colors.teal },
  bottomRow:  { paddingHorizontal: 16, paddingTop: 14 },
  clearBtn:   { paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)' },
  clearText:  { color: THEME.colors.textMuted, fontSize: 14, fontFamily: THEME.fonts.sansMedium },
});

// ── Full filter sheet (⊞ Filters button) ─────────────────────
function FullFilterSheet({ visible, onClose, activeLevel, activeGoal, activeEquipment, onApply, resultCount }: {
  visible: boolean; onClose: () => void;
  activeLevel: string|null; activeGoal: string|null; activeEquipment: string|null;
  onApply: (l: string|null, g: string|null, e: string|null) => void;
  resultCount: number;
}) {
  const [show, setShow]   = useState(visible);
  const [level, setLevel] = useState(activeLevel);
  const [goal,  setGoal]  = useState(activeGoal);
  const [equip, setEquip] = useState(activeEquipment);
  const slideY = useRef(new Animated.Value(700)).current;
  const fade   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setLevel(activeLevel); setGoal(activeGoal); setEquip(activeEquipment);
      setShow(true);
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(fade,   { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: 700, duration: 240, useNativeDriver: true }),
        Animated.timing(fade,   { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start(() => setShow(false));
    }
  }, [visible]);

  function Tile({ opt, isSelected, onPress }: { opt: any; isSelected: boolean; onPress: () => void }) {
    return (
      <TouchableOpacity style={[fs.tile, isSelected && fs.tileActive]} onPress={onPress} activeOpacity={0.75}>
        <Text style={fs.tileIcon}>{opt.icon}</Text>
        <Text style={[fs.tileLabel, isSelected && fs.tileLabelActive]}>{opt.label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Modal transparent visible={show} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[fs.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[fs.panel, { transform: [{ translateY: slideY }] }]}>
        <View style={fs.handle} />
        <Text style={fs.title}>Filters</Text>
        <View style={fs.divider} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {/* Level */}
          <Text style={fs.sectionTitle}>Level</Text>
          <View style={fs.row}>
            {LEVEL_OPTIONS.map(o => <Tile key={o.key} opt={o} isSelected={level===o.key} onPress={() => setLevel(level===o.key ? null : o.key)} />)}
          </View>
          <View style={fs.divider} />
          {/* Goal */}
          <Text style={fs.sectionTitle}>Goal</Text>
          <View style={fs.row}>
            {GOAL_OPTIONS.map(o => <Tile key={o.key} opt={o} isSelected={goal===o.key} onPress={() => setGoal(goal===o.key ? null : o.key)} />)}
          </View>
          <View style={fs.divider} />
          {/* Equipment */}
          <Text style={fs.sectionTitle}>Equipment</Text>
          <View style={fs.row}>
            {[EQUIPMENT_OPTIONS[0], EQUIPMENT_OPTIONS[1], EQUIPMENT_OPTIONS[4]].map(o => (
              <Tile key={o.label} opt={o} isSelected={equip===o.key} onPress={() => setEquip(equip===o.key ? null : o.key)} />
            ))}
          </View>
        </ScrollView>
        <View style={fs.divider} />
        <View style={fs.bottom}>
          <TouchableOpacity style={fs.clearBtn} onPress={() => { setLevel(null); setGoal(null); setEquip(null); }} activeOpacity={0.7}>
            <Text style={fs.clearText}>Clear Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity style={fs.applyBtn} onPress={() => { onApply(level, goal, equip); onClose(); }} activeOpacity={0.85}>
            <Text style={fs.applyText}>Show {resultCount} result{resultCount !== 1 ? 's' : ''}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}
const fs = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 200 },
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#15151A', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', zIndex: 201, maxHeight: '88%', paddingBottom: Platform.OS === 'ios' ? 28 : 14 },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  title:        { color: THEME.colors.textPrimary, fontSize: 17, fontFamily: THEME.fonts.sansMedium, textAlign: 'center', paddingVertical: 12 },
  divider:      { height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  sectionTitle: { color: THEME.colors.textPrimary, fontSize: 16, fontFamily: THEME.fonts.sansMedium, marginTop: 16, marginBottom: 12 },
  row:          { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  tile:         { flex: 1, minWidth: 90, aspectRatio: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingVertical: 12 },
  tileActive:   { backgroundColor: `${THEME.colors.teal}18`, borderColor: `${THEME.colors.teal}60` },
  tileIcon:     { fontSize: 26 },
  tileLabel:    { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sansMedium, textAlign: 'center' },
  tileLabelActive: { color: THEME.colors.teal },
  bottom:       { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 14 },
  clearBtn:     { flex: 1, paddingVertical: 15, alignItems: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)' },
  clearText:    { color: THEME.colors.textSecondary, fontSize: 15, fontFamily: THEME.fonts.sansMedium },
  applyBtn:     { flex: 2, paddingVertical: 15, alignItems: 'center', borderRadius: 14, backgroundColor: '#2563EB' },
  applyText:    { color: '#fff', fontSize: 15, fontFamily: THEME.fonts.sansMedium },
});

// ── Trainer card ──────────────────────────────────────────────
function TrainerCard() {
  return (
    <View style={tc.card}>
      <View style={tc.left}>
        <Text style={tc.tag}>Trainer</Text>
        <Text style={tc.desc}>Program based on{'\n'}your needs and goals</Text>
        <TouchableOpacity><Text style={tc.link}>Explore now →</Text></TouchableOpacity>
      </View>
      <View style={tc.right}>
        {[{ icon:'🎯', label:'Goal' },{ icon:'💪', label:'Level' },{ icon:'🏋️', label:'Equipment' }].map(i => (
          <View key={i.label} style={tc.pill}><Text style={{ fontSize: 12 }}>{i.icon}</Text><Text style={tc.pillText}>{i.label}</Text></View>
        ))}
        <View style={[tc.pill, { backgroundColor: `${THEME.colors.teal}25`, borderColor: `${THEME.colors.teal}40` }]}>
          <Text style={{ fontSize: 10 }}>⚡</Text>
          <Text style={[tc.pillText, { color: THEME.colors.teal }]}>Personalised Program</Text>
        </View>
      </View>
    </View>
  );
}
const tc = StyleSheet.create({
  card:  { flexDirection: 'row', gap: 12, backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', marginHorizontal: 16, marginBottom: 24 },
  left:  { flex: 1 },
  tag:   { color: THEME.colors.teal, fontSize: 16, fontFamily: THEME.fonts.sansMedium, marginBottom: 6 },
  desc:  { color: THEME.colors.textSecondary, fontSize: 13, fontFamily: THEME.fonts.sans, lineHeight: 20, marginBottom: 10 },
  link:  { color: THEME.colors.teal, fontSize: 13, fontFamily: THEME.fonts.sansMedium },
  right: { justifyContent: 'center', gap: 6, minWidth: 140 },
  pill:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pillText: { color: THEME.colors.textMuted, fontSize: 11, fontFamily: THEME.fonts.sansMedium },
});

// ── Category grid ─────────────────────────────────────────────
function CategoryGrid({ onPress }: { onPress: (key: string, label: string) => void }) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Text style={{ color: THEME.colors.textPrimary, fontSize: 18, fontFamily: THEME.fonts.sansMedium, marginBottom: 12 }}>Routines</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {ROUTINE_CATEGORIES.map(item => (
          <TouchableOpacity
            key={item.key}
            style={cg.cell}
            onPress={() => onPress(item.key, item.label)}
            activeOpacity={0.8}
          >
            <Text style={cg.icon}>{item.icon}</Text>
            <Text style={cg.label}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const cg = StyleSheet.create({
  cell:  { width: '47.5%', backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  icon:  { fontSize: 26 },
  label: { color: THEME.colors.textPrimary, fontSize: 14, fontFamily: THEME.fonts.sansMedium, flex: 1 },
});

// ── Chip ─────────────────────────────────────────────────────
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[ch.wrap, active && ch.wrapActive]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[ch.text, active && ch.textActive]}>{label} ▾</Text>
    </TouchableOpacity>
  );
}
const ch = StyleSheet.create({
  wrap:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  wrapActive:  { backgroundColor: `${THEME.colors.teal}18`, borderColor: `${THEME.colors.teal}55` },
  text:        { color: THEME.colors.textSecondary, fontSize: 13, fontFamily: THEME.fonts.sansMedium },
  textActive:  { color: THEME.colors.teal },
});

// ── Main screen ───────────────────────────────────────────────
export default function ExploreScreen() {
  const router = useRouter();
  const { data: allPrograms = [], isLoading } = useExplorePrograms();

  const [levelFilter, setLevelFilter]   = useState<string|null>(null);
  const [goalFilter,  setGoalFilter]    = useState<string|null>(null);
  const [equipFilter, setEquipFilter]   = useState<string|null>(null);
  const [showFullSheet, setShowFullSheet] = useState(false);
  const [miniSheet,   setMiniSheet]     = useState<'level'|'goal'|'equipment'|null>(null);
  const [showAll,     setShowAll]       = useState(false);

  const filtered = useMemo(() => {
    let list = allPrograms;
    if (levelFilter) list = list.filter(p => p.level === levelFilter);
    if (goalFilter)  list = list.filter(p => p.goal  === goalFilter);
    if (equipFilter) list = list.filter(p => p.equipment_type === equipFilter);
    return list;
  }, [allPrograms, levelFilter, goalFilter, equipFilter]);

  const displayed   = showAll ? filtered : filtered.slice(0, INITIAL_SHOW);
  const hiddenCount = filtered.length - INITIAL_SHOW;
  const activeCount = [levelFilter, goalFilter, equipFilter].filter(Boolean).length;

  const levelLabel  = levelFilter  ? LEVEL_OPTIONS.find(o => o.key === levelFilter)?.label  ?? 'Level'     : 'Level';
  const goalLabel   = goalFilter   ? GOAL_OPTIONS.find(o => o.key === goalFilter)?.label    ?? 'Goal'      : 'Goal';
  const equipLabel  = equipFilter  ? EQUIPMENT_OPTIONS.find(o => o.key === equipFilter)?.label ?? 'Equipment' : 'Equipment';

  // Preview count for full filter sheet
  const previewCount = useMemo(() => {
    let list = allPrograms;
    if (levelFilter) list = list.filter(p => p.level === levelFilter);
    if (goalFilter)  list = list.filter(p => p.goal  === goalFilter);
    if (equipFilter) list = list.filter(p => p.equipment_type === equipFilter);
    return list.length;
  }, [allPrograms, levelFilter, goalFilter, equipFilter]);

  function handleCategoryPress(key: string, label: string) {
    router.push({ pathname: '/(client)/routine-category', params: { key, label } } as any);
  }

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ width: 40 }}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Explore</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Scrollable content — fills remaining space cleanly */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* Programs section */}
        <Text style={s.sectionTitle}>Programs</Text>

        {/* Filter row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {/* Main Filters */}
          <TouchableOpacity
            style={[s.filterBtn, activeCount > 0 && s.filterBtnActive]}
            onPress={() => setShowFullSheet(true)} activeOpacity={0.8}
          >
            <Text style={s.filterIcon}>⊞</Text>
            <Text style={[s.filterBtnText, activeCount > 0 && s.filterBtnTextActive]}>
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </Text>
          </TouchableOpacity>

          {/* Level chip → opens mini sheet */}
          <Chip label={levelLabel} active={!!levelFilter} onPress={() => setMiniSheet('level')} />
          {/* Goal chip */}
          <Chip label={goalLabel}  active={!!goalFilter}  onPress={() => setMiniSheet('goal')} />
          {/* Equipment chip */}
          <Chip label={equipLabel} active={!!equipFilter} onPress={() => setMiniSheet('equipment')} />

          {activeCount > 0 && (
            <TouchableOpacity style={s.clearChip}
              onPress={() => { setLevelFilter(null); setGoalFilter(null); setEquipFilter(null); setShowAll(false); }}>
              <Text style={s.clearChipText}>✕ Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Programs list */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          {isLoading ? (
            <View style={s.loadingWrap}><ActivityIndicator color={THEME.colors.teal} /><Text style={s.loadingText}>Loading…</Text></View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyWrap}><Text style={{ fontSize: 32 }}>🔍</Text><Text style={s.emptyText}>No programs match your filters.{'\n'}Try removing some.</Text></View>
          ) : (
            <>
              {displayed.map(p => <ProgramCard key={p.id} program={p} />)}
              {hiddenCount > 0 && !showAll && (
                <TouchableOpacity style={s.showMoreBtn} onPress={() => setShowAll(true)} activeOpacity={0.7}>
                  <Text style={s.showMoreText}>▾  Show {hiddenCount} more program{hiddenCount !== 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              )}
              {showAll && filtered.length > INITIAL_SHOW && (
                <TouchableOpacity style={s.showMoreBtn} onPress={() => setShowAll(false)} activeOpacity={0.7}>
                  <Text style={s.showMoreText}>▴  Show fewer programs</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Trainer card */}
        <TrainerCard />

        {/* Routines categories */}
        <CategoryGrid onPress={handleCategoryPress} />
      </ScrollView>

      {/* Full filter sheet */}
      <FullFilterSheet
        visible={showFullSheet} onClose={() => setShowFullSheet(false)}
        activeLevel={levelFilter} activeGoal={goalFilter} activeEquipment={equipFilter}
        resultCount={previewCount}
        onApply={(l,g,e) => { setLevelFilter(l); setGoalFilter(g); setEquipFilter(e); setShowAll(false); }}
      />

      {/* Mini sheets for individual chips */}
      <MiniFilterSheet
        visible={miniSheet === 'level'} onClose={() => setMiniSheet(null)}
        title="Level" options={LEVEL_OPTIONS}
        selected={levelFilter}
        onSelect={(k) => { setLevelFilter(k); setShowAll(false); }}
      />
      <MiniFilterSheet
        visible={miniSheet === 'goal'} onClose={() => setMiniSheet(null)}
        title="Goal" options={GOAL_OPTIONS}
        selected={goalFilter}
        onSelect={(k) => { setGoalFilter(k); setShowAll(false); }}
      />
      <MiniFilterSheet
        visible={miniSheet === 'equipment'} onClose={() => setMiniSheet(null)}
        title="Equipment"
        options={[EQUIPMENT_OPTIONS[0], EQUIPMENT_OPTIONS[1], EQUIPMENT_OPTIONS[2], EQUIPMENT_OPTIONS[3], EQUIPMENT_OPTIONS[4]]}
        selected={equipFilter}
        onSelect={(k) => { setEquipFilter(k); setShowAll(false); }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: THEME.colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  backArrow:   { color: THEME.colors.textPrimary, fontSize: 22 },
  headerTitle: { color: THEME.colors.textPrimary, fontSize: 17, fontFamily: THEME.fonts.sansMedium },
  scrollContent:{ paddingBottom: 40 },
  sectionTitle: { color: THEME.colors.textPrimary, fontSize: 18, fontFamily: THEME.fonts.sansMedium, paddingHorizontal: 16, paddingTop: 20, marginBottom: 12 },
  filterRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  filterBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterBtnActive:    { backgroundColor: `${THEME.colors.teal}18`, borderColor: `${THEME.colors.teal}55` },
  filterIcon:         { fontSize: 14 },
  filterBtnText:      { color: THEME.colors.textSecondary, fontSize: 13, fontFamily: THEME.fonts.sansMedium },
  filterBtnTextActive:{ color: THEME.colors.teal },
  clearChip:     { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center' },
  clearChipText: { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sans },
  showMoreBtn:   { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  showMoreText:  { color: THEME.colors.teal, fontSize: 14, fontFamily: THEME.fonts.sansMedium },
  divider:       { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16, marginVertical: 20 },
  loadingWrap:   { paddingVertical: 32, alignItems: 'center', gap: 10 },
  loadingText:   { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans },
  emptyWrap:     { paddingVertical: 32, alignItems: 'center', gap: 10 },
  emptyText:     { color: THEME.colors.textMuted, fontSize: 14, fontFamily: THEME.fonts.sans, textAlign: 'center', lineHeight: 22 },
});
