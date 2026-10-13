import assert from 'node:assert/strict';
import * as levels from '../src/level.js';
import * as combat from '../src/combat.js';
const seed = Number(process.argv[2] || 1);
let randomState=seed>>>0;
const random=()=>{randomState=(1664525*randomState+1013904223)>>>0;return randomState/4294967296;};
const worlds=levels.WORLD_LIST?.map(w=>w.id)||['soulforge'];
const report={seed,worlds:[],steps:0,simulatedSeconds:0,deaths:0,peakProjectiles:0,peakAllies:0,peakEnemySummons:0,enemyDistance:0,warnings:0,events:[],callerRates:[30,60,120]};
const events=new Set();
for(const worldId of worlds){
  const level=levels.getLevel?.(worldId)||levels.LEVEL;
  const checkpoints=[0,...level.bosses.map(b=>Math.max(0,level.checkpoints.findLastIndex(cp=>cp.x<=b.triggerX)))];
  for(const checkpoint of new Set(checkpoints)){
    let world=combat.createWorld(checkpoint,{worldId,difficulty:seed%2?'inferno':'extinction'});
    // These are isolated stress fixtures, distinct from the spawn-to-exit legal campaign proof.
    for(const id of ['cinder','siphon','thunder','veil','stasis','eclipse','clone','wolf','dragon'])combat.rewardPlayer(world,{type:'spell',itemId:id},`soak:spell:${id}`);
    for(let frame=0,elapsed=0;elapsed<20;frame++){
      if(world.status==='dead'){report.deaths++;world=combat.retryWorld(world);}
      if(world.status==='won')break;
      if(world.story){const choice=world.story.choices?.find(c=>!c.cost?.hp||c.cost.hp<world.player.hp);combat.advanceStory(world,world.story.index>=world.story.lines.length-1?choice?.id:undefined);continue;}
      const right=(Math.floor(frame/180)+seed)%3!==0;
      const dt=Math.min(20-elapsed,1/[30,60,120][(seed+frame)%3]);elapsed+=dt;
      const starts=world.enemies.map(e=>e.x);
      combat.stepWorld(world,{move:right?1:-1,jumpPressed:frame%73===0,jumpHeld:frame%140<90,
        dashPressed:frame%190===0,jet:frame%220>155,slashPressed:frame%31===0,shoot:random()>.2,
        aimUp:frame%200<55,spellPressed:frame%181===0,cycleSpellPressed:frame%137===0,
        ultimatePressed:frame%1201===0,interactPressed:frame%181===0},dt);
      assert.ok(['playing','dead','won'].includes(world.status));
      for(const body of [world.player,...world.enemies,...world.bosses,...(world.allies||[]),...(world.enemySummons||[])]){
        assert.ok(Number.isFinite(body.x)&&Number.isFinite(body.y),`${worldId} non-finite body`);
        for(const axis of ['vx','vy'])if(body[axis]!==undefined)assert.ok(Number.isFinite(body[axis]),`${worldId} bad velocity`);
      }
      assert.ok(world.player.hp>=0&&world.player.hp<=world.player.maxHp+.001);
      assert.ok(world.player.fuel>=0&&world.player.fuel<=100.001);
      assert.ok(world.player.mana>=0&&world.player.mana<=world.player.maxMana+.001);
      const shots=world.projectiles.filter(p=>p.active);
      for(const p of shots)assert.ok([p.x,p.y,p.vx,p.vy,p.life].every(Number.isFinite));
      assert.equal(world.projectiles.length,96,'projectile pool must retain its actual fixed96 slots');
      assert.ok((world.allies?.length||0)<=3,'allies must remain bounded to3');
      assert.ok((world.enemySummons?.length||0)<=12,'enemy summons must remain bounded to12');
      assert.ok(world.events.length<=160,'feedback pool must remain bounded');
      report.peakProjectiles=Math.max(report.peakProjectiles,shots.length);
      report.peakAllies=Math.max(report.peakAllies,world.allies?.length||0);
      report.peakEnemySummons=Math.max(report.peakEnemySummons,world.enemySummons?.length||0);
      report.enemyDistance+=world.enemies.reduce((distance,e,i)=>distance+Math.abs(e.x-starts[i]),0);
      for(const event of world.events){events.add(event.type);if(event.type==='enemywindup')report.warnings++;}
      world.events.length=0;report.steps++;report.simulatedSeconds+=dt;
    }
  }
  report.worlds.push(worldId);
}
report.events=[...events].sort();
console.log(JSON.stringify(report));
