import { createContext, useContext, useMemo } from 'react';
import { StyleSheet, TextStyle } from 'react-native';

// "Sis": taş grisi zemin, tek vurgu orman yeşili
const light = {
  bg: '#E8ECE7',
  card: '#F8F9F6',
  card2: '#DFE5E0',
  panel: '#D5DED7',
  border: '#D6DDD7',
  text: '#1B2420',
  text2: '#46524C',
  muted: '#5E6862', // açık zeminde okunur kontrast
  primary: '#2F4A3E',
  primaryDark: '#223A30',
  primarySoft: '#C9DACF', // panelden bir ton yeşil, panel üstünde de seçilir
  good: '#2E7D55',
  goodSoft: '#DCEBDF',
  bad: '#A0503E',
  badSoft: '#EBD9D3',
  warn: '#9A6B16',
  onPrimary: '#F1F5F2',
  hero1: '#D5DED7',
  hero2: '#D5DED7',
};

// Koyu "Sis": gece ormanı. Zemin, kart ve panel ayrı katmanlar; vurgu yumuşak adaçayı yeşili
const dark: typeof light = {
  bg: '#0C1210',
  card: '#151D1A',
  card2: '#1E2824',
  panel: '#1B2621', // karttan (#151D1A) bir ton açık: Hero ve paragraf kutuları ayrışır
  border: '#25302B',
  text: '#E9EFEB',
  text2: '#BAC6BF',
  muted: '#8B988F',
  primary: '#9CCDB2',
  primaryDark: '#86B99D',
  primarySoft: '#1E3229',
  good: '#8AD4AA',
  goodSoft: '#173026',
  bad: '#EBA592',
  badSoft: '#34211B',
  warn: '#E8C070',
  onPrimary: '#0B1A13',
  hero1: '#1B2621',
  hero2: '#1B2621',
};

export type Colors = typeof light;
export const palettes = { light, dark };
// Köşe ölçeği: küçük öğeler 8, düğme ve satırlar 16, kartlar 24, hap 999
export const radius = { sm: 8, btn: 16, card: 24, pill: 999 };

export const font = {
  thin: 'Inter_200ExtraLight',
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

// Tipografi ölçeği: büyük rakamlar ince, başlıklar hafif
export const type: Record<string, TextStyle> = {
  display: { fontFamily: font.thin, fontSize: 40, letterSpacing: -1.2, lineHeight: 46 },
  h1: { fontFamily: font.light, fontSize: 28, letterSpacing: -0.6, lineHeight: 34 },
  h2: { fontFamily: font.medium, fontSize: 18, letterSpacing: -0.2, lineHeight: 24 },
  h3: { fontFamily: font.semibold, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 23 },
  bodyM: { fontFamily: font.medium, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  smallM: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: font.medium, fontSize: 11, letterSpacing: 1.2 }, // büyük harf T içinde tr-TR ile
  num: { fontFamily: font.light, fontSize: 24, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  big: { fontFamily: font.thin, fontSize: 64, letterSpacing: -2.5, lineHeight: 68, fontVariant: ['tabular-nums'] },
  // Ölçeğin geri kalanı: ekranlarda elle fontSize yazılmaz, buradan seçilir
  h1M: { fontFamily: font.medium, fontSize: 28, letterSpacing: -0.6, lineHeight: 34 },
  title: { fontFamily: font.medium, fontSize: 21, letterSpacing: -0.3, lineHeight: 28 }, // bölüm başlığı, kart arkası
  question: { fontFamily: font.medium, fontSize: 19, letterSpacing: -0.2, lineHeight: 28 }, // soru metni
  reading: { fontFamily: font.regular, fontSize: 16, lineHeight: 25 }, // paragraf, şık
  readingM: { fontFamily: font.medium, fontSize: 17, lineHeight: 25 }, // Rusça örnek cümle
  chip: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: font.regular, fontSize: 11, lineHeight: 14 },
  microM: { fontFamily: font.medium, fontSize: 11, lineHeight: 14 },
  wheel: { fontFamily: font.medium, fontSize: 24, lineHeight: 30, fontVariant: ['tabular-nums'] },
  numS: { fontFamily: font.light, fontSize: 20, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  numL: { fontFamily: font.thin, fontSize: 48, letterSpacing: -1.5, lineHeight: 52, fontVariant: ['tabular-nums'] },
  bigS: { fontFamily: font.thin, fontSize: 56, letterSpacing: -2, lineHeight: 60, fontVariant: ['tabular-nums'] },
  bigL: { fontFamily: font.thin, fontSize: 76, letterSpacing: -3, lineHeight: 82, fontVariant: ['tabular-nums'] },
};

export const ThemeCtx = createContext<{ c: Colors; isDark: boolean }>({ c: light, isDark: false });
export const useTheme = () => useContext(ThemeCtx);

// Tema değişince yeniden hesaplanan StyleSheet
export function useStyles<T extends StyleSheet.NamedStyles<T>>(make: (c: Colors) => T): T {
  const { c } = useTheme();
  return useMemo(() => StyleSheet.create(make(c)), [c]);
}
