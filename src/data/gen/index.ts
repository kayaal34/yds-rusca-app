import qa from './q_grammar_a.json';
import qb from './q_grammar_b.json';
import qy from './q_yds_types.json';
import qc from './q_grammar_c.json';
import qma from './q_yds_more_a.json';
import qmb from './q_yds_more_b.json';
import qr from './q_reading.json';
import qrb from './q_reading_b.json';
import lessonsJson from './lessons.json';
import lessonsExtra from './lessons_extra.json';
import v1 from './verbs_1.json';
import v2 from './verbs_2.json';
import v3 from './verbs_3.json';
import h1 from './hard_verbs_1.json';
import h2 from './hard_verbs_2.json';
import h3 from './hard_verbs_3.json';
import h4 from './hard_verbs_4.json';
import h5 from './hard_verbs_5.json';
import h6 from './hard_verbs_6.json';
import wNoun from './words_nouns.json';
import wNoun2 from './words_nouns_2.json';
import wAdv from './words_adverbs.json';
import wAdj from './words_adj.json';
import wPhr from './words_phrases.json';

export type RawQ = { topic: string; text: string; options: string[]; answer: number; explanation?: string; passage?: string };
export type Lesson = { topic: string; title: string; summary: string; sections: { h: string; body: string; examples: { ru: string; tr: string }[] }[] };
export type Verb = { r: number; impf: string; perf: string; tr: string; ex: string; exTr: string; gov?: string };

export const genQuestions: RawQ[] = [...qa, ...qb, ...qy, ...qc, ...qma, ...qmb, ...qr, ...qrb] as RawQ[];
// Ek dersler: okuma, iki yönlü çeviri, bağlantı ifadeleri (cloze)
export const lessons: Lesson[] = [...lessonsJson, ...lessonsExtra] as Lesson[];

// İki liste ayrı üretildiği için aynı fiil iki kez gelebilir: ilkini tut, sırayı yeniden numarala
const seen = new Set<string>();
export const verbs: Verb[] = ([...v1, ...v2, ...v3] as Verb[])
  .filter((v) => {
    const keys = [v.impf, v.perf].filter(Boolean);
    if (keys.some((k) => seen.has(k))) return false;
    keys.forEach((k) => seen.add(k));
    return true;
  })
  // İki görünüşlü fiillerde (экспортировать gibi) perf aynı kelimeyse gösterilmez
  .map((v, i) => ({ ...v, perf: v.perf === v.impf ? '' : v.perf, r: i + 1 }));

// YDS'de çıkmış ya da çıkabilecek zor fiiller (ayrı kategori). Numaralar 10001'den başlar,
// böylece "biliyorum" kayıtları sık fiillerle çakışmaz.
export const HARD_BASE = 10000;
type HardRaw = Omit<Verb, 'r'>;
// Her dosya kendi alanında olasılık sırasına göre; alanlar dönüşümlü dizilir ki ilk kartlar karışık gelsin.
// Dosyalar arası ve sık fiillerle tekrarlar ayıklanır.
const hardFiles = [h1, h2, h3, h4, h5, h6] as HardRaw[][];
const hardSeen = new Set(seen);
const hardList: HardRaw[] = [];
for (let i = 0; i < Math.max(...hardFiles.map((f) => f.length)); i++) {
  for (const f of hardFiles) {
    const v = f[i];
    if (!v) continue;
    const keys = [v.impf, v.perf].filter(Boolean);
    if (keys.some((k) => hardSeen.has(k))) continue;
    keys.forEach((k) => hardSeen.add(k));
    hardList.push(v);
  }
}
export const hardVerbs: Verb[] = hardList.map((v, i) => ({ ...v, perf: v.perf === v.impf ? '' : v.perf, r: HARD_BASE + i + 1 }));

// Fiil dışı kelimeler: YDS'nin kelime soruları ve okuma metinleri için isim, sıfat ve kalıplar.
// Kart ve liste ekranı fiillerle aynı; kelime impf alanına, cinsiyet/kullanım notu gov alanına konur.
// Numara tabanları ayrı ki "öğrendim" kayıtları ve sıra numaraları çakışmasın.
type WordRaw = { w: string; note: string; tr: string; ex: string; exTr: string };
const asCards = (raw: WordRaw[], base: number): Verb[] => {
  const seenW = new Set<string>();
  return raw
    .filter((x) => !seenW.has(x.w) && !!seenW.add(x.w))
    .map((x, i) => ({ r: base + i + 1, impf: x.w, perf: '', gov: x.note, tr: x.tr, ex: x.ex, exTr: x.exTr }));
};
export const nouns: Verb[] = asCards([...wNoun, ...wNoun2] as WordRaw[], 2 * HARD_BASE);
export const adjectives: Verb[] = asCards(wAdj as WordRaw[], 3 * HARD_BASE);
export const phrases: Verb[] = asCards(wPhr as WordRaw[], 4 * HARD_BASE);
export const adverbs: Verb[] = asCards(wAdv as WordRaw[], 5 * HARD_BASE);
