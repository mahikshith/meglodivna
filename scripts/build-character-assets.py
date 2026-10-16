"""Extract and register the full chapter character revision. Sources are immutable.

One eroded ownership mask separates accidental one-pixel bridges; source pixels
are restored by nearest-core ownership, never eroded in the output sprites.
"""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import label, binary_erosion, distance_transform_edt, find_objects
from atlas_pack import pack

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'reference/character-revision';OUT=ROOT/'public/character-revision';PROOF=ROOT/'artifacts/character-revision'
frames={};pixels={};animations={}

def extract(name,count):
    path=SRC/name;a=np.array(Image.open(path).convert('RGBA'));mask=a[:,:,3]>=32
    for erosion in range(9):
        labs,_=label(binary_erosion(mask,iterations=erosion) if erosion else mask,np.ones((3,3)))
        sizes=np.bincount(labs.ravel());ids=np.where(sizes>3000)[0];ids=ids[ids!=0]
        if len(ids)==count:break
    assert len(ids)==count,(name,len(ids),count)
    core=np.where(np.isin(labs,ids),labs,0)
    _,nearest=distance_transform_edt(core==0,return_indices=True);owners=core[tuple(nearest)]
    parts=[]
    for id in ids:
        m=(owners==id)&mask;yy,xx=np.where(m);box=(int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1))
        crop=a[box[1]:box[3],box[0]:box[2]].copy();crop[:,:,3]=np.where(m[box[1]:box[3],box[0]:box[2]],crop[:,:,3],0)
        parts.append((box,Image.fromarray(crop)))
    parts.sort(key=lambda p:p[0][3]);parts=[p for i in range(0,count,4) for p in sorted(parts[i:i+4],key=lambda p:p[0][0])]
    return path,parts,erosion

def inspect():
    data={}
    for name,count in [('courier',24),('plate',24),('stalker-caster',24),('guardian',16),('beast-knight',24),('companions',24),('npcs',16)]:
        path,parts,erosion=extract(name+'-raw.png',count)
        data[name]={'size':Image.open(path).size,'erosionOwnership':erosion,'boxes':[p[0] for p in parts]}
    (PROOF/'extraction.json').write_text(json.dumps(data,indent=2));print(json.dumps(data))

def family(source,count,name,start,length,body_h,body_w,pivots,sockets=None):
    path,parts,erosion=extract(source+'-raw.png',count)
    scale=60/body_h if name in ['courier','plate','couriergun','plategun','couriergunrun','plategunrun','mira','orren'] else {'stalker':.32,'caster':.32,'guardian':.32,'wispknight':.30,'bellbeast':.48,'wolf':.34,'dragon':.36,'raven':.30}[name]
    scale *= 3
    for i in range(length):
        box,im=parts[start+i];pivot=pivots[i];key=f'cr-{name}-{i}';anchor=(384,492);size=(768,624)
        im=im.resize(tuple(round(v*scale) for v in im.size),Image.Resampling.LANCZOS)
        offset=tuple(round(anchor[j]+(box[j]-pivot[j])*scale) for j in range(2))
        assert min(offset)>0 and offset[0]+im.width<size[0] and offset[1]+im.height<size[1],(key,offset,im.size)
        canvas=Image.new('RGBA',size);canvas.alpha_composite(im,offset);pixels[key]=canvas
        point=lambda v:dict(x=round(anchor[0]+(v[0]-pivot[0])*scale,3),y=round(anchor[1]+(v[1]-pivot[1])*scale,3))
        slot=(sockets or {}).get(i,{})
        frames[key]=dict(key=key,atlasKey='character-revision',width=size[0],height=size[1],anchor=dict(x=384,y=492),
            body=dict(x=384-body_w*scale/2,y=492-body_h*scale,w=body_w*scale,h=body_h*scale),sockets={n:point(v) for n,v in slot.items()},
            source=path.relative_to(ROOT).as_posix(),sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),sourceRect=list(box),sourcePivot=pivot,
            scale=scale,ownershipErosion=erosion,normalization='Complete original alpha pixels assigned to connected anatomical cores; shared family scale and inspected anchors')

def alias(name,family,ids):animations[name]=[f'cr-{family}-{i}' for i in ids]

def build():
    OUT.mkdir(exist_ok=True,parents=True);PROOF.mkdir(exist_ok=True,parents=True)
    for name,start,feet,ys in [('couriergunrun',0,496,[(246,224),(254,230),(252,230),(241,222)]),('plategunrun',4,940,[(685,663),(693,671),(692,669),(681,660)])]:
        pivots=[(220,feet),(575,feet),(999,feet),(1379,feet)]
        sockets={i:{'hand':(x,ys[i][0]),'gun':(m,ys[i][1])} for i,(x,m) in enumerate([(272,421),(638,788),(1028,1176),(1425,1530)])}
        family('runfire',8,name,start,4,330,125,pivots,sockets)
        alias(name,name,range(4))
    family('rifles',8,'couriergun',0,4,290,125,[(199,487),(590,487),(1005,487),(1415,487)],
        {0:{'hand':(239,271),'gun':(392,252)},1:{'hand':(634,271),'gun':(810,252)},2:{'hand':(1030,230),'gun':(1191,128)},3:{'hand':(1380,152),'gun':(1386,20)}})
    family('rifles',8,'plategun',4,4,290,125,[(199,965),(590,965),(1005,965),(1415,965)],
        {0:{'hand':(239,748),'gun':(395,726)},1:{'hand':(634,749),'gun':(808,727)},2:{'hand':(1030,709),'gun':(1185,616)},3:{'hand':(1380,635),'gun':(1392,504)}})
    courier=[(145,273),(401,273),(655,273),(900,282),(145,510),(400,510),(655,510),(910,510),(140,785),(343,715),(592,755),(896,792),
             (145,1003),(390,1003),(654,1003),(904,1003),(145,1282),(386,1282),(624,1282),(906,1282),(142,1494),(384,1494),(642,1494),(906,1494)]
    plate=[(150,260),(427,260),(658,260),(899,271),(151,518),(420,518),(663,518),(920,518),(150,784),(380,740),(653,783),(911,782),
           (149,1004),(384,1004),(659,1004),(918,1004),(146,1285),(400,1285),(636,1285),(919,1285),(143,1502),(393,1502),(659,1502),(917,1502)]
    sword={12:((121,829),(33,856)),13:((453,858),(577,855)),14:((689,933),(778,987)),15:((902,941),(996,985)),
           16:((127,1060),(39,1127)),17:((376,1076),(376,990)),18:((649,1213),(721,1287)),19:((879,1108),(953,1031)),
           20:((126,1437),(210,1490)),21:((377,1427),(463,1490)),22:((716,1367),(813,1363)),23:((897,1453),(998,1490))}
    plate_sword={12:((107,813),(12,840)),13:((452,852),(574,850)),14:((682,899),(786,955)),15:((906,944),(1008,982)),
                 16:((141,1040),(30,1071)),17:((388,1062),(394,982)),18:((672,1224),(750,1284)),19:((886,1096),(961,1024)),
                 20:((144,1465),(248,1498)),21:((389,1434),(482,1496)),22:((750,1382),(843,1378)),23:((901,1460),(1008,1497))}
    for name,pivots,blades,height in [('courier',courier,sword,220),('plate',plate,plate_sword,226)]:
        sockets={i:{'hand':v[0],'bladeTip':v[1]} for i,v in blades.items()}
        for i,(x,y) in enumerate(pivots):sockets.setdefault(i,{'hand':(x+10,y-77),'gun':(x+55,y-77)})
        family(name,24,name,0,24,height,100,pivots,sockets)
        prefix='aether' if name=='courier' else 'lanternplate'
        for action,ids in {'idle':[0,1],'run':[4,5,6,7],'jump':[8,9],'doublejump':[8,9],'fall':[10],'jet':[8,9],
                           'slash':[12,13,14,15],'overhead':[16,17,18,19],'dash':[20,21,22,23],'hurt':[2],'death':[3],'fire':[0]}.items():alias(prefix+'-'+action,name,ids)
    alias('hero-slash-air','courier',range(16,20));alias('hero-slash-low','courier',range(12,16))
    stalker=[(171,212),(490,212),(804,212),(1127,212),(160,411),(499,411),(805,411),(1156,411),(140,608),(458,608),(795,608),(1135,608)]
    caster=[(162,817),(470,817),(790,817),(1130,817),(160,1017),(485,1017),(818,1017),(1145,1017),(148,1205),(470,1205),(790,1205),(1137,1205)]
    family('stalker-caster',24,'stalker',0,12,180,80,stalker,{5:{'claw':(660,303)},6:{'claw':(970,397)}})
    family('stalker-caster',24,'caster',12,12,180,75,caster,{0:{'hand':(224,744)},1:{'hand':(553,716)},2:{'hand':(882,748)},3:{'hand':(1200,740)},
        4:{'hand':(223,885)},5:{'hand':(549,837)},6:{'hand':(940,879)},7:{'hand':(1190,939)},8:{'hand':(207,1100)},9:{'hand':(491,1024)}})
    guardian=[(156,276),(514,276),(863,276),(1226,276),(154,563),(480,563),(900,563),(1260,563),
              (161,829),(493,829),(840,829),(1180,829),(145,1089),(478,1089),(847,1089),(1223,1089)]
    family('guardian',16,'guardian',0,16,220,140,guardian,{9:{'contact':(664,827)},8:{'contact':(264,826)}})
    knight=[(155,252),(407,252),(654,252),(915,252),(148,491),(398,491),(657,491),(918,491),(142,739),(397,739),(631,739),(906,739)]
    beast=[(139,1016),(385,1016),(644,1016),(887,1016),(131,1296),(367,1296),(644,1296),(911,1296),(136,1519),(385,1519),(622,1519),(892,1519)]
    family('beast-knight',24,'wispknight',0,12,180,80,knight,{6:{'claw':(795,420)},5:{'claw':(491,368)}})
    family('beast-knight',24,'bellbeast',12,12,210,205,beast,{6:{'contact':(735,1291)}})
    for name in ['stalker','caster','wispknight','bellbeast']:
        for action,ids in {'walk':[0,1,2,3],'idle':[8],'windup':[4],'lift':[4],'downswing':[5],'contact':[6],
                           'attack':[4,5,6,7],'recovery':[7],'hurt':[9],'death':[10,11]}.items():alias(name+'-'+action,name,ids)
    for action,ids in {'walk':[0,1,2,3],'idle':[12],'lift':[4,5,6,7],'windup':[4,5,6,7],'downswing':[8],
                       'contact':[9],'attack':range(4,12),'recovery':[10,11],'hurt':[13],'death':[14,15]}.items():alias('guardian-'+action,'guardian',ids)
    wolf=[(165,220),(423,220),(717,220),(990,220),(169,439),(431,439),(729,439),(1005,439)]
    dragon=[(179,711),(466,711),(751,711),(1030,711),(160,940),(447,940),(735,940),(1007,940)]
    raven=[(137,1150),(439,1150),(722,1150),(1006,1150),(142,1320),(433,1320),(733,1320),(995,1320)]
    family('companions',24,'wolf',0,8,130,200,wolf,{4:{'mouth':(275,382)},5:{'mouth':(554,313)},6:{'mouth':(861,386)}})
    family('companions',24,'dragon',8,8,120,190,dragon,{0:{'mouth':(284,648)},1:{'mouth':(571,636)},2:{'mouth':(858,610)},3:{'mouth':(1109,656)},
        4:{'mouth':(269,853)},5:{'mouth':(556,818)},6:{'mouth':(845,862)},7:{'mouth':(1020,768)}})
    family('companions',24,'raven',16,8,100,140,raven,{4:{'beak':(250,1325)},5:{'beak':(542,1334)},6:{'claw':(817,1298)}})
    for name in ['wolf','dragon','raven']:
        alias(name+'-fly',name,range(4));alias(name+'-run',name,range(4));alias(name+'-idle',name,[0]);alias(name+'-attack',name,range(4,8))
        alias(name+'-hurt',name,[7]);alias(name+'-fire',name,[5]);alias(name+'-contact',name,[5,6]);alias(name+'-recovery',name,[6])
    mira=[(183,342),(480,342),(782,342),(1085,342),(182,669),(480,669),(783,669),(1084,669)]
    orren=[(172,976),(484,976),(791,976),(1098,976),(169,1268),(486,1268),(792,1268),(1102,1268)]
    family('npcs',16,'mira',0,8,320,100,mira);family('npcs',16,'orren',8,8,294,110,orren)
    for name,old in [('mira','villager'),('orren','mage')]:
        alias(f'npc-{name}-idle',name,range(4));alias(f'npc-{old}-idle',name,range(4));alias(f'npc-{name}-talk',name,range(4,8))
    from epic_assets import heroes, villains
    heroes(frames,pixels,animations)
    villains(frames,pixels)
    pages=pack(pixels,OUT)
    (OUT/'manifest.json').write_text(json.dumps(dict(frames=frames,animations=animations)))
    geometry={k:{n:f[n] for n in ['body','sockets','hurtboxes'] if n in f} for k,f in frames.items()}
    (ROOT/'src/character-geometry.js').write_text('// Generated by scripts/build-character-assets.py; measured anatomical sockets.\nexport const CHARACTER_GEOMETRY = '+json.dumps(geometry)+';\nexport const CHARACTER_ANIMATIONS = '+json.dumps(animations)+';\n')
    for name,keys in animations.items():
        if 'npc-villager' in name or 'npc-mage' in name:continue
        imgs=[]
        for key in keys:
            im=Image.new('RGBA',(384,312),(15,29,32,255));im.alpha_composite(pixels[key].resize((384,312),Image.Resampling.LANCZOS));imgs.append(im.convert('RGB'))
        imgs[0].save(PROOF/(name+'.gif'),save_all=True,append_images=imgs[1:],duration=120,loop=0)
    for name in ['courier','plate','stalker','caster','guardian','wispknight','bellbeast','wolf','dragon','raven','mira','orren']:
        keys=[k for k in pixels if k.startswith('cr-'+name+'-')];page=Image.new('RGBA',(1024,208*((len(keys)+3)//4)),(15,29,32,255))
        for i,key in enumerate(keys):page.alpha_composite(pixels[key].resize((256,208),Image.Resampling.LANCZOS),(i%4*256,i//4*208))
        page.convert('RGB').save(PROOF/(name+'-contact.png'))
    print(f'Built {len(frames)} illustrated character frames and {len(animations)} animation bindings in {len(pages)} trimmed 2048px pages.')

if __name__=='__main__':
    inspect();build()
