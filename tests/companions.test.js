import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPANIONS, updateCompanion, flightPath, placeCompanion } from '../src/companions.js';
import { segmentHit, weaponOrigin } from '../src/combat.js';
import { overlaps } from '../src/physics.js';
import { companionFrame, characterSocket, firingFrame } from '../src/character-motion.js';

function fixture(type, obstacles = [], target = { id:'foe',x:550,y:340,w:50,h:60,hp:500 }) {
  const profile=COMPANIONS[type], a={id:`ally-${type}`,type,x:100,y:400-profile.h,w:profile.w,h:profile.h,vx:0,vy:0,facing:1,grounded:true,life:100,cooldown:0,characterRevision:true};
  if(profile.flying){a.y=200;a.grounded=false;}
  const floor={id:'floor',x:0,y:400,w:1600,h:200};
  const world={player:{x:140,y:340,w:28,h:60,facing:1},level:{width:1600,height:700},solids:[floor,...obstacles]};
  const hits=[],shots=[],events=[],api={targets:target?[target]:[],segmentHit,hitEnemy:(w,e,n)=>{e.hp-=n;hits.push({type:a.type,x:a.x,y:a.y,phase:a.attackPhase});},emit:(...args)=>events.push(args),spawnProjectile:(w,x,y,vx,vy)=>{const shot={x,y,vx,vy};shots.push(shot);return shot;}};
  const run=(seconds,dt=1/120)=>{for(let t=0;t<seconds;t+=dt){updateCompanion(world,a,dt,api);assert.ok(Number.isFinite(a.x+a.y+a.vx+a.vy));assert.ok(!world.solids.some(s=>overlaps(a,s)),`${type} embedded in solid at ${a.x},${a.y}`);}};
  return {world,a,target,hits,shots,api,run};
}
test('all companions have distinct mass, movement and committed attack timing',()=>{
  const counts=[];
  for(const type of Object.keys(COMPANIONS)){
    const f=fixture(type);f.run(7);
    assert.ok(f.hits.length+f.shots.length>0,`${type} should reach and attack`);
    assert.ok(f.hits.every(hit=>hit.phase==='contact'));
    if(!COMPANIONS[type].flying)assert.ok(f.a.y+f.a.h<=400.001);
    counts.push([type,f.hits.length,f.shots.length]);
  }
  assert.equal(new Set(Object.values(COMPANIONS).map(p=>p.speed)).size,4);
});
test('wolf and clone stop at an unclimbable wall and never damage through it',()=>{
  for(const type of ['wolf','clone']){
    const wall={x:280,y:0,w:50,h:400},f=fixture(type,[wall]);f.run(6);
    assert.ok(f.a.x+f.a.w<=wall.x);assert.equal(f.hits.length+f.shots.length,0);
  }
});
test('ground companions jump a reachable block and brake before an unlandable gap',()=>{
  for(const type of ['wolf','clone']){
    const f=fixture(type,[{x:260,y:340,w:85,h:60}]);f.run(5);assert.ok(f.a.x>345,`${type} must jump ledge`);
    const g=fixture(type);g.world.solids=[{x:0,y:400,w:260,h:200},{x:800,y:400,w:800,h:200}];g.run(4);assert.ok(g.a.x+g.a.w<=260);
  }
});
test('dragon and raven route around walls using full-body clearance',()=>{
  for(const type of ['dragon','raven']){
    const wall={x:290,y:130,w:50,h:270},f=fixture(type,[wall]);
    const path=flightPath(f.a,{x:550,y:210},f.world.solids,segmentHit);assert.ok(path.length>1);
    f.run(8);assert.ok(f.a.x>340,`${type} should navigate around the top`);assert.ok(f.hits.length+f.shots.length>0);
  }
});
test('a raven abandons a committed dive when an obstacle appears',()=>{
  const f=fixture('raven');Object.assign(f.a,{x:170,y:200,attackPhase:'contact',attackElapsed:0,targetId:f.target.id});
  f.world.solids.push({x:300,y:0,w:30,h:400});f.run(.15);assert.equal(f.a.attackPhase,'recovery');assert.equal(f.hits.length,0);
});
test('companions reacquire living targets and never freeze when a target disappears',()=>{
  for(const type of Object.keys(COMPANIONS)){
    const f=fixture(type);f.run(.5);f.api.targets=[];const before=f.a.x;f.world.player.x=800;f.run(3);assert.equal(f.a.targetId,null);assert.notEqual(f.a.x,before);
  }
});
test('dragon fire and clone rifle start at their visible pose sockets in either direction',()=>{
  for(const type of ['dragon','clone'])for(const facing of [-1,1]){
    const f=fixture(type);f.target.x=facing>0?450:20;Object.assign(f.a,{x:240,y:type==='dragon'?240:340,facing,attackPhase:'contact',attackElapsed:0,targetId:f.target.id});
    updateCompanion(f.world,f.a,1/120,f.api);assert.equal(f.shots.length,1);
    const origin=characterSocket(f.a,type==='dragon'?'mouth':'gun',type==='clone'?firingFrame(f.a):companionFrame(f.a));
    assert.ok(Math.abs(origin.x-f.shots[0].x)<.001);assert.ok(Math.abs(origin.y-f.shots[0].y)<.001);
    assert.deepEqual(weaponOrigin(f.a,type==='dragon'?'mouth':'gun'),origin);
  }
});
test('summoning chooses a free arrival body beside the player',()=>{
  for(const type of Object.keys(COMPANIONS)){
    const f=fixture(type,[{x:65,y:200,w:50,h:200}]);assert.equal(placeCompanion(f.world,f.a),true);assert.ok(!f.world.solids.some(s=>overlaps(f.a,s)));
  }
});
