// Veri kontrolü: npx tsx scripts/check-data.ts
import { questions, topics } from '../src/data/questions';
import { adjectives, adverbs, lessons, nouns, phrases, verbs } from '../src/data/gen';

const fail: string[] = [];
const ids = new Set<string>();
for (const q of questions) {
  if (ids.has(q.id)) fail.push(`tekrarlanan id: ${q.id}`);
  ids.add(q.id);
  if (q.options.length !== 5 || new Set(q.options).size !== 5) fail.push(`şık hatası: ${q.id}`);
  if (!(q.answer >= 0 && q.answer < 5)) fail.push(`cevap aralık dışı: ${q.id}`);
  if (!topics.some((t) => t.id === q.topic)) fail.push(`bilinmeyen konu: ${q.id}`);
}
// Kelime kartları: alanlar dolu, Rusça alanlarda Latin, Türkçe alanlarda Kiril harf yok
for (const w of [...nouns, ...adjectives, ...adverbs, ...phrases]) {
  if (!w.impf || !w.tr || !w.ex || !w.exTr) fail.push(`kelime alanı boş: ${w.impf}`);
  if (/[a-z]/i.test(w.impf + w.ex) || /[а-яё]/i.test(w.tr + w.exTr)) fail.push(`kelime alanları karışık: ${w.impf}`);
}
console.log(`kelimeler: isim ${nouns.length}, sıfat ${adjectives.length}, zarf ${adverbs.length}, kalıp ${phrases.length}`);
const vk = new Set<string>();
for (const v of verbs) for (const k of new Set([v.impf, v.perf].filter(Boolean))) {
  if (vk.has(k)) fail.push(`tekrarlanan fiil: ${k}`);
  vk.add(k);
}
for (const l of lessons) for (const s of l.sections) for (const e of s.examples) {
  if (/[ğşıİ]/.test(e.ru) || /[а-яё]/i.test(e.tr)) fail.push(`ders örneği alanları karışık: ${l.topic} / ${s.h}`);
}

const by = (src: string) => questions.filter((q) => q.source === src).length;
console.log(`sorular ${questions.length} (özgün ${by('ozgun')}, ösym ${by('osym')}), fiiller ${verbs.length}, dersler ${lessons.length}`);
if (fail.length) {
  console.error(fail.slice(0, 30).join('\n'));
  console.error(`${fail.length} hata`);
  process.exit(1);
}
console.log('veri kontrolü geçti');
