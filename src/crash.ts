import { Alert, Linking, Platform } from 'react-native';
import { getSetting, setSetting } from './db';

// Geri bildirim ve çökme raporlarının gittiği adres
export const CONTACT_EMAIL = 'kodmod034@gmail.com';
export const VERSION = '1.0';

const KEY = 'crashLog';
export type Crash = { at: number; where: string; msg: string; stack: string };

// Son hata telefonda saklanır; "Hata bildir" e-postasına eklenir. Kayıt başarısız olursa sessizce geçilir (zaten hata anındayız).
export function recordCrash(err: unknown, where: string) {
  const e = err instanceof Error ? err : new Error(String(err));
  const c: Crash = { at: Date.now(), where, msg: e.message.slice(0, 300), stack: (e.stack ?? '').slice(0, 1500) };
  return setSetting(KEY, JSON.stringify(c)).catch(() => {});
}

export async function lastCrash(): Promise<Crash | null> {
  try {
    const raw = await getSetting(KEY);
    return raw ? (JSON.parse(raw) as Crash) : null;
  } catch {
    return null;
  }
}

export const clearCrash = () => setSetting(KEY, '').catch(() => {});

const crashText = (c: Crash) =>
  `\n\nSon hata (${new Date(c.at).toLocaleString('tr-TR')}, ${c.where}):\n${c.msg}\n${c.stack}`;

export function mail(subject: string, crash?: Crash | null) {
  const body = `\n\n---\nYDS Rusça v${VERSION} · ${Platform.OS} ${Platform.Version}${crash ? crashText(crash) : ''}`;
  return Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('YDS Rusça · ' + subject)}&body=${encodeURIComponent(body)}`)
    .catch(() => Alert.alert('E-posta açılamadı', `Bize ${CONTACT_EMAIL} adresinden yazabilirsin.`));
}

// Ekran dışındaki yakalanmamış hatalar (dokunma işleyicileri, zamanlayıcılar) da kaydedilir; varsayılan davranış korunur
let installed = false;
export function installCrashHandler() {
  const EU = (globalThis as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } }).ErrorUtils;
  if (installed || !EU) return;
  installed = true;
  const prev = EU.getGlobalHandler();
  EU.setGlobalHandler((e, fatal) => {
    recordCrash(e, fatal ? 'genel (ölümcül)' : 'genel');
    prev(e, fatal);
  });
}
