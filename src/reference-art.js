const base = `${import.meta.env.BASE_URL}reference/`;

export function preloadReferenceArt(scene) {
  scene.load.atlas('reference-art', `${base}atlas.png`, `${base}atlas.json`);
  scene.load.json('reference-art-manifest', `${base}manifest.json`);
}

export function createReferenceArt(scene) {
  const manifest = scene.cache.json.get('reference-art-manifest');
  if (!manifest || !scene.textures.exists('reference-art')) throw new Error('Reference artwork was not preloaded');
  for (const key of Object.keys(manifest.frames)) {
    if (!scene.textures.get('reference-art').has(key)) throw new Error(`Missing extracted frame: ${key}`);
  }
  return { atlasKey: 'reference-art', ...manifest };
}
