import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, useColorScheme, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useFonts, Inter_200ExtraLight, Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { palettes, ThemeCtx, useTheme } from './src/theme';
import { SettingsProvider, useSettings } from './src/settings';
import { cancelDaily, syncReminder } from './src/notify';
import { resetAll } from './src/db';
import { DEMO, seedDemoIfEmpty } from './src/demo';

// Geliştirme sırasında her açılışta tüm veriyi siler; açılış animasyonu ve tanıtım baştan görünür.
// Yalnız Expo Go / geliştirme sunucusunda çalışır (__DEV__), APK ve mağaza sürümünü etkilemez. Kapatmak için false yap.
const FRESH_START_IN_DEV = true;
// Bayrak globalThis'te: dosya kaydedilince modül yeniden yüklense de veri tekrar silinmez, yalnız uygulama yeniden açılınca
const G = globalThis as { __ydsFreshDone?: boolean };
import { Quiz } from './src/Quiz';
import { Home } from './src/screens/Home';
import { Study } from './src/screens/Study';
import { Mock } from './src/screens/Mock';
import { Verbs } from './src/screens/Verbs';
import { Stats } from './src/screens/Stats';
import { SettingsScreen } from './src/screens/Settings';
import { Onboarding, Splash } from './src/screens/Intro';
import type { Session } from './src/screens/types';
import { Icon, IconName, T, useTap } from './src/ui';

type Tab = 'home' | 'study' | 'mock' | 'verbs' | 'stats';
const TABS: { id: Tab; icon: IconName; label: string }[] = [
  { id: 'home', icon: 'home', label: 'Ana sayfa' },
  { id: 'study', icon: 'book-open', label: 'Çalış' },
  { id: 'mock', icon: 'flag', label: 'Deneme' },
  { id: 'verbs', icon: 'layers', label: 'Kelimeler' },
  { id: 'stats', icon: 'bar-chart-2', label: 'Analiz' },
];

export default function App() {
  const [fontsReady, fontError] = useFonts({ Inter_200ExtraLight, Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <Themed fontsLoaded={fontsReady || !!fontError} />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function Themed({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { s } = useSettings();
  const sys = useColorScheme();
  const isDark = s.theme === 'dark' || (s.theme === 'system' && sys === 'dark');
  const value = useMemo(() => ({ c: isDark ? palettes.dark : palettes.light, isDark }), [isDark]);
  return (
    <ThemeCtx.Provider value={value}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Root fontsLoaded={fontsLoaded} />
    </ThemeCtx.Provider>
  );
}

function Root({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { c } = useTheme();
  const { s, loaded, reload } = useSettings();
  // Silme bitene kadar açılış ekranı kalır; eski ayarlarla bildirim kurulmaz
  const [wiping, setWiping] = useState(() => __DEV__ && FRESH_START_IN_DEV && !G.__ydsFreshDone);
  useEffect(() => {
    if (!wiping) return;
    G.__ydsFreshDone = true;
    cancelDaily().catch(() => {}).then(resetAll).then(reload).catch(() => {}).finally(() => setWiping(false));
  }, []);
  // Demo sürümü (EXPO_PUBLIC_DEMO=1): boş veritabanını bir aylık kullanım verisiyle doldurur
  const [seeding, setSeeding] = useState(DEMO);
  useEffect(() => {
    if (!seeding || wiping) return;
    seedDemoIfEmpty().then((done) => (done ? reload() : undefined)).catch((e) => console.warn('Demo verisi yüklenemedi', e)).finally(() => setSeeding(false));
  }, [wiping]);
  const [splash, setSplash] = useState(true);
  const [tab, setTab] = useState<Tab>('home');
  const [session, setSession] = useState<Session | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rev, setRev] = useState(0); // test bitince ekranlardaki sayılar tazelensin

  // Geri tuşu bir kez, en başta kaydolur; ekranların (ders, sonuç, tanıtım) kendi işleyicileri her zaman önce çalışır
  const nav = useRef({ session, settingsOpen, tab });
  useEffect(() => { nav.current = { session, settingsOpen, tab }; });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const n = nav.current;
      if (n.session) return false; // Quiz kendi onayını gösterir
      if (n.settingsOpen) { setSettingsOpen(false); return true; }
      if (n.tab !== 'home') { setTab('home'); return true; }
      return false;
    });
    return () => sub.remove();
  }, []);

  // Hatırlatmalar bugünkü hedefe göre kurulur: hedef tamamsa bugün bildirim gelmez
  useEffect(() => {
    if (loaded && !wiping && !seeding && s.onboarded) syncReminder(s).catch(() => {});
  }, [loaded, wiping, seeding, rev, s.onboarded, s.reminder, s.hour, s.minute, s.days, s.goal]);

  // Açılıştan sonra uygulama aşağıdan süzülerek gelir; yalnızca ilk girişte
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    if (splash) return;
    const t = setTimeout(() => setIntro(false), 1200);
    return () => clearTimeout(t);
  }, [splash]);
  const enter = intro ? FadeInDown.duration(700).delay(150).easing(Easing.out(Easing.cubic)) : undefined;

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#2F4A3E' }} />;
  if (splash || !loaded || wiping || seeding) return <><StatusBar style="light" /><Splash onDone={() => setSplash(false)} /></>;

  const wrap = (child: React.ReactNode) => <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>{child}</SafeAreaView>;

  if (!s.onboarded) return wrap(<Animated.View entering={enter} style={{ flex: 1 }}><Onboarding /></Animated.View>);
  if (session) return wrap(<Quiz {...session} questions={session.qs} onExit={() => { setSession(null); setRev((r) => r + 1); }} />);
  if (settingsOpen) return wrap(<Animated.View entering={FadeIn.duration(200)} style={{ flex: 1 }}><SettingsScreen back={() => setSettingsOpen(false)} /></Animated.View>);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'left', 'right']}>
      <Animated.View entering={enter} style={{ flex: 1 }}>
      <Animated.View key={tab + rev} entering={intro ? undefined : FadeIn.duration(200)} style={{ flex: 1 }}>
        {tab === 'home' && <Home start={setSession} openSettings={() => setSettingsOpen(true)} goTab={setTab} />}
        {tab === 'study' && <Study start={setSession} />}
        {tab === 'mock' && <Mock start={setSession} />}
        {tab === 'verbs' && <Verbs />}
        {tab === 'stats' && <Stats start={setSession} />}
      </Animated.View>
      <TabBar tab={tab} setTab={setTab} />
      </Animated.View>
    </SafeAreaView>
  );
}

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { c } = useTheme();
  const tap = useTap();
  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border }}>
      <View style={{ flexDirection: 'row', paddingTop: 8, paddingBottom: 4 }}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <Pressable key={t.id} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2, minHeight: 44 }} onPress={() => { if (!on) { tap(); setTab(t.id); } }}>
              <Icon name={t.icon} size={20} color={on ? c.primary : c.text2} />
              <T v={on ? 'microM' : 'micro'} color={on ? 'primary' : 'text2'}>{t.label}</T>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
