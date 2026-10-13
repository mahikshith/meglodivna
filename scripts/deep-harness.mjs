import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readdirSync,writeFileSync,readFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const execute=promisify(execFile),minutes=Number(process.argv[2]||30);
if(!Number.isFinite(minutes)||minutes<30||minutes>40)throw Error('Deep harness requires 30–40 actual minutes.');
const sourceFiles=['src/combat.js','src/physics.js','src/level.js','src/rune-worlds.js','src/catalog.js','src/progress.js','scripts/combat-route.mjs','scripts/soak-world.mjs'];
const sourceHashes=()=>Object.fromEntries(sourceFiles.map(file=>[file,createHash('sha256').update(readFileSync(file)).digest('hex')]));
const signature=hashes=>createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
const baseline=sourceHashes(),started=Date.now(),deadline=started+minutes*60000;
mkdirSync('artifacts',{recursive:true});
const report={started:new Date(started).toISOString(),requestedMinutes:minutes,sourceHashes:baseline,sourceHash:signature(baseline),method:'Continuous fresh-process simulation stress and Node regressions, varying30/60/120Hz inputs and checkpoint fixtures; all8 legal spawn-to-exit campaigns are repeated every5rounds. Actual wall-clock duration and simulated seconds recorded separately. No idle wait or browser/device-performance claim. Any failed round or simulation-source hash change fails this run.',rounds:[],failures:[]};
const campaigns=[['ember','soulforge'],['forge','soulforge'],['inferno','soulforge'],['extinction','soulforge'],['forge','tide'],['forge','pyre'],['forge','neon'],['forge','veil']];
let iteration=0;
while(Date.now()<deadline){
  iteration++;const round={iteration,at:new Date().toISOString(),sourceHash:signature(sourceHashes())};
  try{
    if(round.sourceHash!==report.sourceHash)throw Error('Simulation source changed after the clean harness started.');
    const result=await execute(process.execPath,['scripts/soak-world.mjs',String(iteration)],{timeout:45000,maxBuffer:1024*1024});
    round.soak=JSON.parse(result.stdout.trim());
    const files=readdirSync('tests').filter(f=>f.endsWith('.test.js')).map(f=>`tests/${f}`);
    const tests=await execute(process.execPath,['--test',...files],{timeout:45000,maxBuffer:1024*1024});
    round.tests=tests.stdout.match(/(?:# |ℹ )?(?:tests|pass|fail) \d+/g)?.slice(-3)||'passed';
    if(iteration%5===1){
      round.campaigns=[];
      for(const [difficulty,worldId] of campaigns){
        await execute(process.execPath,['scripts/combat-route.mjs',difficulty,worldId],{timeout:45000,maxBuffer:1024*1024});
        const proof=JSON.parse(readFileSync(`artifacts/combat-route-${worldId}-${difficulty}-report.json`,'utf8'));
        round.campaigns.push({difficulty,worldId,status:proof.status,elapsed:proof.elapsed,deaths:proof.deaths,hp:proof.hp});
      }
    }
    if(signature(sourceHashes())!==report.sourceHash)throw Error('Simulation source changed during a harness round.');
    round.status='passed';
  }catch(error){round.status='failed';round.error=String(error.stdout||error.stderr||error.message).slice(-8000);report.failures.push({iteration,error:round.error});}
  report.rounds.push(round);report.elapsedSeconds=(Date.now()-started)/1000;
  writeFileSync('artifacts/deep-harness-report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({iteration,status:round.status,elapsedSeconds:+report.elapsedSeconds.toFixed(1),worlds:round.soak?.worlds,steps:round.soak?.steps,error:round.status==='failed'?round.error.slice(-500):undefined}));
  if(round.error?.includes('Simulation source changed'))break;
}
report.finished=new Date().toISOString();report.elapsedSeconds=(Date.now()-started)/1000;
report.simulatedSeconds=report.rounds.reduce((sum,round)=>sum+(round.soak?.simulatedSeconds||0),0);
report.steps=report.rounds.reduce((sum,round)=>sum+(round.soak?.steps||0),0);
report.legalCampaigns=report.rounds.reduce((sum,round)=>sum+(round.campaigns?.length||0),0);
report.status=report.failures.length===0&&report.elapsedSeconds>=minutes*60?'passed':'failed';
writeFileSync('artifacts/deep-harness-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({finished:report.finished,status:report.status,elapsedSeconds:report.elapsedSeconds,rounds:report.rounds.length,transientFailures:report.failures.length}));
if(report.status!=='passed')process.exitCode=1;
