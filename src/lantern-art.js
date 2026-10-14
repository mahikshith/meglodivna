const base = `${import.meta.env.BASE_URL}lantern/`;

export function preloadLanternArt(scene) {
  scene.load.atlas('lantern-art', `${base}atlas.png`, `${base}atlas.json`);
  scene.load.json('lantern-manifest', `${base}manifest.json`);
  const motion = `${import.meta.env.BASE_URL}lantern-motion/`, fx = `${import.meta.env.BASE_URL}lantern-fx/`;
  scene.load.atlas('lantern-motion', `${motion}atlas.png`, `${motion}atlas.json`);
  scene.load.json('lantern-motion-manifest', `${motion}manifest.json`);
  scene.load.atlas('lantern-fx', `${fx}atlas.png`, `${fx}atlas.json`);
  for (const name of ['water','stone','platform','emitter','emitter-cap','lever','ward','bolt','orb']) scene.load.image(`ln-fx-${name}`, `${fx}${name}.png`);
  scene.load.image('rh-bg-lantern', `${base}sanctuary.png`);
  for (const name of ['platform', 'arch', 'lantern', 'root']) scene.load.image(`ln-${name}`, `${base}${name}.png`);
}

export function createLanternArt(scene, retained) {
  const manifest = scene.cache.json.get('lantern-manifest');
  if (!manifest) throw new Error('Lantern artwork was not preloaded');
  for (const key of Object.keys(manifest.frames)) {
    if (!scene.textures.get('lantern-art').has(key)) throw new Error(`Missing Lantern frame: ${key}`);
  }
  const motion = scene.cache.json.get('lantern-motion-manifest');
  if (!motion) throw new Error('Lantern motion artwork was not preloaded');
  for (const key of Object.keys(motion.frames)) if (!scene.textures.get('lantern-motion').has(key)) throw new Error(`Missing motion frame: ${key}`);
  return { ...retained, frames: { ...retained.frames, ...manifest.frames, ...motion.frames }, animations: { ...retained.animations, ...manifest.animations, ...motion.animations } };
}
