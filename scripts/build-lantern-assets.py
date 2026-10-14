"""Extract the generated Lantern sprites without clipping at nominal sheet cells.

Run with Python, Pillow, NumPy and SciPy. This is an offline build tool, not a
runtime dependency. Source artwork and prompts remain in reference/lantern-source.
"""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import label, find_objects, distance_transform_edt

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'reference/lantern-source'
OUT = ROOT / 'public/lantern'
PROOF = ROOT / 'artifacts/lantern'
OUT.mkdir(exist_ok=True, parents=True)
PROOF.mkdir(exist_ok=True, parents=True)
frames, pixels, animations = {}, {}, {}


def components(path, count, minimum=300):
    """Assign disconnected edge pixels to their nearest complete sprite core."""
    rgba = np.array(Image.open(path).convert('RGBA'))
    labels, _ = label(rgba[:, :, 3] >= 32, structure=np.ones((3, 3)))
    objects = find_objects(labels)
    large = [i + 1 for i, box in enumerate(objects)
             if np.count_nonzero(labels[box] == i + 1) > minimum]
    assert len(large) == count, (path.name, len(large), count)
    core = np.where(np.isin(labels, large), labels, 0)
    _, nearest = distance_transform_edt(core == 0, return_indices=True)
    owners = core[tuple(nearest)]
    result = []
    for item in large:
        mask = (owners == item) & (rgba[:, :, 3] >= 32)
        yy, xx = np.where(mask)
        box = (int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1)
        isolated = rgba[box[1]:box[3], box[0]:box[2]].copy()
        isolated[:, :, 3] = np.where(mask[box[1]:box[3], box[0]:box[2]], 255, 0)
        result.append((box, Image.fromarray(isolated)))
    assert sum(np.count_nonzero(np.array(im)[:, :, 3]) for _, im in result) == np.count_nonzero(rgba[:, :, 3] >= 32)
    return result


def add(key, image, path, rect, anchor, body=None, **extra):
    assert image.getbbox(), key
    left, top, right, bottom = image.getbbox()
    assert left > 0 and top > 0 and right < image.width and bottom < image.height, (key, 'canvas clips sprite', image.getbbox())
    pixels[key] = image
    frames[key] = dict(key=key, atlasKey='lantern-art', width=image.width, height=image.height,
                       anchor=anchor, source=path.relative_to(ROOT).as_posix(),
                       sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                       sourceRect=list(rect), **extra)
    if body:
        frames[key]['body'] = body
    return key


def hero():
    path = SOURCE / 'courier-raw.png'
    parts = components(path, 24)
    # Assign by torso row, then left-to-right; swords may cross cell boundaries.
    parts.sort(key=lambda p: (round((p[0][3] - 250) / 255), p[0][0]))
    pivots = [
        [(143, 249), (400, 249), (658, 249), (915, 249)],
        [(140, 509), (395, 509), (652, 509), (918, 509)],
        [(147, 729), (399, 703), (663, 754), (902, 763)],
        [(147, 1012), (393, 1012), (654, 1012), (908, 1012)],
        [(147, 1290), (393, 1290), (654, 1290), (908, 1290)],
        [(130, 1512), (388, 1512), (640, 1512), (907, 1512)],
    ]
    groups = {}
    for row, name in enumerate(['idle', 'run', 'air', 'slash', 'overhead', 'dash']):
        keys = []
        for col in range(4):
            box, part = parts[row * 4 + col]
            pivot = pivots[row][col]
            scale = .32
            part = part.resize((round(part.width * scale), round(part.height * scale)), Image.Resampling.NEAREST)
            canvas = Image.new('RGBA', (128, 112))
            offset = (round(64 + (box[0] - pivot[0]) * scale), round(96 + (box[1] - pivot[1]) * scale))
            assert offset[0] >= 0 and offset[1] >= 0 and offset[0] + part.width <= 128 and offset[1] + part.height <= 112
            canvas.alpha_composite(part, offset)
            keys.append(add(f'lantern-hero-{name}-{col}', canvas, path, box,
                            dict(x=64, y=96), dict(x=54, y=36, w=20, h=60),
                            sourcePivot=list(pivot), sourceFrame=row * 4 + col,
                            scale=scale, durationMs=100 if name == 'run' else 110,
                            hand=dict(x=67, y=74), muzzle=dict(x=75, y=74),
                            normalization='Connected alpha silhouette; shared 0.32 nearest-neighbor scale; inspected anatomical pivot; fixed body extent'))
        groups[name] = keys
        animations[f'hero-{name}'] = keys
    for action, keys in dict(idle=groups['idle'], run=groups['run'], jump=groups['air'][:2],
                             fall=groups['air'][2:3], doublejump=groups['air'][:2],
                             dash=groups['dash'], slash=groups['slash'], overhead=groups['overhead'],
                             jet=groups['air'][1:3], fire=groups['idle'], hurt=groups['air'][3:],
                             death=groups['air'][3:]).items():
        animations[f'aether-{action}'] = keys
    animations['hero-slash-air'] = groups['overhead']
    animations['hero-slash-low'] = groups['slash']
    animations['aether-air-slash'] = groups['overhead']
    animations['aether-crouch-slash'] = groups['slash']
    return groups


def creatures():
    path = SOURCE / 'creatures-raw.png'
    parts = components(path, 24, minimum=10000)
    parts.sort(key=lambda p: p[0][3])
    # Sort complete components within each authored row, never nominal cell cuts.
    parts = [part for start in range(0, 24, 4)
             for part in sorted(parts[start:start + 4], key=lambda p: p[0][0])]
    specs = [
        ('stalker', [(145, 201), (448, 201), (786, 201), (1116, 201)], 30, 58),
        ('caster', [(152, 422), (455, 422), (786, 422), (1139, 422)], 28, 64),
        ('guardian', [(150, 650), (452, 650), (805, 650), (1120, 650)], 46, 70),
        ('wolf', [(157, 807), (460, 807), (777, 807), (1104, 807)], 74, 40),
        ('dragon', [(170, 1009), (479, 1009), (784, 1009), (1093, 1009)], 70, 48),
        ('portal', [(149, 1230), (470, 1230), (779, 1230), (1096, 1230)], 70, 64),
    ]
    groups = {}
    for row, (name, pivots, width, height) in enumerate(specs):
        keys = []
        for col in range(4):
            box, part = parts[row * 4 + col]
            pivot = pivots[col]
            scale = .32
            part = part.resize((round(part.width * scale), round(part.height * scale)), Image.Resampling.NEAREST)
            canvas = Image.new('RGBA', (192, 144))
            offset = (round(96 + (box[0] - pivot[0]) * scale), round(112 + (box[1] - pivot[1]) * scale))
            assert offset[0] >= 0 and offset[1] >= 0 and offset[0] + part.width <= 192 and offset[1] + part.height <= 144
            canvas.alpha_composite(part, offset)
            keys.append(add(f'ln-{name}-{col}', canvas, path, box,
                            dict(x=96, y=112), dict(x=96 - width / 2, y=112 - height, w=width, h=height),
                            sourcePivot=list(pivot), sourceFrame=row * 4 + col, scale=scale,
                            durationMs=120, mouth=dict(x=120, y=96),
                            normalization='Whole alpha component plus nearest disconnected details; shared 0.32 nearest-neighbor scale; anatomy pivot',
                            sourceBorderContact=box[0] == 0 or box[2] == 1254))
        groups[name] = keys
        animations[f'{name}-sequence'] = keys
        if row < 3:
            for action, selected in dict(idle=keys[:1], walk=keys[:2], windup=keys[1:2],
                                         attack=keys[2:3], recovery=keys[3:4], hurt=keys[3:4], death=keys[3:4]).items():
                animations[f'{name}-{action}'] = selected
        elif name == 'wolf':
            animations['wolf-run'] = keys
            animations['wolf-idle'] = keys[:1]
            animations['wolf-attack'] = keys[2:3]
        elif name == 'dragon':
            animations['dragon-fly'] = keys[:3]
            animations['dragon-fire'] = keys[3:]
            animations['dragon-idle'] = keys[:1]
        else:
            for action, selected in dict(dormant=keys[:1], form=keys[:3], open=keys[2:3], close=keys[2:]).items():
                animations[f'portal-{action}'] = selected
    return groups


def people_items():
    path = SOURCE / 'people-items-raw.png'
    parts = components(path, 16, minimum=10000)
    parts.sort(key=lambda p: p[0][3])
    parts = [part for start in range(0, 16, 4)
             for part in sorted(parts[start:start + 4], key=lambda p: p[0][0])]
    groups = {}
    for row, (name, pivots, alias) in enumerate([
        ('mira', [(180, 342), (490, 342), (805, 342), (1115, 342)], 'villager'),
        ('orren', [(164, 688), (478, 688), (790, 688), (1102, 688)], 'mage'),
    ]):
        keys = []
        for col in range(4):
            box, part = parts[row * 4 + col]
            pivot = pivots[col]
            scale = .185
            part = part.resize((round(part.width * scale), round(part.height * scale)), Image.Resampling.NEAREST)
            canvas = Image.new('RGBA', (96, 104))
            offset = (round(48 + (box[0] - pivot[0]) * scale), round(88 + (box[1] - pivot[1]) * scale))
            assert offset[0] >= 0 and offset[1] >= 0 and offset[0] + part.width <= 96 and offset[1] + part.height <= 104
            canvas.alpha_composite(part, offset)
            keys.append(add(f'ln-npc-{name}-{col}', canvas, path, box,
                            dict(x=48, y=88), dict(x=39, y=28, w=18, h=60),
                            sourcePivot=list(pivot), sourceFrame=row * 4 + col, scale=scale,
                            durationMs=180,
                            normalization='Whole alpha component; shared NPC 0.185 nearest-neighbor scale; feet aligned to inspected anatomy'))
        groups[name] = keys
        animations[f'npc-{name}-idle'] = keys
        animations[f'npc-{alias}-idle'] = keys
    items = []
    for index, name in enumerate(['health', 'mana', 'fuel', 'shield', 'boost', 'rapid', 'chest', 'rune']):
        box, part = parts[index + 8]
        scale = .24 if name == 'chest' else .16
        part = part.resize((round(part.width * scale), round(part.height * scale)), Image.Resampling.NEAREST)
        part = part.crop(part.getbbox())
        canvas = Image.new('RGBA', (part.width + 4, part.height + 4))
        canvas.alpha_composite(part, (2, 2))
        items.append(add(f'ln-item-{name}', canvas, path, box,
                         dict(x=canvas.width / 2, y=canvas.height / 2),
                         sourceFrame=index + 8, scale=scale,
                         normalization='Whole alpha component; nearest-neighbor scale; tight crop with two transparent padding pixels; center pivot'))
    # Portraits intentionally crop at the shoulders; use isolated sprites to exclude adjacent rows.
    for name, source_index, rect in [('mira', 0, (95, 10, 255, 170)), ('orren', 4, (80, 345, 240, 505))]:
        box, part = parts[source_index]
        face = part.crop((rect[0] - box[0], rect[1] - box[1], rect[2] - box[0], rect[3] - box[1]))
        face = face.resize((64, 64), Image.Resampling.NEAREST)
        canvas = Image.new('RGBA', (68, 68))
        canvas.alpha_composite(face, (2, 2))
        items.append(add(f'ln-face-{name}', canvas, path, rect, dict(x=34, y=34),
                         sourceFrame=source_index, scale=.4,
                         normalization='Intentional head-and-shoulders portrait crop from isolated NPC; nearest-neighbor scale'))
    return groups, items


def item_preview(keys):
    sheet = Image.new('RGB', (5 * 180, 2 * 180), '#34464c')
    draw = ImageDraw.Draw(sheet)
    for index, key in enumerate(keys):
        col, row = index % 5, index // 5
        frame = pixels[key].resize((pixels[key].width * 2, pixels[key].height * 2), Image.Resampling.NEAREST)
        x, y = col * 180, row * 180
        draw.rectangle((x, y, x + 179, y + 179), fill='#78908b' if col % 2 else '#34464c')
        draw.text((x + 8, y + 8), key.removeprefix('ln-'), fill='#fff0c7')
        sheet.paste(frame, (x + (180 - frame.width) // 2, y + 32 + (144 - frame.height) // 2), frame)
    sheet.save(PROOF / 'items-contact.png')


def previews(groups, name):
    sample = pixels[next(iter(groups.values()))[0]]
    frame_w, frame_h = sample.width * 2, sample.height * 2
    cell_w, cell_h = frame_w + 4, frame_h + 24
    baseline = frames[next(iter(groups.values()))[0]]['anchor']['y'] * 2
    sheet = Image.new('RGB', (4 * cell_w, len(groups) * cell_h), '#34464c')
    draw = ImageDraw.Draw(sheet)
    for row, (action, keys) in enumerate(groups.items()):
        for col, key in enumerate(keys):
            frame = pixels[key].resize((frame_w, frame_h), Image.Resampling.NEAREST)
            x, y = col * cell_w, row * cell_h + 20
            draw.rectangle((x, y, x + frame_w - 1, y + frame_h - 1), fill='#78908b' if col % 2 else '#34464c')
            draw.line((x, y + baseline, x + frame_w - 1, y + baseline), fill='#c29b62')
            sheet.paste(frame, (x, y), frame)
            draw.text((x + 4, row * cell_h + 4), f'{action} {col + 1}', fill='#fff0c7')
    sheet.save(PROOF / f'{name}-contact.png')
    movie = []
    for tick in range(24):
        page = Image.new('RGB', (len(groups) * frame_w, cell_h), '#34464c')
        pen = ImageDraw.Draw(page)
        for col, (action, keys) in enumerate(groups.items()):
            pen.text((col * frame_w + 8, 8), action, fill='#fff0c7')
            pen.line((col * frame_w, baseline + 24, col * frame_w + frame_w - 1, baseline + 24), fill='#c29b62')
            frame = pixels[keys[tick % len(keys)]].resize((frame_w, frame_h), Image.Resampling.NEAREST)
            page.paste(frame, (col * frame_w, 24), frame)
        movie.append(page)
    movie[0].save(PROOF / f'{name}-motion.gif', save_all=True, append_images=movie[1:], duration=110, loop=0, disposal=2)


def pack():
    atlas = Image.new('RGBA', (2048, 1024))
    packed = {}
    x = y = 2
    row_height = 0
    for key, image in pixels.items():
        if x + image.width + 2 > atlas.width:
            x = 2
            y += row_height + 4
            row_height = 0
        assert y + image.height + 2 <= atlas.height, 'Atlas budget exceeded'
        atlas.alpha_composite(image, (x, y))
        packed[key] = dict(frame=dict(x=x, y=y, w=image.width, h=image.height), rotated=False,
                           trimmed=False, spriteSourceSize=dict(x=0, y=0, w=image.width, h=image.height),
                           sourceSize=dict(w=image.width, h=image.height))
        x += image.width + 4
        row_height = max(row_height, image.height)
    atlas.save(OUT / 'atlas.png', optimize=True)
    (OUT / 'atlas.json').write_text(json.dumps(dict(frames=packed, meta=dict(image='atlas.png', size=dict(w=atlas.width, h=atlas.height), scale='1')), separators=(',', ':')) + '\n')
    manifest = dict(atlasKey='lantern-art', frames=frames, animations=animations,
                    notes=['Original generated source; extraction is not frame-by-frame generation.',
                           'Transparent RGB source haze is discarded; alpha below 32 removed and surviving pixels made opaque.',
                           'Fire uses idle, hurt/death use the authored landing crouch; no dedicated firearm/hurt/death frames were generated.',
                           'Air/low slashes adapt overhead/horizontal poses; native body dimensions stay constant across every hero frame.',
                           'Creature rows provide four authored action poses, not full walk or death cycles; state-specific stills are held for readable anticipation/recovery.',
                           'The dragon breath reaches the source right boundary; the source contains a cut flame tip. Runtime flame extends this emitter.',
                           'Mira and Orren have four subtle idle poses, shared 0.185 pixel scale and fixed 60px render body; portraits intentionally crop at the shoulders.',
                           'Item frames preserve their source aspect ratio and use a center anchor; chest is wider than the collectible icons.'])
    (OUT / 'manifest.json').write_text(json.dumps(manifest, separators=(',', ':')) + '\n')
    assert all(key in packed for keys in animations.values() for key in keys)
    assert len({tuple(frame['body'].values()) for key, frame in frames.items() if key.startswith('lantern-hero-')}) == 1
    assert len({tuple(frame['body'].values()) for key, frame in frames.items() if key.startswith('ln-npc-')}) == 1
    print(f'Built {len(frames)} frames and {len(animations)} animation keys. All silhouettes fit; all animation references resolve.')


if __name__ == '__main__':
    previews(hero(), 'courier')
    previews(creatures(), 'creatures')
    people, items = people_items()
    previews(people, 'people')
    item_preview(items)
    pack()
