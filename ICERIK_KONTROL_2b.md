# İçerik Kontrolü 2b — q_yds_more_a.json

Dosya: `src/data/gen/q_yds_more_a.json` (110 soru)

## Özet

| Konu | Kontrol edilen | Düzeltilen |
|---|---|---|
| cloze (8 metin × 5) | 40 | 1 |
| tamamlama (cümle tamamlama) | 40 | 0 |
| diyalog | 30 | 0 |
| **Toplam** | **110** | **1** |

Her soru önce anahtara bakılmadan çözüldü, sonra anahtarla karşılaştırıldı. Anahtar hatası bulunmadı. Rusça dilbilgisi (hâl, görünüş, uyum, yönetim) ve Türkçe açıklamalar tutarlı. Bir soruda ikinci doğru seçenek bulundu ve düzeltildi.

## Değişiklikler

1. **#20 (cloze, Yapay zekâ metni, boşluk 1)** — «Искусственный интеллект всё активнее (1) ______ в медицине.»
   - Sorun: Çeldirici «применяют» de dilbilgisi açısından doğruydu. «Искусственный интеллект всё активнее применяют в медицине» geçerli bir belirsiz-kişili yapıdır («интеллект» belirtme hâlinde). Bu nedenle iki seçenek savunulabiliyordu.
   - Düzeltme: «применяют» yerine «применяются» kondu. Bu çoğul biçim tekil özneyle uyuşmadığı için açıkça yanlıştır. Açıklama da buna göre güncellendi. Anahtar değişmedi (4 = «применяется»).

## Doğrulama (`python -I`)

- JSON geçerli, 110 soru
- Her soruda 5 farklı seçenek var ve tüm cevaplar 0–4 aralığında
- 8 cloze grubunun her birinde 5 soru var ve metinler grup içinde aynı
