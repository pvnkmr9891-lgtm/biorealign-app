import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// Registers the device's Expo push token onto profiles.push_token for the
// signed-in user (any role — client reminders, coach alerts, admin digest).
// expo-notifications is imported lazily: if the installed binary predates the
// native module, we log and skip instead of crashing the whole bundle.
export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    let subs: { remove: () => void }[] = [];
    let cancelled = false;

    (async () => {
      let Notifications: typeof import('expo-notifications');
      let Device: typeof import('expo-device');
      try {
        Notifications = await import('expo-notifications');
        Device = await import('expo-device');
      } catch (err) {
        console.log('[Push] expo-notifications unavailable in this build', err);
        return;
      }

      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        if (!Device.isDevice) {
          console.log('[Push] Skipping — not a real device (emulator)');
          return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('[Push] Permission denied');
          return;
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'BioRealign',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#00C4B4',
          });
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
        const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
        if (cancelled) return;
        console.log('[Push] Token registered');

        await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);

        subs.push(Notifications.addNotificationReceivedListener((notification) => {
          console.log('[Push] Received:', notification.request.content.title);
        }));
        subs.push(Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data;
          console.log('[Push] Tapped:', data);
        }));
      } catch (err) {
        console.error('[Push] registration error:', err);
      }
    })();

    return () => {
      cancelled = true;
      subs.forEach((s) => s.remove());
      subs = [];
    };
  }, [user?.id]);
}
