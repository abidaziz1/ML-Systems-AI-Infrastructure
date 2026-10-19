/*
 * Smoke test for a lesson. Opens the lesson in headless Chromium from file://, walks every step,
 * answers every quiz correctly, and fails on console errors, render errors, missing glossary
 * terms and horizontal page overflow.
 *
 *   node tests/smoke.cjs                       # tests every lesson listed in assets/js/catalog.js
 *   node tests/smoke.cjs papers/01-tensorflow  # tests one lesson folder
 *   SHOTS=/some/dir node tests/smoke.cjs ...   # also saves a screenshot of every step
 *
 * Needs Playwright: `npm i -D playwright` (or a global install; set NODE_PATH to its parent folder).
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const shots = process.env.SHOTS || '';
const viewport = process.env.MOBILE ? { width: 390, height: 800 } : { width: 1280, height: 900 };

function lessonFolders() {
  if (process.argv[2]) return [process.argv[2]];
  const src = fs.readFileSync(path.join(root, 'assets/js/catalog.js'), 'utf8');
  return [...src.matchAll(/lesson:\s*'([^']+)'/g)].map((m) => m[1]);
}

async function testLesson(browser, folder) {
  const problems = [];
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push('console error: ' + m.text());
  });
  page.on('pageerror', (e) => problems.push('page error: ' + e.message));

  const url = 'file://' + path.join(root, folder, 'index.html');
  await page.goto(url);
  await page.waitForSelector('.card h1');

  const total = await page.evaluate(() => MLS.player.flat.length);
  const glossaryKeys = await page.evaluate(() => Object.keys(MLS.glossary));
  let minutes = 0;
  let quizzes = 0;

  for (let i = 0; i < total; i++) {
    const info = await page.evaluate((idx) => {
      const f = MLS.player.flat[idx];
      const quizSpecs = [];
      (function walk(blocks) {
        (blocks || []).forEach((b) => {
          if (!b || typeof b === 'string') return;
          if (b.t === 'quiz') quizSpecs.push({ answer: b.answer, n: b.options.length });
          if (Array.isArray(b.body)) walk(b.body);
          if (b.tabs) b.tabs.forEach((t) => walk(t.body));
          if (b.left) walk(b.left.body);
          if (b.right) walk(b.right.body);
        });
      })(f.step.blocks);
      return { title: f.step.title, min: f.step.min || 0, part: f.part.id, quizSpecs };
    }, i);
    minutes += info.min;
    const label = `step ${i + 1}/${total} "${info.title}"`;

    const h1 = await page.textContent('.card h1');
    if (!h1 || h1.trim() !== info.title) problems.push(`${label}: heading mismatch (${h1})`);
    if (await page.$('.callout.watch:has-text("failed to render")')) problems.push(`${label}: render error callout`);
    if (await page.$('.callout.watch:has-text("Unknown block type")')) problems.push(`${label}: unknown block type`);
    if (await page.$('.widget .wbody:has-text("Missing widget")')) problems.push(`${label}: missing widget`);

    const terms = await page.$$eval('button.term', (els) => els.map((e) => e.getAttribute('data-term')));
    terms.forEach((t) => {
      if (!glossaryKeys.includes(t)) problems.push(`${label}: glossary key "${t}" is not defined`);
    });

    // Answer every quiz correctly, in page order (quizzes inside hidden tabs are skipped).
    const quizEls = await page.$$('.quiz');
    for (let q = 0; q < quizEls.length && q < info.quizSpecs.length; q++) {
      const spec = info.quizSpecs[q];
      const opts = await quizEls[q].$$('.opt');
      if (opts.length !== spec.n) {
        problems.push(`${label}: quiz ${q} has ${opts.length} options, expected ${spec.n}`);
        continue;
      }
      const answers = Array.isArray(spec.answer) ? spec.answer : [spec.answer];
      if (!(await quizEls[q].isVisible())) continue;
      for (const a of answers) await opts[a].click();
      if (Array.isArray(spec.answer)) await (await quizEls[q].$('.actions button')).click();
      const ok = await quizEls[q].$('.feedback.ok');
      if (!ok) problems.push(`${label}: quiz ${q} did not accept the correct answer`);
      quizzes++;
    }

    // Step through any graph walkthrough to the last frame.
    const nextStep = await page.$('.walk .wnav button.primary');
    if (nextStep) {
      for (let k = 0; k < 20; k++) {
        if (await nextStep.isDisabled()) break;
        await nextStep.click();
      }
    }

    // Flip every flip card and open every tab, to make sure nothing throws.
    for (const card of await page.$$('button.flip')) await card.click();
    for (const tab of await page.$$('[role=tab]')) {
      if (await tab.isVisible()) await tab.click();
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 2) problems.push(`${label}: page scrolls sideways by ${overflow}px`);

    if (shots) {
      fs.mkdirSync(shots, { recursive: true });
      const name = String(i + 1).padStart(2, '0') + '-' + info.part + '.png';
      await page.screenshot({ path: path.join(shots, name), fullPage: true });
    }
    if (i < total - 1) await page.click('.pager .btn.primary');
  }

  console.log(`${folder}: ${total} steps, ${quizzes} quizzes answered, about ${minutes} minutes of content, viewport ${viewport.width}px`);
  await ctx.close();
  return problems;
}

async function testLanding(browser) {
  const problems = [];
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push('landing console error: ' + m.text());
  });
  page.on('pageerror', (e) => problems.push('landing page error: ' + e.message));
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.waitForSelector('.pcard');
  const cards = await page.$$eval('.pcard', (els) => els.length);
  if (cards !== 24) problems.push(`landing: expected 24 paper cards, found ${cards}`);
  await page.click('button.chip:has-text("Starter 10")');
  const starter = await page.$$eval('.pcard', (els) => els.length);
  if (starter !== 10) problems.push(`landing: expected 10 starter cards, found ${starter}`);
  await ctx.close();
  return problems;
}

(async () => {
  const browser = await chromium.launch();
  let problems = await testLanding(browser);
  for (const folder of lessonFolders()) problems = problems.concat(await testLesson(browser, folder));
  await browser.close();
  if (problems.length) {
    console.error('\nFAILED:\n - ' + problems.join('\n - '));
    process.exit(1);
  }
  console.log('OK: no problems found');
})();
