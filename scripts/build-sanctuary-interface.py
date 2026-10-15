from pathlib import Path
import json,hashlib,runpy
from PIL import Image
extract=runpy.run_path(str(Path(__file__).with_name('build-character-assets.py')))['extract']

root=Path(__file__).resolve().parents[1]
out=root/'public/sanctuary-ui';out.mkdir(exist_ok=True)
path,parts,erosion=extract('interface-raw.png',8)
proof={}
for name,(box,im) in zip(['sword','boots','jet','rifle','rune','lantern','satchel','bell'],parts):
    im.thumbnail((256,256),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(272,272));canvas.alpha_composite(im,((272-im.width)//2,(272-im.height)//2));canvas.save(out/(name+'.png'))
    proof[name]=dict(sourceRect=box,source=path.relative_to(root).as_posix(),sha256=hashlib.sha256(path.read_bytes()).hexdigest())
(out/'manifest.json').write_text(json.dumps(proof,indent=2))
print('Extracted eight illustrated interface objects with transparent backgrounds.')
