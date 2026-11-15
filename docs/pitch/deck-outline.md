# Big Day Stories: план дека и черновая структура спича

Версия 1.1, 15.11.2026. Цифры и источники: [`business.md`](business.md). **Готовый дек:** [`deck/big-day-stories-deck-en.pdf`](deck/big-day-stories-deck-en.pdf) (сдача) и [`deck/big-day-stories-deck-ru.pdf`](deck/big-day-stories-deck-ru.pdf) (сцена), исходники `.pptx` рядом. **Текст выступления:** [`speech-ru.md`](speech-ru.md). **Ответы жюри:** [`jury-qa-ru.md`](jury-qa-ru.md).

Требования к деку (инструкция Business Cup 2.0): PDF на английском, **не больше 10 слайдов вместе с титулом**, без 11-го слайда-приложения; на каждый критерий жюри есть ответ; у каждой цифры источник, у гипотезы подпись «hypothesis». Детали, которые не влезли, уходят в README.

Текст на слайдах дан на английском, как он пойдёт в дек. Слайды 4 и 5 (продукт) заполняются скриншотами и фактами с прода, когда весь сценарий работает.

---

## Слайды

### 1. Title
- **Ключевая мысль:** что это и для кого в одной фразе.
- **На слайде:** Big Day Stories. "Bedtime stories that prepare your child for a big day, and show you what to say." Ссылка на прод, QR-код, трек Skills.
- **Визуал:** персонаж-гид и экран с отсчётом «5 sleeps until the dentist».
- **Критерий:** все.

### 2. Problem
- **Ключевая мысль:** трудные события у маленьких детей не редкость, а норма, а готовят к ним кустарно.
- **На слайде:** "Sarah's son Max (4) sees the dentist on Friday. Last time he screamed in the waiting room." Крупно: **"1 in 3 preschoolers is afraid of the dentist"** (Grisolia et al., 2020). Ниже мелко: 11% of US kids 3–17 have diagnosed anxiety (CDC, 2023–24); 1 in 31 has autism (CDC, 2025). "Today parents improvise: generic books, cartoons, ChatGPT prompts."
- **Критерий:** Problem & User (15%).

### 3. User & evidence
- **Ключевая мысль:** мы понимаем двух родителей и слышали их голос.
- **На слайде:** два портрета: Sarah (one big day a year → Big Day Pass) и Jason (child with autism, a big day every week → Gold). 3–4 цитаты родителей с подписью источника (`docs/research/user-voice-big-day-stories.md`). Если будут интервью: "We talked to N US parents: X said …".
- **Критерий:** Problem & User (15%).

### 4. Solution in 3 steps
- **Ключевая мысль:** подготовленный разговор к дате, а не сказка.
- **На слайде:** 3 скриншота: (1) parent enters event, date and fears → a plan of chapters with a countdown; (2) the child asks a question → the next page answers it, chip "Updated because Max asked"; (3) parent panel: what worries the child + phrases to say; event-day "first → then" card; check-in and bravery badge.
- **Данные:** с прода после полного сценария.
- **Критерий:** Product & Engineering (40%), Originality (10%).

### 5. What's live
- **Ключевая мысль:** это продукт, а не обёртка над моделью.
- **На слайде:** таблица "Code does / AI does": code = plan, story state, topics, memory, payments, safety rules; AI = writes text by rules into validated JSON, with a template fallback. Что работает вживую, что в тестовом режиме (Stripe test), стек (Next.js, PostgreSQL, Railway). Safety: sensitive answers wait for the parent.
- **Данные:** с прода и из README.
- **Критерий:** Product & Engineering (40%).

### 6. Why parents pay and come back
- **Ключевая мысль:** платят после того, как увидели ценность, и продукт сам зовёт к следующему событию.
- **На слайде:** Free (chapter 1) → paywall → **Big Day Pass $9.99 once** / **Gold $49/yr or $7.99/mo** (median Education app: $44.99/yr, RevenueCat). "No subscription trap: one-time pack, 30-day renewal reminder." Цикл удержания стрелками: countdown → calendar reminders → check-in → badge → next event prefilled → memory of what works for this child. North Star: events completed to check-in.
- **Критерий:** Value & Retention (20%).

### 7. Market & path to $100M ARR
- **Ключевая мысль:** большой рынок снизу, и честный путь к $100M слоями.
- **На слайде:** слева воронка: TAM ≈ $830M (17M US families with a child 3–8 × $49), SAM ≈ $210M (anxiety/autism families on Gold + one big day on Pass), SOM ≈ $1M in year 3 (36k payers from SEO, clinics, communities). Справа столбик слоёв: US core $33M + Big Day Passes $15M + premium tiers $8.5M + print books $9M + ages 2–12 & Spanish $20M + UK/CA/AU $15M ≈ $100M. Подпись: "hypotheses; sizing sources in README". Мелко: Wonderbly sold 8M+ personalized books, acquired by Penguin Random House (2025).
- **Критерий:** Business Potential (15%).

### 8. Unit economics
- **Ключевая мысль:** маржа выше 90%, и мы знаем, почему реклама не сработает.
- **На слайде:** маржа: Big Day Pass 90–94%, Gold 94–96% (Stripe 30¢ is the biggest cost, AI is cents). LTV year 1 ≈ $25 (benchmark: $22.82 per payer, RevenueCat Education). CAC: paid search ≈ $390 (CPC $6.23 × 1.6% conversion, WordStream 2025) → **we don't buy ads**; SEO library < $1, clinics $3–5 → target CAC ≤ $8, LTV/CAC ≥ 3. Воронка-цели пилота: 30% → 60% → 8–10% → 1.6% of visitors pay ($0.35 per visitor vs $0.30 per install benchmark).
- **Критерий:** Business Potential (15%).

### 9. Competitors & our angle
- **Ключевая мысль:** у других есть истории, у нас есть цикл события.
- **На слайде:** карта 2×2 (X: single static story ↔ full event cycle; Y: generic tale ↔ specific dated event). Big Day Stories справа вверху; BooksGiant, TinyCoach ближе к центру; Storytime AI, Oscar, Wonderbly слева внизу; ChatGPT слева в центре. Под картой: "BooksGiant is closest. We add: date & plan, child's questions change the story, parent panel, after-event loop. No login, no child photos."
- **Критерий:** Originality (10%).

### 10. Team & next milestones
- **Ключевая мысль:** кто мы и как поймём, что получилось.
- **На слайде:** команда (имена и роли от Лиды). Milestones, не даты: Pilot (50–100 families, psychologist & COPPA review → 60% of events reach check-in) → Value (20 events, grandma link, print book → 35% second event) → Growth (SEO library, 5–10 pediatric dentists, Spanish → CAC below year-1 revenue) → Depth (character voice & illustrations in premium tiers → yearly renewals).
- **Критерий:** все; закрывает вопрос «что дальше».

---

## Черновая структура спича (5 минут + 2 минуты вопросов)

Полный текст: [`speech-ru.md`](speech-ru.md). Ниже каркас. Тайминг взят из инструкции команды: работающий продукт на экране не позже 45-й секунды.

| Блок | Длительность | О чём | Опора |
|---|---|---|---|
| Проблема | ~25 с | Сара, Макс, пятница у стоматолога; «каждый третий дошкольник боится стоматолога» | Слайд 2 |
| Решение | ~20 с | Название и фраза «что делает и для кого» | Слайд 1 / 4 |
| Живое демо | ~2,5 мин | Try a sample → план с отсчётом → глава → ребёнок задаёт вопрос, следующая страница меняется → панель родителя → пейвол и тестовая оплата → карточка дня → отметка и следующее событие. Что вживую, что в тестовом режиме | Прод |
| Доказательства | ~45 с | Голоса родителей (и интервью, если будут); чем отличаемся от BooksGiant и ChatGPT | Слайды 3, 9 |
| Деньги | ~40 с | $9.99 разово или $49 в год; почему продлевают; маржа 90%+; LTV ~$25 и поэтому органика; $100M слоями | Слайды 6–8 |
| Финал | ~20 с | Кто мы, следующий этап, главная фраза ещё раз, «спасибо» | Слайд 10 |

**Правила на сцене (из инструкции):** говорит один, второй ведёт демо; на экране нет терминала и уведомлений; если демо упало, «покажу запись» и дальше; ответ на вопрос 20–30 секунд. Готовые ответы на вопросы жюри: раздел 12 в [`business.md`](business.md).

