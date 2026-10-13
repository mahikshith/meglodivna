"""Deterministic CC0 Gothicvania selection; no demo code or music is shipped."""
from pathlib import Path
from PIL import Image, ImageSequence, ImageDraw
import hashlib, json

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'reference/runeheart-sources'
COLLECTION = SOURCES / 'collection/ gothicvania patreon collection'
TOWN = SOURCES / 'town/GothicVania-town-files'
BRIDGE = SOURCES / 'bridge/Bridge expansion Files'
OUT = ROOT / 'public/runeheart'
PREVIEW = ROOT / 'artifacts/runeheart'
OUT.mkdir(parents=True, exist_ok=True)
PREVIEW.mkdir(parents=True, exist_ok=True)
frames, pixels, animations = {}, {}, {}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def add(key, image, source, source_rect=None, anchor=None, body=None, **extra):
    image = image.convert('RGBA')
    pixels[key] = image
    frames[key] = dict(key=key, width=image.width, height=image.height,
                       anchor=anchor or dict(x=image.width/2, y=image.height),
                       source=str(source.relative_to(SOURCES)).replace('\\', '/'),
                       sourceSha256=sha(source), sourceRect=source_rect or [0,0,image.width,image.height],
                       **extra)
    if body:
        frames[key]['body'] = body
    return key

def hero_gif(name, filename, pivot):
    path = next(COLLECTION.rglob(filename))
    gif = Image.open(path)
    keys = []
    for i, frame in enumerate(ImageSequence.Iterator(gif)):
        image = frame.convert('RGBA'); bbox = image.getbbox()
        canvas = Image.new('RGBA', (128,112))
        canvas.alpha_composite(image, (64-pivot,96-bbox[3]))
        keys.append(add(f'rh-hero-{name}-{i}',canvas,path,
            anchor=dict(x=64,y=96),body=dict(x=57,y=66,w=14,h=30),
            hand=dict(x=72,y=75.5),muzzle=dict(x=78.5,y=75.5),
            sourceFrame=i,durationMs=frame.info.get('duration',100),
            normalization='Original indexed GIF; translation only; feet stabilized; no recoloring'))
    animations[f'hero-{name}'] = keys
    return keys

idle=hero_gif('idle','gothic-hero-idle.gif',24)
run=hero_gif('run','gothic-hero-run.gif',38)
jump=hero_gif('jump','gothic-hero-jump.gif',33)
slash=hero_gif('slash','gothic-hero-attack.gif',50)
air=hero_gif('slash-air','gothic-hero-jump-attack.gif',39)
low=hero_gif('slash-low','gothic-hero-crouch-slash.gif',34)
hurt=hero_gif('hurt','gothic-hero-hurt.gif',34)
crouch=hero_gif('crouch','gothic-hero-crouch.gif',34)
climb=hero_gif('climb','gothic-hero-jump-climb.gif',39)
for action, keys in dict(idle=idle,run=run,jump=jump,fall=jump,doublejump=air,dash=low,
                        slash=slash,jet=jump,fire=idle,hurt=hurt,death=hurt[-1:]).items():
    animations[f'aether-{action}'] = keys
animations['aether-air-slash']=air
animations['aether-crouch-slash']=low

def strip(name,path,count,canvas_size,anchor,body,pivot=None,flip=False, **sockets):
    path=COLLECTION/path; sheet=Image.open(path).convert('RGBA')
    assert sheet.width%count == 0,(name,sheet.size,count)
    width=sheet.width//count; keys=[]
    for i in range(count):
        rect=[i*width,0,width,sheet.height]
        image=sheet.crop((i*width,0,(i+1)*width,sheet.height))
        if flip:image=image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        canvas=Image.new('RGBA',canvas_size)
        px,py=pivot or (width/2,sheet.height)
        canvas.alpha_composite(image,(round(anchor['x']-px),round(anchor['y']-py)))
        keys.append(add(f'rh-{name}-{i}',canvas,path,rect,anchor,body,
                        sourceFrame=i,flippedToFaceRight=flip,**sockets))
    animations[name]=keys
    return keys

hound=dict(canvas_size=(96,64),anchor=dict(x=48,y=56),body=dict(x=33,y=36,w=30,h=20),flip=True,
           mouth=dict(x=63,y=39),attachmentNote='Natural muzzle approximates frozen mouth socket; render attack magic at simulation origin')
hi=strip('hound-idle','Hell-Hound-Files/PNG/hell-hound-idle.png',6,**hound)
hr=strip('hound-run','Hell-Hound-Files/PNG/hell-hound-run.png',5,**hound)
hw=strip('hound-walk','Hell-Hound-Files/PNG/hell-hound-walk.png',12,**hound)
hj=strip('hound-jump','Hell-Hound-Files/PNG/hell-hound-jump.png',6,**hound)
ghost=dict(canvas_size=(80,96),anchor=dict(x=40,y=80),body=dict(x=31.5,y=57.5,w=17,h=22.5),
           hand=dict(x=55,y=68.5),attachmentNote='Conjured bolt socket; no physical gun painted into source')
gi=strip('ghost-idle','Ghost-Files/PNG/ghost-idle.png',7,pivot=(32,61),**ghost)
ga=strip('ghost-shriek','Ghost-Files/PNG/ghost-shriek.png',4,pivot=(32,61),**ghost)
gd=strip('ghost-vanish','Ghost-Files/PNG/ghost-vanish.png',7,pivot=(32,48),**ghost)
beast=dict(canvas_size=(128,128),anchor=dict(x=64,y=112),body=dict(x=52,y=76.5,w=24,h=35.5),flip=True,
           muzzle=dict(x=92,y=88),attachmentNote='Infernal casting hand; authoritative bolt/launcher remains an overlay')
bi=strip('beast-idle','Hell-Beast-Files/PNG/without-stroke/hell-beast-idle.png',6,**beast)
ba=strip('beast-breath','Hell-Beast-Files/PNG/without-stroke/hell-beast-breath.png',4,**beast)
bd=strip('beast-burn','Hell-Beast-Files/PNG/without-stroke/hell-beast-burn.png',6,**beast)
demon=dict(canvas_size=(256,208),anchor=dict(x=128,y=184),body=dict(x=100,y=141,w=56,h=43),
           mouth=dict(x=178,y=148),launcher=dict(x=142,y=134),
           attachmentNote='Skull-faced demon breath socket; frozen Wyrm attack uses visible magical emitter overlay at mouth metadata')
di=strip('demon-idle','demon-Files/PNG/demon-idle.png',6,pivot=(80,127),flip=True,**demon)
da=strip('demon-attack','demon-Files/PNG/demon-attack-no-breath.png',8,pivot=(88,159),flip=True,**demon)
wr=strip('wolf-run','wolf-runing-cycle/sprites/wolf-runing-cycle.png',4,
         (80,48),dict(x=40,y=40),dict(x=25,y=24,w=30,h=16),flip=True)
for family, actions in {
    'crawler':dict(idle=hi,walk=hw,attack=hj,hurt=hi,death=hi[-1:]),
    'raider':dict(idle=gi,fly=gi,fire=ga,hurt=ga,death=gd),
    'mecha':dict(idle=bi,walk=bi,attack=ba,fire=ba,hurt=bi,death=bd),
    'wyrm':dict(idle=di,fly=di,fire=da,hurt=di,death=di[-1:]),
    'wolf':dict(idle=wr,run=wr,attack=wr),
}.items():
    for action,keys in actions.items():animations[f'{family}-{action}']=keys

# Four actual town inhabitants, kept at their authored native pixel resolution.
for role,folder,cell,count in [('villager','woman',37,7),('mage','bearded',40,5),('scientist','hat-man',39,4),('healer','oldman',34,8)]:
    candidates=list((TOWN/'PNG').rglob(f'{folder}-idle.png'))
    if not candidates:candidates=list((TOWN/'PNG').rglob(f'*{folder}*idle*.png'))
    path=candidates[0]; sheet=Image.open(path).convert('RGBA'); cell=sheet.width//count
    keys=[]
    for i in range(count):
        image=sheet.crop((cell*i,0,cell*(i+1),sheet.height)); bbox=image.getbbox()
        canvas=Image.new('RGBA',(80,80));canvas.alpha_composite(image,(40-cell//2,72-bbox[3]))
        keys.append(add(f'rh-npc-{role}-{i}',canvas,path,[cell*i,0,cell,sheet.height],dict(x=40,y=72),dict(x=32,y=40,w=16,h=32),sourceFrame=i))
    animations[f'npc-{role}-idle']=keys
    frames[f'ref-npc-{role}']=dict(frames[keys[0]],key=f'ref-npc-{role}');pixels[f'ref-npc-{role}']=pixels[keys[0]]

def png(key,path,rect=None,scale=1):
    image=Image.open(path).convert('RGBA')
    if rect:image=image.crop((rect[0],rect[1],rect[0]+rect[2],rect[1]+rect[3]))
    if scale!=1:image=image.resize((image.width*scale,image.height*scale),Image.Resampling.NEAREST)
    return add(key,image,path,rect)

props=TOWN/'PNG/environment/props-sliced'; tiles=TOWN/'PNG/environment/layers/sliced-tileset'
for name in ['barrel','crate','crate-stack','house-a','house-b','house-c','street-lamp','wagon','well','sign']:
    png(f'ref-prop-{name}',props/f'{name}.png')
for name in ['castle','house','tree']:png(f'ref-prop-{name}',BRIDGE/'Props'/f'{name}.png')
png('ref-prop-chest',props/'crate.png')
png('ref-prop-pillar',BRIDGE/'Props/castle.png',[256,0,32,280])
for name,rect in [('statue',[48,182,64,114]),('arch',[368,176,48,128]),('torch',[272,176,16,128])]:
    path=COLLECTION/'Gothic-Castle-Files/PNG/layers/gothic-castle-background.png'
    image=Image.open(path).convert('RGBA').crop((rect[0],rect[1],rect[0]+rect[2],rect[1]+rect[3]))
    image.putdata([(r,g,b,0 if (r,g,b)==(7,7,7) else a) for r,g,b,a in image.get_flattened_data()])
    add(f'ref-prop-{name}',image,path,rect,normalization='Authored modular prop; empty RGB7 backing removed')
for material,file in [('stone','wall'),('steel','ground-wall'),('wood','top-wood'),('glass','window-bars'),('circuit','wall-b')]:
    path=tiles/f'{file}.png';im=Image.open(path)
    png(f'ref-tile-{material}',path,[0,0,min(16,im.width),min(16,im.height)],2)
png('ref-tile-grass',tiles/'ground.png',[0,0,16,16],2)
png('ref-prop-platform',tiles/'top-wood.png',[0,0,16,8],2)
png('ref-tile-stone',COLLECTION/'Gothic-Castle-Files/PNG/layers/gothic-castle-tileset.png',[32,32,32,32],2)

# Backdrops remain large independent textures, never tiny tree tile fields.
backgrounds={}
for name,path in {
    'citadel':COLLECTION/'Gothic-Castle-Files/PNG/layers/gothic-castle-background.png',
    'crypt':COLLECTION/'Old-dark-Castle-tileset-Files/PNG/old-dark-castle-interior-background.png',
    'town':TOWN/'PNG/environment/layers/background.png',
    'town-mid':TOWN/'PNG/environment/layers/middleground.png',
    'moon-clouds':COLLECTION/'Gothic-Horror-Files/PNG/layers/clouds.png',
    'moon-town':COLLECTION/'Gothic-Horror-Files/PNG/layers/town.png',
}.items():
    image=Image.open(path).convert('RGBA');image.save(OUT/f'background-{name}.png',optimize=True)
    backgrounds[name]=dict(key=f'rh-bg-{name}',file=f'background-{name}.png',width=image.width,height=image.height,
        source=str(path.relative_to(SOURCES)).replace('\\','/'),sourceSha256=sha(path))

# The Gothic Castle "background" source is a modular panel sheet. Assemble its
# actual panels on one opaque masonry painting; never display the source gutters.
path=COLLECTION/'Gothic-Castle-Files/PNG/layers/gothic-castle-background.png'
source=Image.open(path).convert('RGBA')
hall=Image.new('RGBA',(960,432),'#0b151d');draw=ImageDraw.Draw(hall)
for y0 in range(0,432,24):
    for x0 in range(-24 if (y0//24)%2 else 0,960,48):
        draw.rectangle((x0,y0,x0+46,y0+22),fill='#101e22',outline='#0b171d')
        draw.line((x0+3,y0+2,x0+43,y0+2),fill='#16292a')
for rect,pos in [((192,0,272,160),(32,84)),((16,0,176,160),(256,84)),((384,0,464,160),(624,84)),((288,0,368,160),(800,84))]:
    panel=source.crop(rect)
    # Source author intentionally used RGB7 black for empty panel backing.
    data=list(panel.get_flattened_data());panel.putdata([(r,g,b,0 if (r,g,b)==(7,7,7) else a) for r,g,b,a in data])
    hall.alpha_composite(panel.resize((panel.width*2,panel.height*2),Image.Resampling.NEAREST),pos)
for x0 in [0,216,584,784,944]:
    draw.rectangle((x0,0,x0+15,431),fill='#15292c');draw.line((x0+2,0,x0+2,431),fill='#233b38',width=2)
    for y0 in range(32,432,64):draw.rectangle((x0-3,y0,x0+18,y0+8),fill='#1a3031')
draw.rectangle((0,0,959,34),fill='#111d23');draw.line((0,35,959,35),fill='#243431',width=3)
draw.rectangle((0,414,959,431),fill='#081118');draw.line((0,414,959,414),fill='#263731',width=2)
hall.save(OUT/'background-citadel.png',optimize=True)
backgrounds['citadel'].update(width=960,height=432,composition='Four individually cropped modular panels; RGB7 empty backing removed; original opaque masonry/columns; no source gutters',sourceRects=[[192,0,80,160],[16,0,160,160],[384,0,80,160],[288,0,80,160]])

# Large forest silhouettes use the licensed full-size tree three times, never a
# miniature tree tilefield. The sky, distant trunks and moon are original pixels.
path=BRIDGE/'Props/tree.png';tree=Image.open(path).convert('RGBA')
forest=Image.new('RGBA',(768,432),'#111d2a');draw=ImageDraw.Draw(forest)
for y0,color in [(120,'#152532'),(240,'#1a3037'),(330,'#172b32')]:draw.rectangle((0,y0,767,431),fill=color)
draw.ellipse((480,44,546,110),fill='#a3b7b2');draw.ellipse((486,48,548,112),fill='#9aafad')
for x0,y0,width in [(40,190,18),(180,130,14),(300,210,24),(560,160,19),(700,230,26)]:
    draw.rectangle((x0,y0,x0+width,432),fill='#101f29')
    draw.line((x0+width//2,y0+80,x0-35,y0+35),fill='#101f29',width=8)
for x0,y0,mirror in [(-160,-10,False),(200,5,True),(572,-30,False)]:
    item=tree.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if mirror else tree
    item=item.resize((416,512),Image.Resampling.NEAREST)
    # Palette shade preserves hard pixel silhouettes and authored leaf clusters.
    item.putdata([(int(r*.52),int(g*.65),int(b*.72),a) for r,g,b,a in item.get_flattened_data()])
    forest.alpha_composite(item,(x0,y0))
forest.save(OUT/'background-forest.png',optimize=True)
backgrounds['forest']=dict(key='rh-bg-forest',file='background-forest.png',width=768,height=432,
    source=str(path.relative_to(SOURCES)).replace('\\','/'),sourceSha256=sha(path),composition='Licensed large tree props at2x, mirrored/shaded; original pixel sky/moon/distant trunks')

path=COLLECTION/'night-town-background-files/layers/night-town-background-town.png'
city=Image.new('RGBA',(512,336),'#141d31');draw=ImageDraw.Draw(city)
for y0 in range(336):
    step=y0//21;r=20+step//2;g=29+step//2;b=49+step
    draw.line((0,y0,511,y0),fill=(r,g,b,255))
for x0,y0 in [(30,34),(88,75),(142,20),(249,52),(328,29),(420,94),(467,54)]:draw.rectangle((x0,y0,x0+1,y0+1),fill='#a1b7cc')
draw.ellipse((370,38,409,77),fill='#c1c9c7')
buildings=Image.open(path).convert('RGBA')
for left,right in [(14,76),(101,166),(191,458)]:
    part=buildings.crop((left,0,right,99));bbox=part.getbbox();part=part.crop(bbox)
    # Align the bottom of each real building cluster to one common horizon.
    city.alpha_composite(part,(left+bbox[0],336-part.height))
draw.rectangle((0,331,511,335),fill='#0c1920')
city.save(OUT/'background-night-city.png',optimize=True)
backgrounds['night-city']=dict(key='rh-bg-night-city',file='background-night-city.png',width=512,height=336,
    source=str(path.relative_to(SOURCES)).replace('\\','/'),sourceSha256=sha(path),composition='Three actual building clusters assembled at one horizon; original opaque pixel dusk sky and moon',sourceRects=[[14,0,62,99],[101,0,65,99],[191,0,267,99]])

# Stable shelf packing with two transparent pixels between cells, no filtering/extrusion.
atlas=Image.new('RGBA',(2048,2048));packed={};hashes={};x=y=2;row=0
for key,image in pixels.items():
    digest=hashlib.sha256(image.tobytes()).hexdigest()+f':{image.size}'
    if digest in hashes:rect=hashes[digest]
    else:
        if x+image.width+2>2048:x=2;y+=row+4;row=0
        assert y+image.height+2<=2048,'Atlas budget exceeded'
        rect=dict(x=x,y=y,w=image.width,h=image.height);atlas.alpha_composite(image,(x,y));hashes[digest]=rect
        x+=image.width+4;row=max(row,image.height)
    packed[key]=dict(frame=rect,rotated=False,trimmed=False,spriteSourceSize=dict(x=0,y=0,w=image.width,h=image.height),sourceSize=dict(w=image.width,h=image.height))
atlas.save(OUT/'atlas.png',optimize=True)
(OUT/'atlas.json').write_text(json.dumps(dict(frames=packed,meta=dict(image='atlas.png',size=dict(w=2048,h=2048),scale='1')),separators=(',',':'))+'\n',encoding='utf-8')
receipt=[]
for file,url,page in [('gothicvania-collection.zip','https://opengameart.org/sites/default/files/%20gothicvania%20patreon%20collection.zip','https://opengameart.org/content/gothicvania-patreons-collection'),('town.zip','https://opengameart.org/sites/default/files/gothicvania-town-files.zip','https://opengameart.org/content/gothicvania-town'),('bridge.zip','https://opengameart.org/sites/default/files/bridge_expansion_pack_1_files.zip','https://opengameart.org/content/gothicvania-bridge-expansion-pack-1')]:
    path=SOURCES/file;receipt.append(dict(file=file,bytes=path.stat().st_size,sha256=sha(path),downloadUrl=url,licensePage=page,license='CC0-1.0',author='Luis Zuno (Ansimuz)',included='Graphics only; music and demonstration code excluded'))
manifest=dict(version='0.5-runeheart',frames=frames,animations=animations,backgrounds=backgrounds,sources=receipt,
    notes=['Author animation frames, not flattened concept crops.','All pixel art nearest-neighbor at integer native scale where practical.','Dash uses real low-slash poses; jet and firearm use licensed poses plus runtime effects.','Hero/Wyrm deaths use held final poses plus renderer fade; they are not authored death sequences.','Enemy families are visual adapters for unchanged simulation roles; spell/weapon overlays mark authoritative emission points.'])
(OUT/'manifest.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n',encoding='utf-8')
license_text='Runeheart selected graphics by Luis Zuno / Ansimuz.\nCC0 1.0 Universal: https://creativecommons.org/publicdomain/zero/1.0/\nCanonical source pages and SHA-256 receipts are in manifest.json.\nNo source music or demo game code is included.\nThank you to the author: https://ansimuz.itch.io/\n\n'
for label,path in [('Collection',COLLECTION/'public-license.txt'),('Town',TOWN/'public-license.txt'),('Bridge',BRIDGE/'public-license.txt')]:
    text=path.read_text(encoding='utf-8');text=text.split('Music by')[0]
    license_text+=label+' author-included graphics license:\n'+text.strip()+'\n\n'
(OUT/'LICENSE.txt').write_text(license_text.replace('\r\n','\n'),encoding='utf-8')

def contact(name,keys,cell=(260,160),columns=4):
    width=cell[0]*columns;height=cell[1]*((len(keys)+columns-1)//columns)
    sheet=Image.new('RGB',(width,height),'#1d2737');draw=ImageDraw.Draw(sheet)
    for i,key in enumerate(keys):
        image=pixels[key];sx,sy=(i%columns)*cell[0],(i//columns)*cell[1]
        scale=min(2,(cell[0]-16)//image.width,(cell[1]-30)//image.height)
        scale=max(1,scale);image=image.resize((image.width*scale,image.height*scale),Image.Resampling.NEAREST)
        sheet.paste(image,(sx+(cell[0]-image.width)//2,sy+23),image);draw.text((sx+6,sy+5),key,fill='#c9d6e5')
    sheet.save(PREVIEW/f'{name}.png')
contact('hero-contact',[v[0] for k,v in animations.items() if k.startswith('hero-')],(280,250),3)
contact('hero-motion-contact',[key for k,v in animations.items() if k.startswith('hero-') for key in v],(280,250),5)
contact('creature-contact',[hi[0],hr[0],hj[2],gi[0],ga[2],bi[0],ba[2],di[0],da[4],wr[0]],(360,250),3)
contact('environment-contact',[k for k in pixels if k.startswith('ref-prop-')],(480,320),3)
hero_frames=[]
for key in run+slash+jump:
    im=Image.new('RGBA',(256,224),'#203248');im.alpha_composite(pixels[key].resize((256,224),Image.Resampling.NEAREST));hero_frames.append(im.convert('RGB'))
hero_frames[0].save(PREVIEW/'hero-authored-animation.gif',save_all=True,append_images=hero_frames[1:],duration=90,loop=0)
checks=dict(nonemptyFrames=all(image.getbbox() for image in pixels.values()),
    allFramesBinaryAlpha=all(set(image.getchannel('A').get_flattened_data())<={0,255} for image in pixels.values()),
    sourceFilesExist=all((SOURCES/frame['source']).is_file() for frame in frames.values()),
    atlasBounds=all(rect['frame']['x']+rect['frame']['w']<=2048 and rect['frame']['y']+rect['frame']['h']<=2048 for rect in packed.values()),
    heroClearOuterEdge=all(image.getbbox()[0]>=2 and image.getbbox()[1]>=2 and image.getbbox()[2]<=image.width-2 and image.getbbox()[3]<=image.height-2 for key,image in pixels.items() if key.startswith('rh-hero-')),
    composedBackgroundsOpaque=all(Image.open(OUT/f'background-{name}.png').getchannel('A').getextrema()==(255,255) for name in ['citadel','forest','night-city']),
    heroSocketsFrozen=all(frame['hand']==dict(x=72,y=75.5) and frame['muzzle']==dict(x=78.5,y=75.5) for key,frame in frames.items() if key.startswith('rh-hero-')))
assert all(checks.values()),checks
budget=dict(atlasSize=[2048,2048],atlasRGBABytes=2048*2048*4,backgroundRGBABytes=sum(v['width']*v['height']*4 for v in backgrounds.values()),frameKeys=len(frames),uniqueFrames=len(hashes),animationGroups=len(animations),compiledBytes=sum(p.stat().st_size for p in OUT.iterdir() if p.is_file()),binaryAlpha=sorted(set(atlas.getchannel('A').get_flattened_data()))==[0,255],checks=checks,packet={p.name:dict(bytes=p.stat().st_size,sha256=sha(p)) for p in OUT.iterdir() if p.is_file()},sources=receipt)
(PREVIEW/'asset-budget.json').write_text(json.dumps(budget,indent=2)+'\n',encoding='utf-8')
print(json.dumps(budget,indent=2))
