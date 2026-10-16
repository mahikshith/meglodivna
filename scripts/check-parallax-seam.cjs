/* Isolated rendered-pixel check for the illustrated panorama wrap. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

const output = path.resolve('artifacts/playtest-correction/qa/art/seam');
fs.mkdirSync(output, { recursive: true });
const themes = ['soulforge', 'tide', 'pyre', 'neon', 'veil'];
const records = [];

const inspectPixels = String.raw`
import json, sys
from PIL import Image, ImageChops, ImageStat
a = Image.open(sys.argv[1]).convert('RGB')
b = Image.open(sys.argv[2]).convert('RGB')
if a.size != (740, 360) or b.size != (740, 360):
    raise SystemExit(f'Expected 740x360 rendered screenshots, got {a.size} and {b.size}')
d = ImageChops.difference(a, b)
pixels = list(d.getdata())
changed = sum(max(p) > 8 for p in pixels)
print(json.dumps({'width': a.width, 'height': a.height,
  'meanAbsoluteRGB': round(sum(sum(p) for p in pixels) / (len(pixels)*3), 6),
  'changedOver8Fraction': round(changed/len(pixels), 8),
  'maxChannelDelta': max(max(p) for p in pixels),
  'beforeRGBStdDev': round(sum(ImageStat.Stat(a).stddev)/3, 3)}))
`;

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 740, height: 360 }, isMobile: true, hasTouch: true });
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:5173');
    await page.waitForFunction(() => window.__ASH?.scene?.lanternFX);
    await page.locator('#start').click();
    await page.locator('#intro-skip').click();
    await page.evaluate(() => window.__ASH.scene.game.loop.sleep());
    // A locator screenshot includes composited HTML above the canvas. Keep the
    // comparison strictly on rendered panorama pixels, without HUD/control art.
    await page.addStyleTag({ content: '#stage > :not(#game) { display: none !important; }' });

    for (const theme of themes) {
      const setup = await page.evaluate(async theme => {
        const scene = window.__ASH.scene;
        const { createRuneheartParallax } = await import('/src/runeheart-art.js');
        window.__seamArt?.destroy();
        for (const child of scene.children.list) child.setVisible(false);
        const art = createRuneheartParallax(scene, theme, scene.viewportH);
        window.__seamArt = art;
        art.resize(1344, scene.viewportH + 240);
        scene.cameras.main.setZoom(1).setScroll(0, 0);
        return { theme, texture: art.layers[0].views[0].texture.key,
          panoramaWidth: art.layers[0].width, speed: art.layers[0].speed,
          seamCameraX: art.layers[0].width / art.layers[0].speed };
      }, theme);
      assert.ok(setup.texture.startsWith('rh-bg-pc-'), `${theme}: legacy texture`);

      const paths = [];
      for (const side of ['before', 'after']) {
        const cameraX = setup.seamCameraX + (side === 'before' ? -0.05 : 0.05);
        await page.evaluate(cameraX => {
          const scene = window.__ASH.scene, art = window.__seamArt;
          art.update(cameraX, 0, 300);
          art.backing.setPosition(-192, -120);
          for (const layer of art.layers)
            for (const view of layer.views) view.setPosition(view.x - 192, view.y - 120);
          scene.children.depthSort();
          const renderer = scene.sys.game.renderer;
          renderer.preRender(); scene.cameras.render(renderer, scene.children); renderer.postRender();
        }, cameraX);
        const file = path.join(output, `${theme}-${side}.png`);
        await page.locator('#game canvas').screenshot({ path: file });
        paths.push(file);
      }
      const result = spawnSync('python', ['-c', inspectPixels, ...paths], { encoding: 'utf8' });
      if (result.status !== 0) throw new Error(`${theme}: pixel inspection failed: ${result.stderr || result.stdout}`);
      const pixels = JSON.parse(result.stdout);
      const record = { ...setup, deltaWorldX: 0.1, ...pixels,
        before: path.relative(process.cwd(), paths[0]), after: path.relative(process.cwd(), paths[1]) };
      records.push(record);
      assert.ok(pixels.beforeRGBStdDev > 8, `${theme}: rendered backdrop is blank`);
      assert.ok(pixels.meanAbsoluteRGB < 0.5 && pixels.changedOver8Fraction < 0.01,
        `${theme}: visible panorama jump at ${setup.seamCameraX.toFixed(2)}: ${JSON.stringify(pixels)}`);
    }
    const report = { kind: 'Isolated rendered panorama seam check', viewport: [740, 360],
      physicalDevice: false, legalCampaign: false, passed: true, records };
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`Panorama seams: ${records.length}/${records.length} pass at 740x360; report ${path.join(output, 'report.json')}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
