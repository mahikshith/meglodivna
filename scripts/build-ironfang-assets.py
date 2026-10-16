"""Extract complete authored silhouettes, register anatomy, and build review/runtime atlases.

User-authorized extraction of supplied references and generated animation sheets.
Actors use connected alpha ownership; effects preserve soft alpha on inspected crops.
"""
from pathlib import Path
import hashlib
import json
import runpy
from PIL import Image, ImageDraw
from atlas_pack import pack

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'reference/ironfang-source'
OUT = ROOT / 'public/ironfang'
PROOF = ROOT / 'artifacts/ironfang'
components = runpy.run_path(str(ROOT / 'scripts/build-lantern-assets.py'))['components']
frames, pixels, animations = {}, {}, {}


def parts(name, count):
    path = SRC / name
    items = sorted(components(path, count, 5000), key=lambda p: p[0][3])
    return path, [p for i in range(0, count, 4) for p in sorted(items[i:i+4], key=lambda p: p[0][0])]


def actor(key, path, part, pivot, body_height, sockets, hurtboxes):
    box, im = part
    scale = 1.2
    canvas, anchor = (640, 576), (320, 448)
    offset = tuple(round(anchor[i] + (box[i] - pivot[i]) * scale) for i in range(2))
    im = im.resize(tuple(round(v * scale) for v in im.size), Image.Resampling.LANCZOS)
    assert min(offset) > 0 and offset[0]+im.width < canvas[0] and offset[1]+im.height < canvas[1], (key, offset)
    output = Image.new('RGBA', canvas)
    output.alpha_composite(im, offset)
    pixels[key] = output
    point = lambda v: dict(x=round(anchor[0]+(v[0]-pivot[0])*scale, 3), y=round(anchor[1]+(v[1]-pivot[1])*scale, 3))
    frames[key] = dict(key=key, atlasKey='ironfang', width=canvas[0], height=canvas[1],
        anchor=dict(x=anchor[0], y=anchor[1]), body=dict(x=252.8, y=anchor[1]-body_height*scale, w=134.4, h=body_height*scale),
        sockets={n:point(v) for n,v in sockets.items()}, hurtboxes=[dict(**point(b),w=b[2]*scale,h=b[3]*scale) for b in hurtboxes],
        source=path.relative_to(ROOT).as_posix(), sourceRect=list(box), sourcePivot=list(pivot), scale=scale,
        sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(), durationMs=110,
        normalization='Complete connected silhouette; illustrated source detail; measured anatomy, sockets and body bounds')
    return key


def build():
    OUT.mkdir(exist_ok=True, parents=True); PROOF.mkdir(exist_ok=True, parents=True)
    path, p = parts('bull-final.png', 16)
    pivots = [(166,295),(483,295),(794,298),(1104,298),(167,610),(484,612),(782,610),(1103,611),
              (165,912),(484,912),(791,912),(1105,912),(164,1198),(479,1198),(789,1202),(1091,1201)]
    muzzles = [(261,79),(580,79),(890,79),(1190,79),(270,399),(566,396),(876,451),(1177,394),
               (265,697),(571,696),(889,696),(1193,697),(261,983),(580,1023),(895,1065),(1214,1104)]
    for i,(part,pivot,muzzle) in enumerate(zip(p,pivots,muzzles)):
        x,y=pivot
        actor(f'if-bull-{i}',path,part,pivot,210,{'gun':muzzle,'contact':(930,610) if i==6 else (x+85,y)},
              [(x-85,y-187,167,181),(x+39,y-190,65,75)])
    animations.update({'ironbull-walk':[f'if-bull-{i}' for i in range(4)],
        'ironbull-axe':[f'if-bull-{i}' for i in range(4,8)], 'ironbull-fire':[f'if-bull-{i}' for i in range(8,12)],
        'ironbull-idle':['if-bull-12'], 'ironbull-hurt':['if-bull-13'], 'ironbull-death':['if-bull-14','if-bull-15']})
    path,p = parts('dragon-raw.png',12)
    pivots=[(207,397),(513,397),(820,397),(1130,397),(204,802),(515,802),(821,802),(1130,802),
            (203,1167),(515,1167),(821,1167),(1120,1186)]
    mouths=[(316,305),(616,305),(922,305),(1236,305),(307,704),(616,709),(925,706),(1236,704),
            (314,1082),(615,1014),(920,1116),(1235,1154)]
    for i,(part,pivot,mouth) in enumerate(zip(p,pivots,mouths)):
        x,y=pivot
        actor(f'if-dragon-{i}',path,part,pivot,130,{'mouth':mouth,'gun':(mouth[0]-20,mouth[1]-48)},
              [(x-76,y-121,116,96),(mouth[0]-71,mouth[1]-30,74,51),(x-146,y-70,80,31)])
    animations.update({'irondragon-fly':[f'if-dragon-{i}' for i in range(4)],
        'irondragon-breath':[f'if-dragon-{i}' for i in range(4,8)],'irondragon-idle':['if-dragon-8'],
        'irondragon-hurt':['if-dragon-9'],'irondragon-death':['if-dragon-10','if-dragon-11']})
    path,p=parts('transform-raw.png',16)
    # The rejected winged-bull sheet is used only for intermediate morph anatomy.
    for i,pivot in enumerate([(168,895),(478,895),(790,897)]):
        x,y=pivot
        actor(f'if-morph-{i}',path,p[8+i],pivot,210,{},[(x-80,y-190,170,185)])
    animations['ironfang-transform']=['if-bull-12','if-morph-0','if-morph-1','if-morph-2','if-dragon-1','if-dragon-0']
    source=Image.open(SRC/'fx-raw.png').convert('RGBA')
    # Soft FX can cross nominal cells. These explicitly inspected regions keep the
    # luminous cores; a 10px edge fade prevents low-alpha neighboring wisps/seams.
    for row,(name,top,bottom) in enumerate([('cut',24,360),('impact',373,657),('dust',714,951),('breath',974,1254)]):
        for i,(left,right) in enumerate([(0,308),(308,617),(617,940),(940,1254)]):
            crop=source.crop((left,top,right,bottom))
            import numpy as np
            a=np.array(crop)
            yy,xx=np.indices(a.shape[:2]); fade=np.minimum.reduce([xx,yy,a.shape[1]-1-xx,a.shape[0]-1-yy])/10
            a[:,:,3]=(a[:,:,3]*np.clip(fade,0,1)).astype('uint8')
            crop=Image.fromarray(a);crop.thumbnail((296,296),Image.Resampling.LANCZOS)
            canvas=Image.new('RGBA',(320,320));canvas.alpha_composite(crop,((320-crop.width)//2,(320-crop.height)//2))
            key=f'if-{name}-{i}';pixels[key]=canvas
            frames[key]=dict(key=key,atlasKey='ironfang',width=320,height=320,anchor=dict(x=160,y=160),
                source='reference/ironfang-source/fx-raw.png',sourceRect=[left,top,right,bottom],
                sourceSha256=hashlib.sha256((SRC/'fx-raw.png').read_bytes()).hexdigest())
        animations[f'ironfang-{name}']=[f'if-{name}-{i}' for i in range(4)]
    from epic_assets import bosses
    bosses(frames,pixels,animations)
    pages=pack(pixels,OUT)
    (OUT/'manifest.json').write_text(json.dumps(dict(frames=frames,animations=animations),indent=2))
    # Shared simulation metadata avoids a second set of guessed muzzle offsets.
    data={k:{n:v for n,v in f.items() if n in ['body','sockets','hurtboxes']} for k,f in frames.items() if 'body' in f}
    (ROOT/'src/ironfang-geometry.js').write_text('// Generated by scripts/build-ironfang-assets.py; measured artwork geometry.\nexport const IRONFANG_GEOMETRY = '+json.dumps(data)+';\n')
    contact=Image.new('RGBA',(1536,320*((len(pixels)+3)//4)),(15,29,32,255))
    for i,im in enumerate(pixels.values()):contact.alpha_composite(im.resize((im.width//2,im.height//2),Image.Resampling.LANCZOS),(i%4*384,i//4*320))
    contact.convert('RGB').save(PROOF/'contact.png')
    for name,keys in animations.items():
        imgs=[]
        for key in keys:
            im=Image.new('RGBA',(768,640),(15,29,32,255));im.alpha_composite(pixels[key]);imgs.append(im.convert('RGB'))
        imgs[0].save(PROOF/f'{name}.gif',save_all=True,append_images=imgs[1:],duration=120,loop=0)
    # Literal source trait extracts, retained alongside the enhanced production art.
    crops=[('Designer (1).png',(10,80,315,429)),('Designer (2).png',(6,95,326,441)),
           ('Designer (1).png',(22,614,969,716)),('Designer (2).png',(1095,487,1524,834))]
    for i,(file,box) in enumerate(crops):
        Image.open(ROOT/'artifacts/reference'/file).crop(box).save(PROOF/f'reference-trait-{i}.png')
    print(f'Built {len(frames)} frames, {len(animations)} animation previews; source hashes and sockets saved.')


if __name__ == '__main__':
    build()
