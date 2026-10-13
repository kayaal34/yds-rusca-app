import { Question, questions } from './data/questions';

// Gerçek YDS'nin bölüm sırası ve 80 soruluk dağılımı (ÖSYM kitapçık düzeni).
// Dilbilgisi bölümü yedi dilbilgisi konusundan karışık gelir.
export const SECTIONS: { name: string; topics: string[]; n: number }[] = [
  { name: 'Kelime bilgisi', topics: ['leksika'], n: 6 },
  { name: 'Dilbilgisi', topics: ['padezh', 'vid', 'dvizh', 'predlog', 'prichastie', 'chislit', 'soyuz'], n: 10 },
  { name: 'Cloze test', topics: ['cloze'], n: 10 },
  { name: 'Cümle tamamlama', topics: ['tamamlama'], n: 10 },
  { name: 'Çeviri', topics: ['ceviri_rt', 'ceviri_tr'], n: 6 },
  { name: 'Okuma', topics: ['paragraf'], n: 20 },
  { name: 'Diyalog tamamlama', topics: ['diyalog'], n: 5 },
  { name: 'Yakın anlamlı cümle', topics: ['yakin_anlam'], n: 4 },
  { name: 'Paragraf tamamlama', topics: ['paragraf_tamamlama'], n: 4 },
  { name: 'Anlam bütünlüğü', topics: ['anlam'], n: 5 },
];

// n soruluk denemede her bölümün payı (80'e oranla, en büyük kalan yöntemiyle; toplam tam n)
export function quotas(n: number): number[] {
  const raw = SECTIONS.map((s) => (s.n * n) / 80);
  const q = raw.map(Math.floor);
  const order = raw.map((r, k) => [r - Math.floor(r), k]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; q.reduce((a, b) => a + b, 0) < n; k++) q[order[k % order.length][1]]++;
  return q;
}

// Önce denemelerde hiç görülmemiş sorular (karışık), sonra en eski görülenler.
// Paragraf soruları paragrafıyla birlikte gelir; bölüm payını aşan grup alınmaz.
// Bir bölümde soru yetmezse eksik kısım diğer bölümlerin kalanlarından, sona eklenerek tamamlanır.
export function buildExam(n: number, pool: Question[] = questions, seen: Map<string, number> = new Map()): Question[] {
  const rank = (q: Question) => seen.get(q.id) ?? -1;
  const sorted = (qs: Question[]) =>
    qs.map((q) => ({ q, r: rank(q), k: Math.random() })).sort((a, b) => a.r - b.r || a.k - b.k).map((x) => x.q);
  // Soruları paragraf gruplarına ayırır; grubun sırası ilk sorusunun sırasıdır
  const groups = (qs: Question[]) => {
    const m = new Map<string, Question[]>();
    for (const q of sorted(qs)) {
      const k = q.passage ? 'p:' + q.passage : 'q:' + q.id;
      m.set(k, [...(m.get(k) ?? []), q]);
    }
    return [...m.values()];
  };
  const used = new Set<string>();
  const out: Question[] = [];
  quotas(n).forEach((want, s) => {
    const sec: Question[] = [];
    const gs = groups(pool.filter((q) => SECTIONS[s].topics.includes(q.topic)));
    for (const g of gs) {
      if (sec.length >= want) break;
      if (sec.length + g.length > want) continue;
      sec.push(...g);
    }
    // Hiçbir grup paya sığmadıysa (ör. 20 soruda 3'lük cloze payı, 4-5'lik metinler) en küçük grup alınır
    if (!sec.length && want > 0 && gs.length) sec.push(...gs.reduce((a, b) => (b.length < a.length ? b : a)));
    sec.forEach((q) => used.add(q.id));
    out.push(...sec);
  });
  // Eksik kalırsa (havuz küçükse) kalan sorulardan tamamla; paragraf grubu bölünmez, taşan kısım kesilmez
  for (const g of groups(pool.filter((q) => !used.has(q.id)))) {
    if (out.length >= n) break;
    if (out.length + g.length > n) continue;
    out.push(...g);
  }
  // Paya sığmayan grup yüzünden fazla geldiyse, en kalabalık bölümlerin tek sorularından düşülür
  const sec = (q: Question) => SECTIONS.findIndex((s) => s.topics.includes(q.topic));
  while (out.length > n) {
    const cnt = new Map<number, number>();
    out.forEach((q) => !q.passage && cnt.set(sec(q), (cnt.get(sec(q)) ?? 0) + 1));
    const big = [...cnt].sort((a, b) => b[1] - a[1])[0];
    if (!big) break;
    out.splice(out.findLastIndex((q) => !q.passage && sec(q) === big[0]), 1);
  }
  // Tamamlayan sorular da kendi bölümüne yerleşsin (sıralama kararlı, paragraf grupları bitişik kalır)
  return out.sort((a, b) => sec(a) - sec(b));
}

// Yarıda kalan denemenin kaydı: soru sırası, şık sırası, cevaplar ve geçen süre
export type Draft = {
  title: string;
  minutes?: number;
  full: boolean;
  keepOrder: boolean;
  ids: string[];
  perms: number[][]; // her sorunun şık sırası (asıl şık indeksleri)
  picks: (number | null)[];
  flags: number[];
  elapsed: number; // saniye
  i: number;
};
