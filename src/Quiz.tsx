import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { font, radius, useTheme } from './theme';
import { fmtScore, score, useSettings } from './settings';
import { Clover } from './Logo';
import { Question, questions as allQuestions, topicName } from './data/questions';
import type { Draft } from './exam';
import { favQids, getNote, getReasons, getSetting, markActive, setFav, markSeen, Reason, REASONS, saveAnswer, saveExam, saveReason, setNote, setSetting } from './db';
import { Bar, Btn, Chip, Hero, Icon, ListGroup, Stat, T, useTap } from './ui';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
// Olay işleyicilerinde kullanılır; derleyici kuralı Date.now'u render içinde sanmasın
const now = () => Date.now();
type Prepared = { q: Question; options: string[]; answer: number; perm: number[] };

export function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// Aynı paragrafa bağlı sorular yan yana kalsın diye paragraf gruplarını birlikte karıştırır
function order(qs: Question[]): Question[] {
  const groups = new Map<string, Question[]>();
  for (const q of qs) {
    const k = q.passage ? 'p:' + q.passage : 'q:' + q.id;
    groups.set(k, [...(groups.get(k) ?? []), q]);
  }
  return shuffle([...groups.values()]).flat();
}

function prepare(q: Question, keep: boolean): Prepared {
  // Çıkmış sorularda ve "I..V" gibi sıralı şıklarda şık sırası korunur
  const id = q.options.map((_, i) => i);
  return withPerm(q, keep || q.options.join() === 'I,II,III,IV,V' ? id : shuffle(id));
}

const withPerm = (q: Question, perm: number[]): Prepared => ({ q, perm, options: perm.map((i) => q.options[i]), answer: perm.indexOf(q.answer) });

// Kaydedilmiş soru ve şık sırasından denemeyi yeniden kurar (yarım deneme, geçmiş deneme ayrıntısı)
// Veri güncellemesiyle kalkan sorular atlanır; cevaplar soruyla birlikte süzülür ki kaymasın.
// Şık sayısı değişmişse kayıtlı sıra yerine asıl sıra kullanılır.
export function restore(ids: string[], perms: number[][], picks: (number | null)[] = []): { items: Prepared[]; picks: (number | null)[] } {
  const byId = new Map(allQuestions.map((q) => [q.id, q]));
  const items: Prepared[] = [];
  const out: (number | null)[] = [];
  ids.forEach((id, k) => {
    const q = byId.get(id);
    if (!q) return;
    const id0 = q.options.map((_, i) => i);
    const p = perms[k];
    const ok = Array.isArray(p) && p.length === id0.length && id0.every((i) => p.includes(i));
    items.push(withPerm(q, ok ? p : id0));
    const pk = picks[k];
    out.push(ok && typeof pk === 'number' && pk >= 0 && pk < id0.length ? pk : null);
  });
  return { items, picks: out };
}

export function parseDetail(raw: string | null): { ids: string[]; perms: number[][]; picks: (number | null)[] } | null {
  try {
    const d = raw ? JSON.parse(raw) : null;
    return d && Array.isArray(d.ids) && Array.isArray(d.perms) && Array.isArray(d.picks) ? d : null;
  } catch {
    return null;
  }
}

const DRAFT = 'exam_draft';
export async function loadDraft(): Promise<Draft | null> {
  const raw = await getSetting(DRAFT);
  try { return raw ? (JSON.parse(raw) as Draft) : null; } catch { return null; }
}
export const clearDraft = () => setSetting(DRAFT, '');

const clock = (secs: number) => {
  const s = Math.max(0, secs);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

// keepOrder: soru ve şık sırası olduğu gibi (ÖSYM kitapçığı). inOrder: yalnız soru sırası korunur (bölüm düzenli deneme).
// draft: yarıda bırakılan denemeye devam.
export type QuizProps = { title: string; questions: Question[]; minutes?: number; exam?: boolean; keepOrder?: boolean; inOrder?: boolean; full?: boolean; draft?: Draft; onExit: () => void };

export function Quiz({ title, questions, minutes, exam = false, keepOrder = false, inOrder = false, full = false, draft, onExit }: QuizProps) {
  const { c } = useTheme();
  const { s: st } = useSettings();
  const tap = useTap();
  const restored = useMemo(() => (draft ? restore(draft.ids, draft.perms, draft.picks) : null), [draft]);
  const items = useMemo(
    () => restored?.items ?? (keepOrder || inOrder ? questions : order(questions)).map((q) => prepare(q, keepOrder)),
    [questions, restored]
  );
  const [i, setI] = useState(draft?.i ?? 0);
  const [picks, setPicks] = useState<(number | null)[]>(() => restored?.picks ?? items.map(() => null));
  const [flags, setFlags] = useState<Set<number>>(() => new Set(draft?.flags ?? []));
  const [review, setReview] = useState(false);
  const [done, setDone] = useState(false);
  const [spent, setSpent] = useState(0);
  const [alert, setAlert] = useState<string | null>(null);
  const finished = useRef(false); // çift dokunuşta deneme iki kez kaydedilmesin
  const [started] = useState(() => Date.now() - (draft?.elapsed ?? 0) * 1000);
  const t0 = useRef(0); // soru başına süre; ilk soruda effect ile kurulur
  const scroll = useRef<ScrollView>(null);
  const strip = useRef<ScrollView>(null);

  useEffect(() => { t0.current = Date.now(); }, []);

  // Deneme her cevapta kaydedilir; uygulama kapansa da Deneme sekmesinden kalınan yerden sürer.
  // Süre son kayda kadar sayılır (uygulama kapalıyken işlemez).
  const saveDraft = () => {
    if (!exam || finished.current || picks.every((x) => x === null)) return Promise.resolve();
    const d: Draft = {
      title, minutes, full, keepOrder, i, picks, flags: [...flags],
      ids: items.map((it) => it.q.id), perms: items.map((it) => it.perm),
      elapsed: Math.round((now() - started) / 1000),
    };
    return setSetting(DRAFT, JSON.stringify(d)).catch(() => {});
  };
  useEffect(() => { saveDraft(); }, [picks, flags, i]);
  // Uygulama arka plana geçerken de güncel süreyle kaydedilir (telefon uygulamayı kapatırsa süre kazanılmasın)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'background') saveDraft(); });
    return () => sub.remove();
  });

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  const onAlert = (msg: string) => {
    setAlert(msg);
    tap();
  };

  useEffect(() => {
    // Güncel soru yuvarlağı şeritte ortada kalsın (yuvarlak 34 + boşluk 8)
    strip.current?.scrollTo({ x: Math.max(0, i * 42 - 140), animated: true });
  }, [i]);

  const p = items[i];
  const picked = picks[i];

  function finish() {
    if (finished.current) return;
    finished.current = true;
    setDone(true);
    setReview(false);
    // Arka planda süre dolduysa geçen süre limiti aşmasın
    const raw = Math.round((now() - started) / 1000);
    const secs = minutes ? Math.min(raw, minutes * 60) : raw;
    setSpent(secs);
    const right = items.filter((it, k) => picks[k] === it.answer).length;
    if (exam) {
      // Sınav modunda cevaplar bitişte kaydedilir; boş bırakılanlar istatistiğe girmez
      const answered = picks.filter((x) => x !== null).length;
      const per = Math.round((secs * 1000) / Math.max(1, answered));
      items.forEach((it, k) => picks[k] !== null && saveAnswer(it.q.id, it.q.topic, picks[k] === it.answer, per).catch(() => {}));
      const detail = JSON.stringify({ ids: items.map((it) => it.q.id), perms: items.map((it) => it.perm), picks });
      saveExam(title, right, items.length, secs, full, detail).catch(() => {});
      clearDraft().catch(() => {});
      // Sorular ancak deneme bitince "görüldü" sayılır; yarıda çıkılırsa havuzda yeni kalır
      markSeen(items.map((it) => it.q.id)).catch(() => {});
    }
  }

  const pick = (k: number) => {
    if (!exam && picked !== null) return;
    const next = [...picks];
    next[i] = exam && picked === k ? null : k; // sınavda aynı şıkka tekrar dokununca seçim kalkar
    setPicks(next);
    if (exam) { tap(); return; }
    const ok = k === p.answer;
    tap(ok ? 'success' : 'error');
    saveAnswer(p.q.id, p.q.topic, ok, now() - t0.current).catch(() => {});
  };

  // Soru yuvarlakları için sabit işlev (memo'lu Dot her cevapta yeniden çizilmesin)
  const jump = useCallback((k: number) => {
    setReview(false);
    setI(k);
    t0.current = now();
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const go = (n: number) => {
    if (n >= items.length) return exam ? setReview(true) : finish();
    setReview(false);
    setI(Math.max(0, n));
    t0.current = now();
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const toggleFlag = () => {
    tap();
    setFlags((f) => { const n = new Set(f); n.has(i) ? n.delete(i) : n.add(i); return n; });
  };

  const quit = () => {
    if (done) return onExit();
    if (picks.every((x) => x === null)) {
      if (exam && draft) clearDraft().catch(() => {});
      return onExit();
    }
    if (!exam) {
      return Alert.alert('Çıkılsın mı?', 'Çözdüğün sorular kaydedildi.', [
        { text: 'Devam et', style: 'cancel' },
        { text: 'Çık', style: 'destructive', onPress: onExit },
      ]);
    }
    Alert.alert('Denemeye ara ver?', 'Kaldığın yerden Deneme sekmesinden devam edebilirsin. Süre sen dönene kadar durur.', [
      { text: 'Devam et', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => { clearDraft().catch(() => {}); onExit(); } },
      // Ara verilen gün de çalışılmış sayılır (cevaplar deneme bitince kaydedilir)
      { text: 'Ara ver', onPress: () => { saveDraft().then(() => markActive()).catch(() => {}); onExit(); } },
    ]);
  };

  // Android geri tuşu: kontrol ekranından sorulara döner, sorularda çıkış onayı sorar
  useEffect(() => {
    if (done) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (review) setReview(false);
      else quit();
      return true;
    });
    return () => sub.remove();
  });

  if (done) return <Result title={title} items={items} picks={picks} secs={spent} full={full} exam={exam} onExit={onExit} />;

  const reveal = !exam && picked !== null;

  const top = (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={review ? () => setReview(false) : quit} hitSlop={12} accessibilityLabel={review ? 'Sorulara dön' : 'Çık'} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={review ? 'chevron-left' : 'x'} size={18} color={c.text2} />
        </Pressable>
        {minutes ? (
          <Clock minutes={minutes} started={started} alerts={st.examAlerts} onAlert={onAlert} onEnd={finish} />
        ) : (
          <T v="smallM" color="text2" numberOfLines={1} style={{ flex: 1, textAlign: 'center', marginHorizontal: 12 }}>{title}</T>
        )}
        {exam ? (
          <Pressable onPress={() => { tap(); setReview(!review); }} hitSlop={12} accessibilityLabel="Kontrol ekranı" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: review ? c.primary : c.card, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="grid" size={16} color={review ? c.onPrimary : c.text2} />
          </Pressable>
        ) : (
          <T v="smallM" color="muted" style={{ minWidth: 36, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{i + 1}/{items.length}</T>
        )}
      </View>
      {exam && !review && (
        <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center', paddingVertical: 2 }} style={{ flexGrow: 0 }}>
          {items.map((_, k) => <Dot key={k} n={k + 1} state={k === i ? 'cur' : picks[k] !== null ? 'ans' : 'empty'} flag={flags.has(k)} onPress={jump} />)}
        </ScrollView>
      )}
      {!exam && <Bar value={(i + (picked !== null ? 1 : 0)) / items.length} height={4} />}
      {alert && (
        <Animated.View entering={FadeInUp.duration(250)} exiting={FadeOutUp.duration(250)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primary, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'center' }}>
          <Icon name="bell" size={14} color={c.onPrimary} />
          <T v="smallM" color={c.onPrimary}>{alert}</T>
        </Animated.View>
      )}
    </View>
  );

  if (review) {
    return (
      <View style={{ flex: 1 }}>
        {top}
        <Review items={items} picks={picks} flags={flags} jump={jump} finish={finish} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {top}
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 20, paddingTop: 16, gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View key={p.q.id} entering={FadeIn.duration(220)} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T v="overline" color="muted">{exam ? `Soru ${i + 1} / ${items.length}` : topicName(p.q.topic)}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T v="small" color="muted">{p.q.exam ? `${p.q.exam} · ${p.q.no}` : exam ? topicName(p.q.topic) : 'Süresiz'}</T>
              <FavStar key={p.q.id} qid={p.q.id} />
            </View>
          </View>
          {p.q.passage && (
            <View style={{ backgroundColor: c.panel, borderRadius: radius.btn, padding: 16 }}>
              <T v="reading">{p.q.passage}</T>
            </View>
          )}
          <View style={{ backgroundColor: c.card, borderRadius: radius.card, padding: 16 }}>
            <T v="question">{p.q.text}</T>
          </View>
          <View style={{ gap: 8 }}>
            {p.options.map((o, k) => (
              <Option key={k} k={k} text={o} state={reveal && k === p.answer ? 'right' : reveal && k === picked ? 'wrong' : exam && k === picked ? 'sel' : 'idle'} onPress={() => pick(k)} />
            ))}
          </View>
          {reveal && (
            <Animated.View entering={FadeIn.duration(250)} style={{ gap: 12 }}>
              <View style={{ backgroundColor: c.card, borderRadius: radius.btn, padding: 16, gap: 8 }}>
                <T v="h3" color={picked === p.answer ? 'good' : 'bad'}>{picked === p.answer ? 'Doğru' : `Doğru cevap: ${LETTERS[p.answer]}`}</T>
                {p.q.explanation ? <T v="body" color="text2">{p.q.explanation}</T> : picked !== p.answer ? <T v="body" color="text2">{p.options[p.answer]}</T> : null}
              </View>
              <NoteBox key={p.q.id} qid={p.q.id} />
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
        {exam ? (
          <>
            <Pressable onPress={() => go(i - 1)} disabled={i === 0} accessibilityLabel="Önceki soru" style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: c.muted + '66', alignItems: 'center', justifyContent: 'center', opacity: i === 0 ? 0.35 : 1 }}>
              <Icon name="chevron-left" size={20} color={c.primary} />
            </Pressable>
            <Pressable onPress={toggleFlag} accessibilityLabel={flags.has(i) ? 'İşareti kaldır' : 'Soruyu işaretle'} style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: flags.has(i) ? c.warn : c.muted + '66', backgroundColor: flags.has(i) ? c.warn + '22' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="flag" size={18} color={flags.has(i) ? c.warn : c.primary} />
            </Pressable>
            <Btn title={i + 1 >= items.length ? 'Gözden geçir' : 'Sonraki'} onPress={() => go(i + 1)} style={{ flex: 1 }} />
          </>
        ) : (
          <Btn title={i + 1 >= items.length ? 'Sonucu gör' : 'Devam'} onPress={() => go(i + 1)} disabled={!reveal} style={{ flex: 1 }} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// Kalan süre: başlangıç zamanından hesaplanır (arka planda geçen süre de sayılır). Her saniye yalnız bu bileşen çizilir.
function Clock({ minutes, started, alerts, onAlert, onEnd }: { minutes: number; started: number; alerts: boolean; onAlert: (m: string) => void; onEnd: () => void }) {
  const { c } = useTheme();
  const total = minutes * 60;
  const [left, setLeft] = useState(() => total - Math.floor((Date.now() - started) / 1000));
  const fired = useRef(new Set<number>());
  useEffect(() => {
    const tick = () => setLeft(total - Math.floor((Date.now() - started) / 1000));
    const t = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => { clearInterval(t); sub.remove(); };
  }, [total, started]);
  useEffect(() => {
    if (left <= 0) { onEnd(); return; }
    if (!alerts) return;
    // Yarı süre, 30 dk ve 5 dk kala bir kez uyarır; toplam süreden uzun eşikler atlanır
    for (const [at, msg] of [[Math.floor(total / 2), 'Sürenin yarısı doldu'], [1800, 'Son 30 dakika'], [300, 'Son 5 dakika']] as [number, string][]) {
      if (at < total && left <= at && left > at - 5 && !fired.current.has(at)) {
        fired.current.add(at);
        onAlert(msg);
      }
    }
  }, [left]);
  const low = left < 300;
  return (
    <View accessibilityLabel={`Kalan süre ${clock(left)}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: low ? c.badSoft : c.card, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Icon name="clock" size={14} color={low ? c.bad : c.primary} />
      <T v="smallM" color={low ? 'bad' : 'text'} style={{ fontVariant: ['tabular-nums'] }}>{clock(left)}</T>
    </View>
  );
}

// Soru yuvarlağı: yanıtlı dolu, güncel kalın halkalı, işaretlide turuncu nokta
const Dot = memo(function Dot({ n, state, flag, onPress, size = 34 }: { n: number; state: 'cur' | 'ans' | 'empty'; flag?: boolean; onPress: (k: number) => void; size?: number }) {
  const { c } = useTheme();
  const bg = state === 'ans' ? c.primary : c.card;
  const desc = [state === 'ans' ? 'yanıtlı' : 'boş', flag && 'işaretli'].filter(Boolean).join(', ');
  return (
    <Pressable onPress={() => onPress(n - 1)} hitSlop={5} accessibilityRole="button" accessibilityLabel={`Soru ${n}, ${desc}`} accessibilityState={{ selected: state === 'cur' }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderWidth: state === 'cur' ? 2 : 1, borderColor: state === 'empty' ? c.border : c.primary, alignItems: 'center', justifyContent: 'center' }}>
      <T v="smallM" color={state === 'ans' ? c.onPrimary : state === 'cur' ? 'primary' : 'muted'} style={{ fontSize: size < 30 ? 10 : 11, fontVariant: ['tabular-nums'] }}>{n}</T>
      {flag && <View style={{ position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: c.warn, borderWidth: 1.5, borderColor: c.bg }} />}
    </Pressable>
  );
});

function Option({ k, text, state, onPress }: { k: number; text: string; state: 'idle' | 'sel' | 'right' | 'wrong'; onPress?: () => void }) {
  const { c } = useTheme();
  const bg = { idle: c.card, sel: c.primarySoft, right: c.goodSoft, wrong: c.badSoft }[state];
  const fg = state === 'right' ? c.good : state === 'wrong' ? c.bad : c.text;
  const box = { idle: [c.border, 'transparent', c.muted], sel: [c.primary, c.primary, c.onPrimary], right: [c.good, c.good, c.onPrimary], wrong: [c.bad, 'transparent', c.bad] }[state];
  const said = { idle: '', sel: ', seçili', right: ', doğru cevap', wrong: ', yanlış' }[state];
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={`${LETTERS[k]} şıkkı: ${text}${said}`} accessibilityState={{ selected: state === 'sel', disabled: !onPress }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: bg, borderRadius: radius.btn, paddingHorizontal: 16, paddingVertical: 12, minHeight: 50 }, pressed && state === 'idle' && { opacity: 0.7 }]}>
      <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: box[0], backgroundColor: box[1], alignItems: 'center', justifyContent: 'center' }}>
        {state === 'right' ? <Icon name="check" size={14} color={box[2]} /> : state === 'wrong' ? <Icon name="x" size={14} color={box[2]} /> : <T v="microM" color={box[2]}>{LETTERS[k]}</T>}
      </View>
      <T v="reading" color={fg} style={{ flex: 1 }}>{text}</T>
    </Pressable>
  );
}

// Soruyu favorilere ekler/çıkarır; favoriler ana sayfadan tekrar çözülür
function FavStar({ qid }: { qid: string }) {
  const { c } = useTheme();
  const tap = useTap();
  const [on, setOn] = useState(false);
  useEffect(() => { favQids().then((ids) => setOn(ids.includes(qid))).catch(() => {}); }, [qid]);
  const toggle = () => {
    tap();
    setOn(!on);
    setFav(qid, !on).catch(() => setOn(on));
  };
  return (
    <Pressable onPress={toggle} hitSlop={8} accessibilityRole="button" accessibilityLabel={on ? 'Favorilerden çıkar' : 'Favorilere ekle'} accessibilityState={{ selected: on }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: on ? c.warn : c.border, backgroundColor: on ? c.warn + '22' : c.card }}>
      <Icon name="star" size={15} color={on ? c.warn : c.text2} />
      <T v="chip" color={on ? c.warn : 'text2'}>{on ? 'Favoride' : 'Favori'}</T>
    </Pressable>
  );
}

// Soru altı kısa not; yazmayı bırakınca kaydedilir
function NoteBox({ qid }: { qid: string }) {
  const { c } = useTheme();
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { getNote(qid).then(setText).catch(() => {}); }, [qid]);
  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    if (pending.current === null) return;
    const t = pending.current;
    pending.current = null;
    setNote(qid, t).then(() => setSaved(true)).catch(() => {});
  };
  // Soru değişince ya da ekran kapanınca yazılmamış not kaybolmasın
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (pending.current !== null) setNote(qid, pending.current).catch(() => {});
  }, [qid]);
  const [open, setOpen] = useState(false);
  const change = (t: string) => {
    setText(t);
    setSaved(false);
    pending.current = t;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };
  if (!open && !text) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 4 }}>
        <Icon name="edit-3" size={14} color={c.primary} />
        <T v="smallM" color="primary">Not ekle</T>
      </Pressable>
    );
  }
  return (
    <View style={{ backgroundColor: c.card, borderRadius: radius.btn, paddingHorizontal: 16, paddingVertical: 12, gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="edit-3" size={13} color={c.muted} />
          <T v="overline" color="muted">Notun</T>
        </View>
        {saved && <T v="micro" color="muted">Kaydedildi</T>}
      </View>
      <TextInput
        value={text}
        onChangeText={change}
        onBlur={flush}
        placeholder="Bu soru için kısa bir not yaz"
        autoFocus={open && !text}
        placeholderTextColor={c.muted}
        multiline
        maxLength={280}
        style={{ color: c.text, fontFamily: font.regular, fontSize: 14, minHeight: 22, paddingVertical: 2 }}
      />
    </View>
  );
}

// Göndermeden önce kontrol: tüm sorular yuvarlak olarak, boş ve işaretliler görünür
function Review({ items, picks, flags, jump, finish }: { items: Prepared[]; picks: (number | null)[]; flags: Set<number>; jump: (k: number) => void; finish: () => void }) {
  const { c } = useTheme();
  const answered = picks.filter((x) => x !== null).length;
  const empty = items.length - answered;
  const firstEmpty = picks.findIndex((x) => x === null);
  const firstFlag = [...flags].sort((a, b) => a - b)[0];
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
        <T v="h1">Gözden geçir</T>
        <View style={{ flexDirection: 'row', backgroundColor: c.card, borderRadius: radius.card }}>
          {([[answered, 'Yanıtlı', c.text], [empty, 'Boş', empty ? c.bad : c.text], [flags.size, 'İşaretli', c.text]] as [number, string, string][]).map(([v, l, col], k) => (
            <View key={l} style={[{ flex: 1, alignItems: 'center', paddingVertical: 12 }, k > 0 && { borderLeftWidth: 1, borderLeftColor: c.border }]}>
              <T v="num" color={col}>{v}</T>
              <T v="small" color="muted">{l}</T>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {items.map((_, k) => <Dot key={k} n={k + 1} size={30} state={picks[k] !== null ? 'ans' : 'empty'} flag={flags.has(k)} onPress={jump} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Legend color={c.primary} label="Yanıtlı" />
          <Legend color={c.card} border={c.border} label="Boş" />
          <Legend color={c.warn} label="İşaretli" small />
        </View>
        <T v="small" color="text2">
          {empty ? `${empty} soru boş. Yanlış cevap puan götürmez, boş bırakmak yerine tahmin et. ` : 'Tüm soruları yanıtladın. '}
          Bitirdikten sonra cevaplar değişmez.
        </T>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, gap: 8 }}>
        <Btn title="Sınavı bitir" icon="check" onPress={finish} />
        {firstEmpty >= 0 ? <Btn kind="ghost" title="Boşlara dön" onPress={() => jump(firstEmpty)} /> : firstFlag !== undefined ? <Btn kind="ghost" title="İşaretlilere dön" onPress={() => jump(firstFlag)} /> : null}
      </View>
    </View>
  );
}

function Legend({ color, border, label, small }: { color: string; border?: string; label: string; small?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: small ? 8 : 12, height: small ? 8 : 12, borderRadius: 6, backgroundColor: color, borderWidth: border ? 1 : 0, borderColor: border }} />
      <T v="small" color="muted">{label}</T>
    </View>
  );
}

// readOnly: geçmiş denemeyi yeniden açarken (düğme "Kapat", kutlama titreşimi yok)
export function Result({ title, items, picks, secs, full, exam, onExit, readOnly = false }: { title: string; items: Prepared[]; picks: (number | null)[]; secs: number; full: boolean; exam: boolean; onExit: () => void; readOnly?: boolean }) {
  const { c } = useTheme();
  const { s: st } = useSettings();
  const tap = useTap();
  const [analyze, setAnalyze] = useState(false);
  // Android geri tuşu: analizden sonuca, sonuçtan çıkışa (uygulamadan çıkmasın)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (analyze) setAnalyze(false);
      else onExit();
      return true;
    });
    return () => sub.remove();
  }, [analyze, onExit]);
  const right = items.filter((it, k) => picks[k] === it.answer).length;
  const empty = picks.filter((x) => x === null).length;
  const wrong = items.length - right - empty;
  const missed = items.map((it, k) => ({ it, k })).filter(({ it, k }) => picks[k] !== it.answer);
  // Yanlış ve boşların konulara göre dağılımı
  const byTopic = [...missed.reduce((m, { it }) => m.set(it.q.topic, (m.get(it.q.topic) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const pts = score(right, items.length);
  const hit = full && pts >= st.target;
  useEffect(() => { if (hit && !readOnly) tap('success'); }, []);

  if (analyze) return <Analysis items={missed} picks={picks} onDone={() => setAnalyze(false)} />;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <T v="overline" color="muted" style={{ textAlign: 'center', marginTop: 8 }}>{title}</T>
        <Animated.View entering={FadeIn.duration(300)}>
          <Hero style={{ alignItems: 'center', paddingVertical: 24 }}>
            <T v="small" color="text2">{full ? 'Puan' : 'Doğru'}</T>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <T v="bigL">{full ? fmtScore(right, items.length) : right}</T>
              <T v="h2" color="muted" style={{ marginBottom: 16, fontFamily: font.light }}>/ {full ? 100 : items.length}</T>
            </View>
            <T v="small" color="text2">{full ? `${right} doğru${items.length === 80 ? ' × 1,25' : ` / ${items.length} soru`} · ` : ''}{clock(secs)}</T>
            {full && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <Clover size={22} color={hit ? c.primary : c.muted} weight={1.5} filled={hit} />
                <T v="smallM" color={hit ? 'primary' : 'text2'}>
                  Hedef {st.target} · {hit ? 'hedefine ulaştın' : `${Math.ceil(((st.target - pts) * items.length) / 100)} doğru daha`}
                </T>
              </View>
            )}
          </Hero>
        </Animated.View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat value={right} label="Doğru" color={c.good} />
          <Stat value={wrong} label="Yanlış" color={c.bad} />
          <Stat value={empty} label="Boş" />
        </View>
        {exam && full && <T v="small" color="muted" style={{ textAlign: 'center' }}>Yanlışlar puan götürmez.</T>}
        {byTopic.length > 0 && (
          <>
            <T v="overline" color="muted" style={{ marginTop: 8 }}>Yanlış ve boşlar konulara göre</T>
            <ListGroup>
              {byTopic.slice(0, 6).map(([t, n]) => (
                <View key={t} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 }}>
                  <T v="body">{topicName(t)}</T>
                  <T v="bodyM">{n}</T>
                </View>
              ))}
            </ListGroup>
          </>
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, gap: 8 }}>
        {missed.length > 0 && <Btn title="Yanlışları analiz et" icon="search" onPress={() => setAnalyze(true)} />}
        <Btn kind={missed.length ? 'secondary' : 'primary'} title={readOnly ? 'Kapat' : 'Bitir'} onPress={onExit} />
      </View>
    </View>
  );
}

// Yanlış ve boşları tek tek gezer: senin cevabın, doğrusu, açıklama, neden etiketi ve not
function Analysis({ items, picks, onDone }: { items: { it: Prepared; k: number }[]; picks: (number | null)[]; onDone: () => void }) {
  const { c } = useTheme();
  const [j, setJ] = useState(0);
  const [why, setWhy] = useState<Map<string, Reason>>(new Map());
  useEffect(() => { getReasons(items.map((x) => x.it.q.id)).then(setWhy).catch(() => {}); }, []);
  const { it, k } = items[j];
  const mine = picks[k];
  const choose = (r: Reason) => {
    if (why.get(it.q.id) === r) return;
    setWhy((m) => new Map(m).set(it.q.id, r));
    saveReason(it.q.id, it.q.topic, r).catch(() => {});
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 }}>
        <Pressable onPress={onDone} hitSlop={12} accessibilityLabel="Sonuca dön" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-left" size={18} color={c.text2} />
        </Pressable>
        <T v="overline" color="muted">İnceleme {j + 1} / {items.length}</T>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View key={it.q.id} entering={FadeIn.duration(200)} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Chip label={topicName(it.q.topic)} />
            <Chip label={`Soru ${k + 1}`} />
            <View style={{ flex: 1 }} />
            <FavStar key={it.q.id} qid={it.q.id} />
          </View>
          {it.q.passage && <View style={{ backgroundColor: c.panel, borderRadius: radius.btn, padding: 16 }}><T v="reading">{it.q.passage}</T></View>}
          <View style={{ backgroundColor: c.card, borderRadius: radius.card, padding: 16 }}>
            <T v="question">{it.q.text}</T>
          </View>
          {mine !== null ? <Option k={mine} text={it.options[mine]} state="wrong" /> : <T v="small" color="muted">Bu soruyu boş bıraktın.</T>}
          <Option k={it.answer} text={it.options[it.answer]} state="right" />
          {!!it.q.explanation && (
            <View style={{ backgroundColor: c.card, borderRadius: radius.btn, padding: 16, gap: 4 }}>
              <T v="h3">Neden?</T>
              <T v="body" color="text2">{it.q.explanation}</T>
            </View>
          )}
          {/* Boş bırakılan soruya "neden yanlış" sorulmaz; neden istatistiği yalnız yanlışlardan */}
          {mine !== null && (
            <>
              <T v="overline" color="muted" style={{ marginTop: 4 }}>Neden yanlış yaptın?</T>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {REASONS.map((r) => <Chip key={r.v} label={r.l} on={why.get(it.q.id) === r.v} onPress={() => choose(r.v)} />)}
              </View>
            </>
          )}
          <NoteBox key={it.q.id} qid={it.q.id} />
        </Animated.View>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
        <Btn kind="secondary" title="Önceki" onPress={() => setJ(j - 1)} disabled={j === 0} style={{ flex: 1 }} />
        <Btn title={j + 1 >= items.length ? 'Sonuca dön' : 'Sonraki'} onPress={() => (j + 1 >= items.length ? onDone() : setJ(j + 1))} style={{ flex: 1 }} />
      </View>
    </KeyboardAvoidingView>
  );
}
