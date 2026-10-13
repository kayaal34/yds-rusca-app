// Deneme kurulum kontrolü: npx tsx scripts/check-exam.ts
import { questions } from '../src/data/questions';
import { buildExam, quotas, SECTIONS } from '../src/exam';

const fail: string[] = [];
for (const n of [20, 40, 80]) {
  if (quotas(n).reduce((a, b) => a + b, 0) !== n) fail.push(`pay toplamı ${n} değil`);
  for (const src of ['all', 'ozgun', 'osym'] as const) {
    const pool = src === 'all' ? questions : questions.filter((q) => q.source === src);
    const seen = new Map<string, number>();
    for (let round = 0; round < 5; round++) {
      const qs = buildExam(n, pool, seen);
      if (qs.length !== n) fail.push(`${src} ${n}: ${qs.length} soru`);
      if (new Set(qs.map((q) => q.id)).size !== qs.length) fail.push(`${src} ${n}: tekrar eden soru`);
      // paragraf grubu bölünmemeli
      const byP = new Map<string, number>();
      for (const q of qs) if (q.passage) byP.set(q.passage, (byP.get(q.passage) ?? 0) + 1);
      for (const [p, k] of byP) if (k !== pool.filter((q) => q.passage === p).length) fail.push(`${src} ${n}: bölünmüş paragraf`);
      // tüm havuzda her bölüm en az bir soruyla temsil edilmeli (ör. 20 soruda cloze)
      if (src === 'all') SECTIONS.forEach((s) => { if (!qs.some((q) => s.topics.includes(q.topic))) fail.push(`all ${n}: ${s.name} yok`); });
      qs.forEach((q) => seen.set(q.id, round));
      if (n === 80 && src === 'all' && round === 0) {
        console.log(SECTIONS.map((s) => `${s.name} ${qs.filter((q) => s.topics.includes(q.topic)).length}/${s.n}`).join(', '));
      }
    }
  }
}
if (fail.length) { console.error([...new Set(fail)].join('\n')); process.exit(1); }
console.log('deneme kontrolü geçti');
