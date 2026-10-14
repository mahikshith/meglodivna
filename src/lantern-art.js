const base = `${import.meta.env.BASE_URL}lantern/`;

export function preloadLanternArt(scene) {
  scene.load.atlas('lantern-art', `${base}atlas.png`, `${base}atlas.json`);
  scene.load.json('lantern-manifest', `${base}manifest.json`);
  scene.load.image('rh-bg-lantern', `${base}sanctuary.png`);
  for (const name of ['platform', 'arch', 'lantern', 'root']) scene.load.image(`ln-${name}`, `${base}${name}.png`);
}

export function createLanternArt(scene, retained) {
  const manifest = scene.cache.json.get('lantern-manifest');
  if (!manifest) throw new Error('Lantern artwork was not preloaded');
  for (const key of Object.keys(manifest.frames)) {
    if (!scene.textures.get('lantern-art').has(key)) throw new Error(`Missing Lantern frame: ${key}`);
  }
  return { ...retained, frames: { ...retained.frames, ...manifest.frames }, animations: { ...retained.animations, ...manifest.animations } };
}
