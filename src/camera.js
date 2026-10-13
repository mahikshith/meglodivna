const clamp=(v,a,b)=>Math.max(a,Math.min(Math.max(a,b),v));
// A stable combat view: no attack zoom-in. Keep the player and a nearby threat inside a safe frame.
export function cameraTarget(player,level,width,height,threat=null){
 const px=player.x+player.w/2,py=player.y+player.h/2;
 let focusX=px+clamp(player.vx*.2,-90,90),focusY=py+clamp(player.vy*.10,-65,85),zoom=1;
 if(threat&&!threat.dead&&Math.abs(threat.x-player.x)<800){
  const tx=threat.x+threat.w/2,ty=threat.y+threat.h/2;
  zoom=clamp(Math.min((width-150)/(Math.abs(tx-px)+threat.w),(height-110)/(Math.abs(ty-py)+Math.max(player.h,threat.h))),.72,1);
  focusX=(px+tx)/2;focusY=(py+ty)/2+20;
 }
 const vw=width/zoom,vh=height/zoom;
 // Phaser scroll remains measured from the unzoomed viewport centre.
 return {x:clamp(focusX-vw/2,0,level.width-vw)+(vw-width)/2,
  y:clamp(focusY-vh*.52,0,level.height-vh)+(vh-height)/2,zoom};
}
export function followCamera(previous,target,dt){
 const teleport=Math.hypot(previous.x-target.x,previous.y-target.y)>1100;
 const a=teleport?1:1-Math.exp(-Math.min(.1,Math.max(0,dt))*9);
 return {x:previous.x+(target.x-previous.x)*a,y:previous.y+(target.y-previous.y)*a,zoom:previous.zoom+(target.zoom-previous.zoom)*a};
}
