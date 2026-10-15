"""Trim transparent canvas margins without changing anatomical source coordinates.

2048px pages keep source-resolution artwork within conservative mobile texture
limits. Phaser's trimmed-frame metadata restores the original anchor canvas.
"""
import json
from PIL import Image

def pack(pixels, out, limit=2048):
    pages=[];page=Image.new('RGBA',(limit,limit));frames={};x=y=row=0
    def finish():
        nonlocal page,frames,x,y,row
        height=max(4,y+row+4);name='atlas.png' if not pages else f'atlas-{len(pages)}.png'
        page.crop((0,0,limit,height)).save(out/name,optimize=True)
        pages.append(dict(image=name,size=dict(w=limit,h=height),frames=[dict(filename=key,**value) for key,value in frames.items()]))
        page=Image.new('RGBA',(limit,limit));frames={};x=y=row=0
    parts=[]
    for key,im in pixels.items():
        bounds=im.getbbox();assert bounds,key
        parts.append((key,im,bounds))
    for key,im,box in sorted(parts,key=lambda p:-(p[2][3]-p[2][1])):
        crop=im.crop(box);w,h=crop.size;assert max(w,h)+8<=limit,(key,crop.size)
        if x+w+8>limit:x=0;y+=row+8;row=0
        if y+h+8>limit:finish()
        page.alpha_composite(crop,(x+4,y+4))
        frames[key]=dict(frame=dict(x=x+4,y=y+4,w=w,h=h),rotated=False,trimmed=True,
            spriteSourceSize=dict(x=box[0],y=box[1],w=w,h=h),sourceSize=dict(w=im.width,h=im.height))
        x+=w+8;row=max(row,h)
    if frames:finish()
    (out/'atlas.json').write_text(json.dumps(dict(textures=pages,meta=dict(scale='1',artStyle='illustrated',maxTextureSize=limit))))
    return pages
