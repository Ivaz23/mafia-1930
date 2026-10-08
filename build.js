// build.js — разбивает одиночный HTML на оптимизированные файлы
// Пути ОТНОСИТЕЛЬНЫЕ — работают и локально, и на Netlify
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] || 'mafia_1930.html';
const DIST = 'dist';

if (!fs.existsSync(SRC)) {
  console.error('✗ Не найден файл:', SRC);
  console.error('  Переименуй свой HTML в mafia_1930.html или укажи путь: node build.js путь.html');
  process.exit(1);
}

if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

const html = fs.readFileSync(SRC, 'utf8');
console.log('→ Читаю:', SRC, '(' + Math.round(html.length / 1024) + ' KB)');

/* ---------- 1. Извлекаем все <style> блоки ---------- */
const styles = [];
const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
let m;
while ((m = styleRe.exec(html)) !== null) styles.push(m[1].trim());

const cssOut = styles.join('\n\n');
fs.writeFileSync(path.join(DIST, 'styles.css'), cssOut);
console.log('✓ styles.css   ', styles.length, 'блока,', Math.round(cssOut.length / 1024) + ' KB');

/* ---------- 2. Находим главный скрипт игры ---------- */
const scriptRe = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let gameScript = null;
while ((m = scriptRe.exec(html)) !== null) {
  const content = m[1];
  if (!content || content.length < 100) continue;
  if (content.includes("'use strict'") && content.includes('BOOT_STEPS')) {
    gameScript = content;
  }
}

if (!gameScript) {
  console.error('✗ Не найден основной игровой скрипт');
  process.exit(1);
}

fs.writeFileSync(path.join(DIST, 'game.js'), gameScript.trim());
console.log('✓ game.js      ', Math.round(gameScript.length / 1024) + ' KB');

/* ---------- 3. Собираем новый index.html ---------- */

// 3.1. Удаляем все <style> блоки
let newHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

// 3.2. Вставляем ОТНОСИТЕЛЬНЫЕ ссылки на CSS, manifest, meta
// Ставим сразу после <title>...</title>, чтобы было надёжно
newHtml = newHtml.replace(
  /(<title>[\s\S]*?<\/title>)/i,
  `$1
<link rel="stylesheet" href="styles.css">
<link rel="manifest" href="manifest.json">
<link rel="icon" type="image/svg+xml" href="icon.svg">
<meta name="theme-color" content="#d8b958">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<link rel="preload" as="script"
      href="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"
      crossorigin="anonymous">
<link rel="dns-prefetch" href="https://yandex.ru">`
);

// 3.3. Заменяем главный <script>...</script> на относительный <script src="game.js">
newHtml = newHtml.replace(
  /<script>\s*'use strict';[\s\S]*?<\/script>/i,
  '<script src="game.js" defer></script>'
);

// 3.4. Регистрация SW — с относительным путём и проверкой на localhost/https
newHtml = newHtml.replace(
  /<\/body>/,
  `<script>
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('service-worker.js').catch(function(e){ console.warn(e); });
  });
}
</script>
</body>`
);

fs.writeFileSync(path.join(DIST, 'index.html'), newHtml);
console.log('✓ index.html   ', Math.round(newHtml.length / 1024) + ' KB');

/* ---------- 4. Копируем конфиг-файлы в dist ---------- */
['manifest.json', 'service-worker.js', '_redirects', 'icon.svg', 'netlify.toml'].forEach(f => {
  if (fs.existsSync(f)) {
    fs.copyFileSync(f, path.join(DIST, f));
    console.log('✓', f);
  }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  ГОТОВО. Смотри папку ' + DIST + '/');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Открыть локально: двойной клик по dist/index.html');
console.log('  Или сервер:        npx serve dist');
console.log('  Деплой:            перетащи папку dist на https://app.netlify.com/drop');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');