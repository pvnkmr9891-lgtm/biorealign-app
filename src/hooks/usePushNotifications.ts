import { useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export function usePushNotifications() {
  const { user } = useAuth();
  const notificationListener = useRef<any>();
  const responseListener     = useRef<any>();

  useEffect(() => {
    if (!user?.id) return;

    registerForPushNotifications(user.id);

    // Listener for notifications received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push] Received:', notification.request.content.title);
    });

    // Listener for when user taps a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('[Push] Tapped:', data);
      // TODO: navigate to specific screen based on data.screen
    });

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current)     Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [user?.id]);
}

async function registerForPushNotifications(userId: string) {
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

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('[Push] Token:', token);

    // Save token to Supabase profiles
    // Note: you need to add push_token column to profiles table first
    await supabase
      .from('profiles')
      .update({ push_token: token } as any)
      .eq('id', userId);

  } catch (err) {
    console.error('[Push] Token error:', err);
  }
}
