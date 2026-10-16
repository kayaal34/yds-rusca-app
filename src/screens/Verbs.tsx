import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { font, radius, useTheme } from '../theme';
import { adjectives, adverbs, HARD_BASE, hardVerbs, nouns, phrases, Verb, verbs } from '../data/gen';

import { setVerbKnown, verbKnown } from '../db';
import { Btn, Card, Chip, Header, Icon, Segmented, T, useTap } from '../ui';
import { useSettings } from '../settings';
import { shuffle } from '../Quiz';

// Kelime kategorileri: sık fiiller, YDS'de çıkabilecek zor fiiller, akademik isimler, sıfatlar ve kalıplar
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
    setVerbKnown(w, k, active).catch((e) => console.warn('Fiil kaydedilemedi', e));
  };
  const knownCount = list.filter((v) => known?.get(v.impf) === true).length;
  const review = list.filter((v) => known?.get(v.impf) === false).length;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 20, paddingBottom: 4, gap: 12 }}>
        <Header title="Kelimeler" />
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
        <Segmented items={[{ v: 'cards' as const, l: 'Kartlar' }, { v: 'list' as const, l: 'Liste' }]} value={mode} onChange={setMode} />
      </View>
      {/* Deste ancak ilerleme yüklendikten sonra kurulur; yoksa öğrenilenler ilk turda yeniden gelir */}
      {!known ? null : mode === 'cards' ? <Cards key={round} list={list} batch={st.verbBatch} known={known} mark={mark} again={() => setRound((r) => r + 1)} /> : <List key={cat} list={list} known={known} mark={(w, k) => mark(w, k, false)} />}
    </View>
  );
}

function Cards({ list, batch, known, mark, again }: { list: Verb[]; batch: number; known: Map<string, boolean>; mark: (w: string, k: boolean) => void; again: () => void }) {
  const { c } = useTheme();
  const tap = useTap();
  // Deste tur başında bir kez kurulur: bilinmeyenlerden en sık kullanılan N fiil (önce tekrardakiler), kendi içinde karışık
  const [deck] = useState(() => {
    const unknown = list.filter((v) => known.get(v.impf) !== true);
    const rev = unknown.filter((v) => known.get(v.impf) === false);
    const fresh = unknown.filter((v) => known.get(v.impf) === undefined);
    return shuffle([...rev, ...fresh].slice(0, batch));
  });
  const [i, setI] = useState(0);
  const flip = useSharedValue(0);

  const front = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }], backfaceVisibility: 'hidden' }));
  const back = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }], backfaceVisibility: 'hidden' }));

  const v: Verb | undefined = deck[i];
  const answer = (k: boolean) => {
    if (!v) return;
    tap(k ? 'success' : 'light');
    mark(v.impf, k);
    flip.set(0);
    setI(i + 1);
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, gap: 12 }}>
      {!v ? (
        <Animated.View entering={FadeIn} style={{ flex: 1, justifyContent: 'center' }}>
          <Card style={{ alignItems: 'center', gap: 12, padding: 28 }}>
            <Icon name="check-circle" size={36} color={c.good} />
            <T v="h2" style={{ textAlign: 'center' }}>{deck.length ? 'Tur tamamlandı' : 'Tüm fiilleri öğrendin'}</T>
            <T v="small" color="muted" style={{ textAlign: 'center' }}>{deck.length ? `${deck.length} fiil gözden geçti. Yeni turda sıradaki fiiller gelir.` : 'Listeden istediğin fiili tekrar çalışabilirsin.'}</T>
            {deck.length > 0 && <Btn title="Yeni tur" onPress={again} style={{ alignSelf: 'stretch', marginTop: 8 }} />}
          </Card>
        </Animated.View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="small" color="muted">Tur · {i + 1} / {deck.length}</T>
            <T v="small" color="muted">Çevirmek için dokun</T>
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => { tap(); flip.set(withTiming(flip.get() > 0.5 ? 0 : 1, { duration: 420, easing: Easing.inOut(Easing.cubic) })); }}>
            <Animated.View key={v.r} entering={FadeIn.duration(220)} style={{ flex: 1 }}>
              <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.card, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }, front]}>
                <View style={{ position: 'absolute', top: 18, left: 20 }}><T v="overline" color="muted">No. {v.r % HARD_BASE}</T></View>
                <T v="display" style={{ textAlign: 'center', fontFamily: font.light }} adjustsFontSizeToFit numberOfLines={v.impf.includes(" ") ? 2 : 1}>{v.impf}</T>
                {!!v.gov && <T v="smallM" color="muted">{v.gov}</T>}
                {!!v.perf && (
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <T v="small" color="muted">Mükemmel görünüş</T>
                    <T v="h2" color="primary">{v.perf}</T>
                  </View>
                )}
              </Animated.View>
              <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.card, overflow: 'hidden' }, back]}>
                <View style={{ flex: 1, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
                  <T v="title" color="primary" style={{ textAlign: 'center' }} adjustsFontSizeToFit numberOfLines={3}>{v.tr}</T>
                  <View style={{ height: 1, width: 60, backgroundColor: c.primary + '40' }} />
                  <T v="readingM" style={{ textAlign: 'center' }}>{v.ex}</T>
                  <T v="small" color="text2" style={{ textAlign: 'center' }}>{v.exTr}</T>
                </View>
              </Animated.View>
            </Animated.View>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Btn kind="secondary" title="Tekrar et" icon="rotate-ccw" onPress={() => answer(false)} style={{ flex: 1 }} />
            <Btn title="Öğrendim" icon="check" onPress={() => answer(true)} style={{ flex: 1 }} />
          </View>
        </>
      )}
    </View>
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
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderRadius: radius.btn, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16 }}>
        <Icon name="search" size={17} color={c.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Ara: идти, gitmek" placeholderTextColor={c.muted} style={{ flex: 1, paddingVertical: 12, color: c.text, fontSize: 15, fontFamily: font.regular }} />
      </View>
      <FlatList
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
