# Rakip Analizi ve Sinav Takvimi (2026-10-09)

Not: Web aramasi araciyla yapildi; magaza sayfalari (App Store 429 hatasi) dogrudan acilamadi. Yorum/sikayet maddeleri dogrulanmis veri DEGIL, sektor genel egilimi + gorulen aciklamalardir.

## 1) Resmi ÖSYM tarihleri

- **2026-YDS/2: 22 Kasim 2026 (Pazar), 10.15, 180 dk.** Basvuru 30 Eylul - 8 Ekim 2026, ucret son gun 9 Ekim, gec basvuru 14 Ekim 2026, sonuc 10 Aralik 2026.
  - Kilavuz: Almanca, Arapca, Fransizca, Ingilizce ve **Rusca** dillerinde yapilir (arama ozeti kilavuza dayandirildi; PDF'i dogrudan acmadim).
  - https://osym.gov.tr/2026-yds2-basvurularin-alinmasi
  - https://dokuman.osym.gov.tr/web/2026/9/basvuru-kilavuzu-8g5h1l-29160339.pdf
  - https://www.osym.gov.tr/Sayfa/SinavTakvimi
- **2026-YDS/1** (gecmis): 5 Nisan 2026, 20 farkli dilde. https://www.osym.gov.tr/2026yds1-20-farkli-dilde-gerceklestirilecek
- **2027-YDS/1: BULUNAMADI.** 2027 takvimi henuz yayimlanmamis gorunuyor. Gecmis (2025 takvimi 13.11.2024, 2026 takvimi ~20.11.2025) uzerinden tahmin: Kasim 2026 civari aciklanir; YDS/1 tipik olarak Nisan, basvuru Subat. Bu bir tahmindir, resmi degil.
- Ayrica e-YDS (bilgisayarli, Ingilizce odakli) ayri seri; YDS/1-2 ile karistirilmamali.
- Uyari: Uygulama icindeki "sinava kalan gun" sayaci tarihi uzaktan (config/Supabase) guncellenebilir tutulmali; 2027 tarihi cikinca kod degistirmeden guncellensin.

## 2) Rakipler

Rusca YDS'ye ozel mobil uygulama BULUNAMADI (Google Play/App Store aramasi). Rusca tarafta sadece kitaplar var: Dr. Hikmet Sahiner "YDS Rusca Kelimeleri" serisi (B1-C1, 8700 kelimeden 6700'u), YDS Rusca Dilbilgisi kitabi (https://www.kitapyurdu.com/kitap/rusca-yds-sozlugu/749522.html), "Yabanci Dil Hocam" (academia.edu/ydsrusca). Bos pazar = firsat.

**"BHK":** YDS baglaminda bu isimde bir uygulama/marka bulunamadi. Olasiliklar: "Benim Hocam" (Benim Hocam YDS-YOKDIL-YDT) kisaltmasi olabilir; ya da kullanicinin bildigi yerel/kapali bir uygulama. Kullanicidan magaza linki / tam ad istenmeli.

| Uygulama | Platform | Dil | Ozellikler | Model |
|---|---|---|---|---|
| Benim Hocam YDS-YOKDIL-YDT | Android | Ingilizce | Videolu ders, bilgi karti (surum 2019, eski) | Ucretsiz/bilinmiyor |
| Kelime Hocam: YDS-YOKDIL-YDT | iOS+Android | Ingilizce | Quiz, "bilmediklerim" takibi | Bilinmiyor |
| HD YDS | iOS | Ingilizce | Deneme, okuma parcalari, kelime karti | Bilinmiyor |
| YDS Max | iOS | Ingilizce | 80 soruluk tam deneme (YDS/e-YDS format) | Bilinmiyor |
| YDS Kelime (Akin Dil) | Android | Ingilizce | ~2000 kelime arsivi | Ucretsiz |
| Dilsem YDS Kelime | Android | Ingilizce | Eslestirme, karisik harf, kelime avi oyunlari | Ucretsiz/reklam |
| YDS Ingilizce Kelime Ezber | Android | Ingilizce | Cumleli kelime, sesli telaffuz | Ucretsiz |
| Duolingo (Turkce-Rusca kursu, 2018'den beri) | iOS+Android | Rusca dahil | Streak, XP, lig, gunluk hedef, hatirlatma | Freemium (reklam + Super) |

Kaynaklar: https://www.tamindir.com/android/benim-hocam-yds-yokdil-ydt-2019/ , https://www.bluestacks.com/campaign/com.notsized.wordizz.english/tr/ , https://apps.apple.com/app/hd-yds/id6503486045 , https://apps.apple.com/us/app/-/id1548196204 , https://webrazzi.com/2018/02/09/rusca-ogrenmek-isteyenler-icin-duolingo-turkce-rusca-egitimini-acti/

Genel sikayet egilimi (dogrulanmadi): sadece kelime odakli, deneme/analitik yok; eski icerik; agir reklam; zorunlu abonelik/paywall; ÖSYM ile baglantisiz "sahte format" sorular; Duolingo'da sinav formatina uyumsuzluk ve cumlelerin YDS seviyesi (B2-C1) olmamasi.

## 3) Sonuc

### Eklenecekler (oncelik sirasiyla)
1. Gercek YDS formatinda tam deneme (80 soru, 180 dk, zamanlayici, ÖSYM bolum dagilimi) - rakiplerin cogu yalnizca kelime sunuyor.
2. Konu bazli test + zayif konu analizi (konu basina dogruluk, "bugun su 3 konuyu calis" onerisi) - ana farklilastirici.
3. 1000 fiil kartlari: aralikli tekrar (SRS), "biliyorum/bilmiyorum" takibi, sesli Rusca telaffuz, fiil cekimi (olumlu/tamamlanmis-tamamlanmamis cift) - Rusca'ya ozgu.
4. Streak + gunluk hedef + gunluk hatirlatma (kullanici kapatabilsin) - Duolingo'nun kanitlanmis tutundurma mekanizmasi.
5. Sinava geri sayim (22 Kasim 2026, uzaktan guncellenebilir) + sinava kadar calisma plani.
6. Yanlis defteri: yanlis yapilan sorulari otomatik tekrar testine ekle.
7. Cevrimdisi calisma - Turkiye'de mobil veri/kesinti, ogrenci kullanimi icin onemli.
8. Sorulara kisa Turkce aciklama (neden dogru/yanlis) - "sadece cevap anahtari" olan rakiplerden ayrisir.
9. Ilerleme ozeti/rozetler (hafif oyunlastirma), sinav sonrasi puan tahmini (YDS 100 uzerinden).

### Cikarilacaklar / yapilmayacaklar
- Agresif reklam / tam ekran video reklam (ders ortasinda) - en sik terk sebebi.
- Erken paywall; temel konu testleri ve en az bir deneme ucretsiz olsun.
- Streak kaybini cezalandirici/suc ortakli bildirim ve gunde cok sayida bildirim; tek, ayarlanabilir saat.
- Eski/yanlis icerik: "2019" tarzli surum etiketi, ÖSYM ile baglantili gibi gorunen ifadeler (ÖSYM resmi uygulamasi degildir uyarisi koy).
- Karmasik hesap/kayit zorunlulugu; once misafir kullanim, kayit sonra.
- Rusca disinda alanlara dagilmak (Ingilizce, YOKDIL vb.) - once Rusca YDS'de derinlik.
- Kitap iceriginden birebir kopya (telif); ozgun soru/kelime uret.
- Sahte "bin kisi kullaniyor" tarzi sosyal kanit veya dogrulanamayan basari iddialari.
