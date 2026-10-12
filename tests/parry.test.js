import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, spawnProjectile, stepWorld, STEP } from '../src/combat.js';

test('a deflected missile becomes friendly and keeps its outgoing heading', () => {
  const world=createWorld();world.enemies=[];world.pickups=[];
  const p=world.player;
  const missile=spawnProjectile(world,p.x+42,p.y+20,-220,0,'enemy',true);
  stepWorld(world,{move:0,jumpHeld:false,slashPressed:true},STEP);
  assert.equal(missile.owner,'player');assert.equal(missile.vx,920);
  stepWorld(world,{move:0,jumpHeld:false},STEP);
  assert.equal(missile.vx,920);assert.equal(missile.vy,-30);
});
