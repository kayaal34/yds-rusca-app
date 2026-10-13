# YDS Rusça: yapılacaklar

Öncelik: **P0** = yayından önce şart, **P1** = ürünü belirgin şekilde iyileştirir, **P2** = sonra.
Durum: `[ ]` yapılacak, `[x]` bitti.

## Bitenler (10 Ekim)
- [x] Soru kimlikleri metinden türetiliyor (soru eklenince geçmiş cevaplar kaymıyor)
- [x] Deneme süresi arka planda da işliyor
- [x] Veri kontrol betiği: `npm run check`
- [x] 8 ÖSYM sınavı (636 soru), premium arayüz, yeni konu anlatımı ekranı

## P0: Yayından önce
- [ ] ÖSYM sorularını yayın sürümünden çıkar (`src/data/osym` import'u). Telif: ÖSYM yazılı izin olmadan yayımlamayı yasaklıyor
- [ ] Tüm özgün Rusça içeriği (324 soru, 9 ders, 1050 fiil) anadili Rusça biri ya da Rusça öğretmeni kontrol etsin. Önce NOTLAR.md'deki şüpheli maddeler
- [ ] Hata yakalayıcı (ErrorBoundary): çökmede kırmızı ekran yerine "Bir sorun oldu, yeniden dene"
- [ ] Sınav tarihi otomatik ilerlesin: 22 Kasım geçince bir sonraki sınava geç. 2027-YDS/1 tarihi açıklanınca EXAMS'a ekle
- [ ] Veri yedeği: ilerlemeyi dosyaya dışa/içe aktar (uygulama silinince her şey gidiyor)
- [ ] Gizlilik politikası ve mağaza metinleri (Play Store şartı)
- [ ] Samsung'da APK testi (bildirim, titreşim, koyu tema, küçük ekran)
- [ ] Expo token'larını iptal et (sohbette paylaşıldı)

## P1: İçerik
- [ ] ÖSYM sorularına açıklama ekle (şu an sadece doğru cevap gösteriliyor)
- [ ] 80 eski özgün soruya açıklama ekle
- [ ] ÖSYM 7-16 dilbilgisi sorularının alt konu etiketlerini elle doğrula (otomatik tahminle atandı, analiz yanıltabilir)
- [ ] Taranmış iki kitapçık (2018 İlkbahar, 2019-YDS/2) için OCR
- [ ] Özgün soru sayısını konu başına 50'ye çıkar; YDS tiplerinde (12'şer) özellikle
- [ ] Konu anlatımına gerçek tablolar (hâl ekleri, fiil çekimleri) ve konu sonu mini test
- [ ] Fiiller: çekim tablosu (şimdiki/geçmiş/gelecek), yönetim (hangi hâli aldığı)

## P1: Deneyim
- [ ] Denemede "işaretle, sonra dön" ve sonda optik form görünümü
- [ ] Yarım kalan denemeye devam et (şu an çıkınca her şey kayboluyor)
- [ ] Geçmiş denemeye dokununca ayrıntılı sonuç ve yanlışlar açılsın
- [ ] Alıştırma modunda soruyu atla / geri dön
- [ ] Soruyu favorilere ekle, favori listesi
- [ ] Fiil kartlarında aralıklı tekrar (SRS): bilinen kartlar belirli günlerde tekrar gelsin
- [ ] Rusça sesli okuma (expo-speech): ders örnekleri ve fiiller
- [ ] Açılış animasyonunu kısalt ya da kaldır (her açılışta 1,4 sn bekletiyor)
- [ ] Tema seçenekleri: Kâğıt, Grafit, Bordo ve altın (önerildi, kullanıcı seçecek)

## P2: Sonra
- [ ] Akıllı hatırlatma: hedef tamamlandıysa bildirim gönderme
- [ ] Haftalık rapor ekranı
- [ ] Hesap ve cihazlar arası senkron (kullanıcının kendi sunucusu)
- [ ] Puan tahmini için gerçek YDS dönüşümü (şu an doğru yüzdesi)
- [ ] Erişilebilirlik: büyük yazı desteği, ekran okuyucu etiketleri
- [ ] Soru içinde arama
