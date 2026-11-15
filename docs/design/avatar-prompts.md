# Story friend 2.0: арт-направление и промпты для Gemini

Цель: заменить нынешнего персонажа-проводника (зайчик, медведь, лиса, котёнок из простых фигур) на уникальных сказочных существ, которых Лида генерирует сама в Gemini, листами по одному уровню кастомизации. Здесь: концепция, уровни, точный формат листов, готовые промпты (на английском, копировать как есть) и как превратить листы в слои приложения.

## 1. Что есть сейчас (не ломаем)

- Компонент: `web/components/character/Character.tsx`, палитра `palette.ts`, конструктор `web/components/ui/CharacterBuilder.tsx`.
- Модель: `Character { animal: bunny|bear|fox|kitten; color: blue|green|yellow|red|purple|orange; accessory: cap|scarf|backpack }` (`web/lib/engine/types.ts`, SPEC 11.4). Настроение (`calm|worried|brave|happy`) меняет глаза, брови, рот и позу рук.
- Холст SVG `viewBox 0 0 240 300` (4:5). Один и тот же рисунок идёт в конструктор, читалку, карточку дня, значок и PDF. Цвет одежды и аксессуара красится кодом.

Опорные точки текущего холста (их сохраняем, к ним выравниваем новую графику):

| Точка | Координаты (240×300) |
|---|---|
| Центр головы | (120, 124), овал 128×116, верх головы y = 66 |
| Линия глаз / нос / рот | y = 120 / 135 / ~150 |
| Шея (низ головы, верх тела) | y ≈ 170 |
| Тело | x 74–166, y 166–262 |
| Лапы-ступни, базовая линия | центры (96, 272) и (144, 272), низ y = 285 |
| Ладони в спокойной позе | (68, 242) слева и (172, 242) справа |
| Место компаньона | справа внизу, x 180–236, y 220–285 |

## 2. Арт-направление

### A. «Moonlit Meadow» (рекомендую)
Уютная сказка из книжки на ночь: круглые мягкие существа с одной маленькой волшебной чертой (полумесяц на лбу у зайчика, хвост-огонёк у лисы, звёздные пятнышки у котёнка, пушистые крылышки у дракончика). Тёплые пастельные цвета нашей палитры, ровная тёмно-сливовая обводка, плоская заливка и максимум одна тень на цвет. Пропорции «два головы ростом», как у нынешнего персонажа, поэтому новое встаёт на старые опорные точки.
Почему: не пугает детей 3–7 лет, хорошо трассируется в SVG (плоские пятна, чистые края), перекрашивается кодом, совпадает с токенами стиля (`--primary #5B6CFF`, `--accent #FFB547`, `--ink #2B2A3A`) и с уже готовыми сценами.

### B. «Paper Lantern Spirits»
Существа как вырезанные из цветной бумаги фигурки-фонарики, слои бумаги со смещёнными краями, народный узор. Очень самобытно, но бумажная фактура и узоры плохо трассируются, перекраска сложнее, на маленьком размере (значок, тропа) детали теряются.

**Выбор: A.** Название набора в промптах: «Moonlit Meadow, art set BDS-01».

## 3. Уровни кастомизации

Главное правило слоёв: **у всех существ одно и то же тело-манекен** (голова-круг, тело-фасолина, руки опущены, две овальные ступни) в одной позе, на одном холсте и в одном масштабе. Вид отличается только ушами, рогами, хвостом, крыльями, мордочкой и окраской. Поэтому любая одежда и любой головной убор подходят любому существу.

| № | Уровень | Как получаем | Варианты (id) |
|---|---|---|---|
| 0 | Манекен-шаблон | генерируем (лист 0) | один серый манекен, 8 копий в сетке |
| 1 | Существо (species) | генерируем (лист 1) | `bunny` Moon Bunny, `bear` Cloud Cub, `fox` Ember Fox, `kitten` Star Kitten, `dragon` Puff Dragon, `owl` Owlet Sage, `hedgehog` Moss Hedgehog, `fawn` Dew Fawn |
| 2 | Окрас существа | кодом, без генерации | 3 на вид: classic + 2 волшебных (замена 4–5 цветов шерсти по таблице) |
| 3 | Цвет одежды | кодом, без генерации | нынешние 6 (`blue green yellow red purple orange`) + можно `teal`, `pink` |
| 4 | Одежда (outfit) | генерируем (лист 2) | `tunic` (по умолчанию), `raincoat`, `star-robe`, `knight-tabard`, `overalls`, `moon-pajamas`, `explorer-vest`, `knit-sweater` |
| 5 | Головной убор (headwear) | генерируем (лист 3) | `cap`, `wizard-hat`, `flower-crown`, `star-crown`, `beret`, `acorn-cap`, `bow-headband`, `goggles` (+ `none`) |
| 6 | Аксессуар (accessory) | генерируем (лист 4) | `scarf`, `backpack`, `cape`, `satchel`, `star-necklace` на теле; `star-wand`, `lantern`, `plush-star` в лапе (+ `none`) |
| 7 | Компаньон (companion) | генерируем (лист 5) | `firefly`, `cloud-puff`, `star-sprite`, `crystal-snail`, `ladybug`, `tiny-turtle`, `mushroom-sprout`, `pebble-chick` (+ `none`) |
| 8 | Выражения лица (moods) | лист 6, по желанию | `calm`, `worried`, `brave`, `happy` (нынешние) + `sleepy`, `surprised`, `proud`, `giggly` |
| 9 | Фон-подложка | лист 7, по желанию | `moon-meadow`, `mushroom-wood`, `cloud-castle`, `cozy-burrow`, `starry-lake`, `lighthouse-cove`, `autumn-orchard`, `snowy-pines` |

Почему лица отдельно: у существ на листе 1 лицо пустое (есть только мордочка и нос), а глаза, брови и рот рисует код по настроению, как сейчас. Так настроение меняется на любой странице без новой генерации. Лист 6 нужен, только если захотим нарисованные Gemini лица вместо кодовых.

Руки: в первой версии поза рук одна (спокойная, опущены). Настроение передают лицо и лёгкая анимация. Если позы рук понадобятся, это отдельный лист на каждый вид, позже.

Старые данные переводятся без потерь: `animal` остаётся (те же 4 id + 4 новых), `accessory: cap` переходит в `headwear: cap`, `scarf` и `backpack` остаются аксессуарами, одежда по умолчанию `tunic`. Изменение модели `Character` трогает контракт SPEC 6, его делает поток разработки вместе с архитектором.

## 4. Формат листов (общий для всех)

- Одна картинка **16:9, альбомная**, максимальное разрешение, которое даёт Gemini (если есть выбор 2K/4K, берите его; при 2048×1152 клетка ≈ 512×576 px).
- **Сетка 4 столбца × 2 ряда, 8 равных клеток**, линии сетки не рисуются. Порядок клеток: слева направо, сверху вниз (1–4 верхний ряд, 5–8 нижний).
- **Фон: сплошной чистый пурпурный `#FF00FF`** (хромакей). Белый не подходит: у зайчика, мордочек и одежды есть белое. Пурпурный запрещён внутри рисунков.
- **Манекен: сплошной светло-серый `#C8C8C8` без обводки и без лица.** Одежда, шапки, аксессуары и выражения рисуются прямо на манекене листа 0, затем серый вырезается скриптом. Так все предметы сразу выровнены по одному телу.
- **Ключевой цвет для перекраски** (одежда, шапки, аксессуары): только семейство индиго, три тона `#AEB6FF` светлый, `#5B6CFF` основной, `#3F4BC0` тёмный. Разрешённые неперекрашиваемые акценты: белый `#FFFFFF`, медовое золото `#FFC93C`, обводка `#2B2A3A`. Скрипт заменяет индиго на выбранный цвет одежды по яркости.
- Масштаб и положение одинаковые во всех клетках: базовая линия ступней на 90 % высоты клетки, верх головы (без ушей) на 28 %, поля не меньше 6 %, предметы не касаются краёв и соседей.
- Стиль: плоская векторная заливка, не больше одной тени на цвет жёстким пятном, без градиентов, текстур, свечения и теней на полу. Это нужно для трассировки в SVG.

### Как держать единый стиль между листами
1. Все листы делайте **в одном чате Gemini**, по порядку 0 → 1 → 2 …
2. **Блок STYLE LOCK вставляется дословно в каждый промпт** (уже вставлен ниже). Фраза «Moonlit Meadow, art set BDS-01» играет роль «сида»: Gemini в приложении не даёт задать seed, поэтому якорем служат одинаковый текст и приложенные картинки.
3. К каждому промпту, начиная с листа 1, **прикладывайте лист 0** (и для листов 2–7 ещё лист 1) и пишите в начале «Edit the attached template sheet»: Gemini редактирует готовую сетку, а не рисует новую, поэтому позиции и масштаб сохраняются.
4. Не нравится одна клетка: не перегенерируйте лист, а попросите правку «Change only cell 3 … keep everything else exactly the same».
5. Проверка каждого листа: 8 предметов, ровно 4×2, фон однородный пурпурный, нет надписей, манекены не сдвинуты, нет лишних цветов вне палитры, обводка одной толщины.

## 5. Промпты

### Лист 0. Манекен-шаблон (сделать первым)

```text
Create a character template sheet.

STYLE LOCK — "Moonlit Meadow", art set BDS-01: cozy storybook fantasy for children aged 3 to 7, fully original. Chibi proportions: big round head, small soft bean-shaped body, short stubby arms and two short oval feet, about two heads tall. Flat vector illustration: solid flat colour fills, at most one darker shade per colour as a simple hard-edged shape, no gradients, no textures, no noise, no glow, no drop shadows. Smooth, uniform dark plum outline (#2B2A3A), the same thickness everywhere. Warm gentle palette: cream #FFF9F0, soft indigo #5B6CFF, mint #3DBE8B, honey #FFC93C, coral #E5565B, lilac #9B6BE8, apricot #FF8A3D, plus soft pastel fur tones. Friendly and calm, nothing sharp, spooky or menacing. Every figure is front-facing, perfectly symmetric, standing upright, arms relaxed down at the sides with the paws slightly away from the body.

FORMAT: one landscape image, aspect ratio 16:9, highest available resolution. The image is an invisible grid of 4 equal columns and 2 equal rows (8 equal cells). Exactly one figure per cell, centred horizontally. Do not draw grid lines, frames, borders or cell backgrounds. The whole background is one solid, perfectly even pure magenta (#FF00FF): no gradient, no floor, no shadow. Same scale and same vertical position in every cell: the bottom of the feet sits at 90% of the cell height, the top of the head at 28% of the cell height. Keep at least 6% empty margin around each figure; nothing touches the cell edges or a neighbour. Never use magenta or hot pink inside the artwork.

CONTENT: in all 8 cells draw the same blank mannequin, identical copies: a round head (a slightly wide circle), a bean-shaped body directly under it, two short arms hanging down at the sides with round paws slightly away from the body, two short oval feet side by side. The mannequin is filled with one flat light neutral grey (#C8C8C8), with NO outline, NO face, NO ears, NO tail, NO clothes. All 8 mannequins are pixel-identical in size, shape and position within their cells.

DO NOT include: text, letters, numbers, labels, captions, logos, watermarks, signatures, grid lines, frames, ground shadows, gradients, glow, sparkles, scenery, perspective, 3/4 or side views, extra limbs, more or fewer than 8 figures, cropped figures, photorealism, 3D render look.
```

### Лист 1. Существа (приложить лист 0)

```text
Edit the attached template sheet. Keep the layout, the 4×2 grid, the magenta background and the exact size, position and silhouette of every grey mannequin's head, body, arms and feet. Turn each mannequin into a different creature by colouring it and adding only ears, horns, wings, tail, cheek fluff and a muzzle; the head circle, body, arms and feet keep exactly the mannequin's shape.

STYLE LOCK — "Moonlit Meadow", art set BDS-01: cozy storybook fantasy for children aged 3 to 7, fully original. Chibi proportions: big round head, small soft bean-shaped body, short stubby arms and two short oval feet, about two heads tall. Flat vector illustration: solid flat colour fills, at most one darker shade per colour as a simple hard-edged shape, no gradients, no textures, no noise, no glow, no drop shadows. Smooth, uniform dark plum outline (#2B2A3A), the same thickness everywhere. Warm gentle palette: cream #FFF9F0, soft indigo #5B6CFF, mint #3DBE8B, honey #FFC93C, coral #E5565B, lilac #9B6BE8, apricot #FF8A3D, plus soft pastel fur tones. Friendly and calm, nothing sharp, spooky or menacing. Every figure is front-facing, perfectly symmetric, standing upright, arms relaxed down at the sides with the paws slightly away from the body.

FACE: leave every face blank. Draw only the muzzle patch, a small nose and two soft cheek blush ovals. NO eyes, NO eyebrows, NO mouth (they are added later in code). Each creature uses at most 5 flat colours: main fur, light belly/muzzle, inner-ear accent, nose, plus the outline. No clothes, no accessories.

CELLS (left to right, top row then bottom row):
1. Moon Bunny: cream-white fur, tall soft upright ears with pale pink insides, a small golden crescent-moon mark on the forehead, round cotton tail peeking out at the side.
2. Cloud Cub: a baby bear in warm honey-brown, small round ears, a fluffy white cloud-shaped tuft on top of the head, tiny round tail.
3. Ember Fox: a fox sprite in soft apricot orange with a cream muzzle, pointed ears with dark tips, a big fluffy tail curling up at the side whose tip is a soft yellow flame-shaped wisp (flat shapes, no glow).
4. Star Kitten: a kitten in soft lilac-grey with three tiny star-shaped spots on the forehead, pointed ears with pink insides, a long curved tail.
5. Puff Dragon: a baby dragon in soft mint green with a pale cream belly, two tiny rounded nubby horns, small fluffy rounded wings behind the shoulders, a short chubby tail, no teeth, no claws.
6. Owlet Sage: a round owlet in warm cocoa brown with a cream face disc, small feather tufts as ears, wings shaped like the mannequin arms, a tiny triangular beak in honey colour.
7. Moss Hedgehog: a hedgehog whose soft rounded spines look like a cushion of moss in mint and sage green with two tiny flowers, a cream face and belly, small round ears.
8. Dew Fawn: a baby deer in light caramel with cream dots on the back of the head, small soft ears, two tiny rounded antler buds with a single dewdrop, a short white tail.

DO NOT include: text, letters, numbers, labels, captions, logos, watermarks, grid lines, frames, ground shadows, gradients, glow, sparkles, scenery, perspective, 3/4 or side views, extra limbs, clothes, eyes, mouths, sharp teeth, claws, angry or scary looks, photorealism, 3D render look, any resemblance to characters from existing films, games, cartoons, toys or brands. Never use magenta or hot pink inside the artwork.
```

### Лист 2. Одежда (приложить лист 0 и лист 1)

```text
Edit the first attached image (the grey mannequin template sheet). Keep the layout, the 4×2 grid, the magenta background and every grey mannequin exactly as it is: same grey (#C8C8C8), same size, same position, no outline, no face. Dress each mannequin in a different outfit that fits the body and arms tightly, like a paper-doll costume, so it can later be cut out and placed on any of the creatures from the second attached image. Outfits cover the body and the arms down to the wrists; they never cover the head, the paws or the feet. No hoods, no collars above the neck line.

STYLE LOCK — "Moonlit Meadow", art set BDS-01: cozy storybook fantasy for children aged 3 to 7, fully original. Chibi proportions: big round head, small soft bean-shaped body, short stubby arms and two short oval feet, about two heads tall. Flat vector illustration: solid flat colour fills, at most one darker shade per colour as a simple hard-edged shape, no gradients, no textures, no noise, no glow, no drop shadows. Smooth, uniform dark plum outline (#2B2A3A), the same thickness everywhere. Friendly and calm. Every figure is front-facing, perfectly symmetric, standing upright, arms relaxed down at the sides with the paws slightly away from the body.

COLOUR RULE (important for recolouring): every outfit uses ONLY three tones of indigo — light #AEB6FF, main #5B6CFF, dark #3F4BC0 — plus small details in white #FFFFFF and honey gold #FFC93C, and the dark plum outline. No other colours.

CELLS (left to right, top row then bottom row):
1. Simple tunic: a plain soft tunic with a round neckline and a darker hem band.
2. Raincoat: a short raincoat with big round white buttons and rolled sleeve cuffs.
3. Star robe: a little wizard robe reaching the ankles, wide sleeves, a few small gold stars and a gold crescent on the chest.
4. Knight tabard: a soft padded tabard over a long-sleeve top, a gold heart emblem on the chest, no armour plates, no weapons.
5. Garden overalls: overalls with shoulder straps, a front pocket and two gold buttons, worn over a light top.
6. Moon pajamas: a cosy one-piece sleepsuit with small white moons and dots.
7. Explorer vest: a short-sleeve top with a light vest that has two pockets and a gold compass badge.
8. Knit sweater: a chunky knit sweater with a simple zigzag band across the chest and ribbed cuffs.

DO NOT include: text, letters, numbers, labels, logos, watermarks, grid lines, frames, ground shadows, gradients, glow, scenery, hats, shoes, held objects, faces, ears, tails, perspective or side views, photorealism, 3D render look, any branded or recognisable costume from existing films, games, cartoons or toys. Do not move or reshape the grey mannequins. Never use magenta or hot pink.
```

### Лист 3. Головные уборы (приложить лист 0 и лист 1)

```text
Edit the first attached image (the grey mannequin template sheet). Keep the layout, the 4×2 grid, the magenta background and every grey mannequin exactly as it is: same grey (#C8C8C8), same size, same position, no outline, no face. Put a different piece of headwear on each mannequin's head. Every item sits on the top of the head circle like a band at forehead level and stays small, so the creatures' ears, horns and antlers from the second attached image can stick out on both sides; nothing covers the eyes area (the upper middle of the face) or hangs below the ear line.

STYLE LOCK — "Moonlit Meadow", art set BDS-01: cozy storybook fantasy for children aged 3 to 7, fully original. Flat vector illustration: solid flat colour fills, at most one darker shade per colour as a simple hard-edged shape, no gradients, no textures, no noise, no glow, no drop shadows. Smooth, uniform dark plum outline (#2B2A3A), the same thickness everywhere. Friendly and calm. Front-facing, perfectly symmetric.

COLOUR RULE (important for recolouring): every item uses ONLY three tones of indigo — light #AEB6FF, main #5B6CFF, dark #3F4BC0 — plus small details in white #FFFFFF and honey gold #FFC93C, and the dark plum outline. Exception: cell 3 may use soft pastel petals and leaf green.

CELLS (left to right, top row then bottom row):
1. Baseball cap: a round cap facing forward with a short brim and a button on top.
2. Little wizard hat: a short soft cone hat, slightly tilted, with a gold star on it.
3. Flower crown: a ring of small round flowers and leaves.
4. Star crown: a tiny rounded crown with three soft star points and one gold gem.
5. Beret: a soft round beret tilted to one side.
6. Acorn cap: a cap shaped like an acorn top with a tiny stalk.
7. Bow headband: a thin headband with a big soft bow on one side.
8. Explorer goggles: a headband with round goggles pushed up onto the top of the head.

DO NOT include: text, letters, numbers, labels, logos, watermarks, grid lines, frames, ground shadows, gradients, glow, scenery, clothes, held objects, faces, ears, perspective or side views, photorealism, 3D render look, any branded headwear. Do not move or reshape the grey mannequins. Never use magenta or hot pink.
```

### Лист 4. Аксессуары (приложить лист 0 и лист 1)

```text
Edit the first attached image (the grey mannequin template sheet). Keep the layout, the 4×2 grid, the magenta background and every grey mannequin exactly as it is: same grey (#C8C8C8), same size, same position, no outline, no face. Add a different accessory to each mannequin. Worn items fit the body tightly like a paper-doll piece. Held items are held in the mannequin's paw on the RIGHT side of the image, with the paw at the bottom of the handle, and stay within the cell.

STYLE LOCK — "Moonlit Meadow", art set BDS-01: cozy storybook fantasy for children aged 3 to 7, fully original. Flat vector illustration: solid flat colour fills, at most one darker shade per colour as a simple hard-edged shape, no gradients, no textures, no noise, no glow, no drop shadows. Smooth, uniform dark plum outline (#2B2A3A), the same thickness everywhere. Friendly and calm. Front-facing, symmetric where possible.

COLOUR RULE (important for recolouring): every item uses ONLY three tones of indigo — light #AEB6FF, main #5B6CFF, dark #3F4BC0 — plus small details in white #FFFFFF and honey gold #FFC93C, and the dark plum outline.

CELLS (left to right, top row then bottom row):
1. Scarf: a cosy scarf wrapped around the neck with one striped end hanging down the front.
2. Backpack: a small backpack seen from the front, so only the two shoulder straps and the edges of the pack on both sides are visible.
3. Cape: a short cape seen from the front, visible only at the shoulders and on both sides of the body, closed with a gold star clasp at the neck.
4. Satchel: a small round satchel on a strap across the chest, resting on the hip.
5. Star necklace: a simple cord necklace with a large gold star pendant.
6. Star wand: a short rounded wand with a soft gold star on top, held upright in the right-side paw.
7. Lantern: a small round paper lantern with a warm honey light (flat colours, no glow), held by its handle in the right-side paw.
8. Plush friend: a small soft star-shaped plush toy hugged against the body by the right-side arm.

DO NOT include: text, letters, numbers, labels, logos, watermarks, grid lines, frames, ground shadows, gradients, glow, sparkles, scenery, clothes, hats, faces, ears, weapons, sharp points, perspective or side views, photorealism, 3D render look, any branded item. Do not move or reshape the grey mannequins. Never use magenta or hot pink.
```

### Лист 5. Компаньоны (приложить лист 0 и лист 1)

```text
Edit the first attached image (the grey mannequin template sheet). Keep the layout, the 4×2 grid, the magenta background and every grey mannequin exactly as it is: same grey (#C8C8C8), same size, same position. In each cell add one tiny friendly companion creature standing on the same baseline as the mannequin's feet, to the RIGHT of the mannequin, not touching it, fully inside the cell. Each companion is small, about one quarter of the mannequin's height (flying companions hover at the mannequin's paw height).

STYLE LOCK — "Moonlit Meadow", art set BDS-01: cozy storybook fantasy for children aged 3 to 7, fully original. Chibi proportions, round and soft. Flat vector illustration: solid flat colour fills, at most one darker shade per colour as a simple hard-edged shape, no gradients, no textures, no noise, no glow, no drop shadows. Smooth, uniform dark plum outline (#2B2A3A), the same thickness everywhere. Warm gentle palette: cream #FFF9F0, soft indigo #5B6CFF, mint #3DBE8B, honey #FFC93C, coral #E5565B, lilac #9B6BE8, apricot #FF8A3D. Friendly and calm, front-facing, simple dot eyes and a small smile.

CELLS (left to right, top row then bottom row):
1. Firefly: a round little bug with a honey-yellow tail light (flat, no glow), hovering.
2. Cloud puff: a small fluffy white cloud with a happy face, hovering.
3. Star sprite: a soft five-point star with a face and tiny arms, hovering.
4. Crystal snail: a snail with a shell made of lilac crystal facets.
5. Ladybug: a round coral ladybug with dark dots.
6. Tiny turtle: a baby turtle with a mint shell.
7. Mushroom sprout: a little walking mushroom with an apricot cap and white dots.
8. Pebble chick: a round honey-yellow chick.

DO NOT include: text, letters, numbers, labels, logos, watermarks, grid lines, frames, ground shadows, gradients, glow, sparkles, scenery, clothes on the mannequin, perspective or side views, scary insects, spiders, stingers, teeth, photorealism, 3D render look, any resemblance to characters from existing films, games, cartoons, toys or brands. Do not move or reshape the grey mannequins. Never use magenta or hot pink.
```

### Лист 6. Выражения лица (по желанию, приложить лист 0 и лист 1)

```text
Edit the first attached image (the grey mannequin template sheet). Keep the layout, the 4×2 grid, the magenta background and every grey mannequin exactly as it is: same grey (#C8C8C8), same size, same position. On each mannequin's head draw ONLY facial features in dark plum (#2B2A3A) with small white eye highlights and, where needed, a coral (#F4788C) tongue: eyes, eyebrows and mouth. No nose, no cheeks, no ears. Features sit in the same place on every head: eyes on a horizontal line just above the middle of the head circle, mouth just below the middle. Same line thickness everywhere.

STYLE LOCK — "Moonlit Meadow", art set BDS-01: cozy storybook fantasy for children aged 3 to 7. Flat vector illustration, solid flat fills, no gradients, no textures, no glow. Simple, soft, friendly features: oval eyes with one round highlight, short rounded brows, small rounded mouth.

CELLS (left to right, top row then bottom row):
1. Calm: gentle open eyes, relaxed brows, soft small smile.
2. Worried: slightly larger eyes, brows tilted up in the middle, small wavy mouth (sweet, not sad or crying).
3. Brave: determined eyes, brows slightly lowered at the inner ends, confident closed smile.
4. Happy: closed upward-curved happy eyes, big open smile with a little tongue.
5. Sleepy: half-closed eyes, small yawn mouth.
6. Surprised: round eyes, raised brows, small round open mouth.
7. Proud: closed smiling eyes, chin-up smile.
8. Giggly: one eye winking, wide grin.

DO NOT include: text, labels, logos, watermarks, grid lines, frames, tears, angry or scary expressions, teeth, noses, body changes, clothes, gradients, photorealism. Do not move or reshape the grey mannequins. Never use magenta or hot pink.
```

### Лист 7. Фоны-подложки (по желанию, без вложений или с листом 1 для стиля)

```text
Create a sheet of 8 small portrait backdrop cards.

STYLE LOCK — "Moonlit Meadow", art set BDS-01: cozy storybook fantasy for children aged 3 to 7, fully original. Flat vector illustration: solid flat colour fills, at most one darker shade per colour as a simple hard-edged shape, no gradients, no textures, no noise, no glow. Smooth, uniform dark plum outline (#2B2A3A). Warm gentle palette: cream #FFF9F0, soft indigo #5B6CFF, mint #3DBE8B, honey #FFC93C, coral #E5565B, lilac #9B6BE8, apricot #FF8A3D. Calm and safe-feeling.

FORMAT: one landscape image, aspect ratio 16:9, highest available resolution, an invisible grid of 4 equal columns and 2 equal rows. In each cell one portrait card with rounded corners, aspect 4:5, centred, 88% of the cell height, filled edge to edge with a simple scene. The space between the cards is solid pure magenta (#FF00FF). In every card the lower third is a flat, empty ground area and the centre is open and uncluttered, because a character will stand there later. No characters, no animals, no people.

CELLS (left to right, top row then bottom row):
1. Moon meadow: a soft hill under a big crescent moon and a few stars.
2. Mushroom wood: rounded trees and big friendly mushrooms.
3. Cloud castle: a small round castle on fluffy clouds in a pastel sky.
4. Cozy burrow: inside a warm round burrow with a little lamp.
5. Starry lake: a calm lake with star reflections and reeds.
6. Lighthouse cove: a gentle beach with a small lighthouse.
7. Autumn orchard: round trees with apples and falling leaves.
8. Snowy pines: soft snowy hills with round pine trees.

DO NOT include: text, letters, numbers, labels, logos, watermarks, grid lines, ground shadows, gradients, glow, characters, animals, people, scary or dark places, storms, photorealism, 3D render look. Never use magenta or hot pink.
```

Если Gemini не держит пустое лицо на листе 1, добавьте вторым сообщением: «Change only the faces: remove all eyes, eyebrows and mouths, keep the nose, muzzle and cheeks, keep everything else exactly the same.»

## 6. Из листов в слои приложения

### Папки
```
docs/design/avatar/sheets/        исходники из Gemini (JPG 2752×1536): 00-template.jpg, 01-species.jpg, 02-outfits.jpg,
                                  03-headwear.jpg, 04-accessories.jpg, 05-companions.jpg,
                                  06-expressions.jpg, 07-backdrops.jpg
web/scripts/avatar/               скрипты: slice.py, trace.py, colorize.py, build.mjs, ids.json
web/public/avatar/<level>/<id>.svg   готовые слои, для проверки глазами и для <img>
web/public/avatar/backdrop/<id>.webp фоны (не трассируем, WebP ≤ 150 KB)
web/components/character/art/generated.ts   сгенерированный модуль: пути и роли цветов всех слоёв
```
Имена файлов: `<level>/<id>.svg`, где level из `species | outfit | headwear | accessory | companion | expression | backdrop`, а id из таблицы раздела 3 (латиница, kebab-case). Порядок id в `ids.json` совпадает с порядком клеток 1–8 в промптах.

### Шаги конвейера
1. **Нарезка** (`slice.py`, Python + Pillow + NumPy). Делит лист на 4×2 равные клетки. Пурпурный фон удаляется по расстоянию до `#FF00FF` (порог ~60 в RGB) в прозрачность, ореол убирается сужением маски на 1–2 px. Если Gemini сдвинул предметы, запасной путь: поиск связных пятен по маске и привязка к ближайшей клетке.
2. **Выравнивание по манекену.** На листах 2–6 скрипт находит серый манекен (низкая насыщенность, яркость около `#C8C8C8`), берёт его рамку и переносит клетку так, чтобы эта рамка совпала с эталонной рамкой тела на холсте 240×300 (тело и голова из раздела 1), затем удаляет серые пиксели. Получается предмет, уже стоящий на своём месте. Существа с листа 1 выравниваются так же по рамке тела без ушей и хвоста (в спорных случаях подвинуть вручную в Inkscape по шаблону `template.svg` с направляющими).
3. **Упрощение цветов.** `Image.quantize` до 6–8 цветов на слой, чтобы трассировка дала чистые плоские пятна.
4. **Трассировка в SVG.** [vtracer](https://github.com/visioncortex/vtracer) (MIT, цветной режим, есть `pip install vtracer`) на холсте 4× (960×1200), потом масштаб 0.25 в `viewBox 0 0 240 300`. Стартовые параметры: `colormode='color', hierarchical='stacked', mode='spline', filter_speckle=6, color_precision=6, layer_difference=24, corner_threshold=60`. [potrace](https://potrace.sourceforge.net/) (GPL, только одноцветный) годится для обводки или масок одним цветом, в сборку приложения его код не попадает, используется только как инструмент.
5. **Роли цветов** (`colorize.py`). Каждой заливке присваивается роль:
   - одежда, шапки, аксессуары: тона индиго по яркости → `var(--av-main-light)`, `var(--av-main)`, `var(--av-main-dark)`; золото, белый и обводка остаются как есть;
   - существа: 4–5 цветов шерсти → `var(--av-fur)`, `--av-belly`, `--av-inner`, `--av-nose`; окрасы (уровень 2) задаются таблицами этих переменных в `palette.ts`.
   Код ставит эти переменные на `<svg>`, поэтому перекраска не требует новых файлов. Для PDF и значков переменные подставляются значениями при рендере (как сейчас с `CLOTHES`).
6. **Оптимизация.** [SVGO](https://github.com/svg/svgo) (MIT), цель до 15 KB на слой.
7. **Сборка** (`build.mjs`). Пишет `web/components/character/art/generated.ts` с путями всех слоёв, чтобы SVG оставался одним инлайн-рисунком (нужно для PDF, значков и офлайна PWA).

### Порядок слоёв в `Character.tsx` (сзади вперёд)
фон-подложка → «задние» аксессуары (плащ, рюкзак) → существо (с хвостом, крыльями, ушами) → одежда → лицо (код по настроению, без носа: нос уже в рисунке) → шарф, ожерелье, сумка → головной убор → предмет в лапе → компаньон.

### Лицензия и подписи
Картинки, созданные в Gemini по нашим промптам, можно использовать в продукте по условиям Google. В `web/components/CREDITS.md` добавить строку: «Story friend art: generated with an image model from our own prompts (docs/design/avatar-prompts.md), traced and edited for the project». Промпты не упоминают чужие бренды и персонажей, проверку «не похоже ли на известного героя» делаем глазами на каждом листе.

### Что делает разработка после того, как листы готовы
1. Листы уже лежат в `docs/design/avatar/sheets/` (15 Nov).
2. Написать скрипты из шагов 1–7, прогнать, проверить слои глазами в `/start` на всех 8 существах.
3. Расширить модель `Character` (species 8, outfit, headwear, accessory, companion, furVariant) с переводом старых значений, обновить конструктор: вкладки Friend / Colours / Clothes / Hats / Extras / Buddy.

### Статус (15 Nov): конвейер построен
- `npm run avatar` (в `web/`) пересобирает всё: `scripts/avatar/slice.py` → `trace.py` → `build.mjs`. Нужны Python 3 и `pip install -r web/scripts/avatar/requirements.txt` (Pillow, NumPy, SciPy, vtracer).
- Заменить клетку: положить новый лист с тем же именем в `docs/design/avatar/sheets/` и запустить `npm run avatar`. Имена файлов слоёв не меняются, в URL добавляется хеш содержимого, поэтому браузер и service worker возьмут новую версию.
- Перекраска сделана заранее готовыми файлами (`<id>--<colour>.svg`, `species/<id>--dusk|dawn.svg`), а не CSS-переменными: слои подключаются как `<image>`, лениво кешируются и не раздувают JS. Цвета: `web/scripts/avatar/colors.json`.
- Выравнивание: каждая клетка совмещается с манекеном листа 0 (сдвиг по маске серого), затем ставится на холст: ступни y = 285, центр x = 120, 0,34 единицы на пиксель листа.
- Лица берутся из листа 6 (calm, worried, brave, happy используются по настроению страницы), код больше не рисует лицо.
- Известное: у Moon Bunny кончики ушей обрезаны краем листа (ровный срез). Если мешает, перегенерировать клетку 1 листа 1 с запасом сверху.

### Лист 8. Ещё 8 существ, «мальчиковые» (15 Nov, по просьбе Лиды)
Файл `08-species-2.png`, приложить лист 0 и лист 1. Ids по клеткам: `wolf` Thunder Pup, `lion` Sun Cub, `tiger` Comet Tiger, `dino` Rocky Dino, `panda` Bamboo Panda, `monkey` Jungle Monkey, `rhino` Pebble Rhino, `yeti` Frost Yeti. Конвейер берёт лист автоматически, если файл есть (`ids.json` → `species-2`, уровень `species`); окрасы dusk/dawn в `colors.json`. Промпт как у листа 1, плюс: «a little bolder and sporty, like a brave little buddy for a boy», «NO dark patches around the eyes» и запас сверху («nothing touches the top edge»). Полный текст промпта в треде «Build new fantasy avatars into the app».
Листы скачивать в полном размере; если размер другой, `slice.py` масштабирует лист к 2752×1536 и пишет предупреждение.
- Правка одной клетки: положите весь новый лист рядом как `<имя листа>.cell<N>.png` (например `01-species.cell1.png`, уши Moon Bunny), конвейер возьмёт из него только клетку N, остальные клетки не перекодируются.
