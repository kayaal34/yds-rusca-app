import { questions } from '../src/data/questions';

const roman = /\(I\)[\s\S]*\(II\)[\s\S]*\(III\)/;
const blank = /\(\d\)\s*-{2,}/;
const dialog = /(^|\n)\s*[А-ЯЁA-Z][а-яёa-z]{1,15}\s*:/;
function why(t: string): string[] {
  const r: string[] = [];
  if (t.length > 220) r.push('uzun');
  if (roman.test(t)) r.push('I-V');
  if (blank.test(t)) r.push('(1)---');
  if (dialog.test(t) && /\n/.test(t)) r.push('diyalog');
  return r;
}
const groups = new Map<string, any[]>();
const add = (k: string, q: any, w: string[]) => { if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push({ q, w }); };
for (const q of questions) {
  if (!q.passage) {
    const w = why(q.text);
    if (w.length) add(`${q.source}/${q.exam ?? '-'}/${q.topic} [gömülü]`, q, w);
  } else {
    if (q.passage.trim().length < 40) add(`${q.source}/${q.topic} [kısa passage]`, q, []);
    if (q.text.includes(q.passage.slice(0, 60))) add(`${q.source}/${q.topic} [passage text içinde]`, q, []);
    if (q.text.length > 220) add(`${q.source}/${q.topic} [passage+uzun text]`, q, ['uzun']);
  }
}
for (const [k, v] of [...groups].sort()) {
  console.log(`${k}: ${v.length}`);
  for (const { q, w } of v.slice(0, 2)) console.log('   ', q.id, w.join(','), JSON.stringify(q.text.slice(0, 110)));
}
console.log('toplam', [...groups.values()].reduce((a, v) => a + v.length, 0), '/', questions.length);
