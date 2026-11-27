import { nextOccurrence } from './recurring';
import { localISO } from './dates';

const notificationId = (ruleId, date) => {
  const text = `${ruleId}:${date}`;
  let hash = 0;
  for (const character of text) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0;
  return hash >>> 1 || 1;
};

export async function requestReminderPermission() {
  if (!window.Capacitor?.isNativePlatform?.())
    throw new Error('Device reminders are available in the Android app.');
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') throw new Error('Notification permission was not granted.');
}

export async function syncRecurringReminders(rules) {
  if (!window.Capacitor?.isNativePlatform?.()) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') return;
  const pending = await LocalNotifications.getPending();
  const old = pending.notifications.filter((item) => item.extra?.kind === 'hisab-recurring');
  if (old.length) await LocalNotifications.cancel({ notifications: old.map(({ id }) => ({ id })) });
  const today = localISO();
  const notifications = rules
    .filter((rule) => rule.active && rule.reminder)
    .flatMap((rule) => {
      const dates = [];
      let cursor = today;
      for (let index = 0; index < 3; index += 1) {
        const date = nextOccurrence(rule, cursor);
        dates.push(date);
        const nextDay = new Date(`${date}T12:00:00`);
        nextDay.setDate(nextDay.getDate() + 1);
        cursor = localISO(nextDay);
      }
      return dates.map((date) => ({
        id: notificationId(rule.id, date),
        title: rule.type === 'income' ? 'Money expected today' : 'Bill due today',
        body: `${rule.description} · Rs. ${Number(rule.amount).toLocaleString('en-PK')}`,
        schedule: { at: new Date(`${date}T09:00:00`), allowWhileIdle: false },
        extra: { kind: 'hisab-recurring', ruleId: rule.id },
      }));
    })
    .filter((item) => item.schedule.at.getTime() > Date.now())
    .slice(0, 60);
  if (notifications.length) await LocalNotifications.schedule({ notifications });
}
