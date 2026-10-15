# İçerik Kontrol Raporu (özgün sorular)

Her soru önce anahtara bakmadan çözüldü, sonra anahtarla karşılaştırıldı. Kontrol edilenler: anahtarın doğruluğu, ikinci bir savunulabilir şık olup olmadığı, Rusça dil bilgisi ve yazım (hâl, görünüş, uyum, yönetim, Latin harfi ya da vurgu işareti), Türkçe açıklama, çeviri sadakati, şık türdeşliği ve konu etiketi.

## Özet

| Dosya | Kontrol | Düzeltilen | Silinen |
|---|---|---|---|
| src/data/gen/q_grammar_a.json | 80 | 1 | 0 |
| src/data/gen/q_grammar_b.json | 80 | 6 | 0 |
| src/data/gen/q_yds_types.json | 84 (cloze grupları dahil) | 0 | 0 |
| src/data/questions.ts (`rows`) | 80 | 12 | 0 |
| src/data/gen/lessons_extra.json | 4 ders (spot kontrol) | 1 | – |
| **Toplam** | **324 soru + 4 ders** | **20** | **0** |

Doğrulama: tüm JSON dosyaları ayrıştırılıyor; her soruda 5 farklı şık var ve cevap 0..4 aralığında; q_yds_types.json'a dokunulmadığı için grup pasajları aynı kaldı; `npx tsc --noEmit` hatasız geçti.

Not: Soru kimlikleri metin ve şıklardan hash ile türetiliyor (`hid(...)`). Bu yüzden düzeltilen 19 sorunun kimliği değişti. Bu sorulara ait eski istatistikler ve yanlış kayıtları artık eşleşmeyecek.

Hiç Latin harfli Rusça kelime ya da vurgu işareti bulunmadı. Konu etiketlerinin hepsi geçerli.

## Değişiklikler

### src/data/questions.ts

1. **«Мы ждали, ______ дождь не закончился.»** (soyuz)
   - Sorun: Anahtar şık `пока не` idi. Kökte zaten «не» olduğu için cümle «пока не дождь не закончился» hâline geliyordu, yani anahtar şık hatalıydı. Ayrıca `потому что` da doğru bir cümle kuruyordu («yağmur dinmediği için bekledik»).
   - Düzeltme: `пока не` → `пока` (anahtar), `потому что` → `зато`.
2. **«Он уже ______ домашнее задание.»** (vid)
   - Sorun: «Он уже делает домашнее задание» de doğal ve doğru bir cümle (ikinci doğru şık).
   - Düzeltme: Kök «Он уже ______ домашнее задание и теперь отдыхает.» yapıldı.
3. **«Сейчас он ______ в магазин.»** (dvizh)
   - Sorun: «Сейчас он пойдёт в магазин» (şimdi gidecek) de doğru.
   - Düzeltme: `пойдёт` → `шёл`.
4. **«Смотри, самолёт ______ над городом!»** (dvizh)
   - Sorun: «самолёт летает над городом» (şehrin üstünde tur atıyor) de doğru.
   - Düzeltme: Kök «Смотри, самолёт ______ прямо к аэропорту!» yapıldı; yön belli olduğu için yalnız `летит` doğru.
5. **«Автобус ______ к остановке.»** (dvizh)
   - Sorun: «Автобус подошёл к остановке» Rusçada çok yaygın ve doğru (ikinci doğru şık). «пришёл» da konuşma dilinde savunulabiliyordu.
   - Düzeltme: `подошёл` → `перешёл`, `пришёл` → `вошёл`.
6. **«Лампа висит ______ столом.»** (predlog)
   - Sorun: «за столом» (masanın arkasında) da dil bilgisi ve anlam bakımından doğru.
   - Düzeltme: `за` → `к`.
7. **«Он приедет ______ неделю.»** (predlog)
   - Sorun: «Он приедет на неделю» (bir haftalığına gelecek) de doğru.
   - Düzeltme: `на` → `до`.
8. **«______ домой, я встретил друга.»** (prichastie)
   - Sorun: Şahıs zamirine bağlı ayrık ortaç yapısı («Вернувшийся домой, я…») dil bilgisi açısından doğru, bu yüzden ikinci şık savunulabiliyordu.
   - Düzeltme: `Вернувшийся` → `Вернувшиеся`, `Возвращающийся` → `Возвращающегося` (uyumsuz biçimler).
9. **«Студент, ______ экзамен, был счастлив.»** (prichastie)
   - Sorun: «Студент, сдав экзамен, был счастлив» tamamen doğru (ikinci doğru şık).
   - Düzeltme: `сдав` → `сдавшего`.
10. **«______ письмо, она плакала.»** (prichastie)
    - Sorun: «Читающая письмо, она плакала» (zamire bağlı ayrık ortaç) savunulabiliyordu.
    - Düzeltme: `Читающая` → `Читающую`.
11. **«______ работу, он пошёл домой.»** (prichastie)
    - Sorun: «Закончивший работу, он пошёл домой» dil bilgisi açısından doğru (ikinci şık).
    - Düzeltme: `Закончивший` → `Закончившего`.
12. **«Я остался дома, ______ шёл дождь.»** (soyuz)
    - Sorun: «Я остался дома, пока шёл дождь» (yağmur yağarken evde kaldım) da doğru.
    - Düzeltme: `пока` → `поэтому`.

### src/data/gen/q_grammar_b.json

1. **«Студенты, ______ экзамен, могут уйти домой.»** (prichastie)
   - Sorun: «Студенты, сдав экзамен, могут уйти домой» tamamen doğru (ikinci doğru şık).
   - Düzeltme: `сдав` → `сдавшими`.
2. **«______ домой, я встретил старого друга.»** (prichastie)
   - Sorun: «Вернувшийся домой, я…» (zamire bağlı ayrık ortaç) savunulabiliyordu.
   - Düzeltme: `Вернувшийся` → `Вернувшиеся`.
3. **«______ по-русски, он часто делает ошибки.»** (prichastie)
   - Sorun: «Говорящий по-русски, он…» savunulabiliyordu.
   - Düzeltme: `Говорящий` → `Говорящего`.
4. **«Не ______ ответа, он позвонил ещё раз.»** (prichastie)
   - Sorun: «Не получивший ответа, он позвонил ещё раз» doğru (ikinci şık).
   - Düzeltme: `получивший` → `получившего`.
5. **«Мы будем ждать, ______ дождь не закончится.»** (soyuz)
   - Sorun: «Мы будем ждать, если дождь не закончится» (yağmur dinmezse bekleriz) de mantıklı ve doğru.
   - Düzeltme: `если` → `зато`.
6. **«______ мы поедем в отпуск, нужно накопить денег.»** (soyuz)
   - Sorun: «После того как мы поедем в отпуск, нужно накопить денег» da savunulabiliyordu.
   - Düzeltme: `После того как` → `Как будто`.

### src/data/gen/q_grammar_a.json

1. **«Я ______ этот фильм два раза.»** (vid)
   - Sorun: «Я посмотрю этот фильм два раза» (gelecek zaman) da dil bilgisi açısından doğru.
   - Düzeltme: Kök «Я уже ______ этот фильм два раза.» yapıldı.

### src/data/gen/q_yds_types.json

Değişiklik yok. 12 cloze, 12 tamamlama, 24 çeviri, 12 paragraf, 12 diyalog ve 12 anlam bütünlüğü sorusunun hepsinde anahtar tek doğru şık. Pasajlar dil bilgisi bakımından doğru, çeviri çeldiricileri anlamca gerçekten farklı.

### src/data/gen/lessons_extra.json

1. **«Çeviri: Türkçeden Rusçaya» › «Söz dizimi ve vurgu»**
   - Sorun: ««de/da» (bile, dahi) → тоже, также, даже» satırı «de/da (dahi)» ile «bile» anlamlarını karıştırıyordu.
   - Düzeltme: ««de/da» → тоже, также; «bile, dahi» → даже».
   - Diğer üç dersin Rusça örnekleri, tabloları ve Türkçe çevirileri doğru bulundu.

## Bilinçli olarak dokunulmayanlar (sınırda vakalar)

- «Когда я ______ домой / на работу, я встретил…» (questions.ts ve q_grammar_a): Anahtar `шёл`. `пошёл` ve `ходил` teorik olarak kurulabilir ama bu bağlamda doğal değil. Bunlar standart ders kitabı çeldiricileri olduğu için bırakıldı.
- «Пожалуйста, ______ окно / мне соль» sorularında НСВ emir (`закрывай`, `передавай`) kibar rica olarak sınırda kalıyor. СВ anahtar açıkça en iyi seçenek, bu yüzden bırakıldı.
