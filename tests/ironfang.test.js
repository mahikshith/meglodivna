import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld, STEP, spawnProjectile, weaponOrigin, segmentEntry, damagePlayer } from '../src/combat.js';
import { boosterPose, ironfangFrame, ironfangPoint, damageBounds } from '../src/ironfang.js';
import { IRONFANG_GEOMETRY } from '../src/ironfang-geometry.js';

function fixture(flying = false) {
  const w = createWorld(0, { worldId: 'soulforge', difficulty: 'forge' });
  const b = w.bosses.find(b => b.type === 'regent');
  w.enemies=[];w.props=[];w.gates=[];w.hazards=[];w.enemyPortals=[];w.npcs=[];
  w.bosses=[b];w.boss=b;w.story=null;
  Object.assign(b,{active:true,x:b.arenaStart+500,phase:'idle',phaseTime:0,timer:100,shield:0,flash:0,facing:-1});
  if(flying)Object.assign(b,{form:'flying',visualFamily:'wyrm',h:86,y:b.floorY-180,baseY:b.floorY-180});
  Object.assign(w.player,{x:b.x-280,y:b.floorY-w.player.h,invincible:100});
  return {w,b,p:w.player};
}

test('booster rotates continuously with vertical, diagonal and near-vertical travel',()=>{
  const p={x:0,y:0,w:28,h:60,facing:1};
  for(const [vx,vy] of [[0,-330],[1,-330],[90,-330],[-90,-330],[320,0],[0,100]]){
    const q=boosterPose({...p,vx,vy}),speed=Math.hypot(vx,vy);
    assert.ok(Math.abs(q.dx+vx/speed)<1e-9);assert.ok(Math.abs(q.dy+vy/speed)<1e-9);
    assert.ok(Math.abs(Math.cos(q.rotation+Math.PI/2)-q.dx)<1e-9);
  }
  assert.equal(boosterPose({...p,vx:0,vy:0}).rotation,0);
});

test('both facing directions use the visible pose mouth and gun, including attack and recoil',()=>{
  const {b}=fixture(true);
  for(const form of ['ground','flying'])for(const phase of ['idle','charge','attack'])for(const facing of [-1,1]){
    Object.assign(b,{form,phase,phaseTime:.4,facing,attackKind:form==='flying'?'breath':'cannon',flash:0});
    const key=ironfangFrame(b),meta=IRONFANG_GEOMETRY[key],slot=form==='flying'?'mouth':'gun';
    assert.deepEqual(weaponOrigin(b,slot),ironfangPoint(b,meta.sockets[slot],key));
    const point=weaponOrigin(b,slot);assert.ok((point.x-b.x-b.w/2)*facing>0);
    assert.ok(point.y<b.y+b.h);
    assert.ok(damageBounds(b).every(box=>box.w>0&&box.h>0));
  }
});

test('piercing shots stop on visible boss anatomy and emit one exact surface impact',()=>{
  for(const flying of [false,true])for(const facing of [-1,1]){
    const {w,b}=fixture(flying);b.facing=facing;
    // Select the forward head, outside the old movement box for the dragon.
    const head=damageBounds(b)[1],y=head.y+head.h/2;
    const start=facing>0?head.x+head.w+12:head.x-12;
    const shot=spawnProjectile(w,start,y,-facing*30000,0,'player');
    Object.assign(shot,{damage:23,pierce:8,kind:'rail'});
    const hp=b.hp;stepWorld(w,{},STEP);
    assert.ok(b.hp<hp);assert.equal(shot.active,false);assert.ok(b.flash>0);
    const impacts=w.events.filter(e=>e.type==='impact'&&e.enemyId===b.id);
    assert.equal(impacts.length,1);assert.equal(shot.x,impacts[0].x);assert.equal(shot.y,impacts[0].y);
    assert.ok(shot.hitIds.includes(b.id));
  }
});

test('cannon beam ends at the boss and delivers damage with hit feedback',()=>{
  const {w,b,p}=fixture();p.gun='cannon';p.charges.cannon=3;p.invincible=100;
  p.y=b.y+60-p.h+41;const hp=b.hp;
  stepWorld(w,{shoot:true},STEP);
  assert.ok(p.beam);assert.ok(b.hp<hp);assert.ok(p.beam.x1<b.x+b.w);
  assert.ok(w.events.some(e=>e.type==='impact'&&e.enemyId===b.id));
});

test('damage feedback follows accepted hits, not invulnerable contact',()=>{
  const {w,p}=fixture();p.invincible=0;p.shield=0;
  assert.equal(damagePlayer(w,10,p.x-20),true);
  assert.equal(damagePlayer(w,10,p.x-20),false);
  assert.equal(w.events.filter(e=>e.type==='hurt').length,1);
});

test('segment entry distinguishes a miss from contact at t=0 and mirrors direction',()=>{
  const box={x:10,y:10,w:10,h:10};
  assert.equal(segmentEntry(15,15,15,15,box),0);
  assert.equal(segmentEntry(0,0,30,0,box),null);
  assert.equal(segmentEntry(0,15,30,15,box),1/3);
  assert.equal(segmentEntry(30,15,0,15,box),1/3);
});

test('activated boss keeps moving, cycling attacks and transforming after the player leaves',()=>{
  const {w,b,p}=fixture();const startX=b.x;
  Object.assign(p,{x:100,y:1200,invincible:1000});b.timer=.1;
  const phases=new Set(),positions=new Set();
  for(let i=0;i<600;i++){stepWorld(w,{},STEP);phases.add(b.phase);positions.add(Math.round(b.x));w.events.length=0;}
  assert.ok(positions.size>20);assert.notEqual(b.x,startX);assert.ok(phases.has('charge')&&phases.has('attack')&&phases.has('idle'));
  assert.equal(w.activeBoss,null);assert.ok(b.x>=b.arenaStart&&b.x+b.w<=b.arenaEnd);
  b.hp=b.maxHp*.3;
  for(let i=0;i<130;i++)stepWorld(w,{},STEP);
  assert.equal(b.form,'flying');assert.notEqual(b.phase,'transform');
  const time=b.animationTime;Object.assign(p,{x:b.x-200,y:b.floorY-p.h});stepWorld(w,{},STEP);
  assert.ok(b.animationTime>time);assert.equal(w.activeBoss,b);
});

test('awakened normal enemies retain their own floor and patrol when far offscreen',()=>{
  const w=createWorld();w.enemyPortals=[];w.hazards=[];w.pickups=[];w.npcs=[];
  const e=w.enemies.find(e=>e.type==='guard');w.enemies=[e];
  Object.assign(w.player,{x:e.x-250,y:e.y,invincible:1000});stepWorld(w,{},STEP);assert.equal(e.awake,true);
  const y=e.y,x=e.x;Object.assign(w.player,{x:w.level.width-300,y:500});
  for(let i=0;i<240;i++)stepWorld(w,{},STEP);
  assert.equal(e.dead,false);assert.notEqual(e.x,x);assert.ok(Math.abs(e.y-y)<100,'uses offscreen floor, not player-local solids');
});
