import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type StreakProps = { streak: number; today: number; goal: number; days: number };

// Ana ekran: seri, bugünkü hedef ve sınava kalan gün. Hedef tamamsa yaprak dolu yeşil.
// Widget kodu ayrı çalışır: dışarıdaki sabitlere erişemez, renkler fonksiyonun içinde.
const StreakWidget = (p: StreakProps, env: WidgetEnvironment) => {
  'widget';
  const dark = env.colorScheme === 'dark';
  const bg = dark ? '#151D1A' : '#F8F9F6';
  const fg = dark ? '#E9EFEB' : '#1B2420';
  const muted = dark ? '#8B988F' : '#5E6862';
  const green = dark ? '#9CCDB2' : '#2F4A3E';
  const done = p.today >= p.goal;
  return (
    <VStack alignment="leading" spacing={4} modifiers={[padding({ all: 4 }), containerBackground(bg, 'widget')]}>
      <HStack spacing={6}>
        <Image systemName={done ? 'leaf.fill' : 'leaf'} modifiers={[foregroundStyle(done ? green : muted)]} />
        <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(muted)]}>Seri</Text>
      </HStack>
      <Text modifiers={[font({ size: 40, weight: 'light', design: 'rounded' }), foregroundStyle(fg)]}>{p.streak}</Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>gün üst üste</Text>
      <Spacer />
      <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(done ? green : fg)]}>
        {done ? 'Hedef tamam' : `Bugün ${p.today}/${p.goal}`}
      </Text>
      {env.widgetFamily !== 'systemSmall' && <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>Sınava {p.days} gün</Text>}
    </VStack>
  );
};

export default createWidget('StreakWidget', StreakWidget);
