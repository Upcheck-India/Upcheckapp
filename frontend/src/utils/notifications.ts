import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import i18n from '../i18n';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    } as Notifications.NotificationBehavior),
});

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0062C4',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.warn('[Notifications] Push notification permissions not granted');
            return undefined;
        }
        // Learn more about projectId: https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
        // EAS projectId is used here.
        try {
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            if (!projectId) {
                throw new Error('Project ID not found');
            }
            token = (
                await Notifications.getExpoPushTokenAsync({
                    projectId,
                })
            ).data;
        } catch (e: unknown) {
            token = `${e}`;
        }
    } else {
        console.warn('[Notifications] Must use physical device for Push Notifications');
    }

    return token;
}

// ──────────────────────────────────────────────────────────────────────────────
// Daily water-quality reminders (the continuous-data loop)
//
// Three local notifications a day prompt the farmer to log DO / pH / salinity /
// temperature. Those readings feed every engine (via pond-context), so the
// decision quality compounds across the cycle. Local (on-device) scheduling —
// no server needed, works offline.
// ──────────────────────────────────────────────────────────────────────────────

const WQ_REMINDER_TAG = 'wq-reminder';

/** Morning / afternoon / evening slots (24h). Tunable. */
export const WQ_REMINDER_TIMES = [
    { hour: 6, minute: 30, label: 'Morning' },
    { hour: 13, minute: 0, label: 'Afternoon' },
    { hour: 18, minute: 0, label: 'Evening' },
];

/**
 * (Re)schedule the three daily water-quality reminders. Idempotent — cancels
 * any existing reminders first so calling on every app launch won't duplicate.
 */
export async function scheduleDailyWaterQualityReminders(): Promise<void> {
    // ponytail: local scheduled notifications aren't supported on web (expo-notifications
    // throws there); skip rather than let every call log a warning for a platform gap.
    if (Platform.OS === 'web') return;
    try {
        await cancelWaterQualityReminders();
        for (const slot of WQ_REMINDER_TIMES) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: i18n.t('notifications.wqTitle', { slot: slot.label, defaultValue: '{{slot}} water check' }),
                    body: i18n.t('notifications.wqBody', 'Log DO, pH, salinity and temperature so your feed and risk advice stay accurate.'),
                    data: { tag: WQ_REMINDER_TAG, slot: slot.label },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                    hour: slot.hour,
                    minute: slot.minute,
                },
            });
        }
    } catch (e) {
        console.warn('[Notifications] Could not schedule water-quality reminders', e);
    }
}

/** Cancel only the water-quality reminders (leaves other notifications intact). */
export async function cancelWaterQualityReminders(): Promise<void> {
    try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        await Promise.all(
            scheduled
                .filter((n) => (n.content?.data as any)?.tag === WQ_REMINDER_TAG)
                .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
        );
    } catch (e) {
        console.warn('[Notifications] Could not cancel water-quality reminders', e);
    }
}

const CHEM_REMINDER_TAG = 'chem-reminder';

/** Weekday for the weekly chemistry reminder (1 = Sunday … 7 = Saturday). */
export const CHEM_REMINDER = { weekday: 1, hour: 7, minute: 30 };

/**
 * (Re)schedule the weekly chemistry reminder — test-kit values (ammonia,
 * nitrite, nitrate, alkalinity, hardness) the farmer measures periodically, not
 * daily. Idempotent. Logging these raises the engines' data-confidence score.
 */
export async function scheduleWeeklyChemistryReminder(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
        await cancelWeeklyChemistryReminder();
        await Notifications.scheduleNotificationAsync({
            content: {
                title: i18n.t('notifications.chemTitle', 'Weekly chemistry check'),
                body: i18n.t('notifications.chemBody', 'Test ammonia, nitrite, nitrate, alkalinity and hardness — it keeps your feed and disease advice sharp.'),
                data: { tag: CHEM_REMINDER_TAG },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday: CHEM_REMINDER.weekday,
                hour: CHEM_REMINDER.hour,
                minute: CHEM_REMINDER.minute,
            },
        });
    } catch (e) {
        console.warn('[Notifications] Could not schedule weekly chemistry reminder', e);
    }
}

export async function cancelWeeklyChemistryReminder(): Promise<void> {
    try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        await Promise.all(
            scheduled
                .filter((n) => (n.content?.data as any)?.tag === CHEM_REMINDER_TAG)
                .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
        );
    } catch (e) {
        console.warn('[Notifications] Could not cancel weekly chemistry reminder', e);
    }
}
