"""Reproducible extraction of the approved generated effects and materials.

Keep shared row canvases, alpha gradients and socket positions. No per-frame
auto-fit: it makes the exhaust breathe in size and moves the sword attachment.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC, OUT = ROOT/'reference/lantern-fx-source', ROOT/'public/lantern-fx'
OUT.mkdir(exist_ok=True)
source = Image.open(SRC/'effects-raw.png').convert('RGBA')
atlas = Image.new('RGBA', (512, 512))
frames = {}
rows = [('flame', 32, 320), ('smoke', 355, 650), ('slash', 690, 885), ('overhead', 905, 1225)]
for row, (name, top, bottom) in enumerate(rows):
    for i in range(4):
        # One shared scale and crop per animation, including disconnected wisps.
        crop = source.crop((i*316+8, top, (i+1)*316-8, bottom))
        crop.thumbnail((120, 120), Image.Resampling.LANCZOS)
        cell = Image.new('RGBA', (128, 128))
        cell.alpha_composite(crop, ((128-crop.width)//2, 4 if name in ('flame','smoke') else (128-crop.height)//2))
        atlas.alpha_composite(cell, (i*128, row*128))
        frames[f'{name}-{i}'] = {'frame': {'x':i*128,'y':row*128,'w':128,'h':128}, 'rotated':False,'trimmed':False,
            'spriteSourceSize':{'x':0,'y':0,'w':128,'h':128},'sourceSize':{'w':128,'h':128}}
atlas.save(OUT/'atlas.png')
(OUT/'atlas.json').write_text(json.dumps({'frames':frames,'meta':{'image':'atlas.png','size':{'w':512,'h':512},'scale':'1'}}))
materials = Image.open(SRC/'materials-raw.png').convert('RGBA')
specs = {'water':((8,8,620,620),(306,306)), 'stone':((640,8,1246,620),(303,306)),
    'platform':((8,835,620,1105),(306,135)), 'emitter-cap':((800,650,1090,830),(92,57)),
    'emitter':((695,855,1190,1220),(124,92))}
for name,(bounds,size) in specs.items():
    crop=materials.crop(bounds)
    if name not in ('water','stone'):
        box=crop.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox()
        if box: crop=crop.crop(box)
    crop.thumbnail(size,Image.Resampling.LANCZOS)
    crop.save(OUT/f'{name}.png')
props=Image.open(SRC/'props-raw.png').convert('RGBA')
pw,ph=props.size
for name,bounds,size in [('lever',(0,0,pw//2,ph*.56),(74,82)),('ward',(pw//2,0,pw,ph*.56),(128,176)),
    ('bolt',(0,ph*.57,pw//2,ph),(100,30)),('orb',(pw//2,ph*.57,pw,ph),(100,60))]:
    crop=props.crop(tuple(map(int,bounds)))
    box=crop.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox()
    assert box,name
    crop=crop.crop(box);crop.thumbnail(size,Image.Resampling.LANCZOS);crop.save(OUT/f'{name}.png')
(OUT/'manifest.json').write_text(json.dumps({'source':'reference/lantern-fx-source','generator':'OpenAI image generation',
    'extraction':'scripts/build-lantern-fx.py','frameSize':[128,128], 'flameSocket':[64,12],
    'animations':{name:[f'{name}-{i}' for i in range(4)] for name,_,_ in rows}},indent=2))
preview=Image.new('RGBA',atlas.size,(19,34,37,255));preview.alpha_composite(atlas)
preview.convert('RGB').save(ROOT/'artifacts/lantern-motion/effects-contact.png')
motion=[]
for i in range(4):
    frame=Image.new('RGBA',(512,128),(19,34,37,255))
    for row in range(4): frame.alpha_composite(atlas.crop((i*128,row*128,(i+1)*128,(row+1)*128)),(row*128,0))
    motion.append(frame.convert('RGB'))
motion[0].save(ROOT/'artifacts/lantern-motion/effects.gif',save_all=True,append_images=motion[1:],duration=100,loop=0)
print('Built 16 shared-canvas effects and nine material/prop textures')
from epic_assets import masonry
masonry()
