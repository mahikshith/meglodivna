import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraTarget,followCamera} from '../src/camera.js';
const level={width:20000,height:1440};
const p={x:3000,y:1100,w:28,h:60,vx:320,vy:0};

test('ground travel leaves most short-screen height for scenery and upcoming ledges',()=>{
 const hero={...p,grounded:true},height=467,c=cameraTarget(hero,level,960,height);
 const feet=(hero.y+hero.h-c.y)/height;
 assert.ok(feet>.65&&feet<.78,'ground feet sit above the controls without filling the lower half with masonry');
});
test('camera follows a full jet ascent without zooming into the hero',()=>{
 const ground=cameraTarget(p,level,960,300),sky=cameraTarget({...p,y:200,vy:-330},level,960,300);
 assert.ok(ground.y-sky.y>800);assert.equal(ground.zoom,1);assert.equal(sky.zoom,1);
});
test('combat camera contains both bodies on a short phone viewport',()=>{
 const boss={x:3450,y:1210,w:100,h:130};const c=cameraTarget(p,level,960,300,boss);
 const left=c.x+480-480/c.zoom,top=c.y+150-150/c.zoom;
 for(const body of [p,boss]){assert.ok(body.x>=left);assert.ok(body.x+body.w<=left+960/c.zoom);assert.ok(body.y>=top);assert.ok(body.y+body.h<=top+300/c.zoom);}
 assert.ok(c.zoom<=1);
});
test('portal travel snaps to the destination instead of panning across unseen rooms',()=>{
 assert.deepEqual(followCamera({x:0,y:0,zoom:1},{x:5000,y:700,zoom:1},1/60),{x:5000,y:700,zoom:1});
});
test('rising keeps more of the landing route below the courier in frame',()=>{
 const grounded=cameraTarget(p,level,960,467),rising=cameraTarget({...p,vy:-330},level,960,467);
 assert.equal(rising.zoom,1);
 assert.ok(rising.y>grounded.y,'upward motion looks down rather than cutting off the landing route');
});
test('a distant vertical boss never pulls the airborne hero out of view',()=>{
 const hero={...p,y:160,vy:-330},boss={x:3450,y:1210,w:100,h:130};const c=cameraTarget(hero,level,960,240,boss);
 const top=c.y+120-120/c.zoom;
 assert.ok(hero.y>=top);assert.ok(hero.y+hero.h<=top+240/c.zoom);
});
