import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import Animated, { Easing, SharedValue, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const ACircle = Animated.createAnimatedComponent(Circle);

// Dört yapraklı yonca (32 birimlik kutu), ince çizgi. Kalp biçimli yaprak merkezden dışa bakar,
// çapraz açılarla dört kez döndürülür; sap alttaki iki yaprağın birleştiği yerden çıkar.
const LEAF = 'M16 15.2 C12.6 13 9.4 10.9 9.4 7.7 A3.3 3.3 0 0 1 16 6.9 A3.3 3.3 0 0 1 22.6 7.7 C22.6 10.9 19.4 13 16 15.2 Z';
export const STEM = 'M16 25.9 C16.3 28.1 17.3 29.9 19.6 31.5';
const ANGLES = [-45, 45, 135, 225];

// filled: yaprakların içi aynı renkte yarı saydam dolar (canlı yonca); kontur ince çizgi kalır
export function Clover({ size = 24, color, weight = 1.15, filled = false }: { size?: number; color: string; weight?: number; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G stroke={color} strokeWidth={weight} strokeLinejoin="round" strokeLinecap="round">
        {ANGLES.map((a) => <Path key={a} d={LEAF} transform={`rotate(${a} 16 16)`} fill={filled ? color : 'none'} fillOpacity={0.55} />)}
        <Path d={STEM} fill="none" />
      </G>
    </Svg>
  );
}

const R = 42;
const RING = 2 * Math.PI * R; // ≈ 264
const APath = Animated.createAnimatedComponent(Path);

// Tek yaprak: doluluk p (0-1) içinde kendi dilimine göre dolar; yapraklar sırayla yeşerir
function FillLeaf({ angle, fill, p, k, color, weight }: { angle: number; fill: string; p: SharedValue<number>; k: number; color: string; weight: number }) {
  const props = useAnimatedProps(() => ({ fillOpacity: Math.max(0, Math.min(1, p.value * 4 - k)) }));
  return <APath d={LEAF} transform={`rotate(${angle} 16 16)`} fill={fill} stroke={color} strokeWidth={weight} strokeLinejoin="round" animatedProps={props} />;
}

// Logo işareti: tam halka ve içinde yonca. animate=true iken halka kapanır, yonca açılır,
// sonra yaprakları saat yönünde tek tek yeşerir (fill verilirse).
export function LogoMark({ size = 104, color, fill, animate = false, delay = 0 }: { size?: number; color: string; fill?: string; animate?: boolean; delay?: number }) {
  const ring = useSharedValue(animate ? 0 : 1);
  const leaf = useSharedValue(animate ? 0 : 1);
  const grow = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    ring.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.inOut(Easing.cubic) }));
    leaf.value = withDelay(delay + 550, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    grow.value = withDelay(delay + 900, withTiming(1, { duration: 700, easing: Easing.linear }));
  }, [animate]);
  const ringP = useAnimatedProps(() => ({ strokeDashoffset: RING * (1 - ring.value) }));
  const leafSt = useAnimatedStyle(() => ({
    opacity: Math.min(1, leaf.value * 1.6),
    transform: [{ scale: 0.6 + leaf.value * 0.4 }, { rotate: `${(1 - leaf.value) * -30}deg` }],
  }));
  const inner = size * 0.6;
  const w = 1.5;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 104 104" style={{ position: 'absolute' }}>
        <ACircle cx={52} cy={52} r={R} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${RING} ${RING}`} animatedProps={ringP} transform="rotate(-90 52 52)" />
      </Svg>
      <Animated.View style={leafSt}>
        {fill ? (
          <Svg width={inner} height={inner} viewBox="0 0 32 32">
            <Path d={STEM} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" />
            {ANGLES.map((a, k) => <FillLeaf key={a} angle={a} k={k} p={grow} fill={fill} color={color} weight={w} />)}
          </Svg>
        ) : (
          <Clover size={inner} color={color} weight={w} />
        )}
      </Animated.View>
    </View>
  );
}
