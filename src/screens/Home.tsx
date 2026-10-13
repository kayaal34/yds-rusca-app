import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { radius, useTheme } from '../theme';
import { band, daysUntil, EXAMS, examPassed, useSettings } from '../settings';
import { questions, topicName } from '../data/questions';
import { verbs } from '../data/gen';
import { activityDays, dayGoals, favQids, saveDayGoal, last7, streak, todayCount, topicStats, verbKnown, wrongQids } from '../db';
import { Bar, Chip, Hero, Icon, IconBadge, IconName, ListGroup, ListItem, T, useTap } from '../ui';
import { Clover } from '../Logo';
import { loadDraft, shuffle } from '../Quiz';
import type { Draft } from '../exam';
import type { Start } from './types';

const pick = (n: number, from = questions) => shuffle(from).slice(0, n);
const DAYS = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

type Item = { icon: IconName; title: string; sub: string; onPress: () => void; tint?: string };

export function Home({ start, openSettings, goTab }: { start: Start; openSettings: () => void; goTab: (t: 'study' | 'mock' | 'verbs') => void }) {
  const { c } = useTheme();
  const tap = useTap();
  const { s: st } = useSettings();
  const [today, setToday] = useState(0);
  const [str, setStr] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [favs, setFavs] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [goals, setGoals] = useState<Map<string, number>>(new Map());
  // Bugünün hedefi kaydedilir; geçmiş günler o günkü hedefle değerlendirilir
  useEffect(() => { saveDayGoal(st.goal).then(dayGoals).then(setGoals).catch(() => {}); }, [st.goal]);
  const [known, setKnown] = useState(0);
  const [weak, setWeak] = useState<string | null>(null);
  const [week, setWeek] = useState<{ day: string; total: number }[]>([]);
  const [act, setAct] = useState<Set<string>>(new Set());

  useEffect(() => {
    todayCount().then(setToday).catch(() => {});
    streak().then(setStr).catch(() => {});
    wrongQids().then(setWrong).catch(() => {});
    favQids().then(setFavs).catch(() => {});
    loadDraft().then(setDraft).catch(() => {});
    last7().then(setWeek).catch(() => {});
    activityDays().then(setAct).catch(() => {});
    verbKnown().then((m) => setKnown(verbs.filter((v) => m.get(v.impf) === true).length)).catch(() => {});
    topicStats()
      .then((rows) => {
        const w = rows.filter((r) => r.total >= 3).sort((a, b) => a.right / a.total - b.right / b.total)[0];
        if (w && w.right / w.total < 0.7) setWeak(w.topic);
      })
      .catch(() => {});
  }, []);

  const days = daysUntil(st.examDate);
  const passed = examPassed(st.examDate);
  const exam = EXAMS.find((e) => e.date === st.examDate);
  const h = new Date().getHours();
  const greet = h < 6 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
  const examDay = new Date(st.examDate + 'T09:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  const goalDone = today >= st.goal;
  // Seri: en az 1 soru ya da 1 fiil kartı çalışılan gün sayılır. Dolu yeşil yonca: günlük hedef tamam.
  const workedToday = today > 0 || act.has(week[week.length - 1]?.day ?? '');

  // Günün tek önerisi: zayıf konu, yoksa hedef tamamlanana kadar hızlı test, sonra fiil turu
  const next: Item = goalDone
    ? { icon: 'layers', title: 'Fiil turu', sub: `Bugünkü hedef tamam · ${st.verbBatch} fiil`, onPress: () => goTab('verbs') }
    : weak
      ? { icon: 'target', title: topicName(weak), sub: `En zayıf konun · hedefe ${st.goal - today} soru`, onPress: () => start({ title: topicName(weak), qs: pick(10, questions.filter((q) => q.topic === weak)) }) }
      : { icon: 'zap', title: 'Hızlı test', sub: `Hedefe ${st.goal - today} soru kaldı`, onPress: () => start({ title: 'Hızlı test', qs: pick(10) }) };

  // Deneme, fiiller ve konular alt sekmelerde; burada yalnız sekmelerde olmayan kısayollar
  const items: Item[] = [
    ...(weak || goalDone ? [{ icon: 'zap' as IconName, title: 'Hızlı test', sub: '10 karma soru, süresiz', onPress: () => start({ title: 'Hızlı test', qs: pick(10) }) }] : []),
    ...(wrong.length ? [{ icon: 'rotate-ccw' as IconName, title: 'Yanlışlarını tekrar et', sub: wrong.length > 20 ? `${wrong.length} soru bekliyor · 20'şer` : `${wrong.length} soru bekliyor`, onPress: () => start({ title: 'Yanlışlarım', qs: pick(20, questions.filter((q) => wrong.includes(q.id))) }) }] : []),
    ...(draft ? [{ icon: 'pause-circle' as IconName, title: 'Yarım kalan deneme', sub: `${draft.title} · ${draft.picks.filter((x) => x !== null).length}/${draft.ids.length} yanıtlı`, onPress: () => goTab('mock') }] : []),
    ...(favs.length ? [{ icon: 'star' as IconName, title: 'Favori soruların', sub: favs.length > 20 ? `${favs.length} soru · 20'şer` : `${favs.length} soru`, onPress: () => start({ title: 'Favoriler', qs: pick(20, questions.filter((q) => favs.includes(q.id))) }) }] : []),
  ];


  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(300)} style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <T v="h1">{greet}{st.name ? ',' : ''}</T>
          {/* Ad ve hemen sağında seri yoncası */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!!st.name && <T v="h1M" numberOfLines={1} style={{ flexShrink: 1 }}>{st.name}</T>}
            <View accessibilityLabel={`${str} gün seri, ${goalDone ? 'bugünkü hedef tamam' : workedToday ? 'bugün çalıştın' : 'bugün henüz çalışmadın'}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ transform: [{ rotate: '18deg' }], opacity: workedToday ? 1 : 0.45 }}>
                <Clover size={34} color={workedToday ? c.primary : c.muted} weight={1.3} filled={goalDone} />
              </View>
              <T v="smallM" color={workedToday ? 'primary' : 'muted'} style={{ fontVariant: ['tabular-nums'] }}>{str}</T>
            </View>
          </View>
        </View>
        <Pressable onPress={openSettings} hitSlop={10} accessibilityLabel="Ayarlar" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="settings" size={18} color={c.text2} />
        </Pressable>
      </Animated.View>

      {/* Son 7 gün: hedef tamamsa dolu yeşil, çalışıldıysa yeşil çizgi, çalışılmadıysa solgun */}
      <Animated.View entering={FadeIn.duration(300).delay(20)} style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {week.map((w, k) => {
            const isToday = k === week.length - 1;
            const worked = w.total > 0 || act.has(w.day);
            const full = isToday ? goalDone : w.total >= (goals.get(w.day) ?? st.goal);
            const dt = new Date(w.day + 'T12:00:00');
            return (
              <View key={w.day} style={{ alignItems: 'center', gap: 4 }}>
                <T v="micro" color={isToday ? 'primary' : 'muted'}>{DAYS[dt.getDay()]}</T>
                <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: full ? c.primarySoft : c.card, borderWidth: isToday ? 1.5 : 0, borderColor: c.primary }}>
                  <View style={{ opacity: worked ? 1 : 0.35, transform: [{ rotate: '18deg' }] }}>
                    <Clover size={24} color={worked ? c.primary : c.muted} weight={1.6} filled={full} />
                  </View>
                </View>
                <T v="micro" color={isToday ? 'primary' : 'muted'} style={{ fontVariant: ['tabular-nums'] }}>{dt.getDate()}</T>
              </View>
            );
          })}
        </View>
        {!goalDone && (
          <T v="small" color="text2">
            {workedToday ? `Serin sürüyor. Yoncanı yeşertmek için ${Math.max(0, st.goal - today)} soru daha.` : 'Yoncan solmasın: 1 soru çöz ya da bir fiil kartı çalış, serin sürsün.'}
          </T>
        )}
      </Animated.View>

      <Animated.View entering={FadeIn.duration(300).delay(40)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Chip icon="clock" label={passed ? 'Sınav geçti' : days === 0 ? 'Sınav bugün' : `${days} gün`} onPress={passed ? openSettings : undefined} />
        <T v="small" color="muted" style={{ flex: 1 }} numberOfLines={1}>{passed ? 'Yeni sınav tarihini Ayarlar\'dan seç' : `${exam?.id ?? 'Hedef sınav'} · ${examDay}`}</T>
      </Animated.View>

      {/* Hedef puan */}
      <Animated.View entering={FadeIn.duration(350).delay(80)}>
        <Hero style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="small" color="text2">Hedef puanın</T>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <T v="bigS">{st.target}</T>
              {!!band(st.target) && <T v="smallM" color="muted" style={{ marginBottom: 12 }}>{band(st.target)} seviyesi</T>}
            </View>
          </View>
          <Pressable onPress={openSettings} hitSlop={8} accessibilityLabel="Hedef puanı değiştir" style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: c.primary + '40' }}>
            <T v="smallM" color="primary">Değiştir</T>
          </Pressable>
        </Hero>
      </Animated.View>

      {/* Günün önerisi */}
      <Animated.View entering={FadeIn.duration(350).delay(120)}>
        <Pressable onPress={() => { tap(); next.onPress(); }} style={({ pressed }) => [{ backgroundColor: c.card, borderRadius: radius.card, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }, pressed && { opacity: 0.7 }]}>
          <IconBadge name={next.icon} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="overline" color="muted">Sıradaki</T>
            <T v="h3">{next.title}</T>
            <T v="small" color="muted">{next.sub}</T>
          </View>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow-right" size={17} color={c.onPrimary} />
          </View>
        </Pressable>
      </Animated.View>

      {/* Bugün */}
      <Animated.View entering={FadeIn.duration(350).delay(160)} style={{ backgroundColor: c.card, borderRadius: radius.card, padding: 16, gap: 16 }}>
        <Progress label="Bugünkü hedef" value={today} max={st.goal} done={goalDone ? 'Tamamlandı' : undefined} />
        <Progress label="Sık fiiller" value={known} max={verbs.length} />
      </Animated.View>

      {items.length > 0 && (
        <Animated.View entering={FadeIn.duration(350).delay(200)}>
          <ListGroup inset={50}>
            {items.map((it) => <ListItem key={it.title} icon={it.icon} title={it.title} sub={it.sub} onPress={it.onPress} />)}
          </ListGroup>
        </Animated.View>
      )}
    </ScrollView>
  );
}

function Progress({ label, value, max, done }: { label: string; value: number; max: number; done?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T v="small" color="text2">{label}</T>
        <T v="smallM">{done ?? `${value} / ${max}`}</T>
      </View>
      <Bar value={value / Math.max(1, max)} height={4} track={c.primary + '1F'} />
    </View>
  );
}
