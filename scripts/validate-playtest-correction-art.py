"""Validate new painted correction sources, extracted boss anatomy, and phone texture budget."""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/playtest-correction/qa/art/integrity.json'
published = json.loads((ROOT / 'public/painted-correction/manifest.json').read_text())
boss = json.loads((ROOT / 'public/ironfang/manifest.json').read_text())
atlas = json.loads((ROOT / 'public/ironfang/atlas.json').read_text())
characters = json.loads((ROOT / 'public/character-revision/manifest.json').read_text())
character_atlas = json.loads((ROOT / 'public/character-revision/atlas.json').read_text())

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

textures = []
wolf_sheet = published['normalizedSources']['wolfSheet']
assert digest(ROOT / wolf_sheet['source']) == wolf_sheet['sourceSha256']
assert digest(ROOT / wolf_sheet['file']) == wolf_sheet['sha256']
assert Image.open(ROOT / wolf_sheet['file']).size == (1254, 470)
for section in ('backdrops', 'sprites'):
    for name, info in published[section].items():
        src, output = ROOT / info['source'], ROOT / info['file']
        assert digest(src) == info['sourceSha256'], name
        assert digest(output) == info['sha256'], name
        size = Image.open(output).size
        assert list(size) == info['size'], name
        if section == 'backdrops':
            assert size == (1536, 864) and Image.open(output).mode == 'RGB', name
        else:
            assert Image.open(output).mode == 'RGBA', name
        textures.append({'name': name, 'file': info['file'], 'size': list(size),
            'rgbaDecodedBytes': size[0] * size[1] * 4, 'sha256': info['sha256']})

frames = boss['frames']
correction_keys = [key for key, frame in frames.items()
    if frame.get('source', '').startswith('reference/playtest-correction/')]
assert len(correction_keys) == 43, len(correction_keys)
assert {f'if-cut-{i}' for i in range(4)} <= set(correction_keys)
source_alpha = {}
checked_sockets = []
for key in correction_keys:
    frame = frames[key]
    source = ROOT / frame['source']
    assert digest(source) == frame['sourceSha256'], key
    if 'sourceRect' in frame:
        x0, y0, x1, y1 = frame['sourceRect']
        assert 0 <= x0 < x1 <= Image.open(source).width
        assert 0 <= y0 < y1 <= Image.open(source).height
    if not ('sourcePivot' in frame and 'sockets' in frame):
        continue
    alpha = source_alpha.setdefault(source, np.array(Image.open(source).convert('RGBA'))[:, :, 3])
    pivot, anchor, scale = frame['sourcePivot'], frame['anchor'], frame['scale']
    for name in ('gun', 'mouth'):
        if name not in frame['sockets']:
            continue
        socket = frame['sockets'][name]
        x = round(pivot[0] + (socket['x'] - anchor['x']) / scale)
        y = round(pivot[1] + (socket['y'] - anchor['y']) / scale)
        assert 0 <= x < alpha.shape[1] and 0 <= y < alpha.shape[0] and alpha[y, x] >= 20, (key, name, x, y)
        checked_sockets.append([key, name, x, y])

atlas_keys = set()
for page in atlas['textures']:
    image = ROOT / 'public/ironfang' / page['image']
    size = Image.open(image).size
    assert max(size) <= 2048
    textures.append({'name': 'ironfang-' + page['image'], 'file': image.relative_to(ROOT).as_posix(),
        'size': list(size), 'rgbaDecodedBytes': size[0] * size[1] * 4, 'sha256': digest(image)})
    for item in page['frames']:
        atlas_keys.add(item['filename'])
        assert item['filename'] in frames
assert atlas_keys == set(frames)

wolf_frames = [characters['frames'][f'cr-wolf-{i}'] for i in range(8)]
assert all(frame['source'] == wolf_sheet['file'] and frame['sourceSha256'] == wolf_sheet['sha256']
    for frame in wolf_frames)
wolf_alpha = np.array(Image.open(ROOT / wolf_sheet['file']).convert('RGBA'))[:, :, 3]
for i in (4, 5, 6):
    frame = wolf_frames[i]
    socket = frame['sockets']['mouth']
    x = round(frame['sourcePivot'][0] + (socket['x'] - frame['anchor']['x']) / frame['scale'])
    y = round(frame['sourcePivot'][1] + (socket['y'] - frame['anchor']['y']) / frame['scale'])
    assert wolf_alpha[y, x] >= 20, (i, x, y)
for page in character_atlas['textures']:
    image = ROOT / 'public/character-revision' / page['image']
    size = Image.open(image).size
    assert max(size) <= 2048
    textures.append({'name': 'character-revision-' + page['image'], 'file': image.relative_to(ROOT).as_posix(),
        'size': list(size), 'rgbaDecodedBytes': size[0] * size[1] * 4, 'sha256': digest(image)})

assert all(np.mean(alpha >= 20) < .5 for alpha in source_alpha.values())  # no opaque matte around dragon flight
report = {'kind': 'offline corrected-art integrity', 'bossCorrectionFrames': len(correction_keys),
    'wolfCorrectionFrames': len(wolf_frames),
    'measuredSolidGunMouthSockets': len(checked_sockets), 'textures': textures,
    'rgbaDecodedBytes': sum(item['rgbaDecodedBytes'] for item in textures),
    'checks': ['source and runtime SHA-256', 'all five 1536x864 backdrops', 'transparent portal and portrait',
        'atlas source/size/key integrity', 'solid source pixels under corrected boss gun/mouth sockets',
        'transparent dragon flight background', 'eight regenerated wolf poses and three solid mouth sockets']}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'frames': len(correction_keys), 'sockets': len(checked_sockets),
    'textures': len(textures), 'decodedMiB': round(report['rgbaDecodedBytes'] / 1048576, 2)}))
