const base = `${import.meta.env.BASE_URL}runeheart/`;
const backgroundNames = ['citadel', 'crypt', 'town', 'town-mid', 'moon-clouds', 'moon-town', 'forest', 'night-city'];

export function preloadRuneheartArt(scene) {
  scene.load.atlas('runeheart-art', `${base}atlas.png`, `${base}atlas.json`);
  scene.load.json('runeheart-art-manifest', `${base}manifest.json`);
  for (const name of backgroundNames) scene.load.image(`rh-bg-${name}`, `${base}background-${name}.png`);
}

/** Pass an optional legacy manifest to retain old item/effect keys during migration.
 * Each frame's atlasKey is authoritative when manifests are combined. */
export function createRuneheartArt(scene, legacy = null) {
  const manifest = scene.cache.json.get('runeheart-art-manifest');
  if (!manifest || !scene.textures.exists('runeheart-art')) throw new Error('Runeheart artwork was not preloaded');
  const frames = {};
  if (legacy) for (const [key, frame] of Object.entries(legacy.frames)) frames[key] = { ...frame, atlasKey: legacy.atlasKey };
  for (const [key, frame] of Object.entries(manifest.frames)) {
    if (!scene.textures.get('runeheart-art').has(key)) throw new Error(`Missing Runeheart frame: ${key}`);
    frames[key] = { ...frame, atlasKey: 'runeheart-art' };
  }
  return { ...manifest, atlasKey: 'runeheart-art', frames, animations: { ...legacy?.animations, ...manifest.animations } };
}

export const RUNEHEART_THEMES = {
  soulforge: { backdrop: 'forest', color: 0x243941, tint: 0xaddbdc, farAlpha: .7, decor: 'tree' },
  tide: { backdrop: 'town', color: 0x111f2c, tint: 0xb3e8e6, farAlpha: .78, decor: 'house-b', foreground: 'town-mid' },
  pyre: { backdrop: 'crypt', color: 0x271b22, tint: 0xc69b91, farAlpha: .68, decor: 'castle' },
  neon: { backdrop: 'night-city', color: 0x141d31, tint: 0xc8d8ff, farAlpha: .8, decor: 'street-lamp', skyline: true },
  veil: { backdrop: 'moon-clouds', color: 0x141327, tint: 0x9190c0, farAlpha: .7, decor: 'castle', foreground: 'moon-town' },
  forest: { backdrop: 'forest', color: 0x243941, tint: 0xaddbdc, farAlpha: .7, decor: 'tree' },
  citadel: { backdrop: 'citadel', color: 0x141327, tint: 0xe5d8ff, decor: 'castle' },
  town: { backdrop: 'town', color: 0x111f2c, tint: 0xffffff, farAlpha: .78, foreground: 'town-mid' },
  crypt: { backdrop: 'crypt', color: 0x101a28, tint: 0x90c5c4, farAlpha: .62 },
  moon: { backdrop: 'moon-clouds', color: 0x141327, tint: 0x9190c0, farAlpha: .7, foreground: 'moon-town' },
};

/** Screen-space parallax: full-height authored paintings, preserved aspect ratio,
 * integer nearest-neighbor scale, only a whole-panorama horizontal wrap. Root's
 * manually projected renderer should call update(cameraX, cameraY, floorScreenY).
 * floorScreenY is measured before any additional offset applied by the caller.
 * Native Phaser camera users can leave cameraY zero; these objects use scrollFactor 0. */
export function createRuneheartParallax(scene, theme = 'citadel', viewportH = scene.scale.height) {
  const spec = typeof theme === 'object' ? theme : RUNEHEART_THEMES[theme] || RUNEHEART_THEMES.citadel;
  const backing = scene.add.rectangle(0, 0, scene.scale.width, viewportH, spec.color).setOrigin(0).setDepth(-40).setScrollFactor(0);
  const layers = [];
  const layerSpecs = [
    { name: spec.backdrop, speed: .1, depth: -35, alpha: spec.farAlpha ?? 1, role: 'cover',
      crop: spec.skyline ? { key: 'rh-city-sky', x: 0, y: 0, w: 512, h: 237 } : null },
    { name: spec.skyline ? 'night-city' : spec.foreground, speed: .24, depth: -30,
      alpha: spec.foregroundAlpha ?? .4, role: 'horizon',
      crop: spec.skyline ? { key: 'rh-city-buildings', x: 0, y: 237, w: 512, h: 99 } : null },
  ];
  for (const layerSpec of layerSpecs) {
    const { name, speed, depth, alpha, role, crop } = layerSpec;
    if (!name) continue;
    const texture = scene.textures.get(`rh-bg-${name}`), source = texture.getSourceImage();
    if (crop && !texture.has(crop.key)) texture.add(crop.key, 0, crop.x, crop.y, crop.w, crop.h);
    const views = Array.from({ length: role === 'horizon' ? 4 : 2 }, () =>
      scene.add.image(0, 0, `rh-bg-${name}`, crop?.key).setOrigin(0).setScrollFactor(0).setDepth(depth).setAlpha(alpha).setTint(spec.tint || 0xffffff));
    layers.push({ views, nativeW: crop?.w || source.width, nativeH: crop?.h || source.height,
      speed, role, width: 0, height: 0 });
  }
  let height = viewportH;
  const resize = (viewW = scene.scale.width, viewH = scene.scale.height) => {
    height = viewH; backing.setSize(viewW, viewH);
    for (const layer of layers) {
      // Buildings keep their authored pixel density instead of scaling a short
      // 99px strip to the entire viewport height. Four whole panoramas cover wrap.
      const scale = layer.role === 'horizon' ? 2 : Math.ceil(Math.max(viewW / layer.nativeW, viewH / layer.nativeH));
      layer.width = layer.nativeW * scale; layer.height = layer.nativeH * scale;
      for (const view of layer.views) view.setScale(scale);
    }
  };
  const update = (cameraX = 0, cameraY = 0, floorScreenY = null) => {
    backing.setPosition(0, 0);
    for (const layer of layers) {
      const offset = ((cameraX * layer.speed) % layer.width + layer.width) % layer.width;
      // A small vertical parallax pan stays bounded by the oversized painting.
      const top = layer.role === 'horizon'
        ? (Number.isFinite(floorScreenY) ? floorScreenY : height * .72) - layer.height
        : -Math.min(Math.max(0, layer.height-height), Math.max(0,cameraY) * .05);
      for (let i = 0; i < layer.views.length; i++) layer.views[i].setPosition(layer.width*i-offset, top);
    }
  };
  resize(scene.scale.width, viewportH); update();
  return { layers, backing, update, resize, destroy() { backing.destroy(); for (const layer of layers) for (const view of layer.views) view.destroy(); } };
}

export function runeheartFrameKey(art, animation, time, rate = 9, clamp = false) {
  const frames = art.animations[animation];
  if (!frames?.length) return null;
  const index = Math.max(0, Math.floor(time * rate));
  return frames[clamp ? Math.min(frames.length - 1, index) : index % frames.length];
}
