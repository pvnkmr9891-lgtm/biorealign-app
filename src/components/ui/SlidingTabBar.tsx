// src/components/ui/SlidingTabBar.tsx
// ─────────────────────────────────────────────────────────────────────
// 4-tab bottom bar  (Home · Workout · Progress · Menu)
// + Hamburger side drawer for remaining navigation items
// ─────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  Animated, Modal, Pressable, useWindowDimensions, ScrollView,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { THEME } from '@/constants/theme';
import { useClientUnreadCount, useClientCoachInfo } from '@/hooks/useCoach';
import { TAB_ICON_MAP } from '@/components/ui/NeonTabIcons';
import { PROGRAMS_ENABLED, COACH_REQUEST_ENABLED } from '@/constants/featureFlags';

// ── Navigation config ─────────────────────────────────────────────────

/** 3 route tabs shown in the bottom bar (+ Menu button = 4 total) */
const BOTTOM_TABS = [
  { name: 'index',        label: 'Home',    icon: '🏠', route: '/(client)/' },
  { name: 'workout-plan', label: 'Workout', icon: '💪', route: '/(client)/workout-plan' },
  { name: 'progress',     label: 'Progress',icon: '📊', route: '/(client)/progress' },
];

const TAB_W  = 76;
const DOCK_H = 72;

/** Full set of drawer items — used as-is for the "is Menu active" pathname
 * check (see BottomBar), and filtered per-user by getVisibleDrawerItems
 * for what actually renders in the drawer. Messages and Fitness Assessment
 * only make sense once a coach is assigned; "Need a Coach?" (browse/request)
 * and "My Coach" (status + message shortcut) are mutually exclusive states
 * of the same slot, never shown together. */
const DRAWER_ITEMS = [
  { name: 'checkin',  label: 'Daily Pulse', icon: '💓', route: '/(client)/checkin' },
  ...(PROGRAMS_ENABLED
    ? [{ name: 'programs', label: 'Programs', icon: '🎯', route: '/(client)/programs' }]
    : []),
  { name: 'messages', label: 'Messages', icon: '💬', route: '/(client)/messages', badge: true, requiresCoach: true },
  ...(COACH_REQUEST_ENABLED
    ? [
        { name: 'coach-list', label: 'Need a Coach?', icon: '🧑‍🏫', route: '/(client)/coach-list', requiresCoach: false, hideIfCoach: true },
        { name: 'my-coach',   label: 'My Coach',       icon: '🧑‍🏫', route: '/(client)/my-coach',   requiresCoach: true },
      ]
    : []),
  { name: 'medical-records', label: 'Medical Records', icon: '🩺', route: '/(client)/medical-records' },
  { name: 'recovery', label: 'Recovery', icon: '🩹', route: '/(client)/recovery' },
  { name: 'fitness-assessment', label: 'Fitness Assessment', icon: '🏋️', route: '/(client)/fitness-assessment', requiresCoach: true },
  { name: 'profile',  label: 'Profile',  icon: '👤', route: '/(client)/profile' },
] as { name: string; label: string; icon: string; route: string; badge?: boolean; requiresCoach?: boolean; hideIfCoach?: boolean }[];

function getVisibleDrawerItems(hasCoach: boolean) {
  return DRAWER_ITEMS.filter((item) => {
    if (item.requiresCoach && !hasCoach) return false;
    if (item.hideIfCoach && hasCoach) return false;
    return true;
  });
}

/** Screens where the tab bar should be hidden entirely — focused, single-task
 * flows where a fixed bottom action bar already owns that space, so the
 * floating dock would either overlap it or be a pointless distraction. */
const HIDDEN_SCREENS = [
  'workout-player', 'workout-interval', 'content/player',
  'routine-new', 'routine-add-exercise',
  'routine-explore', 'routine-category',
  'workout-detail', 'plan-add-exercise',
  'checkin',
];

// Total vertical space the floating dock occupies, measured from the very
// bottom of the screen — any fixed/absolute bottom bar on a screen that
// still shows the tab bar needs at least this much clearance so its buttons
// aren't covered by (or fighting touches with) the dock.
const DOCK_BOTTOM_OFFSET = Platform.OS === 'ios' ? 28 : 16;
export const TAB_BAR_CLEARANCE = DOCK_BOTTOM_OFFSET + DOCK_H + 16;

// ── Hamburger icon ────────────────────────────────────────────────────
function HamburgerIcon({ color, isOpen }: { color: string; isOpen: boolean }) {
  const rot1 = useRef(new Animated.Value(0)).current;
  const rot2 = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(rot1, { toValue: isOpen ? 1 : 0, duration: 200, useNativeDriver: true }),
      Animated.timing(rot2, { toValue: isOpen ? 1 : 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fade, { toValue: isOpen ? 0 : 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [isOpen]);

  const line1Rotate = rot1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const line3Rotate = rot2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-45deg'] });

  return (
    <View style={{ width: 22, height: 16, justifyContent: 'space-between', alignItems: 'center' }}>
      <Animated.View style={[burgerStyles.line, { backgroundColor: color, transform: [{ rotate: line1Rotate }, { translateY: isOpen ? 7 : 0 }] }]} />
      <Animated.View style={[burgerStyles.line, { backgroundColor: color, opacity: fade, width: 15 }]} />
      <Animated.View style={[burgerStyles.line, { backgroundColor: color, transform: [{ rotate: line3Rotate }, { translateY: isOpen ? -7 : 0 }] }]} />
    </View>
  );
}

const burgerStyles = StyleSheet.create({
  line: { height: 2, width: 22, borderRadius: 1 },
});

// ── Drawer overlay ────────────────────────────────────────────────────
function DrawerMenu({
  visible,
  onClose,
  unreadCount,
}: {
  visible: boolean;
  onClose: () => void;
  unreadCount: number;
}) {
  const router    = useRouter();
  const pathname  = usePathname();
  const { width } = useWindowDimensions();
  const DRAWER_W  = Math.min(300, width * 0.80);
  const { data: coachInfo, refetch: refetchCoachInfo } = useClientCoachInfo();
  const items = getVisibleDrawerItems(!!coachInfo);

  // Internal modal visibility so close animation can complete
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim   = useRef(new Animated.Value(DRAWER_W)).current;
  const backdropFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // This component stays mounted for the whole app session (it's part
      // of the persistent layout), so its 1-min global staleTime otherwise
      // only refreshes on app backgrounding. Coach assignment happens from
      // a coach/admin's own session — the client's app has no way to know
      // it changed — so re-check every time the menu is actually opened,
      // the moment this decision is visually shown.
      refetchCoachInfo();
      setModalVisible(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 90,
          friction: 12,
        }),
        Animated.timing(backdropFade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_W,
          duration: 230,
          useNativeDriver: true,
        }),
        Animated.timing(backdropFade, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  const isActive = useCallback((name: string) => {
    if (name === 'index') return pathname === '/' || pathname === '/(client)';
    return pathname.includes(name);
  }, [pathname]);

  function navigate(route: string) {
    onClose();
    setTimeout(() => router.push(route as any), 160);
  }

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop — tap to close */}
      <Animated.View style={[drawerStyles.backdrop, { opacity: backdropFade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel — slides from right */}
      <Animated.View style={[
        drawerStyles.panel,
        { width: DRAWER_W, transform: [{ translateX: slideAnim }] },
      ]}>
        {/* Header */}
        <View style={drawerStyles.panelHeader}>
          <View>
            <Text style={drawerStyles.panelTitle}>Menu</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={drawerStyles.closeBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={drawerStyles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={drawerStyles.panelDivider} />

        {/* Navigation items */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {items.map((item) => {
            const active   = isActive(item.name);
            const hasBadge = item.badge && unreadCount > 0;

            return (
              <TouchableOpacity
                key={item.name}
                testID={`drawer-item-${item.name}`}
                style={[drawerStyles.item, active && drawerStyles.itemActive]}
                onPress={() => navigate(item.route)}
                activeOpacity={0.75}
              >
                {/* Left accent bar when active */}
                {active && <View style={drawerStyles.itemAccent} />}

                {/* Icon */}
                <View style={[drawerStyles.iconWrap, active && drawerStyles.iconWrapActive]}>
                  <Text style={drawerStyles.itemIcon}>{item.icon}</Text>
                  {hasBadge && (
                    <View style={drawerStyles.badge}>
                      <Text style={drawerStyles.badgeText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Label */}
                <Text style={[drawerStyles.itemLabel, active && drawerStyles.itemLabelActive]}>
                  {item.label}
                </Text>

                {/* Chevron */}
                <Text style={drawerStyles.itemChevron}>›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Footer */}
        <View style={drawerStyles.panelFooter}>
          <View style={drawerStyles.panelDivider} />
          <Text style={drawerStyles.footerText}>BioRealign</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ── Bottom tab bar ────────────────────────────────────────────────────
function BottomBar({
  unreadCount,
  menuOpen,
  onMenuToggle,
}: {
  unreadCount: number;
  menuOpen: boolean;
  onMenuToggle: () => void;
}) {
  const router   = useRouter();
  const pathname = usePathname();

  const isActive = useCallback((tab: typeof BOTTOM_TABS[0]) => {
    if (tab.name === 'index') return pathname === '/' || pathname === '/(client)';
    return pathname.includes(tab.name);
  }, [pathname]);

  // Is any drawer item currently active?
  const isMenuActive = DRAWER_ITEMS.some(item => pathname.includes(item.name));

  return (
    <View style={barStyles.wrapper}>
      <View style={barStyles.dock}>
        {/* 3 route tabs */}
        {BOTTOM_TABS.map((tab) => {
          const active = isActive(tab);
          const IconComp = TAB_ICON_MAP[tab.name];

          return (
            <TouchableOpacity
              key={tab.name}
              testID={`bottom-tab-${tab.name}`}
              style={barStyles.tabItem}
              onPress={() => router.push(tab.route as any)}
              activeOpacity={0.75}
            >
              {active && <View style={barStyles.activeGlow} />}

              {/* Icon */}
              <View style={barStyles.iconContainer}>
                {IconComp
                  ? <IconComp active={active} size={24} />
                  : <Text style={{ fontSize: 22, opacity: active ? 1 : 0.38 }}>{tab.icon}</Text>
                }
              </View>

              {/* Label */}
              <Text style={[barStyles.label, active && barStyles.labelActive]}>
                {tab.label}
              </Text>

              {/* Active dot */}
              {active && <View style={barStyles.dot} />}
            </TouchableOpacity>
          );
        })}

        {/* Hamburger menu button */}
        <TouchableOpacity
          testID="bottom-tab-menu"
          style={barStyles.tabItem}
          onPress={onMenuToggle}
          activeOpacity={0.75}
        >
          {(menuOpen || isMenuActive) && <View style={barStyles.activeGlow} />}

          <View style={barStyles.iconContainer}>
            <HamburgerIcon
              color={(menuOpen || isMenuActive) ? THEME.colors.teal : 'rgba(255,255,255,0.38)'}
              isOpen={menuOpen}
            />
          </View>

          <Text style={[barStyles.label, (menuOpen || isMenuActive) && barStyles.labelActive]}>
            Menu
          </Text>

          {(menuOpen || isMenuActive) && <View style={barStyles.dot} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────
export function SlidingTabBar() {
  const pathname  = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: unreadCount = 0 } = useClientUnreadCount();

  // Hide on full-screen screens
  if (HIDDEN_SCREENS.some(s => pathname.includes(s))) return null;

  return (
    <>
      <BottomBar
        unreadCount={unreadCount}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen(o => !o)}
      />
      <DrawerMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        unreadCount={unreadCount}
      />
    </>
  );
}

// ── Bottom bar styles ─────────────────────────────────────────────────
const DOCK_W = TAB_W * 4;    // 4 buttons

const barStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: DOCK_BOTTOM_OFFSET,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
    pointerEvents: 'box-none',
  },
  dock: {
    width:           DOCK_W,
    height:          DOCK_H,
    backgroundColor: 'rgba(18, 18, 20, 0.94)',
    borderRadius:    36,
    flexDirection:   'row',
    alignItems:      'center',
    borderWidth:     0.5,
    borderColor:     'rgba(255,255,255,0.10)',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.45,
    shadowRadius:    24,
    elevation:       20,
  },
  tabItem: {
    width:          TAB_W,
    height:         DOCK_H,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            3,
    position:       'relative',
  },
  activeGlow: {
    position:        'absolute',
    top: 8, left: 8, right: 8, bottom: 8,
    borderRadius:    20,
    backgroundColor: `${THEME.colors.teal}18`,
  },
  iconContainer: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize:    9,
    fontFamily:  THEME.fonts.sansMedium,
    color:       'rgba(255,255,255,0.35)',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: THEME.colors.teal,
  },
  dot: {
    position:        'absolute',
    bottom:          5,
    width:           4,
    height:          4,
    borderRadius:    2,
    backgroundColor: THEME.colors.teal,
  },
});

// ── Drawer styles ─────────────────────────────────────────────────────
const drawerStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 200,
  },
  panel: {
    position:        'absolute',
    top:             0,
    right:           0,
    bottom:          0,
    backgroundColor: '#111113',
    zIndex:          201,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.08)',
    shadowColor:     '#000',
    shadowOffset:    { width: -8, height: 0 },
    shadowOpacity:   0.4,
    shadowRadius:    24,
    elevation:       24,
  },
  panelHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop:  Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 16,
  },
  panelTitle: {
    fontSize:    20,
    fontFamily:  THEME.fonts.serif,
    color:       THEME.colors.textPrimary,
    letterSpacing: 0.3,
  },
  closeBtn: {
    width:          34,
    height:         34,
    borderRadius:   17,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color:    THEME.colors.textMuted,
    fontSize: 14,
    fontFamily: THEME.fonts.sansMedium,
  },
  panelDivider: {
    height:          1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 0,
  },

  // Items
  item: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            14,
    paddingHorizontal: 22,
    paddingVertical:   16,
    position:       'relative',
  },
  itemActive: {
    backgroundColor: `${THEME.colors.teal}0C`,
  },
  itemAccent: {
    position: 'absolute',
    left:     0,
    top:      8,
    bottom:   8,
    width:    3,
    borderRadius: 2,
    backgroundColor: THEME.colors.teal,
  },
  iconWrap: {
    width:          42,
    height:         42,
    borderRadius:   12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
    flexShrink:     0,
  },
  iconWrapActive: {
    backgroundColor: `${THEME.colors.teal}18`,
  },
  itemIcon:  { fontSize: 20 },
  itemLabel: {
    flex:      1,
    fontSize:  15,
    fontFamily: THEME.fonts.sans,
    color:     THEME.colors.textMuted,
    letterSpacing: 0.2,
  },
  itemLabelActive: {
    color:     THEME.colors.textPrimary,
    fontFamily: THEME.fonts.sansMedium,
  },
  itemChevron: {
    color:    THEME.colors.textMuted,
    fontSize: 18,
    opacity:  0.5,
  },

  // Badge
  badge: {
    position:        'absolute',
    top: -3, right: -6,
    backgroundColor: THEME.colors.teal,
    borderRadius:    8,
    minWidth:        16,
    height:          16,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 3,
    borderWidth:     1.5,
    borderColor:     '#111113',
  },
  badgeText: {
    fontSize:  9,
    fontFamily: THEME.fonts.sansMedium,
    color:     '#0A0A0B',
  },

  // Footer
  panelFooter: {
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  footerText: {
    textAlign:  'center',
    fontSize:   12,
    fontFamily: THEME.fonts.serif,
    color:      `${THEME.colors.teal}50`,
    paddingTop: 14,
    letterSpacing: 1,
  },
});
