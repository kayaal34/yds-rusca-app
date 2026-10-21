import { Component, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { brand } from './theme';
import { mail, recordCrash } from './crash';

// Bir ekran çökerse beyaz ekran yerine sakin bir hata ekranı gösterir.
// Tema/ayar bağlamı bozulmuş olabileceği için yalnız sabit renkler ve sistem yazı tipi kullanılır.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    const e = new Error(error.message);
    e.stack = `${error.stack ?? ''}\n${info.componentStack ?? ''}`;
    recordCrash(e, 'ekran');
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const report = () => mail('Uygulama hatası', { at: Date.now(), where: 'ekran', msg: error.message.slice(0, 300), stack: (error.stack ?? '').slice(0, 1500) });
    return (
      <View style={{ flex: 1, backgroundColor: brand.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '600', textAlign: 'center' }}>Bir sorun oldu</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, lineHeight: 23, textAlign: 'center' }}>
          Bu ekranda beklenmeyen bir hata oluştu. İlerlemen kayıtlı. Yeniden deneyebilir ya da hatayı bize bildirebilirsin.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => this.setState({ error: null })}
          style={({ pressed }) => ({ marginTop: 12, alignSelf: 'stretch', height: 52, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
        >
          <Text style={{ color: brand.bg, fontSize: 16, fontWeight: '600' }}>Yeniden dene</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={report}
          style={({ pressed }) => ({ alignSelf: 'stretch', height: 52, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>Hata bildir</Text>
        </Pressable>
      </View>
    );
  }
}
