// iPhone ana ekran widget'larını uygulamadaki verilerle günceller (yalnız iOS; Android'de hiçbir şey yapmaz).
import { Platform } from 'react-native';
import { hardVerbs, verbs } from '../data/gen';
import { dayStr, streak, todayCount } from '../db';
import { daysUntil } from '../settings';

// Günün fiili: tarihten türetilir, aynı gün herkes aynı fiili görür; sık ve zor fiiller sırayla
const pool = [...verbs.slice(0, 600), ...hardVerbs.slice(0, 300)];
export function verbOfDay(d: Date) {
  const n = Math.floor(new Date(dayStr(d) + 'T12:00:00').getTime() / 86400000);
  const v = pool[((n * 7919) % pool.length + pool.length) % pool.length];
  return { word: v.impf, pair: v.perf ? `→ ${v.perf}` : v.gov ?? '', tr: v.tr, ex: v.ex, exTr: v.exTr };
}

export async function syncWidgets(s: { goal: number; examDate: string }) {
  if (Platform.OS !== 'ios') return;
  // Modüller yalnız iOS'ta yüklenir
  const [{ default: Streak }, { default: Verb }] = await Promise.all([import('./StreakWidget'), import('./VerbWidget')]);
  const [str, today] = await Promise.all([streak(), todayCount()]);
  Streak.updateSnapshot({ streak: str, today, goal: s.goal, days: daysUntil(s.examDate) });
  // 7 gün ileriye, her gece yarısı yeni fiil
  const entries = Array.from({ length: 7 }, (_, k) => {
    const d = new Date();
    d.setDate(d.getDate() + k);
    if (k > 0) d.setHours(0, 0, 1, 0);
    return { date: d, props: verbOfDay(d) };
  });
  Verb.updateTimeline(entries);
}
