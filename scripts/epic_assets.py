"""Register generated illustrated source art without changing simulation body sizes.

Called by existing atlas builders; source coordinates and sockets remain auditable.
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_erosion, distance_transform_edt

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'reference/epic-revision'
CORRECTION=ROOT/'reference/playtest-correction'
PROOF=ROOT/'artifacts/playtest-correction/qa/art'

def extract(name,count,columns=4):
    path=(CORRECTION/name if (CORRECTION/name).exists() else SRC/name)
    a=np.array(Image.open(path).convert('RGBA')); mask=a[:,:,3]>=20
    for erosion in range(16):
        labs,_=label(binary_erosion(mask,iterations=erosion) if erosion else mask,np.ones((3,3)))
        sizes=np.bincount(labs.ravel()); ids=np.where(sizes>3000)[0]; ids=ids[ids!=0]
        if len(ids)==count:break
    assert len(ids)==count,(name,len(ids),count)
    core=np.where(np.isin(labs,ids),labs,0)
    _,nearest=distance_transform_edt(core==0,return_indices=True); owners=core[tuple(nearest)]
    parts=[]
    for id in ids:
        m=(owners==id)&mask; yy,xx=np.where(m); box=(int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1))
        crop=a[box[1]:box[3],box[0]:box[2]].copy(); crop[:,:,3]=np.where(m[box[1]:box[3],box[0]:box[2]],crop[:,:,3],0)
        parts.append((box,Image.fromarray(crop)))
    parts.sort(key=lambda p:p[0][1]+p[0][3])
    parts=[p for i in range(0,count,columns) for p in sorted(parts[i:i+columns],key=lambda p:p[0][0])]
    return path,parts

def register(frames,pixels,key,path,part,pivot,body,slots,scale=1.0,atlas='ironfang',hurtboxes=None):
    box,im=part; size=(768,640); anchor=(384,480)
    offset=tuple(round(anchor[j]+(box[j]-pivot[j])*scale) for j in range(2))
    im=im.resize(tuple(round(v*scale) for v in im.size),Image.Resampling.LANCZOS)
    assert min(offset)>=0 and offset[0]+im.width<=size[0] and offset[1]+im.height<=size[1],(key,offset,im.size)
    canvas=Image.new('RGBA',size);canvas.alpha_composite(im,offset);pixels[key]=canvas
    point=lambda p:dict(x=round(anchor[0]+(p[0]-pivot[0])*scale,3),y=round(anchor[1]+(p[1]-pivot[1])*scale,3))
    frames[key]=dict(key=key,atlasKey=atlas,width=size[0],height=size[1],anchor=dict(x=anchor[0],y=anchor[1]),
        body=dict(x=anchor[0]-body[0]*scale/2,y=anchor[1]-body[1]*scale,w=body[0]*scale,h=body[1]*scale),
        sockets={n:point(p) for n,p in slots.items()},source=path.relative_to(ROOT).as_posix(),
        sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),sourceRect=list(box),sourcePivot=list(pivot),scale=scale,
        normalization='Connected authored silhouette; shared family scale; measured anatomy and muzzle sockets; Lanczos sampling')
    if hurtboxes:frames[key]['hurtboxes']=[dict(**point(b),w=b[2]*scale,h=b[3]*scale) for b in hurtboxes]

def bosses(frames,pixels,animations):
    path,parts=extract('bull-painted-source.png',16)
    pivots=[(163,307),(490,307),(799,307),(1105,307),(168,622),(489,622),(791,622),(1104,622),
            (166,915),(489,915),(791,915),(1103,915),(164,1210),(482,1210),(790,1210),(1090,1210)]
    guns=[(271,83),(600,92),(914,92),(1233,83),(292,421),(566,400),(919,472),(1222,484),
          (278,701),(594,687),(883,689),(1198,689),(267,980),(435,985),(901,1068),(1239,1135)]
    for i,(part,pivot,gun) in enumerate(zip(parts,pivots,guns)):
        x,y=pivot
        register(frames,pixels,f'if-bull-{i}',path,part,pivot,(112,220),{'gun':gun,'rocket':gun,'contact':(936,632) if i==6 else (x+100,y)},1.15,
                 hurtboxes=[(x-85,y-200,150,192),(x+35,y-191,77,80)])
    for i in range(4):
        key=f'if-bull-charge-{i}';frames[key]=dict(frames[f'if-bull-{i}'],key=key);pixels[key]=pixels[f'if-bull-{i}']
    animations['ironbull-charge']=[f'if-bull-charge-{i}' for i in range(4)]
    path,parts=extract('dragon-painted-source.png',12)
    pivots=[(245,400),(603,400),(960,400),(1320,400),(244,767),(603,767),(964,767),(1321,767),
            (244,1051),(602,1051),(961,1051),(1308,1051)]
    guns=[(332,230),(672,230),(1049,235),(1394,230),(326,597),(688,598),(1043,592),(1408,602),
          (320,885),(614,824),(999,904),(1366,970)]
    mouths=[(371,286),(732,287),(1083,291),(1441,286),(365,645),(722,645),(1102,610),(1436,652),
            (362,936),(679,836),(1047,963),(1435,1031)]
    for i,(part,pivot,gun,mouth) in enumerate(zip(parts,pivots,guns,mouths)):
        x,y=pivot
        register(frames,pixels,f'if-dragon-{i}',path,part,pivot,(136,150),{'gun':gun,'rocket':gun,'mouth':mouth},1,
                 hurtboxes=[(x-83,y-126,133,111),(mouth[0]-83,mouth[1]-32,87,63),(x-166,y-65,85,43)])
    for i in range(4):
        key=f'if-dragon-cannon-{i}';frames[key]=dict(frames[f'if-dragon-{i+4}'],key=key);pixels[key]=pixels[f'if-dragon-{i+4}']
    animations['irondragon-cannon']=[f'if-dragon-cannon-{i}' for i in range(4)]
    path,parts=extract('dragon-flight-painted-source.png',4,2)
    # This second source was regenerated because the first sheet moved the torso too little.
    pivots=[(470,475),(1180,505),(527,907),(1208,930)]
    guns=[(569,166),(1323,340),(595,693),(1390,728)]
    mouths=[(719,231),(1481,448),(750,607),(1485,817)]
    for i,(part,pivot,gun,mouth) in enumerate(zip(parts,pivots,guns,mouths)):
        x,y=pivot
        register(frames,pixels,f'if-dragon-{i}',path,part,pivot,(136/.62,150/.62),{'gun':gun,'rocket':gun,'mouth':mouth},.62,
                 hurtboxes=[(x-120,y-235,235,210),(mouth[0]-125,mouth[1]-65,135,100),(x-265,y-120,150,65)])
    # Morph stages now retain the rebuilt identities; transition timing remains authored.
    for i,index in enumerate([13,4,5]):
        source=f'if-bull-{index}'; key=f'if-morph-{i}'
        frames[key]=dict(frames[source],key=key);pixels[key]=pixels[source]
    preview(pixels,[f'if-bull-{i}' for i in range(16)],'bull')
    preview(pixels,[f'if-dragon-{i}' for i in range(12)],'dragon')
    effects(frames,pixels,animations)

def effects(frames,pixels,animations):
    path=SRC/'fx-raw.png';source=Image.open(path).convert('RGBA')
    rows=[('impact',[(0,0,247,359),(250,0,602,361),(599,0,946,363),(944,115,1254,363)],[(129,339),(414,339),(771,339),(1093,339)],(200,340),.72),
          ('muzzle',[(0,374,244,628),(250,370,645,642),(650,391,942,638),(952,381,1254,629)],[(22,506),(260,506),(659,506),(958,506)],(30,200),.82),
          ('boost',[(48,642,212,950),(261,642,597,997),(652,642,937,976),(999,641,1172,924)],[(126,654),(418,654),(750,654),(1084,654)],(200,35),.9)]
    for name,boxes,pivots,anchor,scale in rows:
        for i,(box,pivot) in enumerate(zip(boxes,pivots)):
            effect_frame(frames,pixels,f'if-{name}-{i}',source,path,box,pivot,anchor,scale)
        animations['ironfang-'+name]=[f'if-{name}-{i}' for i in range(4)]
    for name,box,pivot in [('round',(0,1033,289,1169),(194,1096)),('shell',(307,1042,628,1174),(487,1100)),
                           ('chips',(631,979,946,1210),(786,1194)),('arc',(949,944,1254,1228),(1100,1084))]:
        effect_frame(frames,pixels,'if-'+name,source,path,box,pivot,(200,200),.78)
    slash_path=CORRECTION/'slash-source.png'
    slash=Image.open(slash_path).convert('RGBA')
    assert slash.width%4==0,slash.size
    cell_w=slash.width//4
    for i in range(4):
        cell=slash.crop((i*cell_w,0,(i+1)*cell_w,slash.height))
        alpha=np.array(cell.getchannel('A'))
        yy,xx=np.where(alpha>=8)
        assert len(xx)>1000,(i,'empty painted slash')
        box=(int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1))
        crop=cell.crop(box)
        scale=min(330/crop.width,300/crop.height)
        crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(400,400))
        offset=(55,(400-crop.height)//2)
        assert offset[0]+crop.width<=400 and offset[1]>=0
        canvas.alpha_composite(crop,offset)
        key=f'if-cut-{i}'
        pixels[key]=canvas
        frames[key]=dict(key=key,atlasKey='ironfang',width=400,height=400,anchor=dict(x=64,y=200),
            source=slash_path.relative_to(ROOT).as_posix(),sourceSha256=hashlib.sha256(slash_path.read_bytes()).hexdigest(),
            sourceRect=[i*cell_w+box[0],box[1],i*cell_w+box[2],box[3]],
            normalization='Painted four-frame slash; alpha-tight source crop with Lanczos scale and fixed hand-side emitter')
    animations['ironfang-cut']=[f'if-cut-{i}' for i in range(4)]

def effect_frame(frames,pixels,key,source,path,box,pivot,anchor,scale):
    crop=source.crop(box);a=np.array(crop);yy,xx=np.indices(a.shape[:2])
    fade=np.minimum.reduce([xx,yy,a.shape[1]-1-xx,a.shape[0]-1-yy])/8
    a[:,:,3]=(a[:,:,3]*np.clip(fade,0,1)).astype('uint8')
    im=Image.fromarray(a).resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
    offset=tuple(round(anchor[j]+(box[j]-pivot[j])*scale) for j in range(2));canvas=Image.new('RGBA',(400,400))
    assert min(offset)>=0 and offset[0]+im.width<=400 and offset[1]+im.height<=400,(key,offset,im.size)
    canvas.alpha_composite(im,offset);pixels[key]=canvas
    frames[key]=dict(key=key,atlasKey='ironfang',width=400,height=400,anchor=dict(x=anchor[0],y=anchor[1]),
        source=path.relative_to(ROOT).as_posix(),sourceRect=list(box),sourcePivot=list(pivot),scale=scale,
        sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),normalization='Inspected soft-alpha effect crop with edge fade and fixed emitter')

def preview(pixels,keys,name):
    PROOF.mkdir(exist_ok=True,parents=True)
    page=Image.new('RGBA',(1280,267*((len(keys)+3)//4)),(14,29,32,255))
    for i,key in enumerate(keys):page.alpha_composite(pixels[key].resize((320,267),Image.Resampling.LANCZOS),(i%4*320,i//4*267))
    page.convert('RGB').save(PROOF/(name+'-contact.jpg'),quality=93)
    images=[]
    for key in keys[:4]:
        im=Image.new('RGBA',(768,640),(14,29,32,255));im.alpha_composite(pixels[key]);images.append(im.convert('RGB'))
    images[0].save(PROOF/(name+'-motion.gif'),save_all=True,append_images=images[1:],duration=110,loop=0)

def heroes(frames,pixels,animations):
    path,parts=extract('hero-rifle-final.png',12)
    pivots=[(180,410),(501,410),(797,410),(1101,410),(180,835),(501,835),(797,835),(1101,835),
            (170,1177),(486,1177),(795,1177),(1105,1177)]
    guns=[(340,227),(645,367),(819,470),(1246,161),(350,618),(653,752),(821,857),(1246,545),
          (331,1022),(638,1046),(957,1020),(1245,1045)]
    hands=[(208,239),(536,275),(813,341),(1140,213),(219,636),(537,669),(814,734),(1142,594),
           (204,1039),(518,1056),(829,1033),(1137,1056)]
    keys=[]
    for i,(part,pivot,gun,hand) in enumerate(zip(parts,pivots,guns,hands)):
        family=('courier' if i<4 else 'plate')+'gunair' if i<8 else ('courier' if i<10 else 'plate')+'guncrouch'
        index=i%4 if i<8 else i%2;key=f'cr-{family}-{index}';keys.append(key)
        register(frames,pixels,key,path,part,pivot,(125,330),{'gun':gun,'hand':hand},180/330,'character-revision')
    for family in ['courier','plate']:
        animations[family+'gunair']=[f'cr-{family}gunair-{i}' for i in range(4)]
        animations[family+'guncrouch']=[f'cr-{family}guncrouch-{i}' for i in range(2)]
    preview(pixels,keys,'hero-fire')

def villains(frames,pixels):
    # Source-space centers inspected from the illustrated sheets. These target anatomy,
    # not the traveling axe, claws, capes, wing membranes or attack-effect pixels.
    families={
      'stalker':dict(head=[(234,63),(553,58),(866,66),(1195,59),(216,268),(558,243),(890,300),(1201,269),(181,465),(404,447)],
        torso=[(181,118),(506,117),(819,119),(1147,117),(159,325),(497,308),(816,350),(1149,325),(133,518),(460,494)],headSize=(48,70),torsoSize=(95,95),legs=(150,68)),
      'caster':dict(head=[(177,658),(506,655),(824,661),(1160,659),(174,870),(491,866),(842,869),(1159,866),(163,1067),(450,1050)],
        torso=[(161,735),(492,732),(808,735),(1144,735),(152,947),(483,949),(843,944),(1139,943),(150,1140),(478,1127)],headSize=(52,84),torsoSize=(86,126),legs=(65,40)),
      'guardian':dict(head=[(185,81),(549,81),(892,81),(1248,72),(177,369),(512,365),(938,334),(1278,337),(177,664),(529,701),(846,652),(1184,664),(175,882),(494,918)],
        torso=[(165,155),(521,155),(872,152),(1234,150),(160,436),(482,434),(900,423),(1258,424),(151,729),(478,758),(844,746),(1188,747),(145,978),(474,995)],headSize=(68,94),torsoSize=(140,140),legs=(170,78)),
      'wispknight':dict(head=[(198,116),(465,117),(710,118),(967,117),(203,389),(473,349),(724,366),(969,410),(180,604),(377,570)],
        torso=[(147,171),(412,173),(660,172),(920,172),(150,432),(409,410),(661,421),(918,456),(137,671),(370,656)],headSize=(48,78),torsoSize=(90,94),legs=(145,65)),
      'bellbeast':dict(head=[(219,867),(477,870),(730,872),(981,873),(186,1097),(458,1143),(738,1198),(966,1105),(212,1367),(399,1325)],
        torso=[(119,928),(376,929),(631,930),(882,930),(132,1190),(376,1225),(641,1244),(899,1200),(122,1440),(362,1416)],headSize=(72,95),torsoSize=(150,150),legs=(190,68)),
      'dragon':dict(head=[(250,616),(537,612),(821,585),(1077,630),(235,829),(520,808),(804,837),(990,787)],
        torso=[(170,657),(457,656),(741,628),(1019,668),(149,874),(435,870),(718,879),(1010,858)],headSize=(78,77),torsoSize=(110,90),legs=(105,42),
        tail=[(29,632,105,40),(316,632,105,40),(618,596,83,35),(897,641,90,35),(24,885,87,37),(309,880,78,35),(591,882,92,40),(877,862,96,40)])
    }
    from PIL import ImageDraw
    PROOF.mkdir(exist_ok=True,parents=True)
    for family,spec in families.items():
        keys=[k for k in frames if k.startswith('cr-'+family+'-')]
        overlay=Image.new('RGBA',(1024,214*((len(keys)+3)//4)),(14,29,32,255))
        for i,key in enumerate(keys):
            f=frames[key];pivot=f['sourcePivot'];scale=f['scale'];anchor=f['anchor'];boxes=[]
            if i<len(spec['head']):
                for part in ['head','torso']:
                    cx,cy=spec[part][i];w,h=spec[part+'Size'];boxes.append((cx-w/2,cy-h/2,w,h))
                w,h=spec['legs'];boxes.append((pivot[0]-w/2,pivot[1]-h,w,h))
                if 'tail' in spec:boxes.append(spec['tail'][i])
                f['hurtboxes']=[dict(x=round(anchor['x']+(x-pivot[0])*scale,3),y=round(anchor['y']+(y-pivot[1])*scale,3),w=round(w*scale,3),h=round(h*scale,3)) for x,y,w,h in boxes]
            else:f['hurtboxes']=[dict(f['body'])]
            # A lifted foot can leave its nominal lower-body region entirely. Tighten
            # inspected anatomical regions to solid alpha rather than adding empty damage space.
            alpha=np.array(pixels[key].getchannel('A'));tight=[]
            for b in f['hurtboxes']:
                left,top=int(b['x']),int(b['y']);right,bottom=int(np.ceil(b['x']+b['w'])),int(np.ceil(b['y']+b['h']))
                yy,xx=np.where(alpha[top:bottom,left:right]>=48)
                if len(xx):tight.append(dict(x=left+int(xx.min()),y=top+int(yy.min()),w=int(xx.max()-xx.min()+1),h=int(yy.max()-yy.min()+1)))
            f['hurtboxes']=tight or [dict(f['body'])]
            assert all(b['w']>0 and b['h']>0 and b['x']>=0 and b['y']>=0 and b['x']+b['w']<=f['width'] and b['y']+b['h']<=f['height'] for b in f['hurtboxes']),key
            im=pixels[key].copy();draw=ImageDraw.Draw(im)
            for b in f['hurtboxes']:draw.rectangle((b['x'],b['y'],b['x']+b['w'],b['y']+b['h']),outline=(250,196,64,220),width=2)
            overlay.alpha_composite(im.resize((256,208),Image.Resampling.LANCZOS),(i%4*256,i//4*214))
        overlay.convert('RGB').save(PROOF/(family+'-hurtboxes.jpg'),quality=94)

def environment():
    path,parts=extract('environment-raw.png',4,2);out=ROOT/'public/lantern'
    manifest=json.loads((out/'environment.json').read_text())
    manifest.update(source=path.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    for name,(box,im) in zip(['platform','arch','lantern','root'],parts):
        im.save(out/(name+'.png'))
        manifest['props'][name]=dict(width=im.width,height=im.height,sourceRect=list(box),worldSize={'platform':[225,97],'arch':[255.2,301.6],'lantern':[63,142.1],'root':[324.8,291.45]}[name])
    (out/'environment.json').write_text(json.dumps(manifest,indent=2)+'\n')

def panoramas():
    out=ROOT/'public/journey';out.mkdir(exist_ok=True,parents=True);manifest={}
    for source,names in [('intro-raw.png',['intro-0','intro-1','intro-2']),('realms-raw.png',['wind','tide','ember'])]:
        path=SRC/source
        if not path.exists():continue
        im=Image.open(path).convert('RGB');w,h=im.size
        for i,name in enumerate(names):
            box=(0,round(h*i/3),w,round(h*(i+1)/3));im.crop(box).save(out/(name+'.png'))
            manifest[name]=dict(source=path.relative_to(ROOT).as_posix(),sourceRect=list(box),sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest())
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

def masonry():
    path=SRC/'stone-raw.png';out=ROOT/'public/lantern-fx'
    a=np.array(Image.open(path).convert('RGB'),dtype=float);edge=24
    # Match opposite edge samples, preserving the interior source texture.
    for axis in [0,1]:
        for i in range(edge):
            weight=(1-i/edge)*.5
            if axis==0:
                first,last=a[i].copy(),a[-1-i].copy();a[i]=first*(1-weight)+last*weight;a[-1-i]=last*(1-weight)+first*weight
            else:
                first,last=a[:,i].copy(),a[:,-1-i].copy();a[:,i]=first*(1-weight)+last*weight;a[:,-1-i]=last*(1-weight)+first*weight
    texture=Image.fromarray(np.rint(a).astype('uint8'));texture.save(out/'stone.png')
    manifest=json.loads((out/'manifest.json').read_text());manifest['stone']=dict(source=path.relative_to(ROOT).as_posix(),sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),size=list(texture.size),worldTileSize=[303,306],edgeBlendPixels=edge)
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    assert np.array_equal(a[0],a[-1]) and np.array_equal(a[:,0],a[:,-1])
    tile=texture.resize((320,320),Image.Resampling.LANCZOS);preview=Image.new('RGB',(960,960))
    for y in range(3):
        for x in range(3):preview.paste(tile,(x*320,y*320))
    PROOF.mkdir(exist_ok=True,parents=True);preview.save(PROOF/'stone-tiled.jpg',quality=94)

if __name__=='__main__':
    environment();panoramas();masonry()
