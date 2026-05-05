import { useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Animated, Dimensions, StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { THEME } from '@/constants/theme';
import { useClientUnreadCount } from '@/hooks/useCoach';
import { TAB_ICON_MAP } from '@/components/ui/NeonTabIcons';

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { name: 'index',        label: 'Home',     icon: '🏠', route: '/(client)/' },
  { name: 'workout-plan', label: 'Workout',  icon: '💪', route: '/(client)/workout-plan' },
  { name: 'checkin',      label: 'Check-in', icon: '✅', route: '/(client)/checkin' },
  { name: 'progress',     label: 'Progress', icon: '📊', route: '/(client)/progress' },
  { name: 'programs',     label: 'Programs', icon: '🎯', route: '/(client)/programs' },
  { name: 'my-plan',      label: 'My Plan',  icon: '📋', route: '/(client)/my-plan' },
  { name: 'messages',     label: 'Messages', icon: '💬', route: '/(client)/messages', badge: true },
  { name: 'profile',      label: 'Profile',  icon: '👤', route: '/(client)/profile' },
];

// Screens where the tab bar should hide completely
const HIDDEN_SCREENS = ['workout-player', 'workout-interval', 'content/player'];

// ── Device detection ──────────────────────────────────────────────────────────
function useDeviceType() {
  const { width } = useWindowDimensions();
  if (width >= 768) return 'ipad';
  if (width >= 480) return 'tablet';
  return 'phone';
}

// ── Phone tab bar — 4 visible + peek + slide ──────────────────────────────────
const PHONE_TAB_W   = 72;
const PHONE_VISIBLE = 4;
const PEEK_W        = 22;
const PHONE_DOCK_W  = PHONE_TAB_W * PHONE_VISIBLE + PEEK_W;

function PhoneTabBar({ unreadCount }: { unreadCount: number }) {
  const router    = useRouter();
  const pathname  = usePathname();
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const [showMore, setShowMore] = useState(true);

  const isActive = useCallback((tab: typeof TABS[0]) => {
    if (tab.name === 'index') return pathname === '/' || pathname === '/(client)';
    return pathname.includes(tab.name);
  }, [pathname]);

  const handleScroll = (e: any) => {
    const x       = e.nativeEvent.contentOffset.x;
    const hasMore = x < (TABS.length - PHONE_VISIBLE) * PHONE_TAB_W - 10;
    if (hasMore !== showMore) {
      setShowMore(hasMore);
      Animated.timing(fadeAnim, { toValue: hasMore ? 1 : 0, duration: 200, useNativeDriver: true }).start();
    }
  };

  return (
    <View style={phoneStyles.wrapper}>
      <View style={phoneStyles.dock}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={PHONE_TAB_W}
          snapToAlignment="start"
          contentContainerStyle={{ paddingRight: 8 }}
          style={{ flex: 1 }}
        >
          {TABS.map(tab => {
            const active   = isActive(tab);
            const hasBadge = tab.badge && unreadCount > 0;
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => router.push(tab.route as any)}
                activeOpacity={0.7}
                style={[phoneStyles.tabItem, active && phoneStyles.tabItemActive]}
              >
                {active && <View style={phoneStyles.activeGlow} />}
                <View style={{ position: 'relative' }}>
                  {(() => {
                    const IconComp = TAB_ICON_MAP[tab.name];
                    return IconComp ? <IconComp active={active} size={26} /> : <Text style={{ fontSize: 22, opacity: active ? 1 : 0.4 }}>{tab.icon}</Text>;
                  })()}
                  {hasBadge && (
                    <View style={phoneStyles.badge}>
                      <Text style={phoneStyles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={[phoneStyles.tabLabel, active && phoneStyles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {active && <View style={phoneStyles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Peek indicator */}
        <Animated.View style={[phoneStyles.peekIndicator, { opacity: fadeAnim }]} pointerEvents="none">
          <View style={phoneStyles.peekGradient} />
          <View style={phoneStyles.peekArrow}>
            <Text style={phoneStyles.peekArrowText}>›</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

// ── Tablet / iPad tab bar — all tabs visible ──────────────────────────────────
function TabletTabBar({ unreadCount, isIPad }: { unreadCount: number; isIPad: boolean }) {
  const router   = useRouter();
  const pathname = usePathname();

  const tabW     = isIPad ? 88 : 76;
  const dockW    = tabW * TABS.length;
  const iconSize = isIPad ? 26 : 22;
  const labelSz  = isIPad ? 11 : 9;
  const dockH    = isIPad ? 80 : 72;

  const isActive = useCallback((tab: typeof TABS[0]) => {
    if (tab.name === 'index') return pathname === '/' || pathname === '/(client)';
    return pathname.includes(tab.name);
  }, [pathname]);

  return (
    <View style={[tabletStyles.wrapper, { bottom: Platform.OS === 'ios' ? 28 : 16 }]}>
      <View style={[tabletStyles.dock, { width: Math.min(dockW, Dimensions.get('window').width - 32), height: dockH }]}>
        {TABS.map(tab => {
          const active   = isActive(tab);
          const hasBadge = tab.badge && unreadCount > 0;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => router.push(tab.route as any)}
              activeOpacity={0.7}
              style={[tabletStyles.tabItem, { width: tabW }]}
            >
              {active && (
                <View style={[tabletStyles.activeGlow, { backgroundColor: `${THEME.colors.teal}18` }]} />
              )}
              <View style={{ position: 'relative' }}>
                <Text style={{ fontSize: iconSize, opacity: active ? 1 : 0.4, transform: active ? [{ scale: 1.1 }] : [] }}>
                  {tab.icon}
                </Text>
                {hasBadge && (
                  <View style={tabletStyles.badge}>
                    <Text style={tabletStyles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={{
                fontSize: labelSz,
                fontFamily: 'DMSans_500Medium',
                color: active ? THEME.colors.teal : 'rgba(255,255,255,0.35)',
                marginTop: 2,
                letterSpacing: 0.3,
              }}>
                {tab.label}
              </Text>
              {active && <View style={tabletStyles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function SlidingTabBar() {
  const pathname              = usePathname();
  const deviceType            = useDeviceType();
  const { data: unreadCount = 0 } = useClientUnreadCount();

  // Hide on full-screen screens
  if (HIDDEN_SCREENS.some(s => pathname.includes(s))) return null;

  if (deviceType === 'phone') {
    return <PhoneTabBar unreadCount={unreadCount} />;
  }

  return <TabletTabBar unreadCount={unreadCount} isIPad={deviceType === 'ipad'} />;
}

// ── Phone styles ──────────────────────────────────────────────────────────────
const phoneStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 16,
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  dock: {
    width: PHONE_DOCK_W,
    height: 72,
    backgroundColor: 'rgba(18, 18, 20, 0.93)',
    borderRadius: 36,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
  },
  tabItem: {
    width: PHONE_TAB_W,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 28,
    position: 'relative',
  },
  tabItemActive: {},
  activeGlow: {
    position: 'absolute',
    top: 6, left: 8, right: 8, bottom: 6,
    borderRadius: 24,
    backgroundColor: `${THEME.colors.teal}18`,
  },
  tabIcon:        { fontSize: 22, opacity: 0.4 },
  tabIconActive:  { opacity: 1, transform: [{ scale: 1.12 }] },
  tabLabel:       { fontSize: 9, fontFamily: 'DMSans_500Medium', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.3 },
  tabLabelActive: { color: THEME.colors.teal },
  activeDot:      { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: THEME.colors.teal },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: THEME.colors.teal, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: 'rgba(18,18,20,0.9)',
  },
  badgeText: { fontSize: 9, fontFamily: 'DMSans_500Medium', color: '#0A0A0B' },
  peekIndicator: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  peekGradient: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(18,18,20,0.88)',
    borderTopRightRadius: 36, borderBottomRightRadius: 36,
  },
  peekArrow: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: `${THEME.colors.teal}30`,
    borderWidth: 1, borderColor: `${THEME.colors.teal}60`,
    alignItems: 'center', justifyContent: 'center',
  },
  peekArrowText: { fontSize: 14, color: THEME.colors.teal, fontFamily: 'DMSans_500Medium' },
});

// ── Tablet styles ─────────────────────────────────────────────────────────────
const tabletStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 20, 0.93)',
    borderRadius: 40,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  activeGlow: {
    position: 'absolute',
    top: 6, left: 8, right: 8, bottom: 6,
    borderRadius: 24,
  },
  activeDot: {
    position: 'absolute', bottom: 5,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: THEME.colors.teal,
  },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: THEME.colors.teal, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: 'rgba(18,18,20,0.9)',
  },
  badgeText: { fontSize: 9, fontFamily: 'DMSans_500Medium', color: '#0A0A0B' },
});
