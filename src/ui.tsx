import { Children, ComponentProps, ReactNode, useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleProp, Text, TextInput, TextProps, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Feather from '@expo/vector-icons/Feather';
import Animated, { Easing, runOnJS, SharedValue, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { icon as ICON, PRESSED, radius, space, type, useStyles, useTheme } from './theme';
import { band, useSettings } from './settings';

export type IconName = ComponentProps<typeof Feather>['name'];

export function useTap() {
  const { s } = useSettings();
  return (kind: 'light' | 'success' | 'error' = 'light') => {
    if (!s.haptics) return;
    if (kind === 'light') Haptics.selectionAsync().catch(() => {});
    else Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
  };
}

type TVariant = keyof typeof type;
export function T({ v = 'body', color, style, ...p }: TextProps & { v?: TVariant; color?: 'text' | 'text2' | 'muted' | 'primary' | 'good' | 'bad' | 'white' | string }) {
  const { c } = useTheme();
  const col = color === undefined ? c.text : color === 'white' ? '#fff' : (c as Record<string, string>)[color] ?? color;
  // textTransform:'uppercase' Türkçeyi bilmez (i → I); overline metni tr-TR ile büyütülür
  const children = v === 'overline' ? Children.map(p.children, (ch) => (typeof ch === 'string' ? ch.toLocaleUpperCase('tr-TR') : ch)) : p.children;
  return <Text {...p} style={[type[v], { color: col }, style]}>{children}</Text>;
}

// Listelerde ve kartlarda ikonun durduğu yuvarlak rozet (her yerde aynı boy ve renk)
export function IconBadge({ name, color }: { name: IconName; color?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={name} size={18} color={color ?? c.primary} />
    </View>
  );
}

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { c } = useTheme();
  return <Feather name={name} size={size} color={color ?? c.text} />;
}

// Hafif opaklık geri bildirimi olan buton; yaylanma yok
export function Btn({ title, onPress, kind = 'primary', icon, style, disabled }: { title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  const { c } = useTheme();
  const tap = useTap();
  const bg = { primary: c.primary, secondary: c.primarySoft, ghost: 'transparent', danger: c.badSoft }[kind];
  const fg = { primary: c.onPrimary, secondary: c.primary, ghost: c.primary, danger: c.bad }[kind];
  return (
    <Pressable
      disabled={disabled}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [
        { backgroundColor: bg, borderRadius: radius.pill, height: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
        (pressed || disabled) && { opacity: disabled ? 0.4 : PRESSED },
        style,
      ]}
    >
      {icon && <Feather name={icon} size={ICON.row} color={fg} />}
      <Text style={[type.bodyM, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const st = useStyles((c) => ({ card: { backgroundColor: c.card, borderRadius: radius.card, padding: space.card, gap: 8 } }));
  const tap = useTap();
  if (!onPress) return <View style={[st.card, style]}>{children}</View>;
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [st.card, pressed && { opacity: PRESSED }, style]}>
      {children}
    </Pressable>
  );
}

// Liste satırı: ikon kutusu + başlık/alt başlık + sağ öğe
export function Row({ icon, title, subtitle, right, onPress, progress, tint }: { icon?: IconName; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; progress?: number; tint?: string }) {
  const { c } = useTheme();
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16 }}>
      {icon && (
        <IconBadge name={icon} color={tint} />
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <T v="h3">{title}</T>
        {!!subtitle && <T v="small" color="muted">{subtitle}</T>}
        {progress !== undefined && <View style={{ marginTop: 8 }}><Bar value={progress} height={4} /></View>}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={ICON.row} color={c.muted} /> : null)}
    </Card>
  );
}

// Yumuşak adaçayı panel (eski degrade "hero" yerine)
// Kart içinde ayraçlı satır listesi (Ana sayfa kısayolları, deneme listeleri, Ayarlar grupları).
// inset: ayraç çizgisinin soldan boşluğu (ikonlu satırlarda metinle hizalı)
export function ListGroup({ children, inset = 16, style }: { children: ReactNode; inset?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ backgroundColor: c.card, borderRadius: radius.card, overflow: 'hidden' }, style]}>
      {rows.map((ch, i) => (
        <View key={i}>
          {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginLeft: inset }} />}
          {ch}
        </View>
      ))}
    </View>
  );
}

// ListGroup satırı: ikon, başlık, alt yazı, sağda değer; dokunulabiliyorsa ok işareti
// İkon nötr (text2); yeşil yalnız durum ve ana eylem için. danger: sıfırlama gibi geri alınamaz satırlar.
export function ListItem({ icon, title, sub, right, onPress, disabled, danger, chevron = true }: { icon?: IconName; title: string; sub?: string; right?: ReactNode; onPress?: () => void; disabled?: boolean; danger?: boolean; chevron?: boolean }) {
  const { c } = useTheme();
  const tap = useTap();
  const body = (
    <>
      {icon && <Feather name={icon} size={ICON.row} color={danger ? c.bad : c.text2} />}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="h3" color={danger ? 'bad' : 'text'}>{title}</T>
        {!!sub && <T v="small" color="muted">{sub}</T>}
      </View>
      {right}
      {onPress && !disabled && chevron && !danger && <Feather name="chevron-right" size={ICON.row} color={c.muted} />}
    </>
  );
  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 16, paddingHorizontal: space.card, paddingVertical: 12, minHeight: 56 };
  if (!onPress || disabled) return <View style={row}>{body}</View>;
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" style={({ pressed }) => [row, pressed && { opacity: PRESSED }]}>
      {body}
    </Pressable>
  );
}

export function Hero({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ backgroundColor: c.panel, borderRadius: radius.card, padding: space.card }, style]}>{children}</View>;
}

// Genişliği yumuşakça dolan ilerleme çubuğu
export function Bar({ value, color, height = 6, track }: { value: number; color?: string; height?: number; track?: string }) {
  const { c } = useTheme();
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(Math.max(0, Math.min(1, value || 0)), { duration: 600, easing: Easing.out(Easing.cubic) }); }, [value]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height, backgroundColor: track ?? c.card2, borderRadius: radius.pill, overflow: 'hidden' }}>
      <Animated.View style={[{ height, backgroundColor: color ?? c.primary, borderRadius: radius.pill }, a]} />
    </View>
  );
}

export function Header({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  const { c } = useTheme();
  const tap = useTap();
  return (
    <View style={{ gap: 4, marginTop: 4, marginBottom: 4 }}>
      {onBack && (
        <Pressable onPress={() => { tap(); onBack(); }} hitSlop={12} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' }}>
          <Feather name="chevron-left" size={ICON.nav} color={c.primary} />
          <T v="bodyM" color="primary">Geri</T>
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <T v="h1" style={{ flex: 1 }}>{title}</T>
        {right}
      </View>
      {!!subtitle && <T v="body" color="muted">{subtitle}</T>}
    </View>
  );
}

export function Section({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 2 }}>
      <T v="overline" color="muted">{title}</T>
      {right}
    </View>
  );
}

export function Segmented<V extends string | number>({ items, value, onChange }: { items: { v: V; l: string }[]; value: V; onChange: (v: V) => void }) {
  const { c } = useTheme();
  const tap = useTap();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.card2, borderRadius: radius.pill, padding: 3 }}>
      {items.map((it) => {
        const on = it.v === value;
        return (
          <Pressable key={String(it.v)} onPress={() => { tap(); onChange(it.v); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={[{ flex: 1, minHeight: 44, justifyContent: 'center', borderRadius: radius.pill, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' }, on && { backgroundColor: c.primarySoft, borderColor: c.primary + '59' }]}>
            <T v="smallM" color={on ? 'primary' : 'muted'}>{it.l}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

// Yuvarlak ikon düğmesi: üst çubukta 40, alt eylem çubuğunda 52
export function IconBtn({ name, onPress, label, size = 40, on, disabled, tone = 'card' }: { name: IconName; onPress: () => void; label: string; size?: 40 | 52; on?: boolean; disabled?: boolean; tone?: 'card' | 'outline' }) {
  const { c } = useTheme();
  const tap = useTap();
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      disabled={disabled}
      hitSlop={size < 44 ? 4 : 0}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!on, disabled: !!disabled }}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' },
        tone === 'card' ? { backgroundColor: on ? c.primarySoft : c.card } : { borderWidth: 1, borderColor: on ? c.primary + '59' : c.border, backgroundColor: on ? c.primarySoft : 'transparent' },
        (pressed || disabled) && { opacity: disabled ? 0.35 : PRESSED },
      ]}
    >
      <Feather name={name} size={size > 44 ? ICON.nav : ICON.row} color={on ? c.primary : tone === 'outline' ? c.primary : c.text2} />
    </Pressable>
  );
}

// Üçüncül eylem: düz yeşil metin bağlantısı (Düzenle, Sıfırla, Not ekle …), 44pt dokunma alanı
export function LinkBtn({ title, onPress, icon, tone = 'primary' }: { title: string; onPress: () => void; icon?: IconName; tone?: 'primary' | 'muted' }) {
  const { c } = useTheme();
  const tap = useTap();
  const col = tone === 'primary' ? c.primary : c.muted;
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' }, pressed && { opacity: PRESSED }]}>
      {icon && <Feather name={icon} size={ICON.inline} color={col} />}
      <T v="smallM" color={col}>{title}</T>
    </Pressable>
  );
}

// Büyük ince rakam ve yanında soluk birim (puan, gün, yüzde) — her yerde aynı hiza
export function BigNum({ value, unit, size = 'S', color }: { value: string | number; unit?: string; size?: 'S' | 'L'; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <T v={size === 'L' ? 'bigL' : 'bigS'} color={color}>{String(value)}</T>
      {!!unit && <T v="numS" color="muted">{unit}</T>}
    </View>
  );
}

// Metin girişi: tek stil (ad, arama, not)
export function Input(props: ComponentProps<typeof TextInput> & { icon?: IconName }) {
  const { c } = useTheme();
  const { icon: ic, style, ...rest } = props;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderRadius: radius.btn, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16, minHeight: 48 }}>
      {ic && <Feather name={ic} size={ICON.row} color={c.muted} />}
      <TextInput placeholderTextColor={c.muted} {...rest} style={[type.body, { flex: 1, color: c.text, paddingVertical: 12 }, style]} />
    </View>
  );
}

export function Stat({ value, label, color, style }: { value: string | number; label: string; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Card style={[{ flex: 1, gap: 2 }, style]}>
      <T v="num" color={color}>{String(value)}</T>
      <T v="small" color="muted">{label}</T>
    </Card>
  );
}

export function Badge({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'good' | 'bad' | 'muted' }) {
  const { c } = useTheme();
  const map = { primary: [c.primarySoft, c.primary], good: [c.goodSoft, c.good], bad: [c.badSoft, c.bad], muted: [c.card2, c.muted] }[tone];
  return (
    <View style={{ backgroundColor: map[0], borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 }}>
      <T v="chip" color={map[1]}>{label}</T>
    </View>
  );
}

// Hap biçimli küçük etiket; seçiliyse dolu
export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress?: () => void; icon?: IconName }) {
  const { c } = useTheme();
  const tap = useTap();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.pill, paddingHorizontal: 12, minHeight: 34, backgroundColor: on ? c.primarySoft : c.card, borderWidth: 1, borderColor: on ? c.primary + '59' : c.border }}>
      {icon && <Feather name={icon} size={ICON.inline} color={on ? c.primary : c.text2} />}
      <T v="chip" color={on ? 'primary' : 'text2'}>{label}</T>
    </View>
  );
  if (!onPress) return body;
  return <Pressable onPress={() => { tap(); onPress(); }} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: !!on }}>{body}</Pressable>;
}

type SliderState = { w: number; x0: number; last: number; min: number; max: number; step: number; onChange: (v: number) => void };

// Yalnızca yatay sürüklemede devreye girer; dikey kaydırma sayfaya kalır. Düğme 24 pt, değer düğme merkezine göre.
function sliderPan(s: SliderState) {
  const pick = (x: number) => {
    if (!s.w) return;
    const raw = s.min + Math.max(0, Math.min(1, (x - 12) / Math.max(1, s.w - 24))) * (s.max - s.min);
    const v = Math.max(s.min, Math.min(s.max, Math.round(raw / s.step) * s.step));
    if (v !== s.last) { s.last = v; s.onChange(v); }
  };
  return PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { s.x0 = e.nativeEvent.locationX; pick(s.x0); },
    onPanResponderMove: (_, g) => pick(s.x0 + g.dx),
  });
}

// Parmakla kaydırılan değer çubuğu (ek paket gerektirmez)
export function Slider({ value, min, max, step = 1, onChange }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const st = useRef<SliderState>({ w: 0, x0: 0, last: value, min, max, step, onChange });
  useEffect(() => { Object.assign(st.current, { w, min, max, step, onChange, last: value }); });
  // sliderPan ref nesnesini yalnızca dokunuş anında okur, render sırasında değil
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => sliderPan(st.current));
  const p = (value - min) / Math.max(1, max - min);
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.max(min, Math.min(max, value + (e.nativeEvent.actionName === 'increment' ? step : -step))))}
      style={{ height: 40, justifyContent: 'center' }}
    >
      <View pointerEvents="none" style={{ height: 4, borderRadius: 2, marginHorizontal: 12, backgroundColor: c.primary + '2E' }}>
        <View style={{ width: `${p * 100}%`, height: 4, borderRadius: 2, backgroundColor: c.primary }} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: p * Math.max(0, w - 24), width: 24, height: 24, borderRadius: 12, backgroundColor: c.primary, borderWidth: 3, borderColor: c.card }} />
    </View>
  );
}

const ROW = 44;
const VISIBLE = 5; // ortadaki seçili, üstte ve altta ikişer satır

// Tek satır: kaydırma konumuna göre UI iş parçacığında solar ve küçülür (kaydırırken React yeniden çizmez)
function WheelRow({ k, y, text }: { k: number; y: SharedValue<number>; text: string }) {
  const st = useAnimatedStyle(() => {
    const d = Math.min(2.5, Math.abs(y.value / ROW - k));
    return { opacity: 1 - d * 0.32, transform: [{ scale: 1 - d * 0.1 }] };
  });
  return (
    <Animated.View style={[{ height: ROW, alignItems: 'center', justifyContent: 'center' }, st]}>
      <T v="wheel" style={{ fontVariant: ['tabular-nums'] }}>{text}</T>
    </Animated.View>
  );
}

// iOS alarm saati gibi kaydırmalı seçici. Bırakınca en yakın satıra oturur, değer o an bildirilir.
export function Wheel({ values, value, onChange, format = String, label, width = 72 }: { values: number[]; value: number; onChange: (v: number) => void; format?: (v: number) => string; label: string; width?: number }) {
  const tap = useTap();
  const ref = useRef<Animated.ScrollView>(null);
  const start = Math.max(0, values.indexOf(value));
  const y = useSharedValue(start * ROW);
  const last = useSharedValue(start);
  const tick = () => tap();
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
    const k = Math.round(e.contentOffset.y / ROW);
    if (k !== last.value && k >= 0 && k < values.length) {
      last.value = k;
      runOnJS(tick)();
    }
  });
  // Değer dışarıdan değişince (ör. hızlı seçim çipi, ay değişince gün düzeltmesi) teker o satıra kayar
  useEffect(() => {
    const k = values.indexOf(value);
    if (k >= 0 && k !== Math.round(y.get() / ROW)) ref.current?.scrollTo({ y: k * ROW, animated: true });
  }, [value]);
  const pickAt = (off: number) => {
    const k = Math.max(0, Math.min(values.length - 1, Math.round(off / ROW)));
    if (values[k] !== value) onChange(values[k]);
  };
  const step = (dir: number) => {
    const k = Math.max(0, Math.min(values.length - 1, values.indexOf(value) + dir));
    ref.current?.scrollTo({ y: k * ROW, animated: true });
    onChange(values[k]);
  };
  return (
    <View
      style={{ height: ROW * VISIBLE, width, overflow: 'hidden' }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <Animated.ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        decelerationRate="fast"
        nestedScrollEnabled
        overScrollMode="never"
        contentOffset={{ x: 0, y: start * ROW }}
        contentContainerStyle={{ paddingVertical: ROW * 2 }}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={(e) => pickAt(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => { if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) pickAt(e.nativeEvent.contentOffset.y); }}
      >
        {values.map((v, k) => <WheelRow key={v} k={k} y={y} text={format(v)} />)}
      </Animated.ScrollView>
    </View>
  );
}

const HOURS = Array.from({ length: 24 }, (_, k) => k);
const MINUTES = Array.from({ length: 60 }, (_, k) => k);
const two = (n: number) => String(n).padStart(2, '0');

// Saat ve dakika tekerleri yan yana; seçili satırın şeridi ikisinin arkasında tek parça
export function TimeWheel({ hour, minute, onChange }: { hour: number; minute: number; onChange: (h: number, m: number) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', height: ROW * VISIBLE, paddingHorizontal: 12 }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ROW * 2, height: ROW, borderRadius: radius.btn, backgroundColor: c.card2 }} />
      <Wheel label="Saat" values={HOURS} value={hour} format={two} onChange={(h) => onChange(h, minute)} />
      <T v="wheel" style={{ marginBottom: 2 }}>:</T>
      <Wheel label="Dakika" values={MINUTES} value={minute} format={two} onChange={(m) => onChange(hour, m)} />
    </View>
  );
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const DAYS31 = Array.from({ length: 31 }, (_, k) => k + 1);
const MONTH_NUMS = Array.from({ length: 12 }, (_, k) => k + 1);

// Gün · ay · yıl tekerleri; değer "YYYY-MM-DD". Ayın gün sayısını aşan gün son güne çekilir.
export function DateWheel({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const { c } = useTheme();
  const [y, m, d] = value.split('-').map(Number);
  const now = new Date().getFullYear();
  const years = [now, now + 1, now + 2, now + 3];
  const set = (yy: number, mm: number, dd: number) => {
    const max = new Date(yy, mm, 0).getDate();
    onChange(`${yy}-${two(mm)}-${two(Math.min(dd, max))}`);
  };
  return (
    <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', height: ROW * VISIBLE, paddingHorizontal: 8 }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ROW * 2, height: ROW, borderRadius: radius.btn, backgroundColor: c.card2 }} />
      <Wheel key={`${y}-${m}`} label="Gün" values={DAYS31.slice(0, new Date(y, m, 0).getDate())} value={d} format={two} onChange={(v) => set(y, m, v)} />
      <Wheel label="Ay" values={MONTH_NUMS} value={m} format={(v) => MONTHS[v - 1]} onChange={(v) => set(y, v, d)} />
      <Wheel label="Yıl" values={years.includes(y) ? years : [y, ...years]} value={y} onChange={(v) => set(v, m, d)} width={88} />
    </View>
  );
}

// CEFR seviyeleri: dokununca hedef o seviyenin alt sınırına gelir; geçerli seviye vurgulu
const LEVELS: [string, number, string][] = [['B1', 40, '40–49'], ['B2', 50, '50–65'], ['C1', 66, '66–84'], ['C2', 85, '85–100']];
export function LevelPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { c } = useTheme();
  const tap = useTap();
  const cur = band(value);
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {LEVELS.map(([l, min, range]) => {
        const on = cur === l;
        return (
          <Pressable key={l} onPress={() => { tap(); onChange(min); }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${l} seviyesi, ${range} puan`}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: radius.btn, backgroundColor: on ? c.primarySoft : c.card2, borderWidth: 1, borderColor: on ? c.primary + '59' : 'transparent' }}>
            <T v="smallM" color={on ? 'primary' : 'text'}>{l}</T>
            <T v="micro" color={on ? 'primary' : 'muted'} style={{ fontVariant: ['tabular-nums'] }}>{range}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
