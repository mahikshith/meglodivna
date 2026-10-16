"""Offline asset integrity; does not claim gameplay or physical-device validation."""
from pathlib import Path
import hashlib,json
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
report={'kind':'offline asset integrity','families':{},'files':{},'checks':[]}
def record(path):
    report['files'][path.relative_to(ROOT).as_posix()]={'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

for family in ['ironfang','character-revision']:
    folder=ROOT/'public'/family;manifest=json.loads((folder/'manifest.json').read_text());atlas=json.loads((folder/'atlas.json').read_text());keys=set()
    record(folder/'manifest.json');record(folder/'atlas.json')
    for page in atlas['textures']:
        path=folder/page['image'];record(path);assert max(Image.open(path).size)<=2048
        for item in page['frames']:
            key=item['filename'];assert key not in keys;keys.add(key);f=manifest['frames'][key]
            assert item['sourceSize']=={'w':f['width'],'h':f['height']}
            assert item['frame']['x']+item['frame']['w']<=page['size']['w'] and item['frame']['y']+item['frame']['h']<=page['size']['h']
            if 'sourceSha256' in f:assert hashlib.sha256((ROOT/f['source']).read_bytes()).hexdigest()==f['sourceSha256']
            for socket in f.get('sockets',{}).values():assert 0<=socket['x']<=f['width'] and 0<=socket['y']<=f['height']
            for box in f.get('hurtboxes',[]):assert box['w']>0 and box['h']>0 and 0<=box['x'] and 0<=box['y'] and box['x']+box['w']<=f['width'] and box['y']+box['h']<=f['height']
    assert keys==set(manifest['frames'])
    for sequence in manifest['animations'].values():assert sequence and set(sequence)<=keys
    report['families'][family]={'frames':len(keys),'animations':len(manifest['animations']),'pages':len(atlas['textures']),
        'hurtboxFrames':sum('hurtboxes' in f for f in manifest['frames'].values()),'epicSourceFrames':sum(f.get('source','').startswith('reference/epic-revision') for f in manifest['frames'].values())}

for name in ['intro-0','intro-1','intro-2','wind','tide','ember']:
    path=ROOT/'public/journey'/f'{name}.png';record(path);assert Image.open(path).size==(1254,418)
for folder,names in [('lantern',['platform','arch','lantern','root']),('lantern-fx',['stone'])]:
    for name in names:record(ROOT/'public'/folder/f'{name}.png')
for path in (ROOT/'reference/epic-revision').glob('*.png'):record(path)
for path in (ROOT/'reference/epic-revision').glob('*prompts.json'):record(path)
record(ROOT/'reference/epic-revision/stone-prompt.json')
for path in [ROOT/'src/character-geometry.js',ROOT/'src/ironfang-geometry.js',ROOT/'public/journey/manifest.json',ROOT/'public/lantern/environment.json',ROOT/'public/lantern-fx/manifest.json']:record(path)
stone=Image.open(ROOT/'public/lantern-fx/stone.png');w,h=stone.size
assert list(stone.crop((0,0,w,1)).getdata())==list(stone.crop((0,h-1,w,h)).getdata())
assert list(stone.crop((0,0,1,h)).getdata())==list(stone.crop((w-1,0,w,h)).getdata())
report['checks']=['all atlas keys, animation aliases and texture bounds','source hashes and socket/hurtbox bounds','six inspected panorama crop sizes','masonry opposite edges match exactly']
dest=ROOT/'artifacts/epic-revision/integrity.json';dest.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report['families']));print(f'Validated {len(report["files"])} hashed files; wrote {dest.relative_to(ROOT)}')
