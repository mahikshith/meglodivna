"""Verify the exact signed offline payload before publishing a test APK."""
import argparse, hashlib, json, re, subprocess, zipfile
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('apk',type=Path)
parser.add_argument('--dist',type=Path,default=Path('dist'))
parser.add_argument('--apksigner',required=True)
parser.add_argument('--aapt',required=True)
parser.add_argument('--source-commit',required=True)
parser.add_argument('--ci-url',required=True)
parser.add_argument('--output',type=Path,default=Path('artifacts/android-report.json'))
a=parser.parse_args()
def command(*args):
    return subprocess.check_output(args,text=True,encoding='utf-8',errors='replace')
def sha(data):return hashlib.sha256(data).hexdigest()
signature=command(a.apksigner,'verify','--verbose','--print-certs',str(a.apk))
certificate=re.search(r'Signer #1 certificate SHA-256 digest: (\w+)',signature).group(1)
assert certificate=='d5957205feb0467218e7a0483387e65a347516bbb6511c2e7b5007ff165cc437','Signing certificate changed'
assert 'Number of signers: 1' in signature and 'v2): true' in signature,'Expected one valid v2 signer'
badging=command(a.aapt,'dump','badging',str(a.apk))
assert "name='com.meglodivna.ashsignal' versionCode='11' versionName='0.10.0-lantern'" in badging
assert 'android.permission.INTERNET' not in badging
files={p.relative_to(a.dist).as_posix():p.read_bytes() for p in a.dist.rglob('*') if p.is_file()}
with zipfile.ZipFile(a.apk) as z:
    embedded={name.removeprefix('assets/public/'):z.read(name) for name in z.namelist() if name.startswith('assets/public/') and not name.endswith('/')}
assert set(files)==set(embedded),f'Missing/stale bundled assets: {set(files)^set(embedded)}'
assert all(files[name]==embedded[name] for name in files),'APK differs from production web payload'
report={'artifact':a.apk.name,'package':'com.meglodivna.ashsignal','version':'0.10.0-lantern','versionCode':11,'minSdk':24,'targetSdk':36,'bytes':a.apk.stat().st_size,'sha256':sha(a.apk.read_bytes()),'signature':'v2 verified, one signer','certificateSha256':certificate,'persistentCIKey':True,'sameCertificateAsDeliveredV03APK':True,'sourceCommit':a.source_commit,'ciRun':a.ci_url,'verifiedEmbeddedFiles':sorted(files),'embeddedSha256':{name:sha(data) for name,data in sorted(files.items())},'staleWebAssets':0,'internetPermission':False,'physicalDeviceTested':False,'limitations':'Debug test build. Physical Android comfort, frame rate, thermals and audio mix remain unmeasured.'}
a.output.parent.mkdir(parents=True,exist_ok=True)
a.output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({k:report[k] for k in ['artifact','bytes','sha256','version','versionCode','sourceCommit']},indent=2))
print(f'Verified all {len(files)} embedded web/license/art files.')
