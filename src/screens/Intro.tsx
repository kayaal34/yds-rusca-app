import { useEffect, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Clover, LogoMark } from '../Logo';
import { font, radius, useTheme } from '../theme';
import { band, daysUntil, EXAMS, examPassed, useSettings } from '../settings';
import { cancelDaily, scheduleDaily } from '../notify';
import { Btn, Chip, DateWheel, Icon, IconBadge, IconName, LevelPicker, Slider, T, TimeWheel } from '../ui';

const SPLASH_BG = '#2F4A3E';
const SPLASH_FG = '#E8ECE7';
const SPLASH_MUTED = '#A9BDB1';
const SPLASH_LEAF = '#8FC2A6';
const out = Easing.out(Easing.cubic);

// Tek harf: aşağıdan süzülerek belirir
function Letter({ ch, delay }: { ch: string; delay: number }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = withDelay(delay, withTiming(1, { duration: 450, easing: out })); }, []);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 14 }] }));
  return <Animated.Text style={[{ fontFamily: font.thin, fontSize: 44, lineHeight: 50, color: SPLASH_FG, marginHorizontal: 6 }, st]}>{ch}</Animated.Text>;
}

// Açılış (2,25 sn): işaret belirir, halka kapanır, içinde yonca açılır ve yaprakları tek tek yeşerir,
// "YDS" harf harf gelir, altında ince çizgi açılır ve "Rusça" belirir.
export function Splash({ onDone }: { onDone: () => void }) {
  const mark = useSharedValue(0);
  const line = useSharedValue(0);
  const sub = useSharedValue(0);
  useEffect(() => {
    mark.value = withTiming(1, { duration: 600, easing: out });
    line.value = withDelay(1250, withTiming(1, { duration: 400, easing: out }));
    sub.value = withDelay(1400, withTiming(1, { duration: 400, easing: out }));
    const t = setTimeout(onDone, 2250);
    return () => clearTimeout(t);
  }, []);
  const markSt = useAnimatedStyle(() => ({ opacity: Math.min(1, mark.value * 2), transform: [{ scale: 0.92 + mark.value * 0.08 }] }));
  const lineSt = useAnimatedStyle(() => ({ width: 64 * line.value, opacity: line.value }));
  const subSt = useAnimatedStyle(() => ({ opacity: sub.value, transform: [{ translateY: (1 - sub.value) * 6 }] }));
  return (
    <Animated.View exiting={FadeOut.duration(450)} style={{ flex: 1, backgroundColor: SPLASH_BG, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 108, height: 108, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={markSt}>
          <LogoMark size={108} color={SPLASH_FG} fill={SPLASH_LEAF} animate delay={100} />
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: 30 }}>
        {['Y', 'D', 'S'].map((ch, k) => <Letter key={ch} ch={ch} delay={950 + k * 100} />)}
      </View>
      <Animated.View style={[{ height: 1, backgroundColor: SPLASH_MUTED, marginTop: 10 }, lineSt]} />
      <Animated.Text style={[{ fontFamily: font.light, fontSize: 13, color: SPLASH_MUTED, marginTop: 10, textTransform: 'uppercase', letterSpacing: 6, paddingLeft: 6 }, subSt]}>Rusça</Animated.Text>
    </Animated.View>
  );
}

const FEATURES: [IconName, string, string][] = [
  ['layers', 'Kapsamlı soru havuzu', 'ÖSYM çıkmış soruları ve açıklamalı alıştırmalar'],
  ['flag', 'Gerçek sınav formatı', '20, 40 ya da 80 soruluk süreli denemeler'],
  ['bar-chart-2', 'Kişisel analiz', 'Zayıf konularını ve yanlış nedenlerini bulur'],
  ['book-open', 'Konu anlatımı ve fiiller', 'Dersler, sık ve zor fiil kartları'],
];

const GOALS: [number, string][] = [[10, 'Hafif'], [20, 'Düzenli'], [30, 'Ciddi'], [50, 'Yoğun']];

// İlk açılış: tanıtım → izinler → ad → hedefler
export function Onboarding() {
  const { c } = useTheme();
  const { s: st, update } = useSettings();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(st.name);
  const [goal, setGoal] = useState(st.goal);
  const [target, setTarget] = useState(st.target);
  const [examDate, setExamDate] = useState(st.examDate);
  const [hour, setHour] = useState(st.hour);
  const [minute, setMinute] = useState(st.minute);
  const [reminder, setReminder] = useState(st.reminder);
  const [denied, setDenied] = useState(false);

  const allow = async () => {
    const ok = await scheduleDaily(hour, minute, st.days).catch(() => false);
    setReminder(ok);
    if (!ok) { setDenied(true); return; }
    setStep(2);
  };
  const finish = () => update({ name: name.trim(), goal, target, hour, minute, reminder, examDate, onboarded: true });
  // Android geri tuşu bir önceki adıma döner; ilk adımda uygulamanın varsayılanı çalışır
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      setStep(step - 1);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingTop: 16, minHeight: 44 }}>
        {step > 0 && (
          <Pressable onPress={() => setStep(step - 1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Geri" style={{ marginLeft: -8, marginRight: 4 }}>
            <Icon name="chevron-left" size={22} color={c.text2} />
          </Pressable>
        )}
        {[0, 1, 2, 3, 4].map((k) => <View key={k} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: k <= step ? c.primary : c.border }} />)}
      </View>

      {step === 0 && (
        <Animated.View key="0" entering={FadeIn.duration(350)} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 28, gap: 16, paddingTop: 50 }} showsVerticalScrollIndicator={false}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><LogoMark size={46} color={c.onPrimary} /></View>
            <T v="display">{"Rusça YDS'ye\nplanlı hazırlan."}</T>
            <T v="body" color="text2">Her gün biraz çalış, gelişimini takip et, sınav gününe hazır gel.</T>
            <View style={{ gap: 16, marginTop: 12 }}>
              {FEATURES.map(([icon, t, d]) => (
                <View key={t} style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                  <IconBadge name={icon} />
                  <View style={{ flex: 1 }}>
                    <T v="h3">{t}</T>
                    <T v="small" color="muted">{d}</T>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={{ paddingHorizontal: 28, paddingBottom: 28 }}>
            <Btn title="Başla" onPress={() => setStep(1)} />
          </View>
        </Animated.View>
      )}

      {step === 1 && (
        <Animated.View key="1" entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 28, justifyContent: 'space-between', gap: 24 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 16, marginTop: 16 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bell" size={22} color={c.primary} />
            </View>
            <T v="h1">Bildirimlere izin ver</T>
            <T v="body" color="text2">{"Seçtiğin saatte günde bir kez kısa bir hatırlatma gönderelim. Başka bildirim göndermeyiz. Saati ve günleri Ayarlar'dan değiştirebilirsin."}</T>
            <View style={{ marginTop: 12 }}>
              <TimeWheel hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} />
            </View>
            {denied && <T v="small" color="bad" style={{ textAlign: 'center' }}>İzin verilmedi. İstersen telefon ayarlarından sonra açabilirsin.</T>}
          </View>
          <View style={{ gap: 8 }}>
            <Btn title={denied ? 'Devam' : 'İzin ver'} icon={denied ? undefined : 'bell'} onPress={denied ? () => setStep(2) : allow} />
            {!denied && <Btn kind="ghost" title="Şimdilik geç" onPress={() => { if (!st.reminder) { setReminder(false); cancelDaily().catch(() => {}); } setStep(2); }} />}
          </View>
          </ScrollView>
        </Animated.View>
      )}

      {step === 2 && (
        <Animated.View key="2" entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 28, justifyContent: 'space-between', gap: 24 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <Pressable onPress={Keyboard.dismiss} accessible={false} style={{ gap: 16, marginTop: 16 }}>
              <T v="h1">Sana nasıl hitap edelim?</T>
              <T v="body" color="text2">Adın sadece bu telefonda kalır.</T>
              <TextInput value={name} onChangeText={setName} placeholder="Adın" placeholderTextColor={c.muted} maxLength={20} autoFocus returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={Keyboard.dismiss} style={{ backgroundColor: c.card, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, paddingHorizontal: 20, height: 54, fontSize: 17, color: c.text, fontFamily: font.regular, marginTop: 12 }} />
            </Pressable>
            <Btn title={name.trim() ? 'Devam' : 'Adsız devam et'} kind={name.trim() ? 'primary' : 'secondary'} onPress={() => { Keyboard.dismiss(); setStep(3); }} />
          </ScrollView>
        </Animated.View>
      )}

      {/* Sınav tarihi: bilinen ÖSYM tarihi tek dokunuşla, değilse tekerle elle */}
      {step === 3 && (
        <Animated.View key="3d" entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 28, justifyContent: 'space-between', gap: 24 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 16, marginTop: 16 }}>
              <IconBadge name="calendar" />
              <T v="h1">Sınavın ne zaman?</T>
              <T v="body" color="text2">{"Ana sayfada kalan günleri sayarız. Sonra Ayarlar'dan değiştirebilirsin."}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {EXAMS.filter((e) => !examPassed(e.date)).map((e) => <Chip key={e.date} label={e.id} on={examDate === e.date} onPress={() => setExamDate(e.date)} />)}
              </View>
              <DateWheel value={examDate} onChange={setExamDate} />
              <T v="smallM" color={examPassed(examDate) ? 'bad' : 'primary'} style={{ textAlign: 'center' }}>
                {examPassed(examDate) ? 'Bu tarih geçmiş, ileri bir tarih seç' : daysUntil(examDate) === 0 ? 'Sınav bugün' : `${daysUntil(examDate)} gün kaldı`}
              </T>
            </View>
            <Btn title="Devam" onPress={() => setStep(4)} disabled={examPassed(examDate)} />
          </ScrollView>
        </Animated.View>
      )}

      {step === 4 && (
        <Animated.View key="4" entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 28, justifyContent: 'space-between', gap: 24 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 16, marginTop: 16 }}>
            <T v="h1">{name.trim() ? `${name.trim()}, hedefin ne?` : 'Hedefin ne?'}</T>
            <T v="overline" color="muted" style={{ marginTop: 12 }}>Hedef puan</T>
            <View style={{ alignItems: 'center' }}>
              <T v="bigL">{target}</T>
              <T v="smallM" color="muted">{band(target) ? `${band(target)} seviyesi` : 'B1 altı'}</T>
            </View>
            <Slider value={target} min={40} max={100} step={1} onChange={setTarget} />
            <LevelPicker value={target} onChange={setTarget} />
            <T v="overline" color="muted" style={{ marginTop: 16 }}>Günde kaç soru</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {GOALS.map(([g, l]) => {
                const on = goal === g;
                return (
                  <Pressable key={g} onPress={() => setGoal(g)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Günde ${g} soru, ${l}`} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.btn, backgroundColor: on ? c.primary : c.card }}>
                    <T v="h3" color={on ? c.onPrimary : 'text'}>{g}</T>
                    <T v="micro" color={on ? c.onPrimary : 'muted'}>{l}</T>
                  </Pressable>
                );
              })}
            </View>
            {/* Seri ve yonca kuralı baştan anlatılır */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderRadius: radius.card, padding: 16, marginTop: 8 }}>
              <View style={{ transform: [{ rotate: '18deg' }] }}>
                <Clover size={30} color={c.primary} weight={1.4} filled />
              </View>
              <T v="small" color="text2" style={{ flex: 1 }}>Her gün gel, yoncan solmasın. Bir soru ya da bir fiil kartı serini sürdürür, günlük hedefini tamamlayınca yoncan yeşerir.</T>
            </View>
          </View>
          <Btn title="Başlayalım" onPress={finish} />
          </ScrollView>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}
