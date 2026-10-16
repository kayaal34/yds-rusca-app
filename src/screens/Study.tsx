import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { font, icon as ICON, radius, space, useTheme } from '../theme';
import { Question, questions, Topic, topics } from '../data/questions';
import { lessons } from '../data/gen';
import { lastResults } from '../db';
import { Bar, Btn, Card, Chip, Header, Icon, IconBadge, IconBtn, ListGroup, ListItem, Row, Section, T, useTap } from '../ui';
import { shuffle } from '../Quiz';
import type { Start } from './types';

// Açık ders ve bölüm: konu testinden dönünce ekran yeniden kurulsa da kalınan yerden devam edilir
// Dersten teste gidilince işaretlenir; sekmeye başka yoldan dönülünce liste açılır
let resume: { id: string; sec: number } | null = null;
let fromTest = false;
const remember = (r: typeof resume) => { resume = r; };
const leaveForTest = () => { fromTest = true; };
const backHere = () => { const r = fromTest; fromTest = false; return r; };

export function Study({ start }: { start: Start }) {
  const { c } = useTheme();
  const [res, setRes] = useState<Map<string, boolean>>(new Map());
  const [open, setOpenState] = useState<string | null>(() => (backHere() ? resume?.id ?? null : null));
  useEffect(() => { lastResults().then(setRes).catch(() => {}); }, [open]);
  const setOpen = (id: string | null) => {
    remember(id ? { id, sec: 0 } : null);
    setOpenState(id);
  };

  if (open) return <LessonView id={open} start={(x) => { leaveForTest(); start(x); }} back={() => setOpen(null)} />;

  const tactic = lessons.find((l) => l.topic === 'yds_taktik');
  const list = (g: Topic['group']) =>
    topics.filter((t) => t.group === g).map((t) => {
      const pool = pools(questions.filter((q) => q.topic === t.id), res);
      const hasLesson = lessons.some((l) => l.topic === t.id);
      return (
        <Row
          key={t.id}
          icon={t.icon}
          title={t.name}
          subtitle={[hasLesson ? 'Anlatım' : null, `${pool.solved}/${pool.all.length} çözüldü`, pool.solved ? `%${pool.acc} doğru` : null].filter(Boolean).join(' · ')}
          progress={pool.all.length ? pool.solved / pool.all.length : 0}
          onPress={() => setOpen(t.id)}
        />
      );
    });

  return (
    <ScrollView contentContainerStyle={{ padding: space.screen, gap: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Header title="Çalış" />
      {tactic && (
        <Card onPress={() => setOpen('yds_taktik')} style={{ backgroundColor: c.panel, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <IconBadge name="award" />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="h3">{tactic.title}</T>
            <T v="small" color="text2">Soru tipleri, süre yönetimi, eleme yöntemleri</T>
          </View>
          <Icon name="chevron-right" size={ICON.row} color={c.muted} />
        </Card>
      )}
      <Section title="Dilbilgisi" />
      {list('dilbilgisi')}
      <Section title="YDS soru tipleri" />
      {list('yds')}
    </ScrollView>
  );
}

// Konu havuzunun durumu (her sorunun son cevabına göre) ve teste gelecek sıra:
// önce hiç çözmediklerin, sonra yanlışların, en son doğruların; her grup kendi içinde karışık
function pools(all: Question[], res: Map<string, boolean>) {
  const fresh = all.filter((q) => !res.has(q.id));
  const wrong = all.filter((q) => res.get(q.id) === false);
  const right = all.filter((q) => res.get(q.id) === true);
  const solved = wrong.length + right.length;
  return { all, fresh, wrong, right, solved, acc: solved ? Math.round((right.length / solved) * 100) : 0, next: (n: number) => [...shuffle(fresh), ...shuffle(wrong), ...shuffle(right)].slice(0, n) };
}

// Ders metnindeki satırları biçimlendirir: "•" madde, ":" ile biten alt başlık, diğerleri paragraf
// Metindeki Rusça parçalar vurgulu: Türkçe açıklamanın içinde göz önce Rusça biçime takılsın
const CYR = /([А-Яа-яЁё][А-Яа-яЁё\-́]*(?:\s+[А-Яа-яЁё][А-Яа-яЁё\-́]*)*)/;
function Rich({ text, v = 'reading', color = 'text2' }: { text: string; v?: 'reading' | 'small'; color?: 'text2' | 'text' }) {
  const { c } = useTheme();
  return (
    <T v={v} color={color} style={{ flex: 1 }}>
      {text.split(CYR).map((part, k) =>
        k % 2 ? <T key={k} v={v} color="primary" style={{ fontFamily: font.medium }}>{part}</T> : part.split(/(→)/).map((x, j) => (x === '→' ? <T key={`${k}-${j}`} v={v} style={{ color: c.muted }}>  →  </T> : x))
      )}
    </T>
  );
}

// "Etiket: değer" satırı (ör. "Erkek (стол): стол, стола, …"); art arda gelenler tek tablo kartında
const PAIR = /^([^:]{1,48}):\s+(.+)$/;
type Block = { kind: 'pairs'; rows: [string, string][] } | { kind: 'bullet' | 'text'; line: string };

function blocks(text: string): Block[] {
  const out: Block[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = /^[•\-–]\s?/.test(line);
    const m = !bullet && line.match(PAIR);
    if (m) {
      const last = out[out.length - 1];
      if (last?.kind === 'pairs') last.rows.push([m[1], m[2]]);
      else out.push({ kind: 'pairs', rows: [[m[1], m[2]]] });
    } else out.push({ kind: bullet ? 'bullet' : 'text', line: line.replace(/^[•\-–]\s?/, '') });
  }
  return out;
}

function Body({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      {blocks(text).map((b, i) => {
        if (b.kind === 'pairs') {
          return (
            <View key={i} style={{ backgroundColor: c.card, borderRadius: radius.btn, overflow: 'hidden' }}>
              {b.rows.map(([k, v], j) => (
                <View key={j} style={[{ paddingHorizontal: 16, paddingVertical: 12, gap: 4 }, j > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}>
                  <T v="overline" color="muted">{k}</T>
                  <Rich text={v} color="text" />
                </View>
              ))}
            </View>
          );
        }
        if (b.kind === 'bullet') {
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 12, paddingLeft: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary, marginTop: 9 }} />
              <Rich text={b.line} />
            </View>
          );
        }
        return <Rich key={i} text={b.line} />;
      })}
    </View>
  );
}

// Örnek: önce yalnız Rusça görünür, dokununca çevirisi açılır (önce kendin çevirmeyi dene)
function Example({ ru, tr }: { ru: string; tr: string }) {
  const { c } = useTheme();
  const tap = useTap();
  const [shown, setShown] = useState(false);
  return (
    <Pressable onPress={() => { if (!shown) { tap(); setShown(true); } }} accessibilityRole="button" accessibilityHint={shown ? undefined : 'Çeviriyi göster'}
      style={{ backgroundColor: c.panel, borderRadius: radius.btn, padding: 16, gap: 8 }}>
      <T v="readingM">{ru}</T>
      {shown ? (
        <Animated.View entering={FadeIn.duration(220)}><T v="small" color="text2">{tr}</T></Animated.View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="eye" size={13} color={c.muted} />
          <T v="small" color="muted">Önce kendin çevir, sonra dokun</T>
        </View>
      )}
    </Pressable>
  );
}

function LessonView({ id, start, back }: { id: string; start: Start; back: () => void }) {
  // Android geri tuşu ders listesine döner
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => sub.remove();
  }, [back]);
  const { c } = useTheme();
  const lesson = lessons.find((l) => l.topic === id);
  const topic = topics.find((t) => t.id === id);
  const qs = questions.filter((q) => q.topic === id);
  const [res, setRes] = useState<Map<string, boolean>>(new Map());
  useEffect(() => { lastResults().then(setRes).catch(() => {}); }, []);
  const pool = pools(qs, res);
  const name = topic?.name ?? lesson?.title ?? '';
  const [sec, setSecState] = useState(() => (resume?.id === id ? resume.sec : 0));
  const setSec = (n: number) => {
    remember({ id, sec: n });
    setSecState(n);
  };
  const scroll = useRef<ScrollView>(null);
  const tocRef = useRef<ScrollView>(null);
  const total = lesson?.sections.length ?? 0;

  const goSec = (n: number) => {
    setSec(n);
    scroll.current?.scrollTo({ y: 0, animated: true });
    tocRef.current?.scrollTo({ x: Math.max(0, n * 130 - 60), animated: true });
  };

  // Soru havuzu kartı: kaç soru var, kaçı çözüldü, test hangi sorulardan gelecek
  const testBtns = qs.length > 0 && (
    <View style={{ backgroundColor: c.card, borderRadius: radius.card, padding: space.card, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T v="overline" color="muted">Konu testi</T>
        <T v="smallM">{pool.solved}/{qs.length} çözüldü{pool.solved ? ` · %${pool.acc} doğru` : ''}</T>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.card2, flexDirection: 'row', overflow: 'hidden' }}>
        <View style={{ width: `${(pool.right.length / qs.length) * 100}%`, backgroundColor: c.good }} />
        <View style={{ width: `${(pool.wrong.length / qs.length) * 100}%`, backgroundColor: c.bad }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <T v="small" color="text2">Yeni {pool.fresh.length}</T>
        <T v="small" color="text2">Doğru {pool.right.length}</T>
        <T v="small" color="text2">Yanlış {pool.wrong.length}</T>
      </View>
      <T v="small" color="muted">{pool.fresh.length ? 'Önce çözmediklerin, sonra yanlışların gelir' : 'Hepsini çözdün · önce yanlışların gelir'}</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn title={`${Math.min(10, qs.length)} soru`} icon="play" onPress={() => start({ title: name, qs: pool.next(10) })} style={{ flex: 1 }} />
        {pool.wrong.length > 0 && <Btn kind="secondary" title={`Yanlışlar · ${pool.wrong.length}`} onPress={() => start({ title: `${name} · yanlışlar`, qs: shuffle(pool.wrong) })} style={{ flex: 1 }} />}
      </View>
    </View>
  );

  if (!lesson) {
    return (
      <ScrollView contentContainerStyle={{ padding: space.screen, gap: space.gap }}>
        <Header title={topic?.name ?? ''} onBack={back} />
        <Card><T v="body" color="text2">Bu soru tipi için ayrı bir anlatım yok; YDS taktikleri dersinde ele alınıyor. Doğrudan pratik yaparak başlayabilirsin.</T></Card>
        {testBtns}
      </ScrollView>
    );
  }

  const s = lesson.sections[sec];
  const last = sec === total - 1;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Header title={lesson.title} onBack={back} />
        <T v="body" color="muted" style={{ marginTop: -6 }}>{lesson.summary}</T>
        {/* Konu testi en üstte tek satır: dersten önce de görünür; tam kart son bölümde */}
        {qs.length > 0 && (
          <ListGroup>
            <ListItem icon="play-circle" title="Konu testi" sub={`${pool.solved}/${qs.length} çözüldü${pool.solved ? ` · %${pool.acc} doğru` : ''} · 10 soru`} onPress={() => start({ title: name, qs: pool.next(10) })} />
          </ListGroup>
        )}

        <View style={{ gap: 12 }}>
          <Bar value={(sec + 1) / total} height={2} track={c.primary + '24'} />
          <ScrollView ref={tocRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {lesson.sections.map((x, k) => <Chip key={k} label={`${k + 1}. ${x.h}`} on={k === sec} onPress={() => goSec(k)} />)}
          </ScrollView>
        </View>

        <Animated.View key={sec} entering={FadeIn.duration(250)} style={{ gap: 16 }}>
          {/* Bölüm başlığı: büyük ince numara, akılda bölüm sırası kalsın */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <T v="numL" color="primary">{String(sec + 1).padStart(2, '0')}</T>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="overline" color="muted">Bölüm {sec + 1} / {total}</T>
              <T v="title">{s.h}</T>
            </View>
          </View>
          <Body text={s.body} />
          {s.examples.length > 0 && (
            <View style={{ gap: 12 }}>
              <T v="overline" color="muted">Örnekler</T>
              {s.examples.map((e, k) => <Example key={k} ru={e.ru} tr={e.tr} />)}
            </View>
          )}
        </Animated.View>
        {last && testBtns}

      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: space.screen, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg }}>
        <IconBtn name="chevron-left" label="Önceki bölüm" size={52} tone="outline" disabled={sec === 0} onPress={() => goSec(sec - 1)} />
        {last ? (
          qs.length > 0 ? <Btn title="Teste başla" icon="play" onPress={() => start({ title: name, qs: pool.next(10) })} style={{ flex: 1 }} /> : <Btn title="Dersi bitir" onPress={back} style={{ flex: 1 }} />
        ) : (
          <Btn title={`Sonraki: ${lesson.sections[sec + 1].h}`} onPress={() => goSec(sec + 1)} style={{ flex: 1 }} />
        )}
      </View>
    </View>
  );
}
