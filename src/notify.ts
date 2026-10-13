import * as Notifications from 'expo-notifications';
import { todayCount } from './db';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const BODIES = [
  'Yoncan solmasın. Bugünkü hedefin seni bekliyor.',
  'Birkaç soru çöz, yoncan yeşil kalsın.',
  'Serini koru: günlük hedefini tamamla, yoncan solmasın.',
];
// Tek seferlik bildirimler bu kadar gün ileriye kurulur; uygulama her açıldığında yenilenir (iOS en çok 64 bekleyen bildirim tutar)
const AHEAD = 30;

// Kurulumlar sırayla çalışır: biri 30 bildirimi kurarken araya giren ikinci çağrı çift bildirim bırakmasın
let queue: Promise<unknown> = Promise.resolve();
const serial = <T,>(job: () => Promise<T>): Promise<T> => {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
};

// Seçilen günlerde (1=Pazar … 7=Cumartesi) verilen saatte hatırlatma kurar; öncekileri temizler.
// doneToday: bugünkü hedef tamamsa bugünün bildirimi atlanır. İzin yoksa false döner.
export function scheduleDaily(hour: number, minute: number, days = '1234567', doneToday = false, ask = true): Promise<boolean> {
  return serial(() => schedule(hour, minute, days, doneToday, ask));
}

async function schedule(hour: number, minute: number, days: string, doneToday: boolean, ask: boolean): Promise<boolean> {
  const perm = ask ? await Notifications.requestPermissionsAsync() : await Notifications.getPermissionsAsync();
  if (!perm.granted) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = new Date();
  for (let i = 0; i < AHEAD; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(hour, minute, 0, 0);
    if (d <= now || (i === 0 && doneToday) || !days.includes(String(d.getDay() + 1))) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: 'YDS Rusça', body: BODIES[i % BODIES.length] },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: d },
    });
  }
  return true;
}

// Hatırlatma açıksa bildirimleri bugünkü duruma göre yeniden kurar (izin istemez)
export async function syncReminder(s: { reminder: boolean; hour: number; minute: number; days: string; goal: number }) {
  if (!s.reminder) return;
  const done = (await todayCount()) >= s.goal;
  await scheduleDaily(s.hour, s.minute, s.days, done, false);
}

export function cancelDaily() {
  return serial(() => Notifications.cancelAllScheduledNotificationsAsync());
}
