# Denetim (12 Ekim 2026): yapılacaklar

Üç tarama (yazılımcı, UX/UI tasarımcı, öğrenci/ürün) birleştirildi. Satır numaraları tarama anındaki koda göre, kaymış olabilir.
Önerilen sıra: 1 → 2 → 4'teki hızlı tasarım düzeltmeleri → 6'dan "gerçek format deneme", "yarım denemeye devam", "deneme geçmişi".

## 1. Hatalar (hemen)
- [x] **Fiil destesi ilerlemeyi yok sayıyor** (Verbs.tsx ~14,20,56,65-70): `known` boş Map ile başlıyor, `Cards` desteyi useState başlatıcısında DB yüklenmeden kuruyor → öğrenilenler ilk turda tekrar gelir. Düzeltme: `loaded` state, yüklenene kadar Cards render etme (ya da key'e loaded ekle).
- [x] **Android geri tuşu Sonuç/Analiz'de uygulamadan çıkarıyor** (Quiz.tsx ~152-160, App.tsx ~65): done iken handler yok, Root session varken false dönüyor. `analyze` state'ini Quiz'e taşı; analyze → setAnalyze(false), değilse onExit(), true dön.
- [x] **Onboarding'de geri yok** (Intro.tsx, App.tsx ~64-69): Android geri uygulamadan çıkıyor; adım 1'den itibaren "Geri" + BackHandler step-1. Ayarlar'dan "Tanıtımı tekrar göster" açılınca settingsOpen true kalıyor, geri tuşu görünmeyen Ayarlar'ı kapatıyor (App.tsx ~66).
- [x] **Çift bildirim / yarış** (Settings.tsx ~59-81, notify.ts ~26-37, App.tsx ~74-76): scheduleDaily 30 await sürerken ikinci çağrı cancelAll'ı araya sokuyor. notify.ts'de modül düzeyi promise kuyruğu; Settings önce `update`, kurulumu yalnız Root effect'i (syncReminder) yapsın.
- [x] **markSeen deneme başlarken** (Mock.tsx ~72,152): hemen çıkınca sorular görülmüş sayılıyor. finish() içinde (exam dalı) çağır; ÖSYM listesi için de aynı.
- [x] **Ayarlar'da ad kaybı** (Settings.tsx ~96): yalnız onEndEditing; klavye açıkken Geri → kaydedilmez. onChangeText state + onBlur/unmount kaydı.
- [x] **Sınavda her saniye tam render** (Quiz.tsx ~67-74): sayacı ayrı `<Clock>` bileşenine taşı, Dot'u memo ile sar.
- [x] Sınav günü sabahı "1 gün" (settings.tsx ~104-107): daysUntil 09:00, examPassed 18:00; takvim günü farkı kullan.
- [x] DB açılışı bir kez hata verirse `dbp` reddedilmiş kalıyor (db.ts ~7): catch'te dbp = null.
- [x] Fiil araması `toLowerCase` (Verbs.tsx ~140): `toLocaleLowerCase('tr-TR')`.
- [x] Hatırlatma gün çipleri 360pt'de son çip kesiliyor (Settings.tsx ~149-151): flex:1 ya da flexWrap.
- [x] İlerleme sıfırlanınca syncReminder çağrılmıyor (Settings.tsx ~211).
- [x] Uyarı toast'unun setTimeout'u temizlenmiyor (Quiz.tsx ~87).
- [x] Erişilebilirlik: Option accessibilityRole/State (Quiz ~278-290), Slider accessibilityLabel (ui ~213), Segmented/Chip selected (ui ~141), Dot etiketinde yanıtlı/işaretli bilgisi (Quiz ~271).
- Doğrulanan, sorunsuz: resetAll/resetProgress tüm tablolar, hafta günü eşlemesi, sınav süresi ve çift kayıt koruması, wrongQids, soru id çakışması yok, koyu modda sabit renk yok (splash hariç).

## 2. Mantık tutarsızlıkları
- [x] Seri / yonca / gün şeridi farklı kurallar (db.ts ~130-143 streak, Home ~51,78-82,95-96, notify ~16). Önerilen tek kural: günlük hedef tamamlanan gün yeşil ve seriye sayılır (fiil çalışmasının nasıl sayılacağına karar ver).
- [ ] Bir deneme günlük hedefi tek başına dolduruyor (Quiz.tsx ~114, 80 cevap birden). → Bilerek bırakıldı: sınavda yalnız yanıtlanan sorular sayılıyor, 80 soru gerçek emek.
- [x] 2016 Sonbahar 76 soru ama full puanlanıyor (Mock.tsx ~152) → en yüksek 95. Puanı 100'e ölçekle ya da tam sayma.
- [x] Sınav tarihi geçince çıkmaz sokak: EXAMS tek eleman (settings.tsx ~21), Ayarlar'da tek seçenekli segmented (Settings ~123). Tek seçenekse düz metin; yeni tarih yoksa "ÖSYM açıklayınca eklenecek". 2027-YDS/1 eklenmeli.

## 3. Sınav mantığı (gerçek YDS'ye uyum)
- [x] Konu dağılımı: karma deneme 17 konudan eşit çekiyor (Mock.tsx ~14-37). Gerçek YDS: 6 kelime, 10 dilbilgisi, 10 cloze, 10 cümle tamamlama, 6 çeviri, 20 okuma, 5 diyalog, 4 yakın anlam, 4 paragraf tamamlama, 5 anlam bütünlüğü (2026 kılavuzuyla doğrula). Şu an dilbilgisi ~%47, okuma ~5 soru.
- [x] Bölüm sırası sabit olmalı (Quiz.tsx ~23-30,51 karıştırıyor).
- [x] Paragraf grubu deneme sonunda bölünebiliyor (Mock.tsx ~35-38 slice).
- [ ] "Sayılar" ve "Sıfat-fiil" ÖSYM havuzunda 0 soru ama denemede ayrı bölüm.
- [ ] Mini denemede YDS ölçeğinde yaklaşık karşılık yok (kullanıcı puan istemedi; belki "100 üzerinden" küçük bilgi).

## 4. Tasarım
İlk 10:
- [x] Fiil kartları sıkışık (Verbs.tsx ~31-55): tur boyutu seçimini kaldır (Ayarlar'da var), Hero tek satır, Kartlar/Liste Header'ın sağına ikon.
- [x] Açık tema `muted` #76807A kontrastı düşük (theme.tsx ~13) → ~#5E6862.
- [x] Doğru için iki yeşil (Quiz ~280 primary, ~420 ve Stats ~68 good): tek token `good`; Option right = goodSoft + good ikon.
- [x] Ana sayfa kalabalık: "Bu hafta" çubukları kaldır (şerit + Analiz'de var), liste sekmeleri tekrarlıyor (Home ~61-67) → yalnız "Yanlışlarını tekrar et" ve "Hızlı test" kalsın. Gün sayacı Chip `on` dolu yeşil yerine primarySoft.
- [x] Sonuç ekranı (Quiz ~392-445): "Hedef 75 · x puan kaldı/aşıldı", hedef aşılınca dolu yonca + tap('success').
- [x] Stats yüklenirken boş View (~42), boş durumda "Hızlı test çöz" butonu yok (~52-56).
- [x] Study son bölümde test CTA 3 kez (~178-195), bölüm gezintisi çift (çubuk ~145 + chip ~150).
- [ ] Dokunma alanları <44pt: Review Dot 30, şerit Dot 34, Chip ~32, Segmented ~40, metin linkleri ~30 → hitSlop/padding.
- [ ] Tip ölçeği eziliyor (fontSize 30/48/56/72/76/80, 17/19/21/22, 16, 12, 11): token ekle (title 21, question 18, micro 11, numL 56). İkonlar 16/20/24.
- [ ] Elle yazılmış kart ve liste grubu tekrarları → Card + tek ListGroup bileşeni.
Diğer:
- [x] Sekme etiketi 10.5pt muted (App ~123) → 11pt text2. #2F4A3E sabitleri theme'e.
- [ ] Btn secondary koyu temada silik (ui ~44).
- [ ] Intro hedef kart grid'i vs Ayarlar segmented: aynı ayar iki kontrol.
- [x] Mock açıklama paragrafı uzun, CTA ekran altında (~106-111) → tek satır + yapışkan "Başlat". Sınav uyarıları anahtarı Mock ve Ayarlar'da çift. ÖSYM sınavı onaysız başlıyor (~152) → onay. Geçmiş boş durumu sade.
- [x] Study örnek kartı sol 3px yeşil şerit (~169) → kaldır, panel zemin.
- [x] Verbs: uzun fiil 40pt'de kırılıyor (~107) → adjustsFontSizeToFit numberOfLines 1; kart arkası tam primary koyu temada göz yakıyor (~117) → primarySoft + text; "mükemmel görünüş" küçük harf (~111); satıra dokununca durum değişiyor (~161) → yalnız checkbox + tap().
- [x] Stats: yanlış nedeni çubukları yeşil (~91) → muted/bad; konu kartları tek ListGroup (~119-131).
- [x] Quiz: not kutusu her cevapta açık (~241) → "Not ekle" linki; işaretli soru kırmızı (~253, Dot ~273) → warn; "Yanlış 1/n" ama boşlar da var (~466) → "İnceleme"; analizde paragraf stili farklı (~475); "Bitir"/"Bitti" (~441/496).
- [x] Settings: "Hesabım" → "Profil"; "Bize ulaşın" → "Bize ulaş"; ad alanı düzenlenebilir görünmüyor (~96); "Veri" bölümünde tek satır (~181-186).
Korunacaklar: yonca serisi, "Yoncan solmasın", tek vurgu rengi, ince büyük rakamlar, gözden geçir ekranı, süre uyarıları, haptik, Türkçe mikro metin.

## 5. Kullanıcı olarak saçma
- [ ] Açılış 2,25 sn + 1,2 sn geçiş = ~3,5 sn her açılışta. Öneri: tam animasyon yalnız ilk açılışta, sonra ~1 sn. (Kullanıcı uzatılmasını istemişti, sor.)
- [x] Yarıda bırakılan deneme kayboluyor, devam yok.
- [ ] Alıştırmada soru atlanamıyor (Quiz ~259), geri dönülemiyor.
- [x] "Yanlışlarını tekrar et" tüm yanlışları tek oturumda açıyor (Home ~63) → 20'şerlik, konuya göre süzme.
- [x] Geçmiş denemeler tıklanamıyor, son 20 ile sınırlı (db ~71, Mock ~172), puan grafiği yok.
- [x] Hızlı test tamamen rastgele; `sort(() => Math.random()-0.5)` dengesiz karıştırma (Home ~13, Study ~120,192, Stats ~113) → Fisher-Yates.
- [ ] Fiillerde tekrar zamanlaması yok; "öğrendim" denen bir daha gelmez. Vurgu işareti yok.

## 6. Eksik özellikler
Olmazsa olmaz:
- [x] Yarım denemeye devam (+ markSeen bitişte).
- [x] Deneme geçmişi ayrıntısı (yanlışlar, konu dağılımı) ve puan grafiği (Analiz).
- [ ] Aralıklı tekrar (fiiller + yanlış sorular).
- [ ] Veri yedeği (dışa/içe aktar).
- [x] Gerçek format deneme (YDS dağılımı + sabit bölüm sırası).
- [ ] ÖSYM sorularına açıklama (636'nın hiçbirinde yok) + 80 eski özgün soru.
- [x] Soru favorileme, yanlışları konuya göre süzme.
Olsa iyi olur:
- [ ] Rusça sesli okuma (expo-speech) + vurgu işaretleri.
- [ ] Fiil dışı kelime (isim, sıfat, kalıp); YDS'nin ilk 6 sorusu ve okumanın çoğu kelimeye dayanıyor.
- [ ] Sınava kalan güne göre çalışma planı; haftalık özet; soru içinde arama.

## 7. İçerik ve yayın riskleri
- [ ] Rusça içerik (324 soru, 9 ders, 1567 fiil) anadili Rusça biri tarafından kontrol edilmedi; NOTLAR'daki şüpheli maddeler (P2 İvan Fyodorov tarihi vb.).
- [ ] ÖSYM telifi: kaldırılınca havuz 324; "yakın anlam" ve "paragraf tamamlama"da özgün soru yok; okuma 12, cloze 12; ~4 tam deneme. Özgün soru üretimi gerekli.
- [ ] Ders kapsamı: 9 dersin 8'i dilbilgisi. Okuma stratejisi, çeviri, bağlaç/geçiş dersleri yok.
- [ ] ÖSYM dilbilgisi alt konu etiketleri otomatik tahmin (analizi yanıltabilir).
- [ ] Yayın: ErrorBoundary/çökme raporu yok, hatalar `.catch(() => {})` ile yutuluyor; gizlilik politikası; android.versionCode / ios.buildNumber, EAS otomatik artırma; expo-updates (OTA) yok; uzaktan sınav takvimi; iPad (`supportsTablet: true`) test edilmedi; Samsung APK testi; sohbette paylaşılan Expo token'larını iptal et.


## 8. QA turu (13 Ekim): 39 bulgu düzeltildi
Tanıtım küçük ekran, yarım deneme (ÖSYM uyarısı, süre, kayma, seri), geri tuşu, sıfırlama, indeks, Dot memo, font hatası, dev sıfırlama, Türkçe büyük harf, mini denemede cloze, Özgün 80 puanlama, tek başarı tanımı (son cevap), günlük hedef geçmişi (day_goal), IconBadge.
