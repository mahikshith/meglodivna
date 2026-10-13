import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/level.js';
import { PHYSICS, overlaps } from '../src/physics.js';
import { CATALOG } from '../src/catalog.js';
for(const level of Object.values(LEVELS)){
 test(`${level.id}: rune critical path, rewards and return shortcuts cannot strand the player`,()=>{
  for(const id of ['ember-heart','tide-glass','storm-seal']){
   const item=level.pickups.find(p=>p.itemId===id);assert.ok(item);
   assert.ok(level.route.some(m=>m.pickupId===item.id),`${id} has a reachable route marker`);
   const seal=level.gates.find(g=>g.requiresRelics?.includes(id));assert.ok(seal.x>item.x);
  }
  for(const portal of level.portals){
   assert.ok(level.solids.some(s=>Math.abs(s.y-portal.to.y-46)<1&&portal.to.x>=s.x&&portal.to.x+28<=s.x+s.w),'shortcut returns onto a solid floor');
  }
  for(const n of level.npcs){assert.ok(n.lines.length>=2);assert.ok(n.choices.length>=2);assert.ok(level.solids.some(s=>s.y===n.y+46&&n.x>=s.x&&n.x+28<=s.x+s.w));}
  const rewards=[...level.pickups,...level.props.flatMap(p=>p.contents||[]),...level.npcs.flatMap(n=>n.choices.map(c=>c.reward))];
  for(const r of rewards){const category={weapon:'gun',sword:'sword',armor:'armor',spell:'spell',treasure:'relic'}[r.type];if(category)assert.ok(CATALOG[category].some(i=>i.id===r.itemId));}
 });
 test(`${level.id}: landings have jump margins and safe supported hostile patrols`,()=>{
  const apex=PHYSICS.jumpSpeed**2/(2*PHYSICS.gravity);let rises=0;
  for(let i=1;i<level.route.length;i++){
   const a=level.solids.find(s=>s.id===level.route[i-1].id),b=level.solids.find(s=>s.id===level.route[i].id);if(a===b)continue;
   const rise=a.y-b.y,gap=Math.max(0,b.x-a.x-a.w);assert.ok(rise<=apex-8,`rise ${rise} at ${b.id}`);assert.ok(gap<=280,`gap ${gap} at ${b.id}`);if(rise>50)rises++;
  }
  assert.ok(rises>=8);assert.ok(new Set(level.solids.map(s=>s.y)).size>=10);
  for(const e of level.enemies){if(e.type==='drone')continue;assert.ok(e.minX<=e.x&&e.x<=e.maxX);assert.ok(level.solids.some(s=>s.y===e.y+e.h&&e.minX>=s.x&&e.maxX+e.w<=s.x+s.w));}
  for(const prop of level.props)assert.ok(level.solids.some(s=>s.y===prop.y+prop.h&&prop.x>=s.x&&prop.x+prop.w<=s.x+s.w),prop.id);
 });
}
test('every realm has a different ordered room journey and named architectural landmarks',()=>{
 const orders=Object.values(LEVELS).map(l=>l.rooms.map(r=>r.kind).join(','));assert.equal(new Set(orders).size,5);
 for(const level of Object.values(LEVELS)){assert.ok(level.landmarks.length>=12);assert.ok(level.rooms.every(r=>r.w>0));assert.ok(level.rooms.some(r=>r.kind==='crypt'));}
});
