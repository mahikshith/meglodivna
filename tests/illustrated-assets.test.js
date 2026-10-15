import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { firingFrame, characterSocket } from '../src/character-motion.js';
import { weaponOrigin } from '../src/combat.js';

test('illustrated atlas pages fit mobile limits and preserve every source canvas and anchor',()=>{
  for(const family of ['character-revision','ironfang']){
    const base=new URL(`../public/${family}/`,import.meta.url);
    const atlas=JSON.parse(readFileSync(new URL('atlas.json',base))),manifest=JSON.parse(readFileSync(new URL('manifest.json',base)));
    const keys=new Set();
    for(const page of atlas.textures){
      assert.ok(page.size.w<=2048&&page.size.h<=2048);assert.ok(existsSync(new URL(page.image,base)));
      for(const frame of page.frames){
        assert.ok(!keys.has(frame.filename));keys.add(frame.filename);
        const meta=manifest.frames[frame.filename];assert.ok(meta);
        assert.equal(frame.sourceSize.w,meta.width);assert.equal(frame.sourceSize.h,meta.height);
        assert.ok(frame.frame.x+frame.frame.w<=page.size.w&&frame.frame.y+frame.frame.h<=page.size.h);
        assert.ok(frame.spriteSourceSize.x+frame.spriteSourceSize.w<=meta.width);
        assert.ok(frame.spriteSourceSize.y+frame.spriteSourceSize.h<=meta.height);
        if(meta.body)assert.ok(Math.abs(meta.body.y+meta.body.h-meta.anchor.y)<.001);
      }
    }
    assert.equal(keys.size,Object.keys(manifest.frames).length);
    for(const frames of Object.values(manifest.animations))assert.ok(frames.every(k=>keys.has(k)));
  }
});

test('running rifle animation follows distance and shares exact muzzles in both armor families',()=>{
  for(const armor of ['courier','lanternplate'])for(const facing of [-1,1]){
    const actor={characterRevision:true,sword:'rustfang',armor,x:100,y:300,w:28,h:60,grounded:true,vx:facing*320,facing,aimAngle:facing>0?0:Math.PI};
    const frames=new Set();
    for(const motionDistance of [0,23,45,67]){
      actor.motionDistance=motionDistance;const key=firingFrame(actor);frames.add(key);
      assert.ok(key.includes('gunrun'));assert.deepEqual(weaponOrigin(actor,'gun'),characterSocket(actor,'gun',key));
    }
    assert.equal(frames.size,4);
  }
});
