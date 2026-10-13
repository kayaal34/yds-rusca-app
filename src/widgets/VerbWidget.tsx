import { Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, lineLimit, minimumScaleFactor, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type VerbProps = { word: string; pair: string; tr: string; ex: string; exTr: string };

// Günün fiili: her gün gece yarısı değişir (zaman çizelgesi uygulamadan 7 gün ileriye kurulur).
// Orta boyda örnek cümle ve çevirisi de görünür.
const VerbWidget = (p: VerbProps, env: WidgetEnvironment) => {
  'widget';
  const dark = env.colorScheme === 'dark';
  const bg = dark ? '#151D1A' : '#F8F9F6';
  const fg = dark ? '#E9EFEB' : '#1B2420';
  const muted = dark ? '#8B988F' : '#5E6862';
  const green = dark ? '#9CCDB2' : '#2F4A3E';
  const wide = env.widgetFamily !== 'systemSmall';
  return (
    <VStack alignment="leading" spacing={4} modifiers={[padding({ all: 4 }), containerBackground(bg, 'widget')]}>
      <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(muted)]}>Günün fiili</Text>
      <Text modifiers={[font({ size: wide ? 26 : 22, weight: 'light' }), foregroundStyle(fg), lineLimit(1), minimumScaleFactor(0.6)]}>{p.word}</Text>
      {!!p.pair && <Text modifiers={[font({ size: 13 }), foregroundStyle(green), lineLimit(1)]}>{p.pair}</Text>}
      <Text modifiers={[font({ size: 14, weight: 'medium' }), foregroundStyle(fg), lineLimit(2)]}>{p.tr}</Text>
      <Spacer />
      {wide && <Text modifiers={[font({ size: 13 }), foregroundStyle(fg), lineLimit(2)]}>{p.ex}</Text>}
      {wide && <Text modifiers={[font({ size: 12 }), foregroundStyle(muted), lineLimit(2)]}>{p.exTr}</Text>}
    </VStack>
  );
};

export default createWidget('VerbWidget', VerbWidget);
