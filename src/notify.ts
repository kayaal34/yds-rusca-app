import * as Notifications from 'expo-notifications';
import { todayCount } from './db';
import { verbOfDay } from './widgets/sync';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const BODIES = [
  'Bugünkü hedefin seni bekliyor.',
  'Birkaç soru çöz, serin devam etsin.',
  'Serini koru: bugünkü hedefini tamamla.',
];
// Tek seferlik bildirimler bu kadar gün ileriye kurulur; uygulama her açıldığında yenilenir (iOS en çok 64 bekleyen bildirim tutar)
const AHEAD = 30;
// Günün kelimesi bildirimleri: 30 hatırlatma + 14 kelime + sınav notları 64 sınırının altında kalır
const WORD_AHEAD = 14;
export type WordTime = { hour: number; minute: number } | null;

// Kurulumlar sırayla çalışır: biri 30 bildirimi kurarken araya giren ikinci çağrı çift bildirim bırakmasın
let queue: Promise<unknown> = Promise.resolve();
const serial = <T,>(job: () => Promise<T>): Promise<T> => {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
};

// Seçilen günlerde (1=Pazar … 7=Cumartesi) verilen saatte hatırlatma kurar; öncekileri temizler.
// doneToday: bugünkü hedef tamamsa bugünün bildirimi atlanır. İzin yoksa false döner.
// examDate: sınava 7 ve 1 gün kala ve sınav sabahı, seçili günlerden bağımsız özel hatırlatma
// daily=false: yalnız sınav hatırlatmaları (7 gün, 1 gün, sınav sabahı) kurulur
// word: her gün o günün kelimesi, verilen saatte (null: kapalı)
export function scheduleDaily(hour: number, minute: number, days = '1234567', doneToday = false, ask = true, examDate?: string, daily = true, word: WordTime = null): Promise<boolean> {
  return serial(() => schedule(hour, minute, days, doneToday, ask, examDate, daily, word));
}

const EXAM_NOTES: Record<number, string> = {
  7: 'Sınava 1 hafta kaldı: bu hafta bir tam deneme çöz, kimliğini ve sınav yerini kontrol et.',
  1: 'Yarın sınav günü. Bugün hafif bir tekrar yap ve erken uyu.',
};

async function schedule(hour: number, minute: number, days: string, doneToday: boolean, ask: boolean, examDate?: string, daily = true, word: WordTime = null): Promise<boolean> {
  const perm = ask ? await Notifications.requestPermissionsAsync() : await Notifications.getPermissionsAsync();
  if (!perm.granted) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = new Date();
  for (let i = 0; i < AHEAD; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(hour, minute, 0, 0);
    const left = examDate ? Math.round((new Date(examDate + 'T12:00:00').getTime() - new Date(d).setHours(12, 0, 0, 0)) / 86400000) : -1;
    if (left === 0) {
      // Sınav sabahı: saat seçiminden bağımsız, erkenden
      const morning = new Date(d);
      morning.setHours(7, 30, 0, 0);
      if (morning > now) await Notifications.scheduleNotificationAsync({ content: { title: 'YDS Rusça', body: 'Bugün sınav günü. Hazırsın, başarılar!' }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: morning } });
      continue;
    }
    const special = EXAM_NOTES[left];
    if (d <= now || (!special && (!daily || (i === 0 && doneToday) || !days.includes(String(d.getDay() + 1))))) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: 'YDS Rusça', body: special ?? BODIES[i % BODIES.length] },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: d },
    });
  }
  if (word) {
    for (let i = 0; i < WORD_AHEAD; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      d.setHours(word.hour, word.minute, 0, 0);
      if (d <= now) continue;
      const v = verbOfDay(d);
      await Notifications.scheduleNotificationAsync({
        content: { title: `Günün kelimesi: ${v.word}`, body: v.ex ? `${v.tr}
${v.ex}` : v.tr },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: d },
      });
    }
  }
  return true;
}

// Hatırlatma açıksa bildirimleri bugünkü duruma göre yeniden kurar (izin istemez)
// Dönen değer: günlük hatırlatma açıkken izin yoksa false (çağıran anahtarı kapatır)
export async function syncReminder(s: { reminder: boolean; hour: number; minute: number; days: string; goal: number; examDate?: string; wordNotif?: boolean; wordHour?: number; wordMinute?: number }): Promise<boolean> {
  const done = (await todayCount()) >= s.goal;
  const word = s.wordNotif ? { hour: s.wordHour ?? 9, minute: s.wordMinute ?? 0 } : null;
  const ok = await scheduleDaily(s.hour, s.minute, s.days, done, false, s.examDate, s.reminder, word);
  return ok || !s.reminder;
}

export function cancelDaily() {
  return serial(() => Notifications.cancelAllScheduledNotificationsAsync());
}
