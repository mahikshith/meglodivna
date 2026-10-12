import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readdirSync,writeFileSync,statSync} from 'node:fs';
const execute=promisify(execFile),minutes=Number(process.argv[2]||30);
if(!Number.isFinite(minutes)||minutes<30||minutes>40)throw Error('Deep harness requires 30–40 actual minutes.');
const started=Date.now(),deadline=started+minutes*60000;
const report={started:new Date(started).toISOString(),requestedMinutes:minutes,method:'Fresh-process simulation stress and Node regressions, with varying seeds and checkpoint fixtures. Wall-clock timed, no idle duration counted as simulated gameplay.',rounds:[],failures:[]};
let iteration=0;
while(Date.now()<deadline){
  iteration++;const round={iteration,at:new Date().toISOString(),sourceModified:statSync('src/combat.js').mtime.toISOString()};
  try{
    const result=await execute(process.execPath,['scripts/soak-world.mjs',String(iteration)],{timeout:45000,maxBuffer:1024*1024});
    round.soak=JSON.parse(result.stdout.trim());
    const files=readdirSync('tests').filter(f=>f.endsWith('.test.js')).map(f=>`tests/${f}`);
    const tests=await execute(process.execPath,['--test',...files],{timeout:45000,maxBuffer:1024*1024});
    round.tests=tests.stdout.match(/(?:# |ℹ )?(?:tests|pass|fail) \d+/g)?.slice(-3)||'passed';round.status='passed';
  }catch(error){round.status='failed';round.error=String(error.stdout||error.stderr||error.message).slice(-8000);report.failures.push({iteration,error:round.error});}
  report.rounds.push(round);report.elapsedSeconds=(Date.now()-started)/1000;
  writeFileSync('artifacts/deep-harness-report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({iteration,status:round.status,elapsedSeconds:+report.elapsedSeconds.toFixed(1),worlds:round.soak?.worlds,steps:round.soak?.steps,error:round.status==='failed'?round.error.slice(-500):undefined}));
  const wait=Math.min(45000,Math.max(0,deadline-Date.now()));
  if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
}
report.finished=new Date().toISOString();report.elapsedSeconds=(Date.now()-started)/1000;
report.status=report.rounds.at(-1)?.status==='passed'?'passed':'failed';
writeFileSync('artifacts/deep-harness-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({finished:report.finished,status:report.status,elapsedSeconds:report.elapsedSeconds,rounds:report.rounds.length,transientFailures:report.failures.length}));
if(report.status!=='passed')process.exitCode=1;
