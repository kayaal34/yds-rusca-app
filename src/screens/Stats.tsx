import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { icon as ICON, radius, space, useTheme } from '../theme';
import { useSettings } from '../settings';
import { SECTIONS } from '../exam';
import { questions, topicName } from '../data/questions';
import { last7, lastResults, weekSummary, Reason, REASONS, reasonStats, topicStats, TopicStat } from '../db';
import { Bar, BigNum, Btn, Card, Header, Hero, Icon, ListGroup, Section, T } from '../ui';
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
      <View style={{ height: 120, width: 18, justifyContent: 'flex-end', backgroundColor: c.card2, borderRadius: radius.sm, overflow: 'hidden' }}>
        <Animated.View style={[{ width: 18, borderRadius: radius.sm, backgroundColor: today ? c.primary : c.primary + '99' }, a]} />
      </View>
      <T v="micro" color={today ? 'text' : 'muted'}>{label}</T>
    </View>
  );
}

export function Stats({ start }: { start: Start }) {
  const { c } = useTheme();
  const { s: st } = useSettings();
  const [stats, setStats] = useState<TopicStat[] | null>(null);
  const [week, setWeek] = useState<{ day: string; total: number; right: number }[]>([]);
  const [tot, setTot] = useState({ total: 0, right: 0 });
  const [reasons, setReasons] = useState<{ reason: Reason; n: number }[]>([]);
  const [wk, setWk] = useState<Awaited<ReturnType<typeof weekSummary>> | null>(null);

  useEffect(() => {
    topicStats().then(setStats).catch(() => setStats([]));
    last7().then(setWeek).catch(() => {});
    // Konu satırlarıyla aynı tanım: çözülen farklı soru ve son cevabı doğru olanlar
    lastResults().then((m) => setTot({ total: m.size, right: [...m.values()].filter(Boolean).length })).catch(() => {});
    reasonStats().then(setReasons).catch(() => {});
    weekSummary().then(setWk).catch(() => {});
  }, []);

  if (!stats) return <View style={{ flex: 1, padding: space.screen }}><Header title="Analiz" /></View>;
  const rows = stats.map((x) => ({ ...x, p: x.right / x.total })).sort((a, b) => a.p - b.p);
  const weak = rows.filter((r) => r.total >= 3 && r.p < 0.7).slice(0, 3);
  const max = Math.max(...week.map((w) => w.total), 1);
  const weekTotal = week.reduce((a, w) => a + w.total, 0);
  const overall = tot.total ? tot.right / tot.total : 0;
  // Tahmini YDS puanı: her bölümün başarısı (veri yoksa genel başarı) gerçek sınavdaki soru sayısıyla tartılır
  const estimate = Math.round(
    SECTIONS.reduce((sum, s) => {
      const r = stats.filter((x) => s.topics.includes(x.topic));
      const n = r.reduce((a, x) => a + x.total, 0);
      const acc = n >= 3 ? r.reduce((a, x) => a + x.right, 0) / n : overall;
      return sum + s.n * acc * 1.25;
    }, 0)
  );
  const enough = tot.total >= 30;

  return (
    <ScrollView contentContainerStyle={{ padding: space.screen, gap: space.gap, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Header title="Analiz" />
      {tot.total === 0 ? (
        <Card style={{ alignItems: 'center', gap: 12, padding: 28 }}>
          <Icon name="bar-chart-2" size={ICON.empty} color={c.muted} />
          <T v="h3">Henüz veri yok</T>
          <T v="small" color="muted" style={{ textAlign: 'center' }}>Birkaç test çözünce başarın ve zayıf konuların burada görünür.</T>
          <Btn title="Hızlı test çöz" icon="zap" onPress={() => start({ title: 'Hızlı test', qs: shuffle(questions).slice(0, 10) })} style={{ alignSelf: 'stretch', marginTop: 4 }} />
        </Card>
      ) : (
        <>
          {/* Tahmini puan: bölüm ağırlıklı, hedef çentikli */}
          <Hero style={{ gap: 8 }}>
            <T v="small" color="text2">{enough ? 'Tahmini YDS puanın' : 'Genel başarı'}</T>
            {enough ? <BigNum size="L" value={`~${estimate}`} unit="/ 100" /> : <BigNum size="L" value={Math.round(overall * 100)} unit="%" />}
            {enough && (
              <View style={{ gap: 8, marginTop: 4 }}>
                <View>
                  <Bar value={estimate / 100} height={4} track={c.primary + '24'} />
                  <View style={{ position: 'absolute', left: `${st.target}%`, top: -4, width: 2, height: 12, borderRadius: 1, backgroundColor: c.text2 }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T v="micro" color="muted">Hedef {st.target}</T>
                  <T v="microM" color={estimate >= st.target ? 'primary' : 'text2'}>{estimate >= st.target ? 'Hedefin üstündesin' : `Hedefe ~${st.target - estimate} puan`}</T>
                </View>
              </View>
            )}
            <T v="micro" color="muted">
              {enough ? `Her sorunun son cevabına göre · genel başarı %${Math.round(overall * 100)}` : `Tahmini puan için en az 30 soru çöz (${tot.total}/30)`}
            </T>
          </Hero>

          {/* Doğru, yanlış, bu hafta: tek kartta üç sütun */}
          <View style={{ flexDirection: 'row', backgroundColor: c.card, borderRadius: radius.card }}>
            {([[tot.right, 'Doğru', c.good], [tot.total - tot.right, 'Yanlış', c.bad], [weekTotal, 'Bu hafta', c.text]] as [number, string, string][]).map(([v, l, col], k) => (
              <View key={l} style={[{ flex: 1, alignItems: 'center', paddingVertical: 16 }, k > 0 && { borderLeftWidth: 1, borderLeftColor: c.border }]}>
                <T v="num" color={col}>{v}</T>
                <T v="small" color="muted">{l}</T>
              </View>
            ))}
          </View>

          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <T v="h3">Son 7 gün</T>
              {/* Haftalık özet: geçen haftayla doğru oranı farkı */}
              {wk && wk.now.n > 0 && (() => {
                const acc = Math.round((wk.now.right / wk.now.n) * 100);
                const prevAcc = wk.prev.n ? Math.round((wk.prev.right / wk.prev.n) * 100) : null;
                return <T v="small" color="text2">{wk.now.n} soru · %{acc} doğru{prevAcc !== null && acc !== prevAcc ? ` · ${acc > prevAcc ? '+' : '−'}${Math.abs(acc - prevAcc)}` : ''}</T>;
              })()}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              {week.map((w, i) => <Column key={w.day} i={i} v={w.total} max={max} today={i === week.length - 1} label={DAYS[new Date(w.day + 'T12:00:00').getDay()]} />)}
            </View>
          </Card>

          {weak.length > 0 && (
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="target" size={ICON.row} color={c.text2} />
                <T v="h3">Odaklanman gereken konular</T>
              </View>
              {weak.map((w) => (
                <View key={w.topic} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T v="body" color="text2">{topicName(w.topic)}</T>
                  <T v="bodyM" color={w.p < 0.5 ? 'bad' : 'text'}>%{Math.round(w.p * 100)}</T>
                </View>
              ))}
              <Btn
                title="Bu konulardan 15 soru çöz"
                style={{ marginTop: 4 }}
                onPress={() => start({ title: 'Zayıf konular', qs: shuffle(questions.filter((q) => weak.some((w) => w.topic === q.topic))).slice(0, 15) })}
              />
            </Card>
          )}

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
                    <Bar value={r.n / Math.max(1, sum)} height={4} track={c.primary + '24'} />
                  </View>
                );
              })}
            </Card>
          )}

          <Section title="Konu bazında" />
          <ListGroup>
            {rows.map((r) => (
              <View key={r.topic} style={{ paddingHorizontal: space.card, paddingVertical: 16, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <T v="h3" style={{ flex: 1 }}>{topicName(r.topic)}</T>
                  <T v="h3" color={r.p < 0.5 ? 'bad' : 'primary'}>%{Math.round(r.p * 100)}</T>
                </View>
                <Bar value={r.p} height={4} track={c.primary + '24'} />
                <T v="micro" color="muted">{r.right} doğru · {r.total - r.right} yanlış · soru başı {Math.round(r.avgMs / 1000)} sn</T>
              </View>
            ))}
          </ListGroup>
        </>
      )}
    </ScrollView>
  );
}
