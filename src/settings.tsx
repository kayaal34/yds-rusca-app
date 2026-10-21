import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { getSettings, setSetting } from './db';

export type Settings = {
  onboarded: boolean;
  name: string;
  goal: number; // günlük soru hedefi
  theme: 'system' | 'light' | 'dark';
  haptics: boolean;
  reminder: boolean;
  hour: number;
  minute: number;
  examDate: string; // YYYY-MM-DD
  examAlerts: boolean; // denemede yarı süre, 30 dk ve 5 dk kala uyarı
  target: number; // hedef YDS puanı (0-100)
  verbBatch: number; // fiil turunda kaç kart
  wordNotif: boolean; // her gün günün kelimesi bildirimi
  wordHour: number;
  wordMinute: number;
  days: string; // hatırlatma günleri, expo hafta günü (1=Pazar … 7=Cumartesi), ör. "1234567"
};

// Bilinen ÖSYM YDS tarihleri (hızlı seçim); kullanıcı başka tarihi elle de seçebilir
export const EXAMS = [{ id: 'YDS', date: '2026-11-22' }];
// Kısa tarih etiketi: "22 Kasım 2026"
export const examLabel = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

export const DEFAULTS: Settings = {
  onboarded: false,
  name: '',
  goal: 20,
  theme: 'system',
  haptics: true,
  reminder: false,
  hour: 20,
  minute: 0,
  examDate: '2026-11-22',
  examAlerts: true,
  target: 70,
  verbBatch: 20,
  days: '1234567',
  wordNotif: true,
  wordHour: 9,
  wordMinute: 0,
};

function parse(raw: Record<string, string>): Settings {
  const s = { ...DEFAULTS };
  if (raw.onboarded) s.onboarded = raw.onboarded === '1';
  if (raw.name) s.name = raw.name;
  if (raw.goal) s.goal = Number(raw.goal) || DEFAULTS.goal;
  if (raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'system') s.theme = raw.theme;
  if (raw.haptics) s.haptics = raw.haptics === '1';
  if (raw.reminder) s.reminder = raw.reminder === '1';
  if (raw.hour) s.hour = Number(raw.hour);
  if (raw.minute) s.minute = Number(raw.minute);
  if (raw.examDate) s.examDate = raw.examDate;
  if (raw.examAlerts) s.examAlerts = raw.examAlerts === '1';
  if (raw.target) s.target = Math.min(100, Math.max(0, Number(raw.target) || DEFAULTS.target));
  if (raw.verbBatch) s.verbBatch = Number(raw.verbBatch) || DEFAULTS.verbBatch;
  if (raw.wordNotif) s.wordNotif = raw.wordNotif === '1';
  if (raw.wordHour) s.wordHour = Number(raw.wordHour);
  if (raw.wordMinute) s.wordMinute = Number(raw.wordMinute);
  if (raw.days !== undefined && /^[1-7]*$/.test(raw.days)) s.days = raw.days;
  return s;
}

const Ctx = createContext<{ s: Settings; loaded: boolean; update: (p: Partial<Settings>) => Promise<void>; reload: () => Promise<void> }>({
  s: DEFAULTS,
  loaded: false,
  update: async () => {},
  reload: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // Veritabanından yeniden okur (her şey silindikten sonra varsayılanlara döner)
  const reload = useCallback(async () => {
    const raw = await getSettings().catch(() => ({}));
    setS(parse(raw));
  }, []);

  useEffect(() => {
    getSettings()
      .then((raw) => setS(parse(raw)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback(async (p: Partial<Settings>) => {
    setS((cur) => ({ ...cur, ...p }));
    for (const [k, v] of Object.entries(p)) {
      await setSetting(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
    }
  }, []);

  return <Ctx.Provider value={{ s, loaded, update, reload }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);

// Sınav tarihi geçtiyse true (sayaç "0 gün"de takılmasın)
// Sınav 10:15'te başlar, 180 dk sürer: 13:15'ten sonra geçmiş sayılır
export const examStart = (date: string) => new Date(date + 'T10:15:00').getTime();
export const examPassed = (date: string) => examStart(date) + 3 * 3600000 < Date.now();

// Tam sınav puanı 100 üzerinden: 80 soruda her doğru 1,25, yanlış götürmez. İptal sorulu (ör. 76 soruluk)
// sınavlarda puan kalan sorular üzerinden hesaplanır. Türkçe ondalık virgülle.
export const score = (right: number, total = 80) => Math.round((right * 10000) / Math.max(1, total)) / 100;
export const fmtScore = (right: number, total = 80) => String(score(right, total)).replace('.', ',');

// YDS puanının Avrupa Dil Pasaportu (CEFR) karşılığı. Kaynak: Kamu Hizmeti Komisyonu yabancı dil sınavları
// eşdeğerlik tablosu (MEB sitesinde yayımlanan): C2 85-100, C1 66-84, B2 50-65, B1 40-49. A1-A2 için YDS karşılığı yok.
export const band = (p: number) => (p >= 85 ? 'C2' : p >= 66 ? 'C1' : p >= 50 ? 'B2' : p >= 40 ? 'B1' : '');
export const BANDS = 'B1 40–49 · B2 50–65 · C1 66–84 · C2 85–100';

// Takvim günü farkı: sınav günü 0 ("Sınav bugün"), önceki gün 1
// Kalan tam gün: ana sayfadaki geri sayımla aynı (0 = sınava 24 saatten az kaldı)
export function daysUntil(date: string) {
  return Math.max(0, Math.floor((examStart(date) - Date.now()) / 86400000));
}
