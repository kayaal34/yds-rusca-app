import { useEffect, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Clover, LogoMark } from '../Logo';
import { brand, font, radius, space, useTheme } from '../theme';
import { osymQuestions } from '../data/osym';
import { band, daysUntil, EXAMS, examLabel, examPassed, useSettings } from '../settings';
import { cancelDaily, scheduleDaily } from '../notify';
import { Btn, Chip, DateWheel, IconBadge, IconBtn, IconName, Input, LevelPicker, ListGroup, ListItem, Section, Segmented, Slider, T, TimeWheel } from '../ui';

const SPLASH_BG = brand.bg;
const SPLASH_FG = brand.fg;
const SPLASH_MUTED = brand.muted;
const SPLASH_LEAF = brand.leaf;
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
  ['layers', 'Kapsamlı soru havuzu', osymQuestions.length ? 'ÖSYM çıkmış soruları ve açıklamalı alıştırmalar' : 'YDS formatında açıklamalı sorular'],
  ['flag', 'Gerçek sınav formatı', '20, 40 ya da 80 soruluk süreli denemeler'],
  ['bar-chart-2', 'Kişisel analiz', 'Tahmini puan, zayıf konular, yanlış nedenleri'],
  ['book-open', 'Konu anlatımı ve kelimeler', 'Dersler, fiil, isim, sıfat ve kalıp kartları'],
];

const GOALS: [number, string][] = [[10, 'Hafif'], [20, 'Düzenli'], [30, 'Ciddi'], [50, 'Yoğun']];
const STEPS = 6; // tanıtım, ad, sınav tarihi, hedef, bildirim, plan

// Her adım aynı şablon: üstte ikon rozeti, başlık, açıklama, içerik; altta sabit düğmeler
function Step({ icon, title, text, children, actions }: { icon?: IconName; title: string; text?: string; children?: React.ReactNode; actions: React.ReactNode }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: space.screen, gap: space.gap, paddingTop: 24 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        <Pressable onPress={Keyboard.dismiss} accessible={false} style={{ gap: space.gap }}>
          {icon && <IconBadge name={icon} />}
          <T v="h1">{title}</T>
          {!!text && <T v="body" color="text2">{text}</T>}
        </Pressable>
        {children}
      </ScrollView>
      <View style={{ paddingHorizontal: space.screen, paddingBottom: 20, paddingTop: 8, gap: 8 }}>{actions}</View>
    </Animated.View>
  );
}

// İlk açılış: tanıtım → ad → sınav tarihi → hedef → bildirim → plan
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
    setStep(5);
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

  const days = daysUntil(examDate);
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.screen, paddingTop: 16, minHeight: 44 }}>
        {step > 0 && <IconBtn name="chevron-left" label="Geri" onPress={() => setStep(step - 1)} />}
        {Array.from({ length: STEPS }, (_, k) => <View key={k} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: k <= step ? c.primary : c.border }} />)}
      </View>

      {step === 0 && (
        <Step key="0" title={"Rusça YDS'ye\nplanlı hazırlan."} text="Her gün biraz çalış, gelişimini takip et, sınav gününe hazır gel." actions={<Btn title="Başla" onPress={() => setStep(1)} />}>
          <View style={{ gap: space.gap, marginTop: 8 }}>
            {FEATURES.map(([icon, t, d]) => (
              <View key={t} style={{ flexDirection: 'row', gap: space.gap, alignItems: 'center' }}>
                <IconBadge name={icon} />
                <View style={{ flex: 1 }}>
                  <T v="h3">{t}</T>
                  <T v="small" color="muted">{d}</T>
                </View>
              </View>
            ))}
          </View>
        </Step>
      )}

      {step === 1 && (
        <Step key="1" icon="user" title="Sana nasıl hitap edelim?" text="Adın sadece bu telefonda kalır."
          actions={<Btn title={name.trim() ? 'Devam' : 'Adsız devam et'} kind={name.trim() ? 'primary' : 'secondary'} onPress={() => { Keyboard.dismiss(); setStep(2); }} />}>
          <Input value={name} onChangeText={setName} placeholder="Adın" maxLength={20} autoFocus returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={Keyboard.dismiss} />
        </Step>
      )}

      {step === 2 && (
        <Step key="2" icon="calendar" title="Sınavın ne zaman?" text="Kalan günleri sayar, çalışma dönemini buna göre öneririz."
          actions={<Btn title="Devam" onPress={() => setStep(3)} disabled={examPassed(examDate)} />}>
          {EXAMS.some((e) => !examPassed(e.date)) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EXAMS.filter((e) => !examPassed(e.date)).map((e) => <Chip key={e.date} label={`YDS · ${examLabel(e.date)}`} on={examDate === e.date} onPress={() => setExamDate(e.date)} />)}
            </View>
          )}
          <DateWheel value={examDate} onChange={setExamDate} />
          <T v="smallM" color={examPassed(examDate) ? 'bad' : 'primary'} style={{ textAlign: 'center' }}>
            {examPassed(examDate) ? 'Bu tarih geçmiş, ileri bir tarih seç' : days === 0 ? 'Sınav bugün' : `${days} gün kaldı`}
          </T>
        </Step>
      )}

      {step === 3 && (
        <Step key="3" icon="target" title={name.trim() ? `${name.trim()}, hedefin ne?` : 'Hedefin ne?'} actions={<Btn title="Devam" onPress={() => setStep(4)} />}>
          <Section title="Hedef puan" />
          <View style={{ alignItems: 'center' }}>
            <T v="bigL">{target}</T>
            <T v="smallM" color="muted">{band(target) ? `${band(target)} seviyesi` : 'B1 altı'}</T>
          </View>
          <Slider value={target} min={40} max={100} step={1} onChange={setTarget} />
          <LevelPicker value={target} onChange={setTarget} />
          <Section title="Günde kaç soru" />
          <Segmented items={GOALS.map(([g, l]) => ({ v: g, l: `${g} · ${l}` }))} value={goal} onChange={setGoal} />
          {/* Seri ve yonca kuralı baştan anlatılır */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderRadius: radius.card, padding: space.card }}>
            <View style={{ transform: [{ rotate: '18deg' }] }}>
              <Clover size={30} color={c.primary} weight={1.4} filled />
            </View>
            <T v="small" color="text2" style={{ flex: 1 }}>Her gün gel, yoncan solmasın. Bir soru ya da bir kelime kartı serini sürdürür, günlük hedefini tamamlayınca yoncan yeşerir.</T>
          </View>
        </Step>
      )}

      {step === 4 && (
        <Step key="4" icon="bell" title="Hatırlatma saati" text="Seçtiğin saatte günde bir kez kısa bir hatırlatma gönderelim. Hedefini tamamladığın gün göndermeyiz."
          actions={
            <>
              <Btn title={denied ? 'Devam' : 'İzin ver'} icon={denied ? undefined : 'bell'} onPress={denied ? () => setStep(5) : allow} />
              {!denied && <Btn kind="ghost" title="Şimdilik geç" onPress={() => { if (!st.reminder) { setReminder(false); cancelDaily().catch(() => {}); } setStep(5); }} />}
            </>
          }>
          <TimeWheel hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} />
          {denied && <T v="small" color="bad" style={{ textAlign: 'center' }}>İzin verilmedi. İstersen telefon ayarlarından sonra açabilirsin.</T>}
        </Step>
      )}

      {step === 5 && (
        <Step key="5" title="Planın hazır" actions={<Btn title="Başlayalım" onPress={finish} />}>
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <LogoMark size={96} color={c.primary} fill={c.primary + '8C'} animate />
          </View>
          <ListGroup>
            <ListItem icon="calendar" title={examPassed(examDate) ? 'Sınav tarihi seçilmedi' : `${days} gün`} sub={`YDS · ${examLabel(examDate)}`} chevron={false} />
            <ListItem icon="check-circle" title={`Günde ${goal} soru`} sub="Bir soru ya da bir kelime kartı serini sürdürür" chevron={false} />
            <ListItem icon="target" title={`Hedef ${target}${band(target) ? ` · ${band(target)}` : ''}`} sub={reminder ? `Hatırlatma ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` : 'Hatırlatma kapalı'} chevron={false} />
          </ListGroup>
        </Step>
      )}
    </KeyboardAvoidingView>
  );
}
