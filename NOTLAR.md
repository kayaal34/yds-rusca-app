# YDS Rusça uygulaması: notlar

## Durum (9 Ekim 2026)
- Expo SDK 57 + TypeScript. iPhone'da Expo Go ile geliştiriliyor (telefon ve bilgisayarda aynı Expo hesabı, kişisel access token).
- Tasarım (11 Ekim): "Sis" teması. Taş grisi zemin, tek vurgu orman yeşili (#2F4A3E), açık ve koyu mod. Inter (ince rakamlar 200/300), Feather ikonlar. Logo: tam halka + tik, altında YDS (`src/Logo.tsx`, ikonlar `python scripts/make-icons.py`).
- Deneme: 20/40/80 soru, süre kaydırıcıyla seçilir (soru başı en az 1 dk, önerilen 2,25 dk). Puan sadece 80 soruda (doğru × 1,25, yanlış götürmez). Üstte soru yuvarlakları, işaretleme, kontrole gönder ekranı, yanlış analizi (neden etiketi) ve soru altı not.
- Açılış animasyonu (yumuşak belirme), 3 adımlı tanıtım (ad, günlük hedef, hatırlatma), açık/koyu tema.
- Konu anlatımı: bölüm bölüm okuma, içindekiler, ilerleme çizgisi, örnek blokları, sonda konu testi.
- Sekmeler: Ana, Çalış (konu anlatımı + konu testleri), Deneme (20/40/80 soru, gerçek sınav modu), Fiiller (kartlar + liste), Analiz. Ayarlar ana sayfadaki çarktan.
- Soru havuzu: 324 özgün soru, 15 konu (8 dilbilgisi x 30, 7 YDS tipi x 12: cloze, cümle tamamlama, iki yönlü çeviri, paragraf, diyalog, anlam bütünlüğü). Açıklamalı.
- Konu anlatımı: 9 ders (`src/data/gen/lessons.json`).
- Zor fiiller (11 Ekim): 517 ileri düzey fiil, ayrı kategori, yönetim (gov) alanıyla (`hard_verbs_1..6.json`, birleştirme ve tekrar ayıklama `gen/index.ts`). Yapay zekâ yazdı, anadili Rusça biri kontrol etmedi.
- Fiiller: 1050 sık kullanılan fiil çifti, kart ve liste, "biliyorum" işaretleme (`verbs_*.json`, tekrarlar `gen/index.ts` içinde ayıklanır).
- Veri: SQLite (`src/db.ts`): cevaplar, denemeler, fiil ilerlemesi, ayarlar.
- Sınav tarihi: 2026-YDS/2 = 22 Kasım 2026 (ÖSYM duyurusu). 2027-YDS/1 açıklanınca `src/settings.tsx` > EXAMS'a ekle.

## Platform
- Geliştirme: iPhone + Expo Go.
- Samsung/Android: `eas.json` içinde `apk` profili hazır. Komut: `npx eas build -p android --profile apk` (Expo hesabı gerekli).
- Google Play'den önce: `production` profili (AAB).

## İçerik kalitesi (yayından önce)
- Tüm Rusça içerik yapay zekâ tarafından yazıldı; anadili Rusça biri kontrol etmedi.
- Ajanların emin olmadığını bildirdiği maddeler: vid "Если ты ___ задачу" (решаешь sınırda), dvizh "Машина медленно ___ мост", "Он ___ к окну"; leksika "не смог ___ соблазну"; soyuz "придёт ___ он" (ли aslında edat); cloze pasaj 3 boşluk 3; anlam #3, #5, #11, #12; paragraf P2 (İvan Fyodorov) tarihi ayrıntı.
- Fiil sıralaması kabaca, frekans doğrulanmadı.

## ÖSYM çıkmış soruları
- 8 sınav, 636 soru: 2016 Sonbahar (76), 2017 İlkbahar, 2017 Sonbahar, 2018 Sonbahar, 2019-YDS/1, 2020-YDS, 2021-YDS/1, 2021-YDS/2 (80'er). `src/data/osym/`.
- Kaynak PDF'ler `osym_raw/pdf/` (ÖSYM resmî sitesi). Metin: `pdftotext -layout -nodiag` (çapraz filigranı atar). Ayrıştırıcı: `osym_raw/parse_osym.py`.
- Atlananlar: 2018 İlkbahar ve 2019-YDS/2 kitapçıkları taranmış görüntü (metin katmanı yok), OCR gerekir. 2016 Sonbahar'da 4 soru ayrıştırılamadı.
- Deneme sekmesinde "ÖSYM çıkmış sınavlar" orijinal sırayla, şıklar karıştırılmadan çözülür.
- Telif: ÖSYM yazılı izin olmadan yayımlamayı yasaklıyor. Mağazaya çıkmadan önce `src/data/osym` import'u kaldırılmalı.

## Rakip analizi
- `RAKIP_ANALIZI.md`. Rusça YDS'ye özel uygulama bulunamadı. "BHK" kesinleşmedi (muhtemelen "Benim Hocam").

## Sonraki adımlar
1. ÖSYM PDF'lerinden çıkmış soru aktarımı (onay sonrası).
2. Soru havuzunu büyütmek (özellikle YDS tipleri).
3. Samsung APK.

## Güvenlik
- Sohbette paylaşılan iki Expo token'ı (robot + kişisel) expo.dev > Access tokens'tan SİL.
