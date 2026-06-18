import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const TOKEN_STORAGE_KEY = 'esfotgo_push_token';

export type NotificationScreen =
  | { type: 'event'; eventId: string }
  | { type: 'chat' }
  | { type: 'tutoria'; tutoriaId: string }
  | { type: 'polibus'; routeId: string }
  | { type: 'default' };

export const NotificationService = {
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('[Notifications] No es dispositivo físico — permisos no disponibles');
      return false;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  async getExpoPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) return null;
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: undefined,
      });
      return token.data;
    } catch (err) {
      console.log('[Notifications] Error obteniendo token:', (err as Error)?.message ?? err);
      return null;
    }
  },

  parseScreenFromData(data: Record<string, unknown>): NotificationScreen | null {
    switch (data?.type) {
      case 'event':   return { type: 'event', eventId: String(data.eventId ?? '') };
      case 'chat':    return { type: 'chat' };
      case 'tutoria': return { type: 'tutoria', tutoriaId: String(data.tutoriaId ?? '') };
      case 'polibus': return { type: 'polibus', routeId: String(data.routeId ?? '') };
      default:        return data?.type ? { type: 'default' } : null;
    }
  },

  setupHandlers(onNotificationTapped: (screen: NotificationScreen) => void) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const tappedSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      const screen = this.parseScreenFromData(data);
      if (screen) onNotificationTapped(screen);
    });

    const foregroundSubscription = Notifications.addNotificationReceivedListener((_notification) => {
      // Foreground: shown by handler above — no additional action needed
    });

    return () => {
      tappedSubscription.remove();
      foregroundSubscription.remove();
    };
  },

  async sendLocal(title: string, body: string, data?: Record<string, unknown>) {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {} },
      trigger: null,
    });
  },
};
