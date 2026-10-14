"""Build authored Lantern motion strips; no grid clipping or synthetic limb movement.

Requires Pillow, NumPy, SciPy. Complete alpha silhouettes are assigned to their
nearest connected core by the established Lantern extractor. Source coordinates
below are inspected anatomical pivots/sockets, not bounds-derived normalization.
"""
from pathlib import Path
import hashlib
import json
import runpy
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'reference/lantern-motion-source'
OUT = ROOT / 'public/lantern-motion'
PROOF = ROOT / 'artifacts/lantern-motion'
OUT.mkdir(parents=True, exist_ok=True)
PROOF.mkdir(parents=True, exist_ok=True)
components = runpy.run_path(str(ROOT / 'scripts/build-lantern-assets.py'))['components']
frames, pixels, animations, groups = {}, {}, {}, {}


def sheet(name, count):
    path = SOURCE / name
    parts = sorted(components(path, count, 5000), key=lambda p: p[0][3])
    return path, [p for i in range(0, count, 4) for p in sorted(parts[i:i+4], key=lambda p: p[0][0])]


def frame(key, path, part, pivot, scale, body=(30, 58), canvas=(192, 144), anchor=(96, 112), sockets=None):
    box, im = part
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.NEAREST)
    offset = (round(anchor[0] + (box[0] - pivot[0])*scale), round(anchor[1] + (box[1]-pivot[1])*scale))
    assert offset[0] > 0 and offset[1] > 0 and offset[0]+im.width < canvas[0] and offset[1]+im.height < canvas[1], (key, offset, im.size)
    output = Image.new('RGBA', canvas)
    output.alpha_composite(im, offset)
    pixels[key] = output
    frames[key] = dict(key=key, atlasKey='lantern-motion', width=canvas[0], height=canvas[1],
        anchor=dict(x=anchor[0], y=anchor[1]), body=dict(x=anchor[0]-body[0]/2, y=anchor[1]-body[1], w=body[0], h=body[1]),
        source=path.relative_to(ROOT).as_posix(), sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        sourceRect=list(box), sourcePivot=list(pivot), scale=scale, durationMs=110,
        sourceBorderContact=box[0]==0 or box[1]==0 or box[2]==Image.open(path).width or box[3]==Image.open(path).height,
        normalization='Whole alpha silhouette, shared sequence scale, inspected anatomical pivot, nearest-neighbor resampling')
    if sockets:
        frames[key]['sockets'] = {n:dict(x=round(anchor[0]+(v[0]-pivot[0])*scale, 2),y=round(anchor[1]+(v[1]-pivot[1])*scale, 2)) for n,v in sockets.items()}
    return key


def sequence(name, path, parts, pivots, scale, body, sockets=None, hero=False):
    keys = [frame(f'lm-{name}-{i}', path, part, pivots[i], scale, body,
                  canvas=(128,112) if hero else (192,144), anchor=(64,96) if hero else (96,112),
                  sockets=sockets[i] if sockets else None) for i,part in enumerate(parts)]
    animations[name] = keys
    groups[name] = keys
    return keys


def build():
    path, p = sheet('enemies-motion-raw.png',20)
    sequence('stalker-walk',path,p[:4],[(153,264),(428,264),(703,264),(993,264)],.30,(30,58))
    sequence('caster-walk',path,p[4:8],[(154,527),(429,527),(718,527),(1003,527)],.27,(28,64))
    animations['caster-hover']=animations['caster-walk']
    sequence('guardian-walk',path,p[8:12],[(158,793),(452,793),(700,793),(1003,793)],.28,(46,70))
    hand=[(159,1027),(447,999),(710,912),(991,870),(222,1225),(479,1325),(727,1288),(1014,1304)]
    tip=[(275,1070),(344,943),(610,883),(888,854),(281,1300),(566,1361),(839,1216),(1095,1325)]
    g=sequence('guardian-attack',path,p[12:20],[(157,1116),(444,1116),(704,1116),(995,1116),(148,1371),(438,1371),(707,1371),(1000,1371)],.28,(46,70),
        [dict(hand=h,weaponTip=t,contact=t) for h,t in zip(hand,tip)])
    for phase,idx in dict(lift=[0,1,2,3],windup=[0,1,2,3],downswing=[4],contact=[5],recovery=[6,7]).items():
        animations['guardian-'+phase]=[g[i] for i in idx]

    path,p=sheet('creatures-motion-raw.png',24)
    sequence('wispknight-walk',path,p[:4],[(151,236),(425,236),(712,236),(1000,236)],.26,(24,48))
    w=sequence('wispknight-attack',path,p[4:8],[(145,442),(430,442),(715,442),(1000,442)],.26,(24,48))
    sequence('bellbeast-walk',path,p[8:12],[(173,725),(448,725),(720,725),(1005,725)],.38,(94,100))
    b=sequence('bellbeast-attack',path,p[12:16],[(141,994),(426,994),(717,994),(998,994)],.38,(94,100),
        [dict(frontFoot=t,contact=t) for t in [(241,823),(545,936),(839,987),(1082,906)]])
    for family,keys in [('wispknight',w),('bellbeast',b)]:
        for phase,idx in dict(lift=0,windup=0,downswing=1,contact=2,recovery=3).items(): animations[family+'-'+phase]=[keys[idx]]
        animations[family+'-idle']=animations[family+'-walk'][:1]
    sequence('raven-fly',path,p[16:20],[(157,1146),(455,1134),(744,1129),(1024,1147)],.28,(44,28))
    sequence('raven-attack',path,p[20:24],[(182,1324),(477,1333),(745,1328),(1027,1329)],.28,(44,28),
        [dict(beak=t) for t in [(242,1340),(523,1361),(781,1322),(1063,1319)]])
    animations['raven-idle']=animations['raven-fly']

    path,p=sheet('armor-motion-raw.png',24)
    pivots=[[(135,249),(393,249),(647,249),(905,249)],[(143,504),(397,504),(653,504),(910,504)],
            [(137,768),(390,750),(653,756),(891,767)],[(144,1007),(365,1007),(658,1007),(891,1007)],
            [],[(124,1518),(393,1518),(640,1518),(896,1518)]]
    ah=[(96,829),(419,863),(680,899),(899,926)]
    at=[(10,849),(558,869),(785,924),(1004,979)]
    for row,name in [(0,'idle'),(1,'run'),(2,'air'),(3,'slash'),(5,'dash')]:
        sequence('lanternplate-'+name,path,p[row*4:row*4+4],pivots[row],.27,(20,60),
                 [dict(hand=h,bladeTip=t) for h,t in zip(ah,at)] if name=='slash' else None,hero=True)
    # Reject original armor overhead row: its contact sword pointed backward.
    path,p=sheet('sword-motion-raw.png',12)
    specs=[('courier-slash',[(204,352),(518,352),(902,352),(1267,352)],.22,
            [(169,116),(605,175),(944,235),(1280,260)],[(48,95),(766,179),(1086,334),(1418,350)]),
           ('courier-overhead',[(202,735),(525,735),(898,735),(1266,735)],.22,
            [(175,454),(520,474),(944,645),(1280,656)],[(49,467),(520,338),(1069,732),(1418,730)]),
           ('lanternplate-overhead',[(205,1057),(526,1057),(902,1057),(1269,1057)],.245,
            [(178,799),(520,814),(941,948),(1280,965)],[(48,809),(520,706),(1086,1053),(1420,1048)])]
    for row,(name,piv,scale,hand,tip) in enumerate(specs):
        sequence(name,path,p[row*4:row*4+4],piv,scale,(20,60),[dict(hand=h,bladeTip=t) for h,t in zip(hand,tip)],hero=True)
    for name,source in dict(jump='air',fall='air',doublejump='air',jet='air',fire='idle',hurt='air',death='air',**{'slash-air':'overhead','slash-low':'slash','air-slash':'overhead','crouch-slash':'slash'}).items():
        original=animations['lanternplate-'+source]
        selected=original[:2] if name in ['jump','doublejump'] else original[2:3] if name=='fall' else original[3:] if name in ['hurt','death'] else original
        animations['lanternplate-'+name]=selected
    for name in ['aether-slash','hero-slash-low','aether-crouch-slash']: animations[name]=animations['courier-slash']
    for name in ['aether-overhead','hero-slash-air','aether-air-slash']: animations[name]=animations['courier-overhead']
    # Complete inventory silhouettes; rejected rectangular actor crops are not shipped.
    path=SOURCE/'equipment-icons-raw.png'
    parts=sorted(components(path,3,5000),key=lambda p:p[0][0])
    for name,(box,im) in zip(['lanternplate','bellheart','raven'],parts):
        frame('lm-icon-'+name,path,(box,im),((box[0]+box[2])/2,(box[1]+box[3])/2),.085,(52,52),(72,72),(36,36))


def preview(name, keys):
    w,h=384,312
    contact=Image.new('RGB',(w*4,h*((len(keys)+3)//4)),'#34464c')
    draw=ImageDraw.Draw(contact)
    movie=[]
    for i,key in enumerate(keys):
        image=pixels[key].resize((pixels[key].width*2,pixels[key].height*2),Image.Resampling.NEAREST)
        page=Image.new('RGB',(w,h),'#34464c' if i%2==0 else '#78908b')
        pen=ImageDraw.Draw(page)
        x=(w-image.width)//2
        pen.text((8,8),key,fill='#fff0c7')
        pen.line((0,24+frames[key]['anchor']['y']*2,w,24+frames[key]['anchor']['y']*2),fill='#c29b62')
        page.paste(image,(x,24),image)
        for socket,point in frames[key].get('sockets',{}).items():
            if socket in ['bladeTip','weaponTip','frontFoot']:
                sx,sy=x+point['x']*2,24+point['y']*2
                pen.rectangle((sx-2,sy-2,sx+2,sy+2),outline='#ffdd55')
        contact.paste(page,((i%4)*w,(i//4)*h))
        movie.append(page)
    contact.save(PROOF/(name+'-contact.png'))
    movie[0].save(PROOF/(name+'-motion.gif'),save_all=True,append_images=movie[1:],duration=110,loop=0,disposal=2)


def pack():
    atlas=Image.new('RGBA',(2048,2048))
    packed={};x=y=2;rh=0
    for key,im in pixels.items():
        if x+im.width+2>atlas.width:x=2;y+=rh+4;rh=0
        assert y+im.height+2<=atlas.height
        atlas.alpha_composite(im,(x,y))
        packed[key]=dict(frame=dict(x=x,y=y,w=im.width,h=im.height),rotated=False,trimmed=False,spriteSourceSize=dict(x=0,y=0,w=im.width,h=im.height),sourceSize=dict(w=im.width,h=im.height))
        x+=im.width+4;rh=max(rh,im.height)
    atlas=atlas.crop((0,0,2048,1024 if y+rh<1024 else 2048))
    atlas.save(OUT/'atlas.png',optimize=True)
    (OUT/'atlas.json').write_text(json.dumps(dict(frames=packed,meta=dict(image='atlas.png',size=dict(w=atlas.width,h=atlas.height),scale='1')),separators=(',',':'))+'\n')
    manifest=dict(atlasKey='lantern-motion',frames=frames,animations=animations,
        motionProfiles=dict(guardian=dict(lift=[0,1,2,3],downswing=[4],contact=[5],recovery=[6,7]),
            bellbeast=dict(lift=[0],downswing=[1],contact=[2],recovery=[3]),
            wispknight=dict(windup=[0],dash=[1],contact=[2],recovery=[3]),
            sword=dict(windup=[0],commit=[1],contact=[2],recovery=[3],contactProgress=.55)),
        notes=['Original generated complete strips; all source prompts retained. No copied pose used to claim locomotion.',
            'Alpha >=32 assigned by connected silhouettes; constant sequence scales, anatomy pivots, nearest-neighbor resampling.',
            'Original armor overhead row rejected; dedicated correction sheet supplies actual downstroke contact.',
            'Sockets are native frame coordinates, transformed with frame origin/scale/facing at runtime.',
            'Guardian has eight authored attack poses; other new attacks have four. Phase selection must follow simulation timing.',
            'Wispknight deliberately shares the stalker avian-mask family, at a smaller scale, with its own crouch/leap/contact strip.',
            'Fire aliases idle; hurt/death alias landing crouch. These are limited fallback poses, not bespoke animations.',
            'UI armor/core/raven icons are dedicated complete silhouettes generated from the approved actor references.',
            'Per-sequence source pixel density differs between generated sheets; no per-frame stretch or rotation normalization.'])
    (OUT/'manifest.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
    assert all(k in frames for a in animations.values() for k in a)
    assert all(not f['sourceBorderContact'] for f in frames.values())
    for name,keys in groups.items():
        assert len({hashlib.sha256(pixels[k].tobytes()).hexdigest() for k in keys})==len(keys),name
        preview(name,keys)
    preview('icons',['lm-icon-lanternplate','lm-icon-raven','lm-icon-bellheart'])
    print(f'Built {len(frames)} frames; {len(animations)} aliases; {atlas.width}x{atlas.height}. All references valid; distinct authored poses; no border clipping.')


if __name__=='__main__':
    build()
    pack()
