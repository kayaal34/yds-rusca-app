import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { radius, useTheme } from '../theme';
import { fmtScore, score, useSettings } from '../settings';
import { questions } from '../data/questions';
import { buildExam, Draft, quotas, SECTIONS } from '../exam';
import { clearDraft, loadDraft, parseDetail, restore, Result } from '../Quiz';
import { ExamRow, exams, examSeen, resetSeen } from '../db';
import { Bar, Btn, Card, Header, Hero, Icon, ListGroup, ListItem, Section, Segmented, Slider, T } from '../ui';
import type { Start } from './types';

// YDS: 80 soru 180 dk, yani soru başı 2,25 dk. Alt sınır soru başı 1 dk.
const recommended = (n: number) => Math.round((n * 2.25) / 5) * 5;
const bounds = (n: number) => ({ min: Math.max(5, Math.round(n / 5) * 5), max: Math.round((n * 3.5) / 5) * 5 });

// ÖSYM sınavları ve soruları bir kez gruplanır (veri değişmez)
const OSYM_EXAMS = [...new Set(questions.filter((q) => q.source === 'osym' && q.exam).map((q) => q.exam!))];
const OSYM_BY_EXAM = new Map(OSYM_EXAMS.map((e) => [e, questions.filter((q) => q.exam === e).sort((a, b) => (a.no ?? 0) - (b.no ?? 0))]));

const SOURCES = [
  { v: 'all' as const, l: 'Karma' },
  { v: 'ozgun' as const, l: 'Özgün' },
  { v: 'osym' as const, l: 'ÖSYM' },
];

export function Mock({ start }: { start: Start }) {
  const { c } = useTheme();
  const [hist, setHist] = useState<ExamRow[]>([]);
  const [n, setN] = useState(40);
  const [mins, setMins] = useState(recommended(40));
  const [src, setSrc] = useState<'all' | 'ozgun' | 'osym'>('all');
  const [seen, setSeen] = useState<Map<string, number>>(new Map());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState<ExamRow | null>(null); // ayrıntısı açık geçmiş deneme
  const { s: st } = useSettings();
  useEffect(() => {
    exams().then(setHist).catch(() => {});
    examSeen().then(setSeen).catch(() => {});
    loadDraft().then(setDraft).catch(() => {});
  }, []);

  const b = bounds(n);
  const setCount = (v: number) => { setN(v); setMins(recommended(v)); };
  // ~1400 soru üzerinde süzme: süre kaydırılırken her çizimde tekrarlanmasın
  const { pool, unseen, short, allFresh } = useMemo(() => {
    const pool = src === 'all' ? questions : questions.filter((x) => x.source === src);
    const fresh = pool.filter((x) => !seen.has(x.id));
    // Bölüm bölüm yeterlilik: havuz her bölümün payını karşılıyor mu, görülmemiş sorular yetiyor mu
    const q = quotas(n);
    const inSec = (k: number, qs: { topic: string }[]) => qs.filter((x) => SECTIONS[k].topics.includes(x.topic)).length;
    return {
      pool,
      unseen: fresh.length,
      short: SECTIONS.filter((_, k) => inSec(k, pool) < q[k]).map((s) => s.name),
      allFresh: SECTIONS.every((_, k) => inSec(k, fresh) >= q[k]),
    };
  }, [src, n, seen]);
  const fresh = Math.floor(unseen / n);

  // Yeni deneme her yerde aynı akıştan başlar: yarım deneme varsa silineceği sorulur
  const launch = (go: () => void, confirm?: [string, string]) => {
    const fresh = () => { if (draft) clearDraft().catch(() => {}); go(); };
    if (draft) {
      return Alert.alert('Yarım deneme silinsin mi?', 'Yeni deneme başlarsa yarıda bıraktığın deneme silinir.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Yeni başlat', style: 'destructive', onPress: fresh },
      ]);
    }
    if (confirm) return Alert.alert(confirm[0], confirm[1], [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Başlat', onPress: fresh }]);
    fresh();
  };
  const begin = () => {
    const qs = buildExam(n, pool, seen);
    // Tam puan yalnız havuz her bölümün payını karşılıyorsa (paragraf grupları yüzünden ±1-2 sapma olabilir);
    // bölümü hiç olmayan havuzda (ör. Özgün) doğru sayısı gösterilir
    const full = n === 80 && short.length === 0;
    launch(() => start({ title: full ? 'Tam YDS denemesi' : `Deneme · ${n} soru`, qs, minutes: mins, exam: true, inOrder: true, full }));
  };
  const resume = (d: Draft) => start({ title: d.title, qs: [], minutes: d.minutes, exam: true, keepOrder: d.keepOrder, full: d.full, draft: d });

  if (open?.detail) {
    const d = parseDetail(open.detail);
    const full = open.full === null ? open.total >= 76 : open.full === 1;
    const r = d && restore(d.ids, d.perms, d.picks);
    if (r?.items.length) return <Result title={open.title} items={r.items} picks={r.picks} secs={open.secs} full={full} exam readOnly onExit={() => setOpen(null)} />;
  }
  const fullHist = hist.filter((h) => (h.full === null ? h.total >= 76 : h.full === 1)).slice(0, 10).reverse();
  const clearSeen = () =>
    Alert.alert('Görülen sorular sıfırlansın mı?', 'Denemelerde gördüğün sorular yeniden "görülmemiş" sayılır. Puanların ve geçmiş denemelerin silinmez.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sıfırla', onPress: () => resetSeen().then(() => setSeen(new Map())).catch(() => {}) },
    ]);

  const osymExams = OSYM_EXAMS;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Header title="Deneme" />

      {draft && (
        <View style={{ backgroundColor: c.card, borderRadius: radius.card, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="pause-circle" size={20} color={c.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="h3">Yarım kalan deneme</T>
              <T v="small" color="muted">{draft.title} · {draft.picks.filter((x) => x !== null).length}/{draft.ids.length} yanıtlı{draft.minutes ? ` · ${Math.max(0, draft.minutes - Math.floor(draft.elapsed / 60))} dk kaldı` : ''}</T>
            </View>
          </View>
          <Btn title="Kaldığın yerden devam et" icon="play" onPress={() => resume(draft)} />
          <Btn kind="ghost" title="Yarım denemeyi sil" onPress={() => Alert.alert('Yarım deneme silinsin mi?', 'Cevapların kaydedilmez.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => { clearDraft().catch(() => {}); setDraft(null); } }])} />
        </View>
      )}

      <View style={{ gap: 8 }}>
        <T v="overline" color="muted">Soru sayısı</T>
        <Segmented items={[{ v: 20, l: '20' }, { v: 40, l: '40' }, { v: 80, l: '80 · tam' }]} value={n} onChange={setCount} />
        <T v="small" color="muted">{n === 80 ? 'Gerçek YDS düzeni: 6 kelime, 10 dilbilgisi, 10 cloze, 10 cümle tamamlama, 6 çeviri, 20 okuma, 5 diyalog, 4 yakın anlam, 4 paragraf tamamlama, 5 anlam bütünlüğü. Her doğru 1,25 puan.' : 'YDS bölümleri aynı oranda ve sırada, küçültülmüş. Sonuçta doğru ve yanlış sayın gösterilir.'}</T>
      </View>

      <View style={{ gap: 8 }}>
        <T v="overline" color="muted">Sorular</T>
        <Segmented items={SOURCES} value={src} onChange={setSrc} />
        <View style={{ backgroundColor: c.card, borderRadius: radius.card, padding: 16, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="small" color="text2">Havuzda</T>
            <T v="smallM">{pool.length} soru</T>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="small" color="text2">Denemelerde görmediğin</T>
            <T v="smallM" color={unseen >= n ? 'primary' : 'bad'}>{unseen} soru</T>
          </View>
          <Bar value={unseen / Math.max(1, pool.length)} height={4} />
          <T v="small" color="muted">
            {allFresh ? `Tümü yeni sorulardan. Yaklaşık ${fresh} deneme daha yeni sorularla çözebilirsin.` : 'Bazı bölümlerde yeni soru bitti; o bölümler en eski gördüklerinden tamamlanır.'}
            {short.length ? ` Bu havuzda eksik bölüm var (${short.join(', ')}); eksikler diğer bölümlerden tamamlanır${n === 80 ? ', puan yerine doğru sayısı gösterilir' : ''}.` : ''}
          </T>
          {seen.size > 0 && (
            <Pressable onPress={clearSeen} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
              <T v="smallM" color="primary">Görülenleri sıfırla</T>
            </Pressable>
          )}
        </View>
      </View>

      <Hero style={{ gap: 8, marginTop: 4 }}>
        <T v="overline" color="muted">Süre</T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 }}>
          <T v="big">{mins}</T>
          <T v="body" color="muted" style={{ marginBottom: 12 }}>dk</T>
        </View>
        <Slider value={mins} min={b.min} max={b.max} step={5} onChange={setMins} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T v="small" color="muted">{b.min} dk</T>
          <Pressable onPress={() => setMins(recommended(n))} hitSlop={6}><T v="smallM" color={mins === recommended(n) ? 'muted' : 'primary'}>Önerilen {recommended(n)} dk</T></Pressable>
          <T v="small" color="muted">{b.max} dk</T>
        </View>
      </Hero>

      <Btn title="Denemeyi başlat" onPress={begin} style={{ marginTop: 4 }} />

      {osymExams.length > 0 && (
        <>
          <Section title="ÖSYM çıkmış sınavlar" />
          <ListGroup>
            {osymExams.map((e) => {
              const qs = OSYM_BY_EXAM.get(e) ?? [];
              const m = Math.round(qs.length * 2.25);
              return <ListItem key={e} title={e} sub={`${qs.length} soru · ${m} dk · orijinal sıra`} onPress={() => launch(() => start({ title: e, qs, minutes: m, exam: true, keepOrder: true, full: true }), [e, `${qs.length} soru, ${m} dakika. Süre hemen başlar.`])} />;
            })}
          </ListGroup>
        </>
      )}

      <Section title="Geçmiş denemeler" />
      {fullHist.length >= 2 && (
        <View style={{ backgroundColor: c.card, borderRadius: radius.card, padding: 16, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="small" color="text2">Tam deneme puanların</T>
            <T v="small" color="muted">Hedef {st.target}</T>
          </View>
          <View style={{ height: 96, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            {/* hedef çizgisi */}
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: `${st.target}%`, height: 1, backgroundColor: c.primary + '55' }} />
            {fullHist.map((h) => {
              const p = score(h.right, h.total);
              return <View key={h.id} accessibilityLabel={`${fmtScore(h.right, h.total)} puan`} style={{ flex: 1, height: `${Math.max(4, p)}%`, borderRadius: 6, backgroundColor: p >= st.target ? c.primary : c.primary + '59' }} />;
            })}
          </View>
        </View>
      )}
      {hist.length === 0 && <Card><T v="small" color="muted">Henüz deneme çözmedin. Tamamladığın denemeler burada listelenir.</T></Card>}
      {hist.length > 0 && (
        <ListGroup>
          {hist.map((h) => {
            const full = h.full === null ? h.total >= 76 : h.full === 1;
            return (
              <ListItem
                key={h.id}
                title={h.title}
                sub={`${new Date(h.ts).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} · ${Math.round(h.secs / 60)} dk`}
                right={<T v="numS">{full ? `${fmtScore(h.right, h.total)} puan` : `${h.right}/${h.total}`}</T>}
                disabled={!h.detail}
                onPress={() => setOpen(h)}
              />
            );
          })}
        </ListGroup>
      )}
    </ScrollView>
  );
}
