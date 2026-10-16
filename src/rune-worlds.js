// Authored chamber order, distinct elevations and optional vault loops replace the long corridor.
const REALMS = {
 soulforge:{name:'RUNEHEART · The Hollow Sanctuary',scene:'forest',surface:'grass',biome:'snow',tint:0xa8cbb2,sky:0x101b28,rooms:['refuge','roots','stair','warden','aqueduct','vault','crypt','hex','spire','conduit','regent'],names:['The Last Lantern','Roots of Iron','The Bell Stair','Keeper of Embers','The Drowned Choir','Tideglass Vault','The Ash Ossuary','Mother of Cinders','Stormwell Ascent','The Silent Engine','The Unbinding']},
 tide:{name:'DROWNED CHOIR · The Sluice Kingdom',scene:'islands',surface:'ruins',biome:'ruins',tint:0x79cabb,sky:0x102739,rooms:['refuge','aqueduct','vault','warden','roots','conduit','stair','hex','crypt','spire','regent'],names:['Salt Lantern','Broken Aqueduct','The Pearl Cistern','The Sluice Knight','Sunken Orchard','Pressure Halls','The Hanging Bell','The Undertow Oracle','Drowned Tombs','Raincatcher','The Leviathan Engine']},
 pyre:{name:'CINDER COVEN · The Furnace Below',scene:'castle',surface:'metal',biome:'furnace',tint:0xe6a36e,sky:0x241722,rooms:['refuge','crypt','conduit','warden','stair','roots','vault','hex','aqueduct','spire','regent'],names:['The Coal Chapel','Bone Furnace','Steamworks','The Brass Executioner','The Broken Flue','Charred Garden','The Witch’s Hoard','The Ember Abbess','Molten Causeway','Ashfall','The Devouring Hearth']},
 neon:{name:'STORM ARCHIVE · The Broken Circuit',scene:'sky',surface:'metal',biome:'storm',tint:0x8dc5e0,sky:0x142439,rooms:['refuge','conduit','spire','warden','aqueduct','stair','crypt','hex','vault','roots','regent'],names:['Signal Zero','Relay Trenches','The Lightning Mast','The Arc Marshal','Suspended Highway','Antenna Stair','The Dead Battery','The Circuit Witch','Memory Vault','Copper Roots','The Null Reactor']},
 veil:{name:'GLASS NECROPOLIS · The False Moon',scene:'crystal',surface:'crystal',biome:'eclipse',tint:0xc9a4e4,sky:0x17152c,rooms:['refuge','vault','crypt','warden','spire','aqueduct','roots','hex','stair','conduit','regent'],names:['The Unlit Shrine','Mirror Reliquary','Names Beneath Stone','The Hollow Paladin','Moonshaft','The Pale Crossing','The Mourning Garden','The Promise Eater','The Last Stair','Soul Pipes','The Counterfeit Sun']},
};
function createRealm(id,d) {
 const w={id,name:d.name,description:'Recover three rune stones, open the sanctuary seals and unbind its captive heart.',width:0,height:1440,timeLimit:900,theme:{scene:d.scene,foreground:d.surface},biome:d.biome,spawn:{x:100,y:1214}};
 for(const key of ['solids','hazards','route','enemies','props','pickups','bosses','gates','checkpoints','zones','guides','npcs','portals','enemyPortals','movingPlatforms','crumble','currents','rooms','landmarks'])w[key]=[];
 let serial=0,x=0,floor=1260;
 const tag=name=>`${id}-${name}-${serial++}`;
 function block(name,bx,by,width,h=32,oneWay=false,kind='platform'){const s={id:tag(name),x:bx,y:by,w:width,h,oneWay,kind,biome:d.biome,material:d.surface};w.solids.push(s);return s;}
 function path(s,at=s.x+s.w*.65,extra={}){w.route.push({id:s.id,x:at,y:s.y,verb:'jump',...extra});return s;}
 const ground=(name,bx,by,width)=>block(name,bx,by,width,1440-by,false,'ground');
 function pickup(type,bx,by,itemId,value){const p={id:tag(type),type,x:bx,y:by};if(itemId)p.itemId=itemId;if(value)p.value=value;w.pickups.push(p);return p;}
 function foe(type,s,offset,power){const [width,h,hp]={guard:[30,44,42],mage:[34,50,54],shade:[30,48,45],sentinel:[52,71,78],drone:[34,45,34]}[type];w.enemies.push({id:tag(type),type,x:s.x+offset,y:s.y-h,w:width,h,hp,power,facing:-1,minX:s.x+12,maxX:s.x+s.w-width-12,leashX:s.x,leashW:s.w});}
 function cache(s,at,contents){w.props.push({id:tag('reliquary'),type:'cache',x:at,y:s.y-40,w:44,h:40,hp:24,contents});}
 const relay=(at,by,label)=>w.checkpoints.push({x:at,y:by-46,label});
 function rune(s,at,itemId,spell){const p=pickup('treasure',at,s.y-28,itemId);path(s,at,{pickupId:p.id});pickup('spell',at+65,s.y-28,spell);}
 function secret(start,bx,by,reward){block('vault-step',bx,by-100,150,22,true);block('vault-step',bx+175,by-205,155,22,true);const c=block('side-vault',bx+340,by-305,220,28,true);cache(c,c.x+95,reward);w.landmarks.push({type:'vault',x:c.x+100,y:c.y,seed:serial});w.portals.push({id:tag('return-rift'),x:c.x+160,y:c.y-46,w:32,h:46,to:{x:start.x+90,y:start.y-46},label:'Return to the path'});}
 for(let index=0;index<d.rooms.length;index++){
  const kind=d.rooms[index],start=x,entryY=floor,label=d.names[index],room={id:tag('room'),name:label,kind,x:start,y:0,w:0,h:1440,floorY:floor};w.rooms.push(room);
  w.zones.push({x:start,label,subtitle:index===0?'Find Mira at the lantern.':'Find the rune stones. Open the seals. Free the heart.',biome:d.biome,tint:d.tint,sky:d.sky,theme:w.theme});
  if(kind==='refuge'){
   const s=ground('sanctuary',x,floor,950);path(s,x+130);relay(x+100,floor,label);
   const npc={id:`${id}-mira`,name:'MIRA · LANTERN KEEPER',skin:'npc-mira',portrait:'portrait-mira',x:x+330,y:floor-46,lines:[{speaker:'MIRA',text:'The engine is burning people into light. My brother is still inside.'},{speaker:'AETHER',text:'Then we cut its heart out. How do I get past the seals?'},{speaker:'MIRA',text:'Three stones. Ember in the keeper’s hall. Tide in the vault. Storm above the pipes. Take what you need.'}],choices:[{id:`${id}-ward`,label:'Take guardian plate',reward:{type:'armor',itemId:'bulwark'}},{id:`${id}-soul`,label:'Learn Soul Siphon',reward:{type:'spell',itemId:'siphon'}}]};
   w.npcs.push(npc);path(s,x+340,{npcId:npc.id});w.landmarks.push({type:'console',x:x+485,y:floor,seed:index});cache(s,x+600,[{type:'shield',value:30},{type:'mana',value:30}]);pickup('spell',x+760,floor-28,'wolf');path(s,x+860);x+=950;
  }else if(['warden','hex','regent'].includes(kind)){
   const s=ground('arena',x,floor,1400),n=['warden','hex','regent'].indexOf(kind),bossId=`${id}-${kind}`;relay(x+75,floor,label);pickup('health',x+150,floor-28,null,55);pickup('mana',x+195,floor-28,null,70);
   w.bosses.push({id:bossId,name:label.toUpperCase(),type:kind,x:x+810,y:floor-(n===2?132:120),w:n===2?112:96,h:n===2?132:120,hp:[520,700,950][n],floorY:floor,triggerX:x+300,arenaStart:x+200,arenaEnd:x+1250,shield:35});path(s,x+320,{bossId});block('arena-flank',x+380,floor-115,180,24,true);block('arena-flank',x+1000,floor-130,180,24,true);
   w.gates.push({id:tag('guardian-seal'),bossId,x:x+1270,y:0,w:30,h:floor});if(n===0)rune(s,x+1320,'ember-heart','cinder');if(n===1)pickup('spell',x+1320,floor-28,'dragon');if(n===2)pickup('treasure',x+1320,floor-28,'soul-core');path(s,x+1360);w.landmarks.push({type:'altar',x:x+730,y:floor,seed:index});x+=1400;
  }else if(kind==='roots'){
   const a=ground('root-bank',x,floor,390);path(a,x+325);foe('guard',a,230,'rifle');const b=path(block('broken-root',x+530,floor-85,230));foe('drone',b,95,'rifle');path(block('hanging-root',x+900,floor-165,240));const end=ground('orchard-bank',x+1280,floor,540);path(end,x+1410);foe('sentinel',end,330,'lightning');path(end,x+1750);
   w.hazards.push({id:tag('thorn-pit'),type:'spikes',x:x+390,y:1390,w:890,h:30,period:3.4,onTime:1.2,phase:.5});secret(end,x+1290,floor,[{type:'sword',itemId:'katana'},{type:'mana',value:50}]);x+=1820;
  }else if(kind==='stair'||kind==='spire'){
   const a=ground('tower-foot',x,floor,340);path(a,x+260);relay(x+50,floor,label);for(let j=0;j<4;j++){const s=path(block('tower-step',x+370+j*220,floor-100*(j+1),185,26,true));if(j===2)foe('mage',s,90,'soul');}
    floor-=400;const top=ground('tower-crown',x+1260,floor,590);path(top,x+1350);if(kind==='spire'){rune(top,x+1450,'storm-seal','thunder');pickup('weapon',x+1530,floor-28,'rail');}else if(id==='soulforge'){const npc={id:`${id}-orren`,name:'ORREN / BELL ENGINEER',skin:'npc-orren',portrait:'portrait-orren',x:x+1470,y:floor-46,lines:[{speaker:'ORREN',text:'I built this bell to light our homes. The Regent fed it people instead. Tell Mira I am alive.'},{speaker:'AETHER',text:'How do I reach the Keeper?'},{speaker:'ORREN',text:'He guards until he strikes. Cut through his recovery, then carry the three stones to the heart.'}],choices:[{id:`${id}-echo`,label:'Call a courier echo',reward:{type:'spell',itemId:'clone'}},{id:`${id}-shield`,label:'Take a soul shield',reward:{type:'shield',value:45}}]};w.npcs.push(npc);path(top,x+1470,{npcId:npc.id});}else pickup('spell',x+1470,floor-28,'clone');path(top,x+1790);w.landmarks.push({type:'tower',x:x+1190,y:floor+160,seed:index});x+=1850;
  }else if(kind==='aqueduct'){
   const a=ground('sluice-entry',x,floor,400);path(a,x+300);relay(x+80,floor,label);const ys=[-65,20,-80,0];for(let j=0;j<4;j++){const s=path(block('aqueduct-span',x+530+j*330,floor+ys[j],200,34));if(j===1)foe('drone',s,60,'lightning');}const end=ground('cistern-bank',x+1880,floor,430);path(end,x+2170);pickup('spell',x+2080,floor-28,'stasis');w.hazards.push({id:tag('drowned-depth'),type:'water',x:x+400,y:1390,w:1480,h:40});w.landmarks.push({type:'water',x:x+530,y:floor+130,w:1350,seed:index});x+=2310;
  }else if(kind==='vault'){
   const a=ground('vault-entry',x,floor,400);path(a,x+300);path(block('vault-upper',x+500,floor-100,240,26,true));const c=path(block('rune-reliquary',x+860,floor-190,430,38),x+980);rune(c,x+1040,'tide-glass','stasis');const end=ground('vault-exit',x+1430,floor,530);path(end,x+1550);foe('shade',end,340,'shadow');path(end,x+1890);w.gates.push({id:tag('tide-seal'),requiresRelic:'tide-glass',x:x+1920,y:0,w:24,h:floor});secret(a,x+45,floor,[{type:'spell',itemId:'wolf'},{type:'treasure',itemId:'eclipse-fragment'}]);x+=1960;
  }else if(kind==='crypt'){
   const a=ground('crypt-lip',x,floor,320);path(a,x+260);path(block('crypt-stair',x+390,Math.min(1330,floor+110),280));floor=Math.min(1260,floor+220);const c=ground('crypt-floor',x+780,floor,1150);path(c,x+890);block('crypt-roof',x+1010,floor-225,650,40,false,'ceiling');foe('shade',c,440,'shadow');foe('mage',c,790,'cinder');w.props.push({id:tag('volatile-vessel'),type:'barrel',x:x+1300,y:floor-48,w:38,h:48,hp:12});cache(c,x+1730,[{type:'weapon',itemId:'rocket'},{type:'mana',value:60}]);path(c,x+1850);x+=1930;
  }else if(kind==='conduit'){
   const a=ground('engine-walk',x,floor,660);path(a,x+190);foe('sentinel',a,400,'lightning');path(a,x+560);const duct=path(block('engine-duct',x+760,floor-95,300));const c=ground('engine-switchyard',x+1200,floor,700);path(c,x+1300);tag('pressure-valve');const gateId=tag('pressure-door');path(c,x+1410);w.gates.push({id:gateId,x:x+1650,y:0,w:24,h:floor,autoOpenAt:{x:duct.x+35,y:duct.y,w:duct.w-70}});w.hazards.push({id:tag('steam-jet'),type:'steam',x:x+1510,y:floor-140,w:24,h:140,period:3.8,onTime:1.2,phase:1});pickup('cannon',x+1760,floor-28,null,2);pickup('nova',x+1820,floor-28,null,1);path(c,x+1850);w.landmarks.push({type:'pipes',x:x+970,y:floor,seed:index});x+=1900;
  }
  room.w=x-start;room.floorY=floor;w.landmarks.push({type:kind==='refuge'?'lantern':'arch',x:start+80,y:entryY,seed:index});if(index>0&&!['warden','hex','regent'].includes(kind))pickup('health',x-95,floor-28,null,25);
 }
 const aqueduct=w.rooms.find(r=>r.kind==='aqueduct'),tower=w.rooms.find(r=>r.kind==='spire'),crypt=w.rooms.find(r=>r.kind==='crypt');
 if(id==='tide'){
  w.currents.push({id:tag('undertow'),x:aqueduct.x+500,y:aqueduct.floorY-150,w:1300,h:300,vx:-55,vy:0});
  w.movingPlatforms.push({id:tag('raft'),kind:'raft',x:aqueduct.x+850,y:aqueduct.floorY+120,w:210,h:24,oneWay:true,axis:'x',distance:260,period:7,phase:0});
  w.bosses.forEach(b=>b.power='undertow');
 }
 if(id==='pyre'){
  const brittle=w.solids.filter(s=>s.kind==='platform'&&!s.oneWay).slice(0,3);for(const s of brittle)w.crumble.push({solidId:s.id,delay:.9,restore:4});
  const b=w.bosses[0];tag('furnace-valve');const gateId=tag('furnace-ward');
  w.gates.push({id:gateId,x:b.arenaStart+50,y:0,w:24,h:b.floorY,
   autoOpenAt:{x:b.arenaStart-105,y:b.floorY,w:70}});b.shieldGateId=gateId;
  const i=w.route.findIndex(m=>m.bossId===b.id);w.route.splice(i,0,{id:w.route[i].id,x:b.arenaStart-70,y:b.floorY,verb:'run'});w.bosses.forEach(b=>b.power='infernal');
 }
 if(id==='neon'){
  w.movingPlatforms.push({id:tag('lift'),kind:'lift',x:tower.x+1100,y:tower.floorY+150,w:130,h:24,oneWay:true,axis:'y',distance:290,period:6,phase:0});
  block('machinery-ceiling',crypt.x+950,crypt.floorY-250,200,24,false,'ceiling');w.bosses.forEach(b=>b.power='overload');
 }
 if(id==='veil'){
  const b=w.bosses[1],portalId=tag('betrayal');const npc={id:'veil-ysra',name:'YSRA · THE PROMISE EATER',skin:'witch',portrait:'portrait-ysra',x:b.arenaStart-95,y:b.floorY-46,
   lines:[{speaker:'YSRA',text:'I can give you a dragon. The dead will ask a little blood in return.'},{speaker:'AETHER',text:'Your circle is already open. What did you invite through?'},{speaker:'YSRA',text:'Accept and find out. Or walk away whole.'}],choices:[{id:'veil-pact',label:'Dragon pact · lose 25 life; face the ambush',cost:{hp:25},reward:{type:'spell',itemId:'dragon'},effect:{type:'ambush',enemyPortalId:portalId}},{id:'veil-refuse',label:'Refuse · restore resonance',reward:{type:'mana',value:35}}]};
  w.npcs.push(npc);w.enemyPortals.push({id:portalId,x:b.arenaStart+60,y:b.floorY-46,type:'shade',period:18,lifetime:8,requiresClaim:'choice:veil-pact'});
  const i=w.route.findIndex(m=>m.bossId===b.id);w.route.splice(i,0,{id:w.route[i].id,x:npc.x+12,y:b.floorY,verb:'run',npcId:npc.id});w.bosses.forEach(b=>b.power='mirror');
 }
 if(id==='soulforge'){
  w.combatStyle='sanctuary';w.pressureDisabled=true;for(const boss of w.bosses)boss.combatStyle='sanctuary';
  // Additions use explicit IDs after generation so existing saved claims never renumber.
  w.solids.push({id:'soulforge-hollow-practice-ledge',x:800,y:1210,w:150,h:22,oneWay:true,kind:'platform',biome:d.biome,material:d.surface});
  const span=w.solids.find(s=>s.id==='soulforge-aqueduct-span-42');span.x-=30;span.w+=30;
  const bank=w.solids.find(s=>s.id==='soulforge-cistern-bank-44'),drone=w.enemies.find(e=>e.id==='soulforge-drone-8');
  Object.assign(drone,{x:bank.x+140,y:bank.y-drone.h,minX:bank.x+12,maxX:bank.x+bank.w-drone.w-12,leashX:bank.x,leashW:bank.w});
  w.pickups.push(
   {id:'soulforge-hollow-practice-mana',type:'mana',x:875,y:1182,value:20},
   {id:'soulforge-hollow-root-shield',type:'shield',x:1270,y:1232,value:30},
   {id:'soulforge-hollow-choir-boost',type:'boost',x:6320,y:832,value:8},
   {id:'soulforge-hollow-crypt-rapid',type:'rapid',x:11200,y:1052,value:8},
   {id:'soulforge-hollow-storm-fuel',type:'fuel',x:14330,y:852,value:60});
  const guidance={refuge:'Find Mira. Hold jump to reach the low shelf; release to land sooner.',roots:'Watch the stalker wind up. Evade its lunge, then strike.',stair:'Climb the bell walkways and find Orren.',warden:'Let the Keeper commit. Strike during recovery to claim Ember.',aqueduct:'Cross the broken choir. The amber booster strengthens thrust.',vault:'Take Tideglass from the upper reliquary. Side vaults are optional.',crypt:'A sleeping bell waits through the raised rift. The descending passage leads onward.',hex:'Break the coven and awaken the dragon pact.',spire:'Climb above the engine to recover the Storm stone.',conduit:'Land on the upper duct to release the seal. Cross the steam while it rests.',regent:'Carry the three stones into the heart. Unbind the captive souls.'};
  w.zones.forEach((zone,index)=>zone.subtitle=guidance[w.rooms[index].kind]);
  // Optional upper crypt: explicit IDs keep every existing claim and relay stable.
  const beastFloor={id:'soulforge-bellbeast-floor',x:10550,y:460,w:1500,h:48,kind:'platform',material:d.surface,biome:d.biome};
  w.solids.push(beastFloor,
    {id:'soulforge-bellbeast-entry-ledge',x:10350,y:760,w:170,h:24,oneWay:true,kind:'platform',material:d.surface,biome:d.biome},
    {id:'soulforge-bellbeast-perch-west',x:10800,y:350,w:180,h:24,oneWay:true,kind:'platform',material:d.surface,biome:d.biome},
    {id:'soulforge-bellbeast-perch-east',x:11600,y:350,w:180,h:24,oneWay:true,kind:'platform',material:d.surface,biome:d.biome});
  w.enemies.push({id:'soulforge-bellbeast',name:'THE BELLBEAST',type:'bellbeast',visualFamily:'bellbeast',major:true,soulValue:80,
    x:11450,y:294,w:190,h:166,hp:580,shield:35,facing:-1,minX:10550,maxX:11860,leashX:10550,leashW:1500});
  w.portals.push({id:'soulforge-bellbeast-entry',pairId:'soulforge-bellbeast-pair',x:10440,y:714,w:34,h:46,
    to:{x:10640,y:414},label:'The sleeping bell',destinationId:'soulforge-bellbeast-return'});
  w.landmarks.push({type:'altar',x:11300,y:460,seed:127});
  w.optionalEncounters=[{id:'soulforge-bellbeast',portalId:'soulforge-bellbeast-entry',floorId:beastFloor.id,reward:80}];
 }
 // Each authored entrance has a visible dormant partner. Its reverse activates
 // only after passage, so old main-route destinations cannot steal a first run.
 for(const portal of [...w.portals]){
  portal.pairId ||= `${portal.id}-pair`;portal.destinationId ||= `${portal.id}-destination`;
  w.portals.push({id:portal.destinationId,pairId:portal.pairId,destinationId:portal.id,dormant:true,
    x:portal.to.x,y:portal.to.y,w:portal.w,h:portal.h,to:{x:portal.x,y:portal.y},label:portal.label});
 }
 w.width=x;w.boss=w.bosses.at(-1);w.exit={x:x-60,y:floor-70,w:50,h:70};path(w.solids.find(s=>s.kind==='ground'&&s.x+s.w===x),x-35);w.gates.push({id:`${id}-three-stone-seal`,requiresRelics:['ember-heart','tide-glass','storm-seal'],x:x-100,y:0,w:24,h:floor});return w;
}
export function buildRuneWorlds(){return Object.fromEntries(Object.entries(REALMS).map(([id,def])=>[id,createRealm(id,def)]));}
