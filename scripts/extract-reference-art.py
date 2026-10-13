"""Deterministic extraction from user-supplied flattened concept boards.

Run with the bundled Python + Pillow/NumPy. Originals are never modified or
copied into public/. Coordinates are literal native-source pixels, not the
printed, fictional sprite-sheet metadata on the boards.
"""
from pathlib import Path
from collections import deque
import hashlib
import json
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'reference'
PREVIEWS = ROOT / 'artifacts' / 'reference'
SOURCES = Path('C:/Users/mahik/Downloads')
FILES = {
    'aether': '03_aether_character_sheet.png',
    'pack': '02_asset_pack_all_characters.png',
    'concept': '01_concept_board_full_world.png',
    'designer': 'Designer.png',
}
images = {key: Image.open(SOURCES / name).convert('RGBA') for key, name in FILES.items()}
specs = []


def add(key, source, rect, pivot=None, scale=1, canvas=None, opaque=False, **extra):
    specs.append(dict(key=key, source=source, rect=rect, pivot=pivot, scale=scale,
                      canvas=canvas, opaque=opaque, extra=extra))


# Every rectangle contains one actually visible pose. The sheet prints larger
# animation counts than the number of drawings present; those labels are ignored.
hero = {
    'idle': [(12,339,57,424,37,419),(60,339,106,424,82,419),(106,339,148,424,127,419)],
    'run': [(154,340,195,424,177,419),(195,340,239,424,221,419),(239,342,281,424,263,419),(281,345,326,424,305,419),(326,345,364,424,346,419)],
    'jump': [(369,338,408,424,391,419),(408,329,445,409,430,404),(448,316,484,391,465,377)],
    'doublejump': [(491,314,541,395,518,380),(542,328,586,414,565,401),(589,339,622,424,605,419)],
    'fall': [(631,340,680,424,658,419),(680,339,727,424,703,419)],
    'dash': [(736,349,790,424,771,414),(787,349,839,424,821,415),(837,347,894,424,877,414)],
    'dashtrail': [(899,348,988,424,959,414),(981,348,1068,424,1045,414)],
    'jetidle': [(11,509,62,593,38,577),(63,509,110,593,85,577),(109,509,157,593,132,577)],
    'jet': [(163,508,207,596,191,579),(208,507,251,596,233,579),(252,507,298,596,279,579),(299,507,342,596,322,579),(343,507,388,596,366,579),(389,507,424,596,408,579)],
    'fire': [(430,525,477,604,454,597),(479,525,526,604,500,597),(530,525,582,604,551,597),(584,525,630,604,605,597)],
    'hurt': [(683,522,731,606,708,597),(735,523,784,606,759,597),(785,525,831,606,807,597)],
    'death': [(838,546,901,606,866,597),(898,559,954,606,927,597),(950,563,1006,606,979,597),(1003,563,1068,606,1036,597)],
}
for action, poses in hero.items():
    for i, (x0,y0,x1,y1,fx,fy) in enumerate(poses):
        extraLeft=32 if action=='dashtrail' else 0
        add(f'ref-aether-{action}-{i}', 'aether', [x0,y0,x1-x0,y1-y0],
            [fx,fy], 1.25, [128+extraLeft,160 if action in ['doublejump','jetidle','jet'] else 128], body={'x':50+extraLeft,'y':56,'w':28,'h':60},
            anchor=[64+extraLeft,116], family='aether', action=action,
            hand=[80+extraLeft,75], muzzle=[93+extraLeft,75] if action=='fire' else None,
            readyPose=action=='fire' and i==0,
            attachmentRole='canonical-raised-fire')

for i, rect in enumerate([(18,710,42,45),(63,704,68,55),(139,704,68,55),(210,697,69,74),(280,705,73,53),(366,703,47,65),(418,699,53,70)]):
    add(f'ref-fx-attack-{i}','aether',rect,family='effect',action='attack')
for i,rect in enumerate([(514,702,59,68),(582,705,58,65),(646,717,50,53),(702,721,35,48)]):
    add(f'ref-fx-jet-{i}','aether',rect,family='effect',action='jet')
for i,rect in enumerate([(797,706,100,56),(899,706,83,62),(990,709,59,57)]):
    add(f'ref-fx-dash-{i}','aether',rect,family='effect',action='dash')


creatures = {
    'crawler': {
        'idle': [(697,42,72,70,733,105)],
        'walk': [(775,44,75,66,812,104),(851,43,74,68,887,105),(928,43,76,69,965,105)],
        'attack': [(697,144,74,66,733,204),(774,148,78,61,814,204)],
        'hurt': [(853,143,76,69,892,204),(932,146,75,65,970,205)],
        'death': [(1009,156,88,55,1050,205)],
    },
    'raider': {
        'idle': [(1126,41,69,72,1164,105)],
        'fly': [(1203,39,69,72,1240,105),(1280,38,67,73,1313,105),(1350,40,70,72,1384,105),(1429,40,74,71,1465,105)],
        'fire': [(1127,136,67,81,1163,206),(1202,141,67,73,1239,206)],
        'hurt': [(1360,158,73,54,1395,206)],
        'death': [(1434,163,94,50,1474,207)],
    },
    'mecha': {
        'idle': [(696,293,76,92,736,377)],
        'walk': [(775,294,70,91,811,377)],
        'attack': [(850,292,53,94,877,377),(902,309,69,77,939,377)],
        'fire': [(972,295,93,91,1009,377)],
        'hurt': [(695,397,91,88,734,473)],
        'death': [(788,421,73,64,823,474),(862,420,52,65,891,474),(916,420,85,64,959,474)],
    },
}
for family,actions in creatures.items():
    for action,poses in actions.items():
        for i,(x,y,w,h,fx,fy) in enumerate(poses):
            if family=='crawler':canvas=[128,112];anchor=[64,100];body={'x':34,'y':59,'w':60,'h':41};scale=1.25
            elif family=='raider':canvas=[128,112];anchor=[64,100];body={'x':47,'y':43,'w':34,'h':45};scale=1.15
            else:canvas=[144,144];anchor=[64,128];body={'x':38,'y':57,'w':52,'h':71};scale=1.05
            add(f'ref-{family}-{action}-{i}','pack',[x,y,w,h],[fx,fy],scale,canvas,
                anchor=anchor,body=body,family=family,action=action,
                muzzle=[120,80] if family=='mecha' else [94,65],
                core=[64,79] if family=='mecha' else [64,74])

# Register the actual mouths, rather than treating the entire wing/tail rectangle
# as a body. These source drawings have different illustrative scales.
wyrm = {
    'idle': [(10,551,269,152,265,622,.82,164,644)],
    'fly': [(279,551,140,126,404,602,1.48,347,627),(417,550,132,123,538,594,1.5,479,626)],
    'fire': [(646,551,177,137,804,615,1.45,738,640),(12,714,170,132,168,781,1.3,102,812),(164,735,119,110,271,783,1.48,229,807)],
    'hurt': [(285,708,130,145,402,777,1.4,350,809),(383,716,96,126,465,775,1.42,425,801),(475,725,143,129,594,802,1.38,539,824)],
    'death': [(615,763,212,70,811,813,.97,681,798)],
}
for action,poses in wyrm.items():
    for i,(x,y,w,h,mx,my,scale,cx,cy) in enumerate(poses):
        # Virtual foot/body anchor is stable even for folded aerial legs.
        pivot=[mx-100/scale,my+72/scale]
        add(f'ref-wyrm-{action}-{i}','pack',[x,y,w,h],pivot,scale,[256,256 if action=='fly' else 224],
            anchor=[128,200],body={'x':72,'y':114,'w':112,'h':86},mouth=[228,128],
            core=[round(228+(cx-mx)*scale),round(128+(cy-my)*scale)],
            launcher=[156,100],family='wyrm',action=action,
            sourceMouth=[mx,my],sourceCore=[cx,cy])

npcs = [
    ('villager',(626,165,53,93),(650,250),(637,175,30,33)),
    ('mage',(687,168,67,89),(716,250),(700,183,30,30)),
    ('blacksmith',(763,168,73,91),(795,251),(780,174,32,39)),
    ('scientist',(842,174,51,84),(866,252),(850,179,33,35)),
    ('merchant',(905,166,65,91),(935,251),(919,174,33,38)),
    ('healer',(983,166,50,92),(1009,252),(993,175,30,37)),
]
for name,rect,pivot,face in npcs:
    add(f'ref-npc-{name}','designer',rect,pivot,1.12,[96,128],anchor=[48,106],
        body={'x':32,'y':43,'w':32,'h':63},family='npc',name=name)
    add(f'ref-face-{name}','designer',face,family='portrait',name=name)
add('ref-face-aether','designer',[631,883,63,84],family='portrait',name='aether')

tiles = {
    'grass':('designer',[19,555,39,43]),'dirt':('designer',[65,555,38,43]),
    'stone':('designer',[109,555,39,43]),'moss':('designer',[153,555,40,43]),
    'crystal':('designer',[197,555,39,43]),'ruins':('designer',[576,552,42,49]),
    'cave':('designer',[14,701,49,62]),'cave-wall':('designer',[69,701,44,62]),
    'metal':('concept',[657,42,49,51]),'snow':('designer',[109,555,39,43]),
}
for name,(source,rect) in tiles.items():
    add(f'ref-tile-{name}',source,rect,opaque=True,family='tile',targetSize=[64,64])

props = {
    'platform':('designer',[288,554,56,24]),'platform-moving':('designer',[288,576,56,23]),
    'ladder':('designer',[352,549,36,62]),'spikes':('designer',[396,555,50,49]),
    'arch':('designer',[745,550,46,58]),'pillar':('designer',[706,550,37,57]),
    'gate':('designer',[1460,688,64,108]),'teleporter':('designer',[1387,689,76,110]),
    'tree':('designer',[1130,683,68,110]),'dead-tree':('designer',[1190,706,64,88]),
    'crystal':('designer',[1247,686,86,109]),'statue':('designer',[1335,686,52,111]),
    'torch':('designer',[900,550,30,55]),'chain':('designer',[866,550,31,58]),
    'chest':('designer',[1416,149,86,51]),'turret':('concept',[1100,651,61,80]),
    'banner':('designer',[500,548,45,63]),'water':('designer',[426,704,48,62]),
    'waterfall':('designer',[486,699,43,68]),'crystal-plant':('designer',[347,702,71,60]),
    'door':('designer',[796,550,62,58]),'sign':('designer',[452,554,43,49]),
}
for name,(source,rect) in props.items():add(f'ref-prop-{name}',source,rect,family='prop',name=name)

backgrounds = {
    'forest':('concept',[1020,13,100,123]),'sky':('concept',[1125,13,104,123]),
    'castle':('concept',[1232,13,96,123]),'cave':('concept',[1331,13,94,123]),
    'city':('concept',[1429,13,96,123]),'sky-wide':('designer',[617,682,491,85]),
    'forest-wide':('designer',[618,774,241,58]),'cave-wide':('designer',[863,774,245,58]),
    'islands-wide':('pack',[1229,575,295,60]),'ruins-wide':('pack',[1229,641,295,69]),
    'castle-wide':('pack',[1229,716,157,65]),'crystals-wide':('pack',[1389,716,135,65]),
    'cavern-wide':('pack',[1229,787,295,65]),
}
for name,(source,rect) in backgrounds.items():add(f'ref-bg-{name}',source,rect,opaque=True,family='background',name=name)

collectibles = {
    'coin':[1089,151,42,49],'crystal':[1148,151,42,48],'health':[1205,151,47,46],
    'mana':[1273,150,46,50],'key':[1335,148,50,55],'treasure':[1417,148,86,55],
    'health-potion':[1087,225,41,46],'mana-potion':[1161,225,40,46],
    'shield':[1230,225,46,46],'jetpack':[1296,224,57,43],'dash':[1369,225,58,43],
    'scroll':[1452,222,51,51],
}
for name,rect in collectibles.items():add(f'ref-item-{name}','designer',rect,family='item',name=name)
for name,rect in {
    'shot':[1253,292,38,38],'bolt':[1293,294,61,37],'charged':[1357,289,46,48],
    'star':[1412,288,46,48],'enemy-shot':[1258,341,35,33],'enemy-bolt':[1295,342,57,32],
    'fire':[1353,334,45,46],'explosion':[1411,327,59,54],
}.items():add(f'ref-fx-{name}','pack',rect,family='effect',action=name)
add('ref-fx-shield-0','concept',[1275,294,63,64],family='effect',action='shield')
add('ref-fx-teleport-0','designer',[307,866,42,83],family='effect',action='teleport')
add('ref-fx-slash-0','designer',[15,876,62,67],family='effect',action='slash')
add('ref-fx-flame-0','designer',[361,881,36,66],family='effect',action='flame')


def background_mask(crop, dominant=False):
    """Fit the smooth board matte from its perimeter, then unmix edge pixels.

    Background removal is an alpha operation on source RGB pixels, never a
    redraw. The polynomial handles these boards' gradient panels. Low residuals
    are transparent; colored hair, capes and luminous particles are retained.
    """
    original=np.asarray(crop)
    rgb = original[:,:,:3].astype(np.float32)
    h,w = rgb.shape[:2]
    yy,xx = np.mgrid[-1:1:complex(h),-1:1:complex(w)]
    light = float(np.median(rgb[[0,-1],:]))>155
    design = np.stack([np.ones_like(xx),xx,yy] if light else [np.ones_like(xx),xx,yy,xx*yy,xx*xx,yy*yy],axis=-1)
    border = (np.abs(xx)>.94)|(np.abs(yy)>.94)
    candidates = ((np.min(rgb,axis=-1)>180)&(np.ptp(rgb,axis=-1)<32)) if light else border
    selected = candidates.copy()
    assert np.count_nonzero(selected)>10, crop.size
    for _ in range(4):
        fit = np.linalg.lstsq(design[selected],rgb[selected],rcond=None)[0]
        bg = np.einsum('ijk,kl->ijl',design,fit)
        residual = np.linalg.norm(rgb-bg,axis=-1)
        values = residual[candidates]
        selected = candidates & (residual <= max(8,float(np.quantile(values,.78))))
    direct=float(np.median(original[[0,-1],:,3]))<45
    if direct:
        alpha=original[:,:,3].astype(np.float32)/255
        alpha[original[:,:,3]<12]=0
    else:
        alpha = np.clip((residual-(15 if light else 9))/(22 if light else 16),0,1)
        alpha=np.minimum(alpha,original[:,:,3]/255)
        if light:alpha[(np.ptp(rgb,axis=-1)<25)&(residual<90)]=0
    # Keep connected artwork and small particles, discard isolated matte noise.
    seen = np.zeros((h,w),bool)
    keep = np.zeros((h,w),bool)
    components=[]
    for sy,sx in np.argwhere(alpha>.12):
        if seen[sy,sx]: continue
        todo=deque([(sy,sx)]);seen[sy,sx]=True;component=[];peak=0
        while todo:
            y,x=todo.popleft();component.append((y,x));peak=max(peak,float(alpha[y,x]))
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    ny,nx=y+dy,x+dx
                    if 0<=ny<h and 0<=nx<w and not seen[ny,nx] and alpha[ny,nx]>.12:
                        seen[ny,nx]=True;todo.append((ny,nx))
        if len(component)>=8 or (len(component)>=2 and peak>.85):components.append(component)
    if dominant and components:components=[max(components,key=len)]
    for component in components:
        for y,x in component:keep[y,x]=True
    alpha *= keep
    # Remove the board color from partial pixels to prevent white/blue matte halos.
    foreground=rgb if direct else np.clip((rgb-(1-alpha[...,None])*bg)/np.maximum(alpha[...,None],.01),0,255)
    rgba=np.dstack([foreground,alpha*255]).round().astype(np.uint8)
    rgba[alpha==0,:3]=0
    return Image.fromarray(rgba), {'method':'source-alpha-cleanup' if direct else 'robust-gradient-matte/unmix',
                                  'dominantComponent':dominant,
                                  'transparentFraction':float(np.mean(alpha==0))}


def main():
    OUT.mkdir(parents=True,exist_ok=True);PREVIEWS.mkdir(parents=True,exist_ok=True)
    frames={}; rendered=[]; hashes={};duplicates=[]
    for spec in specs:
        key=spec['key'];source=images[spec['source']];x,y,w,h=spec['rect']
        assert 0<=x<source.width and 0<=y<source.height and x+w<=source.width and y+h<=source.height,key
        crop=source.crop((x,y,x+w,y+h))
        if spec['opaque']:
            crop=crop.convert('RGB').convert('RGBA');audit={'method':'literal-opaque-panel-crop'}
        else: crop,audit=background_mask(crop,spec['extra'].get('family') in ['aether','crawler','raider','mecha','wyrm','npc','portrait'])
        if spec['extra'].get('targetSize'):crop=crop.resize(spec['extra']['targetSize'],Image.Resampling.NEAREST)
        scale=spec['scale']
        if scale!=1:crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
        if spec['canvas']:
            image=Image.new('RGBA',spec['canvas']);anchor=spec['extra']['anchor'];pivot=spec['pivot']
            offset=[round(anchor[0]-(pivot[0]-x)*scale),round(anchor[1]-(pivot[1]-y)*scale)]
            image.alpha_composite(crop,offset)
        else:
            bounds=crop.getbbox();assert bounds,key
            image=crop.crop(bounds);anchor=[image.width/2,image.height-1]
            offset=[-bounds[0],-bounds[1]]
        assert image.getbbox(),key
        digest=hashlib.sha256(image.tobytes()).hexdigest()
        alias=hashes.get(digest)
        if alias:duplicates.append({'key':key,'samePixelsAs':alias})
        else:hashes[digest]=key
        metadata={'key':key,'width':image.width,'height':image.height,'anchor':{'x':anchor[0],'y':anchor[1]},
                  'source':FILES[spec['source']],'sourceRect':{'x':x,'y':y,'w':w,'h':h},
                  'scale':scale,'cropOffset':offset,'pixelSha256':digest,'mask':audit,**spec['extra']}
        metadata['anchor']={'x':anchor[0],'y':anchor[1]}
        if alias:metadata['aliasOf']=alias
        bounds=image.getbbox();metadata['visibleBounds']={'x':bounds[0],'y':bounds[1],'w':bounds[2]-bounds[0],'h':bounds[3]-bounds[1]}
        if spec['canvas']:
            assert 0<bounds[0]<bounds[2]<image.width and 0<bounds[1]<bounds[3]<image.height, f'Artwork touches frame edge: {key} {bounds}'
        frames[key]=metadata;rendered.append((key,image))
    width=2048;x=y=rowH=0;positions={}
    for key,image in rendered:
        if frames[key].get('aliasOf'):
            positions[key]=positions[frames[key]['aliasOf']];continue
        w,h=image.size
        if x+w+2>width:y+=rowH+2;x=0;rowH=0
        positions[key]=[x,y,w,h];x+=w+2;rowH=max(rowH,h)
    height=2**math.ceil(math.log2(y+rowH+2));assert height<=4096,(width,height)
    atlas=Image.new('RGBA',(width,height));atlasJSON={'frames':{},'meta':{'app':'ASH//SIGNAL deterministic source extraction','size':{'w':width,'h':height},'scale':'1'}}
    for key,image in rendered:
        x,y,w,h=positions[key]
        if not frames[key].get('aliasOf'):atlas.alpha_composite(image,(x,y))
        atlasJSON['frames'][key]={'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h}}
    atlas.save(OUT/'atlas.png',optimize=True)
    (OUT/'atlas.json').write_text(json.dumps(atlasJSON,indent=2)+'\n',encoding='utf8')
    animations={}
    for key,item in frames.items():
        if item.get('action'):animations.setdefault(f"{'fx' if item['family']=='effect' else item['family']}-{item['action']}",[]).append(key)
    # The first drawing under the printed Shoot label is a weapon-ready stance.
    # Keep its source crop available, but fire cycles only through raised hands.
    animations['aether-ready']=['ref-aether-fire-0']
    animations['aether-fire']=[key for key in animations['aether-fire'] if not frames[key]['readyPose']]
    sources=[{'file':name,'sha256':hashlib.sha256((SOURCES/name).read_bytes()).hexdigest(),'width':images[k].width,'height':images[k].height} for k,name in FILES.items()]
    manifest={'version':1,'atlasKey':'reference-art','frames':frames,'animations':animations,'sources':sources,
              'duplicates':duplicates,'budget':{'frameCount':len(frames),'atlasWidth':width,'atlasHeight':height,'atlasRGBABytes':width*height*4},
              'limitations':['Flattened concept illustrations are not uniform original animation sheets.','Only distinct visible source poses were extracted; printed frame counts are ignored.','No generated in-between frames.','Opaque scenery panels contain their source painted lighting.','Background masking may lose extremely low-contrast source pixels; inspect the contact sheets.','User supplied sources; provenance recorded, independent ownership/license verification not performed.']}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
    for name,subset in [('hero',[entry for entry in rendered if entry[0].startswith('ref-aether-')]),('creatures',[entry for entry in rendered if frames[entry[0]].get('family') in ['crawler','raider','mecha','wyrm','npc','portrait']]),('environment',[entry for entry in rendered if frames[entry[0]].get('family') in ['background','tile','prop','item']]),('extracted',rendered)]:
        cols=8;cellW=192;cellH=188;sheet=Image.new('RGB',(cols*cellW,math.ceil(len(subset)/cols)*cellH),(24,28,41));draw=ImageDraw.Draw(sheet)
        for i,(key,image) in enumerate(subset):
            x=(i%cols)*cellW;y=(i//cols)*cellH
            for cy in range(y,y+cellH-24,12):
                for cx in range(x,x+cellW,12):draw.rectangle((cx,cy,cx+11,cy+11),fill=(36,43,57) if ((cx-x)//12+(cy-y)//12)%2 else (25,30,43))
            scale=min(1.25,(cellW-10)/image.width,(cellH-30)/image.height);preview=image.resize((round(image.width*scale),round(image.height*scale)),Image.Resampling.NEAREST)
            sheet.paste(preview,(x+(cellW-preview.width)//2,y+8),preview);draw.text((x+5,y+cellH-21),key.replace('ref-',''),fill=(227,237,245))
        sheet.save(PREVIEWS/f'{name}-contact-sheet.png',optimize=True)
    print(json.dumps({'frames':len(frames),'animations':{k:len(v) for k,v in animations.items()},'budget':manifest['budget'],'duplicates':duplicates},indent=2))


if __name__=='__main__':main()
