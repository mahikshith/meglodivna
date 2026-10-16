// Opaque architectural terrain. Every walkable top is exactly at its collision y.
// Individual slabs are seeded per solid; no transparent tile sheets or repeating floor bands.
const palettes={
 grass:{body:0x252c2b,deep:0x111b20,stone:0x46504a,cap:0x687263,light:0xbbbba0,seam:0x15201e},
 ruins:{body:0x29333b,deep:0x131d2b,stone:0x465260,cap:0x718185,light:0xb9c9c1,seam:0x18232b},
 metal:{body:0x29303b,deep:0x151824,stone:0x3d4955,cap:0x6f7c87,light:0xb4cacb,seam:0x151d28},
 crystal:{body:0x2d2940,deep:0x171a2a,stone:0x4c4660,cap:0x746e91,light:0xc5bed8,seam:0x201e31},
};
function randomFor(id){let seed=2166136261;for(const c of id)seed=Math.imul(seed^c.charCodeAt(0),16777619);return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function buildSolidTerrain(scene,solid,material='ruins'){
 const {x,y,w,h}=solid,p=palettes[material]||palettes.ruins,r=randomFor(solid.id),g=scene.add.graphics().setDepth(1);
 const platform=solid.kind==='platform'||solid.oneWay,capH=Math.min(h,platform?9:15);
 g.fillStyle(p.body,1);g.fillRect(x,y,w,h);
 // The first visible face catches light; the foundation recedes beneath the play surface.
 if(h>30){g.fillGradientStyle(p.body,p.body,p.deep,p.deep,1);g.fillRect(x,y+capH,w,h-capH);}
 if(!platform){
  let rowY=y+capH+4,row=0;
  while(rowY<y+Math.min(h,210)){
   const rh=Math.min(30+r()*22,y+h-rowY);let bx=x-(row%2?42:0);
   while(bx<x+w){
    const bw=78+r()*98,left=Math.max(x,bx),right=Math.min(x+w,bx+bw-3),alpha=Math.max(.12,.68-(rowY-y)/300);
    if(right>left){
     const bevel=3+Math.floor(r()*6),bottom=rowY+rh-3;
     const points=[{x:left+bevel,y:rowY},{x:right-3,y:rowY},{x:right,y:rowY+bevel},{x:right-2,y:bottom-3},{x:right-9,y:bottom},{x:left+3,y:bottom},{x:left+1,y:rowY+bevel}];
     g.fillStyle(p.stone,alpha*(.82+r()*.18));g.fillPoints(points,true);
     g.lineStyle(2,p.light,alpha*.27);g.beginPath();g.moveTo(left+3,rowY+bevel);g.lineTo(left+bevel,rowY+2);g.lineTo(right-6,rowY+2);g.strokePath();
     g.lineStyle(2,p.seam,.85);g.lineBetween(right-1,rowY+bevel,right-3,bottom-2);g.lineBetween(right-3,bottom-1,left+4,bottom-1);
     for(let fleck=0;fleck<9;fleck++){const fx=Math.floor(left+9+r()*Math.max(1,right-left-18)),fy=Math.floor(rowY+7+r()*Math.max(1,rh-16));g.fillStyle(fleck%3?p.deep:p.light,alpha*.15);g.fillRect(fx,fy,2+Math.floor(r()*5),1);}
     // Sparse hairline fractures have different lengths/directions in each slab.
     if(r()>.68&&right-left>32){const cx=left+12+r()*(right-left-25),cy=rowY+7;g.lineStyle(1,p.seam,.65);g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+5,cy+8);g.lineTo(cx+2,cy+15);g.strokePath();}
    }bx+=bw;
   }rowY+=rh;row++;
  }
 }
 // Broad capstones communicate mass and a continuous, readable landing plane.
 let bx=x;
 while(bx<x+w){const bw=Math.min(w-(bx-x),64+r()*82);g.fillStyle(p.cap,1);g.fillRect(Math.floor(bx),y,Math.ceil(bw),capH);
  g.fillStyle(0xf0dfb8,.92);g.fillRect(Math.floor(bx+1),y,Math.max(1,Math.floor(bw-2)),3);
  g.fillStyle(p.seam,.9);g.fillRect(Math.floor(bx),y+capH-3,Math.ceil(bw),3);
  if(bx>x){g.fillStyle(p.seam,.8);g.fillRect(Math.floor(bx),y+2,2,capH-2);}bx+=bw;}
 // Bevels on the face and sides keep solids readable over either light or dark backgrounds.
 g.fillStyle(0x090f18,.45);g.fillRect(x+w-7,y+capH,7,Math.max(0,h-capH));
 g.fillStyle(p.light,.12);g.fillRect(x,y+capH,3,Math.max(0,h-capH));
 if(platform){g.fillStyle(0x0b1420,.85);g.fillRect(x+3,y+h-5,w-6,5);g.fillStyle(p.stone,.8);g.fillTriangle(x+7,y+h,x+29,y+h,x+18,y+h+14);g.fillTriangle(x+w-29,y+h,x+w-7,y+h,x+w-18,y+h+14);}
 // Metal conduits have recessed plates and rivets, never bright stage-light beams.
 if(material==='metal'){for(let px=x+18;px<x+w-10;px+=92){g.fillStyle(0x151b26,.8);g.fillRect(px,y+capH+5,28,Math.min(9,Math.max(0,h-capH-9)));g.fillStyle(0xa7aa9c,.55);g.fillRect(px-7,y+5,3,3);}}
 if(scene.textures.exists('ln-platform')){
  const group=scene.add.container(0,0).setDepth(1);
  // Authored masonry covers the entire collision body, including conduit ledges.
  if(!platform){
   group.add(g);
   const stoneSource=scene.textures.get('ln-fx-stone').getSourceImage();
   group.add(scene.add.tileSprite(x,y,w,h,'ln-fx-stone').setOrigin(0).setTileScale(303/stoneSource.width,306/stoneSource.height).setAlpha(.72));
  }else g.destroy();
  const texture=material==='metal'?'ln-fx-platform':'ln-platform';
  if(platform){
   group.add(scene.add.image(x,y,texture).setOrigin(0).setDisplaySize(w,Math.min(100,w*.43)));
   if(!solid.oneWay)group.addAt(scene.add.image(x+w*.25,y+h+7,'ln-root').setOrigin(.5,0).setDisplaySize(123.2,110.55).setTint(0x7d9382).setAlpha(.65),0);
  }else if(solid.kind!=='ceiling'){
   const source=scene.textures.get('ln-platform').getSourceImage();
   for(let px=x;px<x+w;px+=225){const length=Math.min(225,x+w-px);group.add(scene.add.image(px,y,'ln-platform').setOrigin(0).setDisplaySize(225,97).setCrop(0,0,length/225*source.width,source.height).setAlpha(.92));}
  }
  // Keep the actual collision top unmistakable over detailed painted scenery.
  // The dark undercut supports a warm 3px edge without moving the visual ledge.
  const edge=scene.add.graphics();
  edge.fillStyle(0x081a24,.94);edge.fillRect(x,y+3,w,3);
  edge.fillStyle(solid.oneWay?0xf7dfa8:0xeadfbd,.96);edge.fillRect(x,y,w,3);
  group.add(edge);
  return group;
 }
 return g;
}
