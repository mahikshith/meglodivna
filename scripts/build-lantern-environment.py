"""Extract original environment objects; keep source bytes and alpha intact."""
from pathlib import Path
import json
import hashlib
import numpy as np
from PIL import Image
from scipy.ndimage import label, find_objects

root = Path(__file__).resolve().parents[1]
source = root / 'reference/lantern-source/environment-raw.png'
dest = root / 'public/lantern'
rgba = np.array(Image.open(source).convert('RGBA'))
labels, _ = label(rgba[:, :, 3] >= 32, structure=np.ones((3, 3)))
parts = []
for i, box in enumerate(find_objects(labels), 1):
    if box and np.count_nonzero(labels[box] == i) > 10000:
        parts.append((i, box))
assert len(parts) == 4, len(parts)
parts.sort(key=lambda item: (item[1][0].start > 620, item[1][1].start))
manifest = {'source': source.relative_to(root).as_posix(), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'props': {}}
for name, (index, box) in zip(['platform', 'arch', 'lantern', 'root'], parts):
    pixels = rgba[box].copy()
    pixels[:, :, 3] = np.where(labels[box] == index, pixels[:, :, 3], 0)
    im = Image.fromarray(pixels)
    im.save(dest / f'{name}.png')
    manifest['props'][name] = {'width': im.width, 'height': im.height, 'sourceRect': [box[1].start, box[0].start, box[1].stop, box[0].stop]}
background_source=root/'reference/character-revision/sanctuary-illustrated.png'
background = Image.open(background_source)
background.save(dest / 'sanctuary.png')
manifest['background']={'source':background_source.relative_to(root).as_posix(),'sha256':hashlib.sha256(background_source.read_bytes()).hexdigest(),'size':list(background.size)}
(dest / 'environment.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Extracted four full-resolution environment layers and illustrated panorama.')
from epic_assets import environment
environment()
