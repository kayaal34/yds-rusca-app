# İçerik Kontrolü 2c

Dosyalar: `src/data/gen/q_yds_more_b.json`, `src/data/gen/q_reading.json`

Her soru önce cevap anahtarına bakılmadan çözüldü, sonra anahtarla karşılaştırıldı. Kontrol edilenler: cevap anahtarı, tek savunulabilir seçenek, Rusça ve Türkçe dil bilgisi/yazım, açıklamanın anahtarla ve seçenek harfleriyle (A–E) uyumu, 5 farklı seçenek, «anlam» seçenekleri, paragraf gruplarının tutarlılığı.

## Sayılar

| Dosya / Konu | Kontrol edilen | Düzeltilen |
|---|---|---|
| q_yds_more_b – ceviri_rt (RU→TR) | 30 | 0 |
| q_yds_more_b – ceviri_tr (TR→RU) | 30 | 0 |
| q_yds_more_b – yakin_anlam | 40 | 0 |
| q_yds_more_b – anlam (akışı bozan cümle) | 15 | 0 |
| q_reading – paragraf (20 metin) | 74 | 0 |
| **Toplam** | **189** | **0** |

## Değişiklikler

Yok. Her iki dosyada da düzeltme gerektiren gerçek bir hata bulunmadı:

- **Cevap anahtarları:** 189 sorunun tamamında anahtar doğru.
- **Tek doğru seçenek:** Çeldiricilerde anlam her zaman açıkça değiştirilmiş (zaman, kapsam, olumsuzluk, neden-sonuç yönü, kesinlik/olasılık). TR→RU sorularında yanlış seçenekler bilinçli hâl hataları içeriyor (ör. «из-за засуха», «для обитателями», «настоял на то»).
- **Açıklamalar:** Açıklamalarda anılan seçenek harfleri (A–E) tek tek kontrol edildi, hepsi doğru seçeneği gösteriyor. Hâl yönetimi açıklamaları da doğru («настоять на чём», «признан чем», «посвятить чему» vb.).
- **«anlam» paragrafları:** Akışı bozan cümle her paragrafta tek ve açık. Seçenekler ["I","II","III","IV","V"] biçiminde.
- **Okuma metinleri:** Doğru cevaplar metinle destekleniyor, çeldiriciler desteklenmiyor. Olgusal bilgiler de doğru: Tversky–Kahneman %25/%45, Yellowstone 1995, Birleşik Krallık'ta yalnızlık bakanlığı 2018, penisilin 1928, Richthofen'in terimi.

## Doğrulama (`python -I`)

- Her iki dosya da geçerli JSON (115 + 74 soru).
- Her soruda 5 farklı seçenek var, `answer` 0–4 aralığında.
- «anlam» seçenekleri doğru biçimde.
- q_reading'de 20 paragraf grubu var (14 tanesi 4 soruluk, 6 tanesi 3 soruluk). Her grubun içinde paragraf metni birebir aynı.
