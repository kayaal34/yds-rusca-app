// Demo verisi: uygulamayı "bir aydır kullanılıyor" gibi gösterir (tanıtım, mağaza görüntüsü, cihaz testi).
// Yalnız EXPO_PUBLIC_DEMO=1 ile derlenen sürümde ve veritabanında hiç cevap yokken çalışır.
import { db, dayStr } from './db';
import { questions } from './data/questions';
import { adjectives, hardVerbs, nouns, phrases, verbs } from './data/gen';
import { buildExam } from './exam';

export const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';

// Tekrarlanabilir rastgelelik: her kurulumda aynı demo
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pickN = <T,>(a: T[], n: number) => [...a].sort(() => rnd() - 0.5).slice(0, n);

// Konu başarısı: bazı konular zayıf görünsün ki analiz ekranı anlamlı olsun
const SKILL: Record<string, number> = { padezh: 0.82, vid: 0.58, dvizh: 0.64, predlog: 0.77, prichastie: 0.52, chislit: 0.7, soyuz: 0.8, leksika: 0.68, cloze: 0.66, tamamlama: 0.72, ceviri_rt: 0.85, ceviri_tr: 0.6, paragraf: 0.74, diyalog: 0.83, anlam: 0.62, yakin_anlam: 0.69, paragraf_tamamlama: 0.57 };

export async function seedDemoIfEmpty(): Promise<boolean> {
  const d = await db();
  const has = await d.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM answers');
  if (has && has.n > 0) return false;

  await d.withTransactionAsync(async () => {
    const day0 = new Date();
    const days: string[] = [];
    // Son 30 gün: ilk haftalar aralıklı, son 12 gün kesintisiz (seri 12)
    for (let k = 29; k >= 0; k--) {
      const dt = new Date(day0);
      dt.setDate(dt.getDate() - k);
      if (k > 12 && rnd() < 0.35) continue;
      days.push(dayStr(dt));
    }
    const wrongPool: string[] = [];
    for (const [i, day] of days.entries()) {
      const isToday = i === days.length - 1;
      const n = isToday ? 22 : 12 + Math.floor(rnd() * 30);
      const ts0 = isToday ? Date.now() - n * 45000 : new Date(day + 'T19:00:00').getTime();
      for (const [j, q] of pickN(questions, n).entries()) {
        // Zamanla biraz gelişsin
        const ok = rnd() < (SKILL[q.topic] ?? 0.7) + i * 0.004;
        if (!ok) wrongPool.push(q.id);
        await d.runAsync('INSERT INTO answers (qid, topic, correct, ms, day, ts) VALUES (?,?,?,?,?,?)', [q.id, q.topic, ok ? 1 : 0, 20000 + Math.floor(rnd() * 50000), day, ts0 + j * 45000]);
      }
      await d.runAsync('INSERT OR IGNORE INTO activity (day) VALUES (?)', [day]);
      await d.runAsync('INSERT OR REPLACE INTO day_goal (day, goal) VALUES (?, ?)', [day, 20]);
    }

    // Denemeler: puanlar yükselen 4 tam deneme ve 3 mini deneme, ayrıntılarıyla
    const plan: [number, number, number][] = [[24, 80, 0.58], [20, 40, 0.62], [17, 80, 0.63], [12, 20, 0.7], [9, 80, 0.68], [5, 40, 0.72], [2, 80, 0.74]];
    const seen = new Map<string, number>();
    for (const [ago, n, p] of plan) {
      const qs = buildExam(n, questions, seen);
      const picks = qs.map((q) => (rnd() < p ? q.answer : rnd() < 0.08 ? null : (q.answer + 1 + Math.floor(rnd() * 4)) % q.options.length));
      const right = picks.filter((x, k) => x === qs[k].answer).length;
      const ts = Date.now() - ago * 86400000;
      const detail = JSON.stringify({ ids: qs.map((q) => q.id), perms: qs.map((q) => q.options.map((_, i) => i)), picks });
      await d.runAsync('INSERT INTO exams (title, right, total, secs, ts, full, detail) VALUES (?,?,?,?,?,?,?)', [n === 80 ? 'Tam YDS denemesi' : `Mini deneme · ${n} soru`, right, n, Math.round(n * 2.1 * 60), ts, n === 80 ? 1 : 0, detail]);
      for (const q of qs) {
        seen.set(q.id, ts);
        await d.runAsync('INSERT OR REPLACE INTO exam_seen (qid, ts) VALUES (?, ?)', [q.id, ts]);
      }
    }

    // Kelimeler: sık fiillerin çoğu, diğer kategorilerin bir kısmı öğrenilmiş; bir kısmı tekrarda
    const learn = async (list: { impf: string }[], known: number, review: number) => {
      for (const [k, v] of list.entries()) {
        if (k < known) await d.runAsync('INSERT OR REPLACE INTO verbs_learn (w, known) VALUES (?, 1)', [v.impf]);
        else if (k < known + review) await d.runAsync('INSERT OR REPLACE INTO verbs_learn (w, known) VALUES (?, 0)', [v.impf]);
      }
    };
    await learn(verbs, 184, 36);
    await learn(hardVerbs, 62, 25);
    await learn(nouns, 95, 20);
    await learn(adjectives, 48, 15);
    await learn(phrases, 30, 12);

    // Favoriler, notlar ve yanlış nedenleri
    for (const [k, q] of pickN(questions.filter((x) => x.source === 'ozgun'), 9).entries()) {
      await d.runAsync('INSERT OR REPLACE INTO favs (qid, ts) VALUES (?, ?)', [q.id, Date.now() - k * 3600000]);
    }
    const notes = ['Hareket fiili: идти tek yön, ходить gidip gelme.', 'Bağlaç tuzağı: хотя ile несмотря на karıştırma.', 'Sıfat-fiil sonu -щий: şimdiki zaman, etken.'];
    for (const [k, q] of pickN(questions, 3).entries()) {
      await d.runAsync('INSERT OR REPLACE INTO notes (qid, text, ts) VALUES (?, ?, ?)', [q.id, notes[k], Date.now()]);
    }
    const reasons = ['bilgi', 'dikkat', 'sure', 'tahmin'];
    for (const qid of pickN([...new Set(wrongPool)], 18)) {
      const q = questions.find((x) => x.id === qid);
      if (q) await d.runAsync('INSERT INTO reasons (qid, topic, reason, ts) VALUES (?,?,?,?)', [qid, q.topic, reasons[Math.floor(rnd() * reasons.length)], Date.now()]);
    }

    // Profil: tanıtım tamamlanmış
    const set = (k: string, v: string) => d.runAsync('INSERT OR REPLACE INTO settings (k, v) VALUES (?, ?)', [k, v]);
    await set('onboarded', '1');
    await set('name', 'Yahya');
    await set('goal', '20');
    await set('target', '75');
  });
  return true;
}
