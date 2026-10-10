# Инструкция по Git: ОДИН репозиторий, ОДНА ветка main

**Схема максимально простая: есть только `main`. Все делают ветки от `main` и сливают обратно в `main` через Pull Request.**

```
main (единственная общая ветка, то что на хостинге)
 ↑   ↑   ↑
 |   |   feature/3-form (backend)
 |   feature/2-header (frontend)
 feature/1-one-test (твоя тестовая)
```

Правила:
1. Напрямую в `main` не пушим. Никогда.
2. Взял задачу -> ветка от `main` -> работа -> PR в `main` -> мерж -> удалить ветку.
3. Чужие папки не трогаем без спроса.

## 1. Разовая настройка (15 минут, всем ДО хакатона)

```bash
git --version
git config --global user.name "Ivan Petrov"
git config --global user.email "ivan@example.com"
```

Почта = как на GitHub.

**Включи авто-upstream, чтобы не было ошибки как у тебя на скрине:**
```bash
git config --global push.autoSetupRemote true
```
После этого обычный `git push` сам создает ветку на GitHub, не надо каждый раз писать `-u origin ...`.

**Клонируй репо ОДИН РАЗ:**
```bash
git clone https://github.com/KIZNAIVER-HACKATON-2026/hacaton_main.git
cd hacaton_main
```

В VS Code: `File -> Open Folder -> hacaton_main`.

Если при push просит логин/пароль: пароль от GitHub не подойдет, нужен Token. GitHub -> Settings -> Developer settings -> Personal access tokens -> Generate. Сохрани его, вставляешь вместо пароля. Настрой ДО хакатона.

## 2. Кто за какие папки отвечает (чтобы не конфликтовать в одном репо)

```
hacaton_main/
├── index.php
├── assets/css/, assets/js/, assets/img/
├── includes/db.php      <- только тимлид
├── pages/
├── api/
├── database/schema.sql  <- только backend + тимлид
├── docs/
└── pitch/               <- только ответственный за презу
    ├── presentation.pptx
    └── presentation.pdf
```

- Frontend: `pages/`, `assets/`
- Backend: `api/`, `database/`
- Green-1: картинки, тексты, `docs/`
- Green-2: ТОЛЬКО `pitch/`
- Тимлид: мержи в `main`, `db.php`, деплой

## 3. Полный цикл: взял задачу -> сдал

Пример: задача #1, ветка `feature/1-one-test` — как у тебя на скрине.

### Шаг 1. Встань на свежий main
```bash
git checkout main
git pull origin main
```
`git pull` без слов тоже сработает, потому что main уже привязан к origin. А вот `git pull main` — ошибка, так писать нельзя. Git думает что `main` это имя удаленного сервера, а сервер у нас называется `origin` (это видно в `git remote -v`).

### Шаг 2. Создай свою ветку ОТ main
```bash
git checkout -b feature/1-one-test
```

Имена только латиницей: `feature/1-header`, `feature/5-login`, `fix/8-mobile`, `pitch/10-slides`.

### Шаг 3. Работаешь, коммитишь часто
```bash
git status
git add pages/header.php
git commit -m "1: добавил шапку"
git push
```
`git push` сработает сразу, если ты включил `push.autoSetupRemote` из раздела 1. Если не включал, первый раз надо так:
```bash
git push -u origin feature/1-one-test
```
Именно эта ошибка у тебя на скрине: `has no upstream branch`. Это не поломка, Git просто просит в первый раз показать куда пушить.

Дальше в этой же ветке уже просто `git push`.

Не делай слепо `git add .`, если видишь в `git status` чужие файлы. Добавляй свои точечно.

### Шаг 4. Создай Pull Request в main
1. Зайди на github.com в наш репо.
2. Желтая плашка `Compare & pull request` -> жми.
3. Проверь: `base: main <- compare: feature/1-one-test`.
4. Название: `1: что сделал`, в описание `Closes #1`.
5. `Create pull request`, в Reviewers выбери тимлида/мидла.

Если попросили поправить — правишь в ТОЙ ЖЕ ветке, снова `add/commit/push`. Новый PR не нужен.

### Шаг 5. После мержа убери за собой
Когда PR смержили на сайте:
```bash
git checkout main
git pull origin main
git branch -d feature/1-one-test
```
Ты снова на свежем `main`, готов брать следующую задачу.

## 4. Коммиты

Формат: `номер: что сделал`

Хорошо: `1: добавил шапку`, `5: чиню форму`, `10: обновил слайды`
Плохо: `фикс`, `final`, `asdasd`

Коммить раз в 30-60 минут, а не один гигантский коммит в конце дня.

## 5. Как подтянуть свежий main к себе в ветку

Если сидишь в ветке полдня, а в `main` уже много нового:
```bash
# находясь в своей ветке:
git pull origin main
```
Делай утром и после обеда. Перед созданием PR — обязательно.

## 6. Презентация в том же репо: особые правила

`.pptx` нельзя мержить как код. Если двое одновременно его поменяют — один затрет другого.

1. `pitch/` правит ТОЛЬКО ОДИН человек.
2. Тоже через ветку `pitch/...` -> PR в `main`.
3. Только `presentation.pptx` + `presentation.pdf`, никаких `ФИНАЛ2`.
4. Видео в гит не льем, кладем ссылку в `pitch/demo-link.txt`.

То же для `schema.sql` — меняет только backend + тимлид.

## 7. Конфликты

Будут в основном в `style.css`. Выглядит так:
```
<<<<<<< HEAD
.header { height: 60px; }
=======
.header { height: 80px; }
>>>>>>> main
```

Для зеленых:
1. Открой в VS Code, он покажет кнопки `Accept Current / Incoming / Both`.
2. Спроси в чате у второго человека чей вариант правильный.
3. Выбери, удали строки `<<<< ==== >>>>`, сохрани, проверь в браузере.
4. Заверши:
```bash
git add assets/css/style.css
git commit -m "1: помирил конфликт"
git push
```
Паникуешь — зови тимлида, покажи экран. Не жми случайные команды.

Чтобы конфликтов было меньше: договоритесь писать в `style.css` каждый в свой блок с комментарием `/* Ivan: header */`, не сиди в ветке дольше 6 часов.

## 8. ЗАПРЕЩЕНКА

🚫 `git push origin main` напрямую в main
🚫 `git push --force`
🚫 `git reset --hard`, `git clean -fd` без тимлида
🚫 Коммитить пароли, `.zip`, видео на 500МБ
🚫 Мержить свой PR самому не показав никому (кроме опечатки)
🚫 Ветки с кириллицей: `моя-ветка`, `финал`

## 9. Шпаргалка на 1 экран (распечатай)

```bash
# ВЗЯЛ ЗАДАЧУ №1
git checkout main
git pull origin main
git checkout -b feature/1-название-латиницей

# РАБОТАЕШЬ
git status
git add ТВОИ-ФАЙЛЫ
git commit -m "1: что сделал"
git push

# ПОДТЯНУТЬ СВЕЖИЙ MAIN
git pull origin main

# ПОСЛЕ МЕРЖА PR
git checkout main
git pull origin main
git branch -d feature/1-название-латиницей

# ГДЕ Я?
git branch --show-current
git status
git log --oneline -5
```

## 10. Кнопками в VS Code (для зеленых)

1. Source Control слева (Ctrl+Shift+G).
2. Внизу слева клик по ветке — смена. Новая: `... -> Branch -> Create Branch` от `main`.
3. `+` на своих файлах, сообщение `1: что сделал`, галочка Commit, кнопка Push.
4. PR все равно на сайте GitHub.

## 11. Разбор твоих ошибок со скрина + частые косяки

**1. `git pull main` -> fatal: 'main' does not appear to be a git repository**
Ты написал имя ветки вместо имени пульта. Правильно:
```bash
git pull origin main
# или просто:
git pull
```
`origin` — это сервер (видно в `git remote -v`), `main` — ветка. Порядок всегда такой: сначала куда (origin), потом что (main).

**2. `git push` -> fatal: has no upstream branch**
Новая ветка еще не связана с GitHub. Лечится один раз:
```bash
git push -u origin feature/1-one-test
```
Или включи авто-режим один раз навсегда (раздел 1):
```bash
git config --global push.autoSetupRemote true
```
После этого просто `git push` будет работать всегда.

**3. Начал менять файлы в `main`, забыв создать ветку**
```bash
git stash
git checkout -b feature/1-название
git stash pop
```

**4. `rejected, failed to push`**
Сначала забери чужое:
```bash
git pull origin main
git push
```
Без `--force`.

**5. Потерялся**
```bash
git branch --show-current
git status
```
Скинь вывод тимлиду.

## 12. Что тимлиду настроить на GitHub под схему «только main» (2 минуты)

Так как ветка одна, нужна всего ОДНА защита:

`Репо -> Settings -> Branches -> Add classic branch protection rule`
- Branch name pattern: `main`
- Включить `Require a pull request before merging`, approvals: `0` (чтобы не тормозить, на скорость полагаемся на ревью глазами)
- Включить `Block force pushes`, запретить `Allow deletions`
- `Settings -> General -> Automatically delete head branches` — включить

Права: ты `Admin`, остальные `Write`. Default branch трогать не надо, остается `main`.

Теперь прямой `git push origin main` будет отклоняться, а `feature/... -> main` через PR работать.

## 13. Тренировка (всем пройти один раз)

1. `git checkout main`, `git pull origin main`
2. `git checkout -b feature/test-твое-имя`
3. Создай `docs/hello-твое-имя.txt`
4. `add/commit/push`, создай PR в `main`
5. Дождись мержа, `checkout main`, `pull`, удали ветку

---
**Формула: 1 репо + 1 main + много маленьких веток + частые PR. Не пушу в main напрямую, не форсю, спрашиваю если страшно.**
