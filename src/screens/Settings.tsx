import { ReactNode, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, Switch, TextInput, View } from 'react-native';
import { brand, font, space, useTheme } from '../theme';
import { band, EXAMS, examLabel, examPassed, useSettings } from '../settings';
import { cancelDaily, scheduleDaily, syncReminder } from '../notify';
import { syncWidgets } from '../widgets/sync';
import { resetHomeCache } from './Home';
import { resetAll, resetProgress } from '../db';
import { Chip, DateWheel, Header, Icon, IconName, LevelPicker, LinkBtn, ListGroup, ListItem, Section, Segmented, Slider, T, TimeWheel } from '../ui';
import { LogoMark } from '../Logo';

// expo hafta günü numarası (1=Pazar) ve kısa ad; Pazartesiden başlar
const DAYS: [string, string][] = [['2', 'Pt'], ['3', 'Sa'], ['4', 'Ça'], ['5', 'Pe'], ['6', 'Cu'], ['7', 'Ct'], ['1', 'Pz']];

// Ayarlar satırı: ortak ListItem (sağda anahtar ya da değer); dokunulabilir satırlarda ok işareti ListItem'dan gelir
function Item({ icon, label, children, onPress, danger }: { icon: IconName; label: string; children?: ReactNode; onPress?: () => void; danger?: boolean }) {
  return <ListItem icon={icon} title={label} right={children} onPress={onPress} danger={danger} />;
}

// Ayraç metinle hizalı: kart boşluğu + ikon + aralık
const Group = ({ children }: { children: ReactNode }) => <ListGroup inset={space.card + 18 + 16}>{children}</ListGroup>;

// Geri bildirim adresi; boşken "Bize ulaşın" satırları bilgi mesajı gösterir
const CONTACT_EMAIL = 'kodmod034@gmail.com';
const VERSION = '1.0';

function mail(subject: string) {
  if (!CONTACT_EMAIL) return Alert.alert('Yakında', 'İletişim adresi henüz eklenmedi.');
  const body = `\n\n---\nYDS Rusça v${VERSION} · ${Platform.OS} ${Platform.Version}`;
  Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('YDS Rusça · ' + subject)}&body=${encodeURIComponent(body)}`)
    .catch(() => Alert.alert('E-posta açılamadı', `Bize ${CONTACT_EMAIL} adresinden yazabilirsin.`));
}

export function SettingsScreen({ back }: { back: () => void }) {
  const { c } = useTheme();
  const { s: st, update, reload } = useSettings();
  const [msg, setMsg] = useState('');
  const [editDate, setEditDate] = useState(false);

  const setReminder = async (on: boolean, hour = st.hour, minute = st.minute, days = st.days) => {
    setMsg('');
    if (on) {
      const ok = await scheduleDaily(hour, minute, days).catch(() => false);
      if (!ok) { setMsg('Bildirim izni verilmedi. Telefon ayarlarından izin verebilirsin.'); await update({ reminder: false }); return; }
    } else await cancelDaily().catch(() => {});
    await update({ reminder: on, hour, minute, days });
  };

  // Gün seç/kaldır; en az bir gün kalır
  const toggleDay = (d: string) => {
    const next = st.days.includes(d) ? st.days.replace(d, '') : [...st.days + d].sort().join('');
    if (!next) return;
    update({ days: next });
  };

  const setTime = (h: number, m: number) => update({ hour: h, minute: m });

  return (
    <ScrollView contentContainerStyle={{ padding: space.screen, gap: 8, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Header title="Ayarlar" onBack={back} />

      <Section title="Profil" />
      <Group>
        <Item icon="user" label="Ad">
          {/* Her harfte kaydedilir; klavye açıkken geri dönülse de ad kaybolmaz */}
          <TextInput defaultValue={st.name} onChangeText={(t) => update({ name: t.trim() })} placeholder="Adını yaz" placeholderTextColor={c.muted} maxLength={20} accessibilityLabel="Ad" returnKeyType="done" style={{ flex: 1, maxWidth: 180, textAlign: 'right', color: c.text2, fontFamily: font.regular, fontSize: 15, paddingVertical: 6 }} />
          <Icon name="edit-2" size={14} color={c.muted} />
        </Item>
        <View style={{ padding: space.card, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name="target" size={18} color={c.text2} />
            <T v="h3">Günlük hedef</T>
          </View>
          <Segmented items={[10, 20, 30, 50].map((g) => ({ v: g, l: `${g} soru` }))} value={st.goal} onChange={(v) => update({ goal: v })} />
        </View>
        <View style={{ padding: space.card, gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name="award" size={18} color={c.text2} />
            <T v="h3" style={{ flex: 1 }}>Hedef puan</T>
            <T v="bodyM">{st.target}{band(st.target) ? ` · ${band(st.target)}` : ''}</T>
          </View>
          <Slider value={st.target} min={40} max={100} step={1} onChange={(v) => update({ target: v })} />
          <LevelPicker value={st.target} onChange={(v) => update({ target: v })} />
        </View>
      </Group>

      <Section title="Sınav" />
      <Group>
        <View style={{ padding: space.card, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name="calendar" size={18} color={c.text2} />
            <T v="h3">Hedef sınav</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="h3">YDS sınavı</T>
              <T v="small" color={examPassed(st.examDate) ? 'bad' : 'muted'}>
                {new Date(st.examDate + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {examPassed(st.examDate) ? ' · geçti, yeni tarih seç' : ''}
              </T>
            </View>
            <LinkBtn title={editDate ? 'Tamam' : 'Düzenle'} onPress={() => setEditDate(!editDate)} />
          </View>
          {editDate && (
            <>
              {/* Bilinen ÖSYM tarihleri hızlı seçim; istenen tarih tekerle elle girilir */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {EXAMS.filter((e) => !examPassed(e.date)).map((e) => <Chip key={e.date} label={`YDS · ${examLabel(e.date)}`} on={st.examDate === e.date} onPress={() => update({ examDate: e.date })} />)}
              </View>
              <DateWheel value={st.examDate} onChange={(d) => update({ examDate: d })} />
            </>
          )}
        </View>
        <Item icon="watch" label="Sınav uyarıları">
          <Switch accessibilityLabel="Sınav uyarıları" value={st.examAlerts} onValueChange={(v) => update({ examAlerts: v })} trackColor={{ true: c.primary, false: c.card2 }} thumbColor={st.examAlerts ? brand.fg : c.text2} ios_backgroundColor={c.card2} />
        </Item>
      </Group>
      <T v="small" color="muted" style={{ paddingHorizontal: 4 }}>Denemede yarı süre, 30 dakika ve 5 dakika kala kısa bir uyarı ve titreşim.</T>

      <Section title="Bildirim" />
      <Group>
        <Item icon="bell" label="Günlük hatırlatma">
          <Switch accessibilityLabel="Günlük hatırlatma" value={st.reminder} onValueChange={(v) => setReminder(v)} trackColor={{ true: c.primary, false: c.card2 }} thumbColor={st.reminder ? brand.fg : c.text2} ios_backgroundColor={c.card2} />
        </Item>
        {st.reminder && (
        <View style={{ padding: space.card, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name="clock" size={18} color={c.text2} />
            <T v="h3">Saat</T>
          </View>
          <TimeWheel hour={st.hour} minute={st.minute} onChange={setTime} />
        </View>
        )}
        {st.reminder && (
        <View style={{ padding: space.card, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name="calendar" size={18} color={c.text2} />
            <T v="h3">Günler</T>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DAYS.map(([d, l]) => <Chip key={d} label={l} on={st.days.includes(d)} onPress={() => toggleDay(d)} />)}
          </View>
        </View>
        )}
      </Group>
      {!!msg && <T v="small" color="bad">{msg}</T>}

      <Section title="Çalışma" />
      <Group>
        <View style={{ padding: space.card, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name="layers" size={18} color={c.text2} />
            <T v="h3">Kelime turu</T>
          </View>
          <Segmented items={[10, 20, 30, 50].map((g) => ({ v: g, l: `${g} kelime` }))} value={st.verbBatch} onChange={(v) => update({ verbBatch: v })} />
        </View>
      </Group>

      <Section title="Görünüm" />
      <Group>
        <View style={{ padding: space.card, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name="moon" size={18} color={c.text2} />
            <T v="h3">Tema</T>
          </View>
          <Segmented items={[{ v: 'system' as const, l: 'Sistem' }, { v: 'light' as const, l: 'Açık' }, { v: 'dark' as const, l: 'Koyu' }]} value={st.theme} onChange={(v) => update({ theme: v })} />
        </View>
        <Item icon="smartphone" label="Titreşim">
          <Switch accessibilityLabel="Titreşim" value={st.haptics} onValueChange={(v) => update({ haptics: v })} trackColor={{ true: c.primary, false: c.card2 }} thumbColor={st.haptics ? brand.fg : c.text2} ios_backgroundColor={c.card2} />
        </Item>
      </Group>

      <Section title="Yardım" />
      <Group>
        {/* Ayarlar önce kapanır; yoksa tanıtımdayken geri tuşu görünmeyen Ayarlar'ı kapatır */}
        <Item icon="play-circle" label="Tanıtımı tekrar göster" onPress={() => { back(); update({ onboarded: false }); }} />
        <Item icon="message-circle" label="Öneri gönder" onPress={() => mail('Öneri')} />
        <Item icon="alert-circle" label="Hata bildir" onPress={() => mail('Hata bildirimi')} />
        <Item icon="edit-3" label="Soruda hata var" onPress={() => mail('Soru hatası')} />
      </Group>
      <T v="small" color="muted" style={{ paddingHorizontal: 4 }}>{CONTACT_EMAIL ? `Bize ulaş: ${CONTACT_EMAIL}` : 'İletişim adresi yakında eklenecek.'}</T>

      <Section title="Sıfırlama" />
      <Group>
        <Item
          icon="rotate-ccw"
          label="İlerlemeyi sıfırla"
          danger
          onPress={() =>
            Alert.alert('İlerleme sıfırlansın mı?', 'Cevapların, denemelerin, yarım denemen, serin, kelime ilerlemen, görülen sorular ve yanlış analizlerin silinir. Ayarların, notların ve favorilerin kalır. Bu işlem geri alınamaz.', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Sıfırla', style: 'destructive', onPress: () => resetProgress().then(() => { resetHomeCache(); syncReminder(st).catch(() => {}); syncWidgets(st).catch(() => {}); Alert.alert('İlerleme sıfırlandı'); }).catch(() => Alert.alert('Sıfırlanamadı', 'Tekrar dene.')) },
            ])
          }
        />
        <Item
          icon="trash-2"
          label="Her şeyi sıfırla"
          danger
          onPress={() =>
            Alert.alert('Her şey sıfırlansın mı?', 'İlerlemen, notların ve ayarların silinir, uygulama ilk açılıştaki gibi tanıtımla başlar. Bu işlem geri alınamaz.', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Her şeyi sıfırla', style: 'destructive', onPress: () => cancelDaily().catch(() => {}).then(resetAll).then(() => { resetHomeCache(); back(); return reload(); }).catch(() => Alert.alert('Silinemedi', 'Tekrar dene.')) },
            ])
          }
        />
      </Group>
      <T v="small" color="muted" style={{ paddingHorizontal: 4 }}>Bu işlemler geri alınamaz.</T>

      <View style={{ alignItems: 'center', gap: 12, marginTop: 28 }}>
        <LogoMark size={40} color={c.primary} />
        <T v="smallM" color="text2">YDS Rusça · v{VERSION}</T>
      </View>
    </ScrollView>
  );
}
