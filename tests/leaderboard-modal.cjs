/*
 * Браузерная проверка «Топ смен» без изменения базы данных.
 * php -S 0.0.0.0:8080
 * npm ci
 * CHROMIUM_PATH=/usr/bin/chromium node tests/leaderboard-modal.cjs
 * TEST_BASE_URL позволяет указать другой адрес запущенного PHP-сервера.
 */
'use strict';

const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');

const base = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const menuButton = '.topbar__nav [data-leaderboard-open]';
const fixture = Array.from({ length: 5 }, (_, index) => ({
  rank: index + 1,
  nickname: index === 0 ? 'Фельдшер03' : 'Игрок_' + (index + 1),
  score: 12500 - index * 1000,
  finished_at: '2026-10-24 11:30:00'
}));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  let passed = 0;
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let players = fixture;
    let failAPI = false;
    let requests = 0;
    await page.setRequestInterception(true);
    page.on('request', request => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.endsWith('/api/top.php')) {
        requests += 1;
        return request.respond({
          status: failAPI ? 503 : 200,
          contentType: 'application/json',
          body: JSON.stringify(failAPI ? { ok: false } : { ok: true, players })
        });
      }
      // Проверка авторизованной разметки не должна создавать игрока через API.
      if (pathname.endsWith('/api/profile.php')) {
        return request.respond({ status: 200, contentType: 'application/json', body: '{"ok":false}' });
      }
      return request.continue();
    });
    await page.evaluateOnNewDocument(() => {
      const setInterval = window.setInterval.bind(window);
      const clearInterval = window.clearInterval.bind(window);
      window.__leaderboardInterval = null;
      window.setInterval = (callback, delay, ...args) => {
        const id = setInterval(callback, delay, ...args);
        if (delay === 60000) window.__leaderboardInterval = { id, callback };
        return id;
      };
      window.clearInterval = id => {
        if (window.__leaderboardInterval && window.__leaderboardInterval.id === id) window.__leaderboardInterval = null;
        clearInterval(id);
      };
    });

    const test = async (name, run) => {
      await run();
      passed += 1;
      console.log('PASS ' + name);
    };
    const open = async (selector = menuButton) => {
      await page.click(selector);
      await page.waitForSelector('#top[open]');
      await page.waitForNetworkIdle({ idleTime: 50 });
    };
    const closed = async () => {
      await page.waitForFunction(() => !document.getElementById('top').open && !document.body.classList.contains('leaderboard-open'));
    };
    const escape = async () => {
      await page.keyboard.press('Escape');
      await closed();
    };
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(base + '/index.php', { waitUntil: 'networkidle0' });
    // API замокан: тесты интерфейса не зависят от доступности MySQL/SQLite.
    await page.evaluate(() => { document.body.dataset.db = '1'; });

    await test('Гость: окно скрыто, в меню сохранена кнопка «Рекорды»', async () => {
      assert.equal(await page.$eval('#top', element => element.open), false);
      assert.equal(await page.$eval('#top', element => getComputedStyle(element).display), 'none');
      assert.equal(await page.$('main .board'), null);
      assert.equal(await page.$eval(menuButton, element => element.textContent), 'Рекорды');
      assert.equal(requests, 0);
    });

    await test('Кнопка открывает модальное окно с актуальными пятью результатами', async () => {
      await open();
      await page.waitForFunction(() => document.querySelector('#top .rank__nick').textContent === 'Фельдшер03');
      assert.equal(await page.$eval('#top', element => element.matches(':modal')), true);
      assert.equal(await page.$$eval('#top .rank', elements => elements.length), 5);
      assert.equal(await page.$eval('#top .rank__score', element => element.textContent), '12 500очк');
      assert.equal(await page.$eval('#top .rank__when', element => element.textContent), '24.10 · 11:30');
      assert.equal(await page.$eval(menuButton, element => element.getAttribute('aria-expanded')), 'true');
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
      assert.equal(await page.evaluate(() => document.activeElement.className), 'board__close');
    });

    await test('Tab и Shift+Tab не выпускают фокус из окна', async () => {
      for (let index = 0; index < 7; index += 1) {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.getElementById('top').contains(document.activeElement)), true);
      }
      await page.focus('.board__close');
      await page.keyboard.down('Shift');
      await page.keyboard.press('Tab');
      await page.keyboard.up('Shift');
      assert.equal(await page.evaluate(() => document.activeElement.className), 'board__dismiss');
    });

    await test('Клик внутри окна не закрывает его; фон не прокручивается', async () => {
      await page.click('#board-title');
      const before = await page.evaluate(() => window.scrollY);
      await page.mouse.move(5, 5);
      await page.mouse.wheel({ deltaY: 600 });
      await settle();
      assert.equal(await page.$eval('#top', element => element.open), true);
      assert.equal(await page.evaluate(() => window.scrollY), before);
    });

    await test('Крестик закрывает окно и возвращает фокус на кнопку меню', async () => {
      await page.click('.board__close');
      await closed();
      assert.equal(await page.evaluate(selector => document.activeElement.matches(selector), menuButton), true);
      assert.equal(await page.$eval(menuButton, element => element.getAttribute('aria-expanded')), 'false');
      assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
    });

    await test('Работают повторное открытие и кнопка «Закрыть»', async () => {
      await open();
      await page.click('.board__dismiss');
      await closed();
    });

    await test('Escape закрывает окно', async () => {
      await open();
      await escape();
    });

    await test('Клик по затемнённому фону закрывает окно', async () => {
      await open();
      await page.mouse.click(5, 5);
      await closed();
    });

    await test('Перетаскивание из окна на фон не вызывает случайного закрытия', async () => {
      await open();
      const bounds = await page.$eval('#board-title', element => element.getBoundingClientRect().toJSON());
      await page.mouse.move(bounds.x + 10, bounds.y + 10);
      await page.mouse.down();
      await page.mouse.move(5, 5, { steps: 4 });
      await page.mouse.up();
      assert.equal(await page.$eval('#top', element => element.open), true);
      await escape();
    });

    await test('Обновление пустого рейтинга и остановка таймера после закрытия', async () => {
      await open();
      await page.waitForFunction(() => document.querySelector('#top .rank__nick').textContent === 'Фельдшер03');
      players = [];
      await page.waitForFunction(() => window.__leaderboardInterval !== null);
      await page.evaluate(() => window.__leaderboardInterval.callback());
      await page.waitForFunction(() => !document.querySelector('#top .board__empty').hidden);
      assert.equal(await page.$eval('#top .board__list', element => element.hidden), true);
      await escape();
      assert.equal(await page.evaluate(() => window.__leaderboardInterval), null);
    });

    await test('Ники из API выводятся текстом, а не HTML', async () => {
      players = [{ ...fixture[0], nickname: '<img src=x onerror="window.injected=true">' }];
      await open();
      await page.waitForFunction(() => document.querySelector('#top .rank__nick')?.textContent.startsWith('<img'));
      assert.equal(await page.$('#top .rank__nick img'), null);
      assert.equal(await page.evaluate(() => window.injected), undefined);
      await escape();
    });

    await test('При ошибке API сохраняется последний показанный результат', async () => {
      failAPI = true;
      const response = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/api/top.php'));
      await open();
      assert.equal((await response).status(), 503);
      assert.equal(await page.$eval('#top .rank__nick', element => element.textContent), players[0].nickname);
      await escape();
      failAPI = false;
      players = fixture;
    });

    await test('Кнопка в подвале открывает то же окно и восстанавливает фокус', async () => {
      const footerButton = '.foot [data-leaderboard-open]';
      await open(footerButton);
      await page.waitForFunction(() => document.querySelector('#top .rank__nick')?.textContent === 'Фельдшер03' && document.querySelectorAll('#top .rank').length === 5);
      await settle();
      await page.click('.board__dismiss');
      await closed();
      assert.equal(await page.evaluate(selector => document.activeElement.matches(selector), footerButton), true);
    });

    await test('При недоступной БД окно открывается без дополнительных запросов', async () => {
      await page.evaluate(() => { document.body.dataset.db = '0'; });
      const before = requests;
      await open();
      await settle();
      assert.equal(requests, before);
      await escape();
      await page.evaluate(() => { document.body.dataset.db = '1'; });
    });

    await test('Телефон, планшет и горизонтальный экран: окно помещается, фон не расползается', async () => {
      for (const [width, height] of [[320, 568], [375, 667], [768, 1024], [640, 360]]) {
        await page.setViewport({ width, height });
        await open();
        const metrics = await page.evaluate(() => {
          const dialog = document.getElementById('top').getBoundingClientRect();
          const closer = document.querySelector('.board__close').getBoundingClientRect();
          const dismiss = document.querySelector('.board__dismiss').getBoundingClientRect();
          const body = document.querySelector('.board__body');
          return { left: dialog.left, right: dialog.right, top: dialog.top, bottom: dialog.bottom,
            closeTop: closer.top, dismissBottom: dismiss.bottom, width: innerWidth, height: innerHeight,
            documentWidth: document.documentElement.scrollWidth, bodyWidth: body.clientWidth, bodyScrollWidth: body.scrollWidth,
            scrollable: body.scrollHeight > body.clientHeight };
        });
        assert.ok(metrics.left >= 0 && metrics.right <= width && metrics.top >= 0 && metrics.bottom <= height, JSON.stringify(metrics));
        assert.ok(metrics.closeTop >= 0 && metrics.dismissBottom <= height);
        assert.ok(metrics.documentWidth <= width);
        assert.ok(metrics.bodyScrollWidth <= metrics.bodyWidth);
        if (height === 360) assert.equal(metrics.scrollable, true);
        await escape();
      }
    });

    await test('Старые ссылки #top открывают окно; закрытие убирает только этот якорь', async () => {
      await page.goto(base + '/index.php?from=test#top', { waitUntil: 'networkidle0' });
      await page.waitForSelector('#top[open]');
      await escape();
      const url = new URL(page.url());
      assert.equal(url.hash, '');
      assert.equal(url.search, '?from=test');
    });

    await test('После входа окно доступно, энциклопедия продолжает открываться отдельно', async () => {
      await page.goto(base + '/index.php?nick=ModalTest', { waitUntil: 'networkidle0' });
      await open();
      await escape();
      await page.click('#encyclopedia-open');
      await page.waitForFunction(() => !document.getElementById('encyclopedia-modal').hidden);
      await page.click('#encyclopedia-close');
      await page.waitForFunction(() => document.getElementById('encyclopedia-modal').hidden);
      assert.equal(await page.$eval('#top', element => element.open), false);
    });

    assert.deepEqual(errors, [], 'Не должно быть ошибок JavaScript в браузере');
    console.log('\n' + passed + ' browser checks passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
