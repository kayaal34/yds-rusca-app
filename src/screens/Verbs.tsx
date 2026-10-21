import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, FadeIn, interpolate, runOnJS, type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { icon as ICON, radius, space, useTheme } from '../theme';
import { Clover } from '../Logo';
import * as Speech from 'expo-speech';
import { adjectives, adverbs, HARD_BASE, hardVerbs, nouns, phrases, Verb, verbs } from '../data/gen';

import { clearVerb, setVerbKnown, verbKnown } from '../db';
import { Bar, Btn, Card, Chip, Header, Icon, IconBtn, Input, T, useTap } from '../ui';
import { useSettings } from '../settings';
import { shuffle } from '../Quiz';

// Kelime kategorileri: sık fiiller, YDS'de çıkabilecek zor fiiller, akademik isimler, sıfatlar ve kalıplar
// Kaydırma eşiği (pt): bunu geçen kart cevaplanır
const SWIPE = 110;
// Sesli okuma: cihazın Rusça sesiyle; ses yoksa sessizce geçer
const say = (t: string) => {
  Speech.stop();
  Speech.speak(t, { language: 'ru-RU', rate: 0.9 });
};

type Cat = 'common' | 'hard' | 'noun' | 'adj' | 'adv' | 'phrase';
const LISTS: Record<Cat, Verb[]> = { common: verbs, hard: hardVerbs, noun: nouns, adj: adjectives, adv: adverbs, phrase: phrases };
const CATS: [Cat, string][] = [['common', 'Fiil'], ['hard', 'Zor fiil'], ['noun', 'İsim'], ['adj', 'Sıfat'], ['adv', 'Zarf'], ['phrase', 'Kalıp']];

export function Verbs() {
  const { c } = useTheme();
  const [known, setKnown] = useState<Map<string, boolean> | null>(null); // null: henüz yüklenmedi
  const [mode, setMode] = useState<'cards' | 'list'>('cards');
  const [round, setRound] = useState(0); // yeni tur başlatınca deste yeniden kurulur
  const [cat, setCat] = useState<Cat>('common');
  const list = LISTS[cat];
  const { s: st } = useSettings();
  useEffect(() => { verbKnown().then(setKnown).catch(() => setKnown(new Map())); }, []);

  // active: kart turunda çalışıldı (seriye sayılır); listede işaretlemek saymaz
  const mark = (w: string, k: boolean, active = true) => {
    setKnown((m) => new Map(m ?? []).set(w, k));
    setVerbKnown(w, k, active).catch((e) => console.warn('Kelime kaydedilemedi', e));
  };
  // Listede işaret kaldırılınca kelime "hiç çalışılmamış" olur (tekrar listesine düşmez)
  const unmark = (w: string) => {
    setKnown((m) => { const n = new Map(m ?? []); n.delete(w); return n; });
    clearVerb(w).catch(() => {});
  };
  const knownCount = list.filter((v) => known?.get(v.impf) === true).length;
  const review = list.filter((v) => known?.get(v.impf) === false).length;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: space.screen, paddingBottom: 4, gap: 12 }}>
        <Header title="Kelimeler" right={<IconBtn name={mode === 'cards' ? 'list' : 'layers'} label={mode === 'cards' ? 'Liste görünümü' : 'Kart görünümü'} onPress={() => setMode(mode === 'cards' ? 'list' : 'cards')} />} />
        {/* Altı kategori dar ekrana sığsın diye kayan çip satırı */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }} style={{ flexGrow: 0, marginHorizontal: -20 }}>
          <View style={{ width: 12 }} />
          {CATS.filter(([v]) => LISTS[v].length > 0).map(([v, l]) => <Chip key={v} label={`${l} · ${LISTS[v].length}`} on={cat === v} onPress={() => { setCat(v); setRound((r) => r + 1); }} />)}
          <View style={{ width: 12 }} />
        </ScrollView>
        {/* Tur boyutu Ayarlar'da */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <T v="h2" style={{ fontVariant: ['tabular-nums'] }}>{knownCount}</T>
            <T v="small" color="text2" style={{ flex: 1 }}>/ {list.length} öğrenildi · {review} tekrarda</T>
          </View>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: c.primary + '24', flexDirection: 'row', overflow: 'hidden' }}>
            <View style={{ width: `${(knownCount / Math.max(1, list.length)) * 100}%`, backgroundColor: c.primary }} />
            <View style={{ width: `${(review / Math.max(1, list.length)) * 100}%`, backgroundColor: c.primary + '70' }} />
          </View>
        </View>
      </View>
      {/* Deste ancak ilerleme yüklendikten sonra kurulur; yoksa öğrenilenler ilk turda yeniden gelir */}
      {!known ? null : mode === 'cards' ? <Cards key={round} list={list} batch={st.verbBatch} known={known} mark={mark} again={() => setRound((r) => r + 1)} /> : <List key={cat} list={list} known={known} mark={(w, k) => (k ? mark(w, true, false) : unmark(w))} />}
    </View>
  );
}

// İki yuvalı deste: i. kart i%2 yuvasında üstte, sıradaki kart diğer yuvada arkada hazır bekler.
// Üstteki kart çıkınca arkadaki zaten yerinde olduğu için yeniden yükleme ve boşluk olmaz.
function Cards({ list, batch, known, mark, again }: { list: Verb[]; batch: number; known: Map<string, boolean>; mark: (w: string, k: boolean) => void; again: () => void }) {
  const { c } = useTheme();
  const tap = useTap();
  // Deste tur başında bir kez kurulur: bilinmeyenlerden en sık kullanılan N kelime (önce tekrardakiler), kendi içinde karışık
  const [deck] = useState(() => {
    const unknown = list.filter((v) => known.get(v.impf) !== true);
    const rev = unknown.filter((v) => known.get(v.impf) === false);
    const fresh = unknown.filter((v) => known.get(v.impf) === undefined);
    return shuffle([...rev, ...fresh].slice(0, batch));
  });
  const [i, setI] = useState(0);
  const [tally, setTally] = useState({ ok: 0, again: 0 });
  const [flipped, setFlipped] = useState(false);
  const flip = useSharedValue(0);
  const txA = useSharedValue(0);
  const txB = useSharedValue(0);
  const topSV = useSharedValue(0); // üstteki yuva (hareket işleyicisi UI tarafında okur)
  const top = i % 2;
  const txTop = top === 0 ? txA : txB;
  const answered = useSharedValue(-1); // kaydırma animasyonu sürerken düğmeye basılırsa aynı kart iki kez sayılmasın

  // Yeni kart üste geçince, ekran dışına giden eski yuva (artık arkada, yeni kelimeyle) ortaya alınır
  useEffect(() => {
    topSV.set(top);
    (top === 0 ? txB : txA).set(0);
  }, [i]);
  useEffect(() => () => { Speech.stop(); }, []);

  const v: Verb | undefined = deck[i];
  const answer = (k: boolean) => {
    if (!v || answered.get() === i) return;
    answered.set(i);
    Speech.stop();
    setFlipped(false);
    tap(k ? 'success' : 'light');
    mark(v.impf, k);
    setTally((t) => (k ? { ...t, ok: t.ok + 1 } : { ...t, again: t.again + 1 }));
    flip.set(0);
    setI(i + 1);
  };
  // Düğmeyle cevapta da kart kayarak çıkar
  const fling = (k: boolean) => {
    if (!v || answered.get() === i) return;
    txTop.set(withTiming(k ? 600 : -600, { duration: 220, easing: Easing.in(Easing.quad) }, (fin) => { if (fin) runOnJS(answer)(k); }));
  };
  const flipCard = () => {
    tap();
    setFlipped(!flipped);
    flip.set(withTiming(flipped ? 0 : 1, { duration: 420, easing: Easing.inOut(Easing.cubic) }));
  };
  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-16, 16])
    .onUpdate((e) => { (topSV.get() === 0 ? txA : txB).set(e.translationX); })
    .onEnd((e) => {
      const t = topSV.get() === 0 ? txA : txB;
      if (Math.abs(e.translationX) > SWIPE) {
        const ok = e.translationX > 0;
        // Hızlı fırlatınca kart daha çabuk çıkar
        const dur = Math.max(140, Math.min(260, 600 / Math.max(1, Math.abs(e.velocityX) / 400)));
        t.set(withTiming(ok ? 600 : -600, { duration: dur }, (fin) => { if (fin) runOnJS(answer)(ok); }));
      } else t.set(withTiming(0, { duration: 220, easing: Easing.out(Easing.back(1.4)) }));
    });
  const tapG = Gesture.Tap().maxDistance(10).onEnd(() => { runOnJS(flipCard)(); });
  const gesture = Gesture.Exclusive(pan, tapG);

  if (!v) {
    return (
      <Animated.View entering={FadeIn} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: space.screen, paddingBottom: 16 }}>
        <Card style={{ alignItems: 'center', gap: 12, padding: 28 }}>
          <View style={{ transform: [{ rotate: '18deg' }] }}>
            <Clover size={48} color={c.primary} weight={1.4} filled={deck.length > 0} />
          </View>
          <T v="h2" style={{ textAlign: 'center' }}>{deck.length ? 'Tur tamamlandı' : 'Bu listenin hepsini öğrendin'}</T>
          <T v="small" color="muted" style={{ textAlign: 'center' }}>
            {deck.length ? `${deck.length} kelime · ${tally.ok} öğrendin · ${tally.again} tekrar` : 'Listeden istediğin kelimeyi tekrar çalışabilirsin.'}
          </T>
          {deck.length > 0 && <Btn title="Yeni tur" onPress={again} style={{ alignSelf: 'stretch', marginTop: 8 }} />}
        </Card>
      </Animated.View>
    );
  }

  // Her yuva kendi kelimesini gösterir: üstteki i, arkadaki i+1
  const slotVerb = (s: number) => deck[s === top ? i : i + 1];

  return (
    <View style={{ flex: 1, paddingHorizontal: space.screen, paddingTop: 12, paddingBottom: 16, gap: 12 }}>
      <View style={{ gap: 6 }}>
        <Bar value={i / Math.max(1, deck.length)} height={2} track={c.primary + '24'} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T v="micro" color="muted">{i + 1} / {deck.length}</T>
          <T v="micro" color="muted">Dokun: çevir · Kaydır: sağa öğrendim, sola tekrar</T>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <GestureDetector gesture={gesture}>
          <View style={{ flex: 1 }}>
            {[0, 1].map((s) => (
              <Slot key={s} v={slotVerb(s)} isTop={s === top} tx={s === 0 ? txA : txB} topTx={txTop} flip={flip} flipped={flipped} />
            ))}
          </View>
        </GestureDetector>
        {/* Ses düğmesi kartın dokunma alanı dışında: basınca kart çevrilmez */}
        <View style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 3 }}>
          <IconBtn name="volume-2" label={flipped ? 'Örneği sesli oku' : 'Sesli oku'} onPress={() => say(flipped ? v.ex : v.impf)} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Btn kind="secondary" title="Tekrar et" icon="rotate-ccw" onPress={() => fling(false)} style={{ flex: 1 }} />
        <Btn title="Öğrendim" icon="check" onPress={() => fling(true)} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

type SV = SharedValue<number>;

function Slot({ v, isTop, tx, topTx, flip, flipped }: { v?: Verb; isTop: boolean; tx: SV; topTx: SV; flip: SV; flipped: boolean }) {
  const { c } = useTheme();
  // Üstteki kart sürüklenir; arkadaki, üstteki uzaklaştıkça büyüyüp öne gelir
  const pos = useAnimatedStyle(() => {
    if (isTop) return { transform: [{ translateX: tx.get() }, { rotate: `${interpolate(tx.get(), [-200, 200], [-8, 8])}deg` }] };
    const p = interpolate(Math.abs(topTx.get()), [0, 260], [0, 1], 'clamp');
    return { transform: [{ translateY: 12 * (1 - p) }, { scale: 0.94 + 0.06 * p }] };
  });
  const front = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: `${interpolate(isTop ? flip.get() : 0, [0, 1], [0, 180])}deg` }], backfaceVisibility: 'hidden' }));
  const back = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: `${interpolate(isTop ? flip.get() : 0, [0, 1], [180, 360])}deg` }], backfaceVisibility: 'hidden' }));
  // Eşiğe yaklaşınca kartın üstünde hangi yöne gittiği belirir
  const hintOk = useAnimatedStyle(() => ({ opacity: isTop ? interpolate(tx.get(), [20, SWIPE], [0, 1], 'clamp') : 0 }));
  const hintAgain = useAnimatedStyle(() => ({ opacity: isTop ? interpolate(tx.get(), [-SWIPE, -20], [1, 0], 'clamp') : 0 }));
  if (!v) return null;
  return (
    <Animated.View
      style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: isTop ? 2 : 1 }, pos]}
      accessible={isTop}
      importantForAccessibility={isTop ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!isTop}
      accessibilityRole="button"
      accessibilityLabel={flipped ? `${v.tr}. ${v.ex}` : v.impf}
      accessibilityHint="Çevirmek için dokun, öğrendim için sağa, tekrar için sola kaydır"
    >
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.card, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }, front]}>
        <View style={{ position: 'absolute', top: 18, left: space.card }}><T v="overline" color="muted">No. {v.r % HARD_BASE}</T></View>
        <T v="word" style={{ textAlign: 'center' }} adjustsFontSizeToFit numberOfLines={v.impf.includes(' ') ? 2 : 1}>{v.impf}</T>
        {!!v.gov && <T v="smallM" color="muted">{v.gov}</T>}
        {!!v.perf && (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <T v="small" color="muted">Mükemmel görünüş</T>
            <T v="h2" color="primary">{v.perf}</T>
          </View>
        )}
      </Animated.View>
      {isTop && (
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.card, overflow: 'hidden' }, back]}>
          <View style={{ flex: 1, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
            <T v="title" color="primary" style={{ textAlign: 'center' }} adjustsFontSizeToFit numberOfLines={3}>{v.tr}</T>
            <View style={{ height: 1, width: 60, backgroundColor: c.primary + '40' }} />
            <T v="readingM" style={{ textAlign: 'center' }}>{v.ex}</T>
            <T v="small" color="text2" style={{ textAlign: 'center' }}>{v.exTr}</T>
          </View>
        </Animated.View>
      )}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }, hintOk]}>
        <Icon name="check" size={ICON.inline} color={c.primary} />
        <T v="chip" color="primary">Öğrendim</T>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 20, left: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.card2, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }, hintAgain]}>
        <Icon name="rotate-ccw" size={ICON.inline} color={c.text2} />
        <T v="chip" color="text2">Tekrar</T>
      </Animated.View>
    </Animated.View>
  );
}

function List({ list, known, mark }: { list: Verb[]; known: Map<string, boolean>; mark: (w: string, k: boolean) => void }) {
  const { c } = useTheme();
  const tap = useTap();
  const [q, setQ] = useState('');
  const data = useMemo(() => {
    // tr-TR: "I" → "ı", "İ" → "i" doğru küçülsün
    const t = q.trim().toLocaleLowerCase('tr-TR');
    if (!t) return list;
    return list.filter((v) => v.impf.includes(t) || v.perf.includes(t) || v.tr.toLocaleLowerCase('tr-TR').includes(t));
  }, [q, list]);
  return (
    <View style={{ flex: 1, paddingHorizontal: space.screen, paddingTop: 12, gap: 12 }}>
      <Input icon="search" value={q} onChangeText={setQ} placeholder="Ara: идти, gitmek" />
      <FlatList
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        data={data}
        extraData={known}
        ListEmptyComponent={<T v="small" color="muted" style={{ textAlign: 'center', marginTop: 24 }}>Sonuç yok. Rusça ya da Türkçe yazmayı dene.</T>}
        keyExtractor={(v) => String(v.r)}
        contentContainerStyle={{ paddingBottom: 32 }}
        initialNumToRender={20}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.border }} />}
        renderItem={({ item: v }) => {
          const k = known.get(v.impf);
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
              <T v="small" color="muted" style={{ width: 36, fontVariant: ['tabular-nums'] }}>{v.r % HARD_BASE}</T>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyM">{v.impf}{v.perf ? `  /  ${v.perf}` : ''}</T>
                <T v="small" color="muted">{v.tr}</T>
              </View>
              {/* Kaydırırken yanlışlıkla değişmesin diye yalnız kutu dokunulabilir */}
              <Pressable onPress={() => { tap(); mark(v.impf, !k); }} hitSlop={10} accessibilityRole="checkbox" accessibilityLabel={`${v.impf} öğrenildi`} accessibilityState={{ checked: !!k }} style={{ width: 24, height: 24, borderRadius: radius.sm, borderWidth: 1.5, borderColor: k ? c.primary : c.border, backgroundColor: k ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {k && <Icon name="check" size={14} color={c.onPrimary} />}
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}
