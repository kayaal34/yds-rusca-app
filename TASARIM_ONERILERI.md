# Tasarım incelemesi (16 Ekim 2026)

Tasarım ajanının raporu. A: düzeltilecek tutarsızlıklar, B: yeni tasarım önerileri (karar bekliyor), C: ilk 5.

## A) Tutarsızlıklar
1. Koyu temada panel (#18221E) ile kart (#151D1A) neredeyse aynı; Hero ayrışmıyor → dark panel #1B2621. Kullanılmayan hero1/hero2/primaryDark silinsin.
2. Kart iç boşluğu karışık (Hero 20, diğerleri 16) → tek değer 20; ListGroup inset'leri buna göre (Home 54, Settings 50).
3. İkinci vurgu rengi amber (işaret, favori, Analiz çubukları) → işaret/favori primarySoft+primary; Stats çubukları primary, %50 altı yalnız metin bad.
4. Seçili durum üç biçimde (dolu primary / primarySoft+kenar) → tek stil: bg primarySoft, metin primary, 1px kenar primary+59.
5. "Hedef tamam" Ana sayfada üç kez → Sıradaki alt yazısı "20 kelime · ~5 dk", tamamlanınca Progress satırı kalksın.
6. Hafta şeridinde tarih satırı gereksiz; seri sayısı birimsiz → numS + "gün".
7. Sekme geçişinde içerik zıplıyor (key={tab+rev}, boş week) → yer tutucu yoncalar, modül önbelleği.
8. DENETIM'de [x] ama yapılmamış: Stats konu kartları ListGroup değil; Verbs Kartlar/Liste hâlâ Segmented; Stats yüklenirken boş ekran.
9. Settings Item ile ListItem farklı → Settings ListItem + danger kullansın; ListItem ikon rengi text2.
10. Switch başparmağı kart rengiyle aynı → thumbColor açık onPrimary / kapalı text2, track false card2.
11. 44pt altı dokunma alanları: Segmented (~40), Review Dot 30, Study içindekiler çipleri, Mock metin bağlantıları.
12. Tip tokenları atlanıyor: ders metni body yerine reading; Dot fontSize → microM; "/100" → numS; kelime kartı için word tokenı; girdiler type.body.
13. Büyük rakam + birim 4 farklı biçimde → BigNum bileşeni.
14. Köşe yarıçapı: soru kartı 24 iken çevresi 16 → radius.btn; grafik çubukları radius.sm.
15. İkon boyutları dağınık → ölçek 14 / 18 / 20 / 32.
16. Yuvarlak ikon düğmeleri 36/40/52 → IconBtn (üst 40, alt 52).
17. Üçüncül eylemler 4 stilde → LinkBtn (smallM primary, 44pt).
18. Haptik ve basma opaklığı tutarsız → tap() eksik yerler, tek opaklık 0.7.
19. Kelime adlandırması: "Fiil turu", "fiil" metinleri isim/sıfat/kalıpta da → "Kelime turu", kategoriye göre metin.
20. Düğme metinleri: Devam/Sonraki, Değiştir/Düzenle → "Sonraki", "Düzenle".
21. Ayraç biçimi " · " / "  ·  " / virgül → her yerde " · ".
22. Bölüm başlıkları ham overline / Section karışık; ekran gap 16/12/8 → Section ve gap 16.
23. Açıklama paragrafları gürültülü → alt yazılar ve uzun metinler kısalsın.
24. Dört farklı girdi stili → Input bileşeni.
25. Gömülü renkler (#2F4A3E, SPLASH_*) → theme brand; "Yarım denemeyi sil" yeşil → muted; ÖSYM verisi yoksa Intro metni ve Mock ÖSYM seçeneği gizlensin.

## B) Yeni tasarım önerileri (karar bekliyor)
- B1 Ana sayfa "Bugün" Hero: ilerleme halkası (yonca dolar), "12/20", tek ana düğme; hedef puan kartı ve iki çubuk kalkar (M).
- B2 Sınav geri sayımı: başlangıçtan sınava ilerleme çizgisi, dönem metinleri, sınav haftası kontrol listesi, sınav günü ekranı, 7 ve 1 gün kala bildirim (S–M).
- B3 Sonuç ekranı: hedef çentikli çubuk, önceki denemeye göre fark, tek kartta doğru/yanlış/boş, günlük hedefi tamamlayınca yonca çiçeklenmesi (M).
- B4 Ders okuma: üstte 2pt ilerleme çubuğu, bölümler sayfası, tek satır konu testi, "Sonraki: başlık" düğmesi, derste bölüm ilerlemesi (M).
- B5 Kelime kartı: sağa/sola kaydırma (Öğrendim/Tekrar), arkada sıradaki kart, kategori çip satırı, sesli okuma (expo-speech) (M).
- B6 Mikro etkileşim: sabit haptik dili, basınca hafif küçülme, sayarak artan rakamlar (S).
- B7 Haftalık özet: pazartesi ilk açılışta geçen haftanın özeti ve odak testi (M).
- B8 Onboarding: her adım aynı şablon, sıra Ad → Sınav tarihi → Hedef → Günlük hedef → Bildirim, son ekran "Planın hazır" (S).
- B9 Sis tarzı paywall: sade, 2 plan kartı, sayaç ve kırmızı rozet yok (arayüz M, ödeme L).
- B10 Tahmini YDS puanı: son ~200 cevaptan bölüm ağırlıklı tahmin, Analiz'in başında (M).

## C) İlk yapılacak 5
1. Koyu panel, 20pt kart boşluğu, amber'in kaldırılması (A1–A3).
2. Ana sayfada "Bugün" Hero (B1 + A5–A7).
3. Tek liste ve seçim dili (A4, A8, A9, A11).
4. Yonca çiçeklenmeli sonuç ekranı ve haptik dili (B3 + B6).
5. Kelime kartında kaydırma ve adlandırma düzeltmesi (B5 + A19).
