"""Publish the controlled illustrated correction sources at bounded Android texture sizes."""
from pathlib import Path
import hashlib
import json

from PIL import Image
import numpy as np
from scipy.ndimage import distance_transform_edt

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'reference/playtest-correction'
OUT = ROOT / 'public/painted-correction'
PROOF = ROOT / 'artifacts/playtest-correction/qa/art'
OUT.mkdir(parents=True, exist_ok=True)
PROOF.mkdir(parents=True, exist_ok=True)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

manifest = {'backdrops': {}, 'sprites': {}, 'normalizedSources': {}}
wolf_source = SRC / 'wolf-painted-source.png'
wolf = Image.open(wolf_source).convert('RGBA')
wolf = wolf.resize((1254, 470), Image.Resampling.LANCZOS)
wolf.putalpha(wolf.getchannel('A').point(lambda alpha: alpha if alpha >= 12 else 0))
wolf_normalized = SRC / 'wolf-painted-raw.png'
wolf.save(wolf_normalized, optimize=True)
manifest['normalizedSources']['wolfSheet'] = {'source': wolf_source.relative_to(ROOT).as_posix(),
    'sourceSha256': sha(wolf_source), 'sourceSize': [2048, 768],
    'file': wolf_normalized.relative_to(ROOT).as_posix(), 'sha256': sha(wolf_normalized),
    'size': [1254, 470], 'role': 'offline animation extraction source, not a runtime texture'}
for name in ('sanctuary', 'tide', 'pyre', 'storm', 'veil'):
    path = SRC / f'{name}-source.png'
    source = Image.open(path).convert('RGB')
    # 1536x864 exceeds the widest phone view without retaining five 1672px textures.
    image = source.resize((1536, 864), Image.Resampling.LANCZOS)
    target = OUT / f'{name}.png'
    image.save(target, optimize=True)
    manifest['backdrops'][name] = {'source': path.relative_to(ROOT).as_posix(),
        'sourceSha256': sha(path), 'sourceSize': list(source.size),
        'file': target.relative_to(ROOT).as_posix(), 'sha256': sha(target),
        'size': list(image.size), 'worldScale': 'screen-space cover, bilinear sampling'}

path = SRC / 'threshold-source.png'
source = Image.open(path).convert('RGBA')
portal_pixels = np.array(source)
red_fringe = (portal_pixels[:, :, 0] > 170) & (portal_pixels[:, :, 0] > portal_pixels[:, :, 1] * 1.8) & \
    (portal_pixels[:, :, 0] > portal_pixels[:, :, 2] * 1.7) & (portal_pixels[:, :, 3] > 15)
if red_fringe.any():
    nearest = distance_transform_edt(red_fringe, return_distances=False, return_indices=True)
    portal_pixels[red_fringe, :3] = portal_pixels[nearest[0][red_fringe], nearest[1][red_fringe], :3]
source = Image.fromarray(portal_pixels)
alpha = source.getchannel('A')
box = alpha.point(lambda value: 255 if value >= 8 else 0).getbbox()
assert box and box[2] - box[0] > 400 and box[3] - box[1] > 700, box
door = source.crop(box)
door.thumbnail((512, 704), Image.Resampling.LANCZOS)
target = OUT / 'threshold.png'
door.save(target, optimize=True)
manifest['sprites']['threshold'] = {'source': path.relative_to(ROOT).as_posix(),
    'sourceSha256': sha(path), 'sourceSize': list(source.size), 'sourceRect': list(box),
    'file': target.relative_to(ROOT).as_posix(), 'sha256': sha(target), 'size': list(door.size),
    'anchor': [door.width / 2, door.height], 'worldDisplay': [70, 96]}

# Current courier identity replaces the older, unrelated face in story dialogue.
path = ROOT / 'reference/character-revision/courier-raw.png'
source = Image.open(path).convert('RGBA')
box = (75, 43, 205, 187)
portrait = source.crop(box)
portrait = portrait.resize((260, 288), Image.Resampling.LANCZOS)
target = OUT / 'courier-portrait.png'
portrait.save(target, optimize=True)
manifest['sprites']['courierPortrait'] = {'source': path.relative_to(ROOT).as_posix(),
    'sourceSha256': sha(path), 'sourceRect': list(box),
    'file': target.relative_to(ROOT).as_posix(), 'sha256': sha(target), 'size': list(portrait.size)}

(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
total = sum((ROOT / v['file']).stat().st_size for section in ('backdrops', 'sprites') for v in manifest[section].values())
print(f'Published {len(manifest["backdrops"])} chapter paintings and {len(manifest["sprites"])} sprites; {total / 1048576:.2f} MiB compressed.')
