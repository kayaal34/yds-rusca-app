import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { space, useTheme } from '../theme';
import { band, daysUntil, examPassed, useSettings } from '../settings';
import { questions, topicName } from '../data/questions';
import { activityDays, dayGoals, dayStr, favQids, saveDayGoal, last7, streak, todayCount, topicStats, wrongQids } from '../db';
import { Btn, Hero, IconBtn, IconName, LinkBtn, ListGroup, ListItem, T } from '../ui';
import { Clover, ProgressClover } from '../Logo';
import { loadDraft, shuffle } from '../Quiz';
import type { Draft } from '../exam';
import type { Start } from './types';

const pick = (n: number, from = questions) => shuffle(from).slice(0, n);

// Son 7 gün iskeleti: veri gelmeden de şerit çizilsin (sekme geçişinde zıplamasın)
const emptyWeek = () => Array.from({ length: 7 }, (_, k) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - k));
  return { day: dayStr(d), total: 0 };
});
// Son okunan değerler: ekran yeniden kurulunca önce bunlar görünür, sonra tazelenir
const cache: { today: number; str: number; week: { day: string; total: number }[]; act: Set<string> } = { today: 0, str: 0, week: [], act: new Set() };
const remember = (p: Partial<typeof cache>) => Object.assign(cache, p);
const DAYS = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

type Item = { icon: IconName; title: string; sub: string; onPress: () => void; tint?: string };

export function Home({ start, openSettings, goTab }: { start: Start; openSettings: () => void; goTab: (t: 'study' | 'mock' | 'verbs') => void }) {
  const { c } = useTheme();
  const { s: st } = useSettings();
  const [today, setToday] = useState(cache.today);
  const [str, setStr] = useState(cache.str);
  const [wrong, setWrong] = useState<string[]>([]);
  const [favs, setFavs] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [goals, setGoals] = useState<Map<string, number>>(new Map());
  // Bugünün hedefi kaydedilir; geçmiş günler o günkü hedefle değerlendirilir
  useEffect(() => { saveDayGoal(st.goal).then(dayGoals).then(setGoals).catch(() => {}); }, [st.goal]);
  const [weak, setWeak] = useState<string | null>(null);
  const [week, setWeek] = useState<{ day: string; total: number }[]>(() => (cache.week.length ? cache.week : emptyWeek()));
  const [act, setAct] = useState<Set<string>>(cache.act);

  useEffect(() => {
    todayCount().then((v) => { remember({ today: v }); setToday(v); }).catch(() => {});
    streak().then((v) => { remember({ str: v }); setStr(v); }).catch(() => {});
    wrongQids().then(setWrong).catch(() => {});
    favQids().then(setFavs).catch(() => {});
    loadDraft().then(setDraft).catch(() => {});
    last7().then((v) => { remember({ week: v }); setWeek(v); }).catch(() => {});
    activityDays().then((v) => { remember({ act: v }); setAct(v); }).catch(() => {});
    topicStats()
      .then((rows) => {
        const w = rows.filter((r) => r.total >= 3).sort((a, b) => a.right / a.total - b.right / b.total)[0];
        if (w && w.right / w.total < 0.7) setWeak(w.topic);
      })
      .catch(() => {});
  }, []);

  const days = daysUntil(st.examDate);
  const passed = examPassed(st.examDate);
  const h = new Date().getHours();
  const greet = h < 6 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
  const examDay = new Date(st.examDate + 'T09:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  const goalDone = today >= st.goal;
  // Seri: en az 1 soru ya da 1 kelime kartı çalışılan gün sayılır. Dolu yeşil yonca: günlük hedef tamam.
  const workedToday = today > 0 || act.has(week[week.length - 1]?.day ?? '');

  // Günün tek önerisi: zayıf konu, yoksa hedef tamamlanana kadar hızlı test, sonra kelime turu
  const next: Item = goalDone
    ? { icon: 'layers', title: 'Kelime turu', sub: `${st.verbBatch} kelime · yaklaşık ${Math.max(2, Math.round(st.verbBatch / 4))} dk`, onPress: () => goTab('verbs') }
    : weak
      ? { icon: 'target', title: topicName(weak), sub: 'En zayıf konun · 10 soru', onPress: () => start({ title: topicName(weak), qs: pick(10, questions.filter((q) => q.topic === weak)) }) }
      : { icon: 'zap', title: 'Hızlı test', sub: '10 karma soru · süresiz', onPress: () => start({ title: 'Hızlı test', qs: pick(10) }) };

  // Kayıtlı id'lerden yalnız uygulamada hâlâ bulunan sorular (içerik düzeltmesi id'yi değiştirebilir)
  const wrongQs = questions.filter((q) => wrong.includes(q.id));
  const favQs = questions.filter((q) => favs.includes(q.id));

  // Deneme, kelimeler ve konular alt sekmelerde; burada yalnız sekmelerde olmayan kısayollar
  const items: Item[] = [
    ...(weak || goalDone ? [{ icon: 'zap' as IconName, title: 'Hızlı test', sub: '10 karma soru · süresiz', onPress: () => start({ title: 'Hızlı test', qs: pick(10) }) }] : []),
    ...(wrongQs.length ? [{ icon: 'rotate-ccw' as IconName, title: 'Yanlışlarını tekrar et', sub: wrongQs.length > 20 ? `${wrongQs.length} soru bekliyor · 20'şer` : `${wrongQs.length} soru bekliyor`, onPress: () => start({ title: 'Yanlışlarım', qs: pick(20, wrongQs) }) }] : []),
    ...(draft ? [{ icon: 'pause-circle' as IconName, title: 'Yarım kalan deneme', sub: `${draft.title} · ${draft.picks.filter((x) => x !== null).length}/${draft.ids.length} yanıtlı`, onPress: () => goTab('mock') }] : []),
    ...(favQs.length ? [{ icon: 'star' as IconName, title: 'Favori soruların', sub: favQs.length > 20 ? `${favQs.length} soru · 20'şer` : `${favQs.length} soru`, onPress: () => start({ title: 'Favoriler', qs: pick(20, favQs) }) }] : []),
  ];


  // Sınava kalan güne göre dönem önerisi
  const phase = passed
    ? 'Sınav geçti, yeni tarihi Ayarlar\'dan seç'
    : days === 0
      ? 'Bugün sınav günü. Hazırsın.'
      : days <= 7
        ? 'Sınav haftası: kimliğini ve sınav yerini kontrol et'
        : days <= 30
          ? 'Son düzlük: yanlışlarını tekrar et, haftada bir tam deneme'
          : days <= 60
            ? 'Deneme dönemi: haftada iki tam deneme'
            : 'Temel dönem: her gün konu ve kelime';
  const left = Math.max(0, st.goal - today);

  return (
    <ScrollView contentContainerStyle={{ padding: space.screen, gap: space.gap, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(300)} style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <T v="h1">{greet}{st.name ? ',' : ''}</T>
          {/* Ad ve hemen sağında seri: yonca ve gün sayısı */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!!st.name && <T v="h1M" numberOfLines={1} style={{ flexShrink: 1 }}>{st.name}</T>}
            <View accessibilityLabel={`${str} gün seri, ${goalDone ? 'bugünkü hedef tamam' : workedToday ? 'bugün çalıştın' : 'bugün henüz çalışmadın'}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <View style={{ transform: [{ rotate: '18deg' }], opacity: workedToday ? 1 : 0.45 }}>
                <Clover size={30} color={workedToday ? c.primary : c.muted} weight={1.3} filled={goalDone} />
              </View>
              <T v="numS" color={workedToday ? 'primary' : 'muted'}>{str}</T>
              <T v="micro" color="muted">gün</T>
            </View>
          </View>
        </View>
        <IconBtn name="settings" label="Ayarlar" onPress={openSettings} />
      </Animated.View>

      {/* Son 7 gün: hedef tamamsa dolu yeşil, çalışıldıysa yeşil çizgi, çalışılmadıysa solgun. Tarih erişilebilirlik etiketinde. */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {week.map((w, k) => {
          const isToday = k === week.length - 1;
          const worked = w.total > 0 || act.has(w.day);
          const full = isToday ? goalDone : w.total >= (goals.get(w.day) ?? st.goal);
          const dt = new Date(w.day + 'T12:00:00');
          return (
            <View key={w.day} accessible accessibilityLabel={`${dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}, ${full ? 'hedef tamam' : worked ? 'çalışıldı' : 'çalışılmadı'}`} style={{ alignItems: 'center', gap: 4 }}>
              <T v="micro" color={isToday ? 'primary' : 'muted'}>{DAYS[dt.getDay()]}</T>
              <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: full ? c.primarySoft : c.card, borderWidth: isToday ? 1.5 : 0, borderColor: c.primary }}>
                <View style={{ opacity: worked ? 1 : 0.35, transform: [{ rotate: '18deg' }] }}>
                  <Clover size={24} color={worked ? c.primary : c.muted} weight={1.6} filled={full} />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Bugün: hedef halkası, kalan soru ve tek ana eylem */}
      <Animated.View entering={FadeIn.duration(350).delay(60)}>
        <Hero style={{ gap: space.gap }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.gap }}>
            <ProgressClover value={today / Math.max(1, st.goal)} color={c.primary} track={c.primary + '24'} done={goalDone} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="overline" color="muted">Bugün</T>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <T v="numL">{Math.min(today, 999)}</T>
                <T v="numS" color="muted">/ {st.goal}</T>
              </View>
              <T v="small" color={goalDone ? 'primary' : 'text2'}>
                {goalDone ? 'Hedef tamam, yoncan yeşil' : workedToday ? `Yoncanı yeşertmek için ${left} soru daha` : 'Yoncan solmasın: 1 soru ya da 1 kelime kartı'}
              </T>
            </View>
          </View>
          <Btn kind={goalDone ? 'secondary' : 'primary'} title={next.title} icon={next.icon} onPress={next.onPress} />
          <T v="micro" color="muted" style={{ textAlign: 'center', marginTop: -8 }}>{next.sub}</T>
        </Hero>
      </Animated.View>

      {/* Sınav: kalan gün, tarih, hedef puan ve döneme göre öneri */}
      <Animated.View entering={FadeIn.duration(350).delay(100)} style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <T v="numS">{passed ? '—' : days}</T>
            <T v="micro" color="muted">gün</T>
          </View>
          <T v="small" color="muted" style={{ flex: 1 }} numberOfLines={1}>YDS · {examDay}</T>
          <LinkBtn title={`Hedef ${st.target}${band(st.target) ? ` · ${band(st.target)}` : ''}`} icon="target" onPress={openSettings} />
        </View>
        <T v="small" color="text2">{phase}</T>
      </Animated.View>

      {items.length > 0 && (
        <Animated.View entering={FadeIn.duration(350).delay(140)}>
          <ListGroup inset={space.card + 18 + 16}>
            {items.map((it) => <ListItem key={it.title} icon={it.icon} title={it.title} sub={it.sub} onPress={it.onPress} />)}
          </ListGroup>
        </Animated.View>
      )}
    </ScrollView>
  );
}
