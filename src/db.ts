import * as SQLite from 'expo-sqlite';
import { hardVerbs, verbs } from './data/gen';

let dbp: Promise<SQLite.SQLiteDatabase> | null = null;

export function db() {
  dbp ??= SQLite.openDatabaseAsync('yds.db').then(async (d) => {
    await d.execAsync(`
      CREATE TABLE IF NOT EXISTS answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        qid TEXT NOT NULL,
        topic TEXT NOT NULL,
        correct INTEGER NOT NULL,
        ms INTEGER NOT NULL,
        day TEXT NOT NULL,
        ts INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        right INTEGER NOT NULL,
        total INTEGER NOT NULL,
        secs INTEGER NOT NULL,
        ts INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS verbs_known (r INTEGER PRIMARY KEY, known INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS verbs_learn (w TEXT PRIMARY KEY, known INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS activity (day TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS exam_seen (qid TEXT PRIMARY KEY, ts INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT);
      CREATE TABLE IF NOT EXISTS notes (qid TEXT PRIMARY KEY, text TEXT NOT NULL, ts INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS favs (qid TEXT PRIMARY KEY, ts INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS answers_qid_ts ON answers (qid, ts);
      CREATE TABLE IF NOT EXISTS day_goal (day TEXT PRIMARY KEY, goal INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS reasons (id INTEGER PRIMARY KEY AUTOINCREMENT, qid TEXT NOT NULL, topic TEXT NOT NULL, reason TEXT NOT NULL, ts INTEGER NOT NULL);
    `);
    // exams.full: tam sınav mı (puan gösterilir). Eski veritabanlarına sütun eklenir.
    const cols = await d.getAllAsync<{ name: string }>('PRAGMA table_info(exams)');
    if (!cols.some((x) => x.name === 'full')) await d.execAsync('ALTER TABLE exams ADD COLUMN full INTEGER');
    // exams.detail: soru, şık sırası ve cevaplar (JSON); geçmiş denemenin ayrıntısı için
    if (!cols.some((x) => x.name === 'detail')) await d.execAsync('ALTER TABLE exams ADD COLUMN detail TEXT');
    // Eski kayıtlar fiilin sıra numarasıyla tutuluyordu; liste değişince kayıyordu. Fiilin kendisine taşı.
    const old = await d.getAllAsync<{ r: number; known: number }>('SELECT r, known FROM verbs_known');
    if (old.length) {
      const byR = new Map([...verbs, ...hardVerbs].map((v) => [v.r, v.impf]));
      for (const o of old) {
        const w = byR.get(o.r);
        if (w) await d.runAsync('INSERT OR IGNORE INTO verbs_learn (w, known) VALUES (?, ?)', [w, o.known]);
      }
      await d.runAsync('DELETE FROM verbs_known');
    }
    return d;
  }).catch((e) => {
    dbp = null; // açılış bir kez hata verdiyse sonraki çağrı yeniden denesin
    throw e;
  });
  return dbp;
}

export const dayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function saveAnswer(qid: string, topic: string, correct: boolean, ms: number) {
  const d = await db();
  await d.runAsync('INSERT INTO answers (qid, topic, correct, ms, day, ts) VALUES (?,?,?,?,?,?)', [
    qid, topic, correct ? 1 : 0, ms, dayStr(), Date.now(),
  ]);
}

export async function saveExam(title: string, right: number, total: number, secs: number, full: boolean, detail: string | null = null) {
  const d = await db();
  await d.runAsync('INSERT INTO exams (title, right, total, secs, ts, full, detail) VALUES (?,?,?,?,?,?,?)', [title, right, total, secs, Date.now(), full ? 1 : 0, detail]);
}

// full: null ise eski kayıt; 76+ soruluk denemeler tam sayılır
export type ExamRow = { id: number; title: string; right: number; total: number; secs: number; ts: number; full: number | null; detail: string | null };
export async function exams(): Promise<ExamRow[]> {
  const d = await db();
  return d.getAllAsync<ExamRow>('SELECT * FROM exams ORDER BY ts DESC');
}

export type TopicStat = { topic: string; total: number; right: number; avgMs: number };
// Konu başarısı her sorunun son cevabına göre (Çalış ekranıyla aynı tanım): total = çözülen farklı soru,
// right = son cevabı doğru olanlar. Süre ortalaması tüm cevaplardan.
export async function topicStats(): Promise<TopicStat[]> {
  const d = await db();
  return d.getAllAsync<TopicStat>(
    `SELECT a.topic, COUNT(*) AS total, SUM(a.correct) AS right,
       (SELECT AVG(ms) FROM answers m WHERE m.topic = a.topic) AS avgMs
     FROM answers a WHERE a.ts = (SELECT MAX(ts) FROM answers b WHERE b.qid = a.qid)
     GROUP BY a.topic`
  );
}

// Her sorunun son cevabı doğru mu (çözülmemiş soru haritada yok)
export async function lastResults(): Promise<Map<string, boolean>> {
  const d = await db();
  const rows = await d.getAllAsync<{ qid: string; correct: number }>(
    'SELECT qid, correct FROM answers a WHERE ts = (SELECT MAX(ts) FROM answers b WHERE b.qid = a.qid) GROUP BY qid'
  );
  return new Map(rows.map((r) => [r.qid, r.correct === 1]));
}

export async function todayCount(): Promise<number> {
  const d = await db();
  const r = await d.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM answers WHERE day = ?', [dayStr()]);
  return r?.n ?? 0;
}

// Son 7 günün çözülen/doğru sayıları (eskiden yeniye)
export async function last7(): Promise<{ day: string; total: number; right: number }[]> {
  const d = await db();
  const rows = await d.getAllAsync<{ day: string; total: number; right: number }>(
    'SELECT day, COUNT(*) AS total, SUM(correct) AS right FROM answers GROUP BY day ORDER BY day DESC LIMIT 30'
  );
  const out = [];
  for (let k = 6; k >= 0; k--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - k);
    const key = dayStr(dt);
    const r = rows.find((x) => x.day === key);
    out.push({ day: key, total: r?.total ?? 0, right: r?.right ?? 0 });
  }
  return out;
}

export async function totals(): Promise<{ total: number; right: number }> {
  const d = await db();
  const r = await d.getFirstAsync<{ total: number; right: number }>('SELECT COUNT(*) AS total, COALESCE(SUM(correct),0) AS right FROM answers');
  return r ?? { total: 0, right: 0 };
}

// Son cevabı yanlış olan soru id'leri
export async function wrongQids(): Promise<string[]> {
  const d = await db();
  const rows = await d.getAllAsync<{ qid: string }>(
    `SELECT qid FROM answers a
     WHERE correct = 0 AND ts = (SELECT MAX(ts) FROM answers b WHERE b.qid = a.qid)
     GROUP BY qid`
  );
  return rows.map((r) => r.qid);
}

// Fiil çalışılan günler (seri ve yonca şeridi için)
export async function activityDays(): Promise<Set<string>> {
  const d = await db();
  const rows = await d.getAllAsync<{ day: string }>('SELECT day FROM activity ORDER BY day DESC LIMIT 60');
  return new Set(rows.map((r) => r.day));
}

// Üst üste soru çözülen gün sayısı (bugün çözülmediyse dünden geriye sayar)
export async function streak(): Promise<number> {
  const d = await db();
  // Soru çözülen ve fiil çalışılan günler birlikte sayılır
  const rows = await d.getAllAsync<{ day: string }>('SELECT DISTINCT day FROM answers UNION SELECT day FROM activity');
  const days = new Set(rows.map((r) => r.day));
  const cur = new Date();
  if (!days.has(dayStr(cur))) cur.setDate(cur.getDate() - 1);
  let n = 0;
  while (days.has(dayStr(cur))) {
    n++;
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}

// Fiil ilerlemesi fiilin kendisiyle (impf) tutulur: true = öğrendim, false = tekrarda
export async function verbKnown(): Promise<Map<string, boolean>> {
  const d = await db();
  const rows = await d.getAllAsync<{ w: string; known: number }>('SELECT w, known FROM verbs_learn');
  return new Map(rows.map((x) => [x.w, x.known === 1]));
}

// active: kart turunda çalışıldıysa gün seriye sayılır (listede kutu işaretlemek saymaz)
export async function setVerbKnown(w: string, known: boolean, active = true) {
  const d = await db();
  await d.runAsync('INSERT OR REPLACE INTO verbs_learn (w, known) VALUES (?, ?)', [w, known ? 1 : 0]);
  if (active) await markActive();
}

// O günün hedefi (geçmiş günler kendi hedefiyle değerlendirilir)
export async function saveDayGoal(goal: number) {
  const d = await db();
  await d.runAsync('INSERT OR REPLACE INTO day_goal (day, goal) VALUES (?, ?)', [dayStr(), goal]);
}

export async function dayGoals(): Promise<Map<string, number>> {
  const d = await db();
  const rows = await d.getAllAsync<{ day: string; goal: number }>('SELECT day, goal FROM day_goal ORDER BY day DESC LIMIT 60');
  return new Map(rows.map((r) => [r.day, r.goal]));
}

// Bugünü çalışılmış gün say (seri için)
export async function markActive() {
  const d = await db();
  await d.runAsync('INSERT OR IGNORE INTO activity (day) VALUES (?)', [dayStr()]);
}

export async function getSetting(k: string): Promise<string | null> {
  const d = await db();
  return (await d.getFirstAsync<{ v: string }>('SELECT v FROM settings WHERE k = ?', [k]))?.v ?? null;
}

export async function getSettings(): Promise<Record<string, string>> {
  const d = await db();
  const rows = await d.getAllAsync<{ k: string; v: string }>('SELECT k, v FROM settings');
  return Object.fromEntries(rows.map((r) => [r.k, r.v]));
}

export async function setSetting(k: string, v: string) {
  const d = await db();
  await d.runAsync('INSERT OR REPLACE INTO settings (k, v) VALUES (?, ?)', [k, v]);
}

// Soru altı kısa not; boş metin notu siler
// Favori sorular (notlar gibi ilerleme sıfırlanınca kalır, "her şeyi sıfırla" ile silinir)
export async function favQids(): Promise<string[]> {
  const d = await db();
  const rows = await d.getAllAsync<{ qid: string }>('SELECT qid FROM favs ORDER BY ts DESC');
  return rows.map((r) => r.qid);
}

export async function setFav(qid: string, on: boolean) {
  const d = await db();
  if (on) await d.runAsync('INSERT OR REPLACE INTO favs (qid, ts) VALUES (?, ?)', [qid, Date.now()]);
  else await d.runAsync('DELETE FROM favs WHERE qid = ?', [qid]);
}

export async function getNote(qid: string): Promise<string> {
  const d = await db();
  return (await d.getFirstAsync<{ text: string }>('SELECT text FROM notes WHERE qid = ?', [qid]))?.text ?? '';
}

export async function setNote(qid: string, text: string) {
  const d = await db();
  if (text.trim()) await d.runAsync('INSERT OR REPLACE INTO notes (qid, text, ts) VALUES (?,?,?)', [qid, text.trim(), Date.now()]);
  else await d.runAsync('DELETE FROM notes WHERE qid = ?', [qid]);
}

// Yanlış analizi: "neden yanlış yaptın" etiketi
export type Reason = 'bilgi' | 'dikkat' | 'sure' | 'tahmin';
export const REASONS: { v: Reason; l: string }[] = [
  { v: 'bilgi', l: 'Bilgi eksiği' },
  { v: 'dikkat', l: 'Dikkatsizlik' },
  { v: 'sure', l: 'Süre' },
  { v: 'tahmin', l: 'Tahmin' },
];

// Bir soru için tek neden tutulur; değiştirilirse eskisi silinir
export async function saveReason(qid: string, topic: string, reason: Reason) {
  const d = await db();
  await d.runAsync('DELETE FROM reasons WHERE qid = ?', [qid]);
  await d.runAsync('INSERT INTO reasons (qid, topic, reason, ts) VALUES (?,?,?,?)', [qid, topic, reason, Date.now()]);
}

export async function getReasons(qids: string[]): Promise<Map<string, Reason>> {
  if (!qids.length) return new Map();
  const d = await db();
  const rows = await d.getAllAsync<{ qid: string; reason: Reason }>(`SELECT qid, reason FROM reasons WHERE qid IN (${qids.map(() => '?').join(',')})`, qids);
  return new Map(rows.map((r) => [r.qid, r.reason]));
}

export async function reasonStats(): Promise<{ reason: Reason; n: number }[]> {
  const d = await db();
  // Sonradan doğru çözülen sorunun nedeni sayılmaz; her sorunun son etiketi, son cevabı yanlışsa
  return d.getAllAsync<{ reason: Reason; n: number }>(
    `SELECT reason, COUNT(*) AS n FROM reasons r
     WHERE r.id = (SELECT MAX(id) FROM reasons x WHERE x.qid = r.qid)
       AND (SELECT correct FROM answers a WHERE a.qid = r.qid ORDER BY ts DESC LIMIT 1) = 0
     GROUP BY reason ORDER BY n DESC`
  );
}

// Ayarlar ve notlar hariç tüm ilerlemeyi siler
export async function resetProgress() {
  const d = await db();
  await d.execAsync(`DELETE FROM answers; DELETE FROM exams; DELETE FROM verbs_known; DELETE FROM verbs_learn; DELETE FROM reasons; DELETE FROM activity; DELETE FROM day_goal; DELETE FROM exam_seen; DELETE FROM settings WHERE k = 'exam_draft';`);
}

// Denemelerde gösterilen sorular: yeni denemede önce hiç görülmeyenler gelir
export async function examSeen(): Promise<Map<string, number>> {
  const d = await db();
  const rows = await d.getAllAsync<{ qid: string; ts: number }>('SELECT qid, ts FROM exam_seen');
  return new Map(rows.map((r) => [r.qid, r.ts]));
}

export async function markSeen(qids: string[]) {
  const d = await db();
  const ts = Date.now();
  await d.withTransactionAsync(async () => {
    for (const q of qids) await d.runAsync('INSERT OR REPLACE INTO exam_seen (qid, ts) VALUES (?, ?)', [q, ts]);
  });
}

export async function resetSeen() {
  const d = await db();
  await d.runAsync('DELETE FROM exam_seen');
}

// Ayarlar ve notlar dahil her şeyi siler (uygulama ilk açılış hâline döner)
export async function resetAll() {
  const d = await db();
  await d.execAsync('DELETE FROM answers; DELETE FROM exams; DELETE FROM verbs_known; DELETE FROM verbs_learn; DELETE FROM reasons; DELETE FROM activity; DELETE FROM exam_seen; DELETE FROM notes; DELETE FROM favs; DELETE FROM day_goal; DELETE FROM settings;');
}
