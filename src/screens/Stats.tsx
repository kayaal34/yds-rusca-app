import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { questions, topicName } from '../data/questions';
import { last7, lastResults, Reason, REASONS, reasonStats, topicStats, TopicStat } from '../db';
import { Bar, Btn, Card, Header, Hero, Icon, Section, Stat, T } from '../ui';
import { shuffle } from '../Quiz';
import type { Start } from './types';

const DAYS = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

function Column({ v, max, label, i, today }: { v: number; max: number; label: string; i: number; today: boolean }) {
  const { c } = useTheme();
  const h = useSharedValue(0);
  useEffect(() => { h.value = withDelay(i * 40, withTiming(max ? v / max : 0, { duration: 500, easing: Easing.out(Easing.cubic) })); }, [v, max]);
  const a = useAnimatedStyle(() => ({ height: `${Math.max(3, h.value * 100)}%` }));
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
      <T v="micro" color="muted">{v || ''}</T>
      <View style={{ height: 120, width: 18, justifyContent: 'flex-end', backgroundColor: c.card2, borderRadius: 6, overflow: 'hidden' }}>
        <Animated.View style={[{ width: 18, borderRadius: 6, backgroundColor: today ? c.primary : c.primary + '99' }, a]} />
      </View>
      <T v="micro" color={today ? 'text' : 'muted'}>{label}</T>
    </View>
  );
}

export function Stats({ start }: { start: Start }) {
  const { c } = useTheme();
  const [stats, setStats] = useState<TopicStat[] | null>(null);
  const [week, setWeek] = useState<{ day: string; total: number; right: number }[]>([]);
  const [tot, setTot] = useState({ total: 0, right: 0 });
  const [reasons, setReasons] = useState<{ reason: Reason; n: number }[]>([]);

  useEffect(() => {
    topicStats().then(setStats).catch(() => setStats([]));
    last7().then(setWeek).catch(() => {});
    // Konu satırlarıyla aynı tanım: çözülen farklı soru ve son cevabı doğru olanlar
    lastResults().then((m) => setTot({ total: m.size, right: [...m.values()].filter(Boolean).length })).catch(() => {});
    reasonStats().then(setReasons).catch(() => {});
  }, []);

  if (!stats) return <View style={{ flex: 1 }} />;
  const rows = stats.map((x) => ({ ...x, p: x.right / x.total })).sort((a, b) => a.p - b.p);
  const weak = rows.filter((r) => r.total >= 3 && r.p < 0.7).slice(0, 3);
  const max = Math.max(...week.map((w) => w.total), 1);
  const weekTotal = week.reduce((a, w) => a + w.total, 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Header title="Analiz" subtitle="Güçlü ve zayıf yönlerin, her sorunun son cevabına göre." />
      {tot.total === 0 ? (
        <Card style={{ alignItems: 'center', gap: 12, padding: 28, marginTop: 8 }}>
          <Icon name="bar-chart-2" size={30} color={c.muted} />
          <T v="h3">Henüz veri yok</T>
          <T v="small" color="muted" style={{ textAlign: 'center' }}>Birkaç test çözdüğünde konu bazlı başarın ve zayıf noktaların burada görünür.</T>
          <Btn title="Hızlı test çöz" icon="zap" onPress={() => start({ title: 'Hızlı test', qs: shuffle(questions).slice(0, 10) })} style={{ alignSelf: 'stretch', marginTop: 4 }} />
        </Card>
      ) : (
        <>
          <Hero style={{ marginTop: 8 }}>
            <T v="small" color="text2">Genel başarı</T>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
              <T v="bigL">{Math.round((tot.right / tot.total) * 100)}</T>
              <T v="h1" color="muted" style={{ marginBottom: 12 }}>%</T>
            </View>
            <T v="small" color="text2">{tot.total} farklı soru çözdün</T>
          </Hero>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Stat value={tot.right} label="Doğru" color={c.good} />
            <Stat value={tot.total - tot.right} label="Yanlış" color={c.bad} />
            <Stat value={weekTotal} label="Bu hafta" />
          </View>

          <Card style={{ gap: 12 }}>
            <T v="h3">Son 7 gün</T>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              {week.map((w, i) => <Column key={w.day} i={i} v={w.total} max={max} today={i === week.length - 1} label={DAYS[new Date(w.day + 'T12:00:00').getDay()]} />)}
            </View>
          </Card>

          {reasons.length > 0 && (
            <Card style={{ gap: 12 }}>
              <T v="h3">Yanlış nedenlerin</T>
              {reasons.map((r) => {
                const sum = reasons.reduce((a, x) => a + x.n, 0);
                return (
                  <View key={r.reason} style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <T v="body" color="text2">{REASONS.find((x) => x.v === r.reason)?.l ?? r.reason}</T>
                      <T v="bodyM">{r.n}</T>
                    </View>
                    <Bar value={r.n / Math.max(1, sum)} height={4} color={c.bad} track={c.badSoft} />
                  </View>
                );
              })}
            </Card>
          )}

          {weak.length > 0 && (
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="target" size={18} color={c.bad} />
                <T v="h3">Odaklanman gereken konular</T>
              </View>
              {weak.map((w) => (
                <View key={w.topic} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T v="body" color="text2">{topicName(w.topic)}</T>
                  <T v="bodyM" color="bad">%{Math.round(w.p * 100)}</T>
                </View>
              ))}
              <Btn
                title="Bu konulardan 15 soru çöz"
                style={{ marginTop: 4 }}
                onPress={() => start({ title: 'Zayıf konular', qs: shuffle(questions.filter((q) => weak.some((w) => w.topic === q.topic))).slice(0, 15) })}
              />
            </Card>
          )}

          <Section title="Konu bazında" />
          {rows.map((r) => {
            const color = r.p < 0.5 ? c.bad : c.primary; // tek vurgu; yalnız çok düşük başarı kırmızı
            return (
              <Card key={r.topic} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <T v="h3" style={{ flex: 1 }}>{topicName(r.topic)}</T>
                  <T v="h3" color={color}>%{Math.round(r.p * 100)}</T>
                </View>
                <Bar value={r.p} color={color} />
                <T v="small" color="muted">{r.right} doğru  ·  {r.total - r.right} yanlış  ·  soru başı {Math.round(r.avgMs / 1000)} sn</T>
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}
