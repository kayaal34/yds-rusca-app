// iPhone ana ekran widget'larını uygulamadaki verilerle günceller (yalnız iOS; Android'de hiçbir şey yapmaz).
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { hardVerbs, verbs } from '../data/gen';
import { activityDays, dayStr, streak, todayCount } from '../db';
import { daysUntil } from '../settings';

// Günün fiili: tarihten türetilir, aynı gün herkes aynı fiili görür; sık ve zor fiiller sırayla
const pool = [...verbs.slice(0, 600), ...hardVerbs.slice(0, 300)];
export function verbOfDay(d: Date) {
  const n = Math.floor(new Date(dayStr(d) + 'T12:00:00').getTime() / 86400000);
  const v = pool[((n * 7919) % pool.length + pool.length) % pool.length];
  return { word: v.impf, pair: v.perf ? `→ ${v.perf}` : v.gov ?? '', tr: v.tr, ex: v.ex, exTr: v.exTr };
}

export async function syncWidgets(s: { goal: number; examDate: string }) {
  if (Platform.OS !== 'ios' || !requireOptionalNativeModule('ExpoWidgets')) return;
  // Modüller yalnız iOS'ta yüklenir
  const [{ default: Streak }, { default: Verb }] = await Promise.all([import('./StreakWidget'), import('./VerbWidget')]);
  const [str, today, act] = await Promise.all([streak(), todayCount(), activityDays()]);
  // Bugün çalışılmadıysa gece yarısı seri kopar
  const worked = today > 0 || act.has(dayStr());
  const midnight = new Date();
  midnight.setHours(24, 0, 1, 0);
  const days = daysUntil(s.examDate);
  // Gece yarısı yeni gün: bugünkü sayı sıfırlanır; seri, bugün çalışıldıysa yarın da sürer
  Streak.updateTimeline([
    { date: new Date(), props: { streak: str, today, goal: s.goal, days } },
    { date: midnight, props: { streak: worked ? str : 0, today: 0, goal: s.goal, days: Math.max(0, days - 1) } },
  ]);
  // 7 gün ileriye, her gece yarısı yeni fiil
  const entries = Array.from({ length: 7 }, (_, k) => {
    const d = new Date();
    d.setDate(d.getDate() + k);
    if (k > 0) d.setHours(0, 0, 1, 0);
    return { date: d, props: verbOfDay(d) };
  });
  Verb.updateTimeline(entries);
}
