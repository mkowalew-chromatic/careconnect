import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const mutations = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'mutations.json'), 'utf8'));
const [id, flag, ref] = process.argv.slice(2);
if (!(id in mutations) || (flag && flag !== '--restore') || (flag === '--restore' && !ref)) throw Error('Usage: node se-demo-kit/mutate.mjs SCENARIO [--restore BASELINE_COMMIT]');
const repo=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const m=mutations[id], path=join(repo,m.path);
if(!existsSync(join(repo,'packages/design-system/chromatic.config.json'))) throw Error('Run inside a CareConnect checkout');
const old=readFileSync(path,'utf8');
if(flag==='--restore') {
 if(!/^[a-f0-9]{7,40}$/i.test(ref)) throw Error('Use the pinned hexadecimal baseline commit ID');
 const original=execFileSync('git',['show',ref+':'+m.path],{encoding:'utf8'});
 const expected=original.split(m.before).length===2?original.replace(m.before,m.after):null;
 if(old!==original && old!==expected) throw Error('File includes unrelated changes; refusing to overwrite');
 writeFileSync(path,original);console.log('Restored '+m.path+' from '+ref);
} else {
 if(old.split(m.before).length!==2) throw Error('Expected exactly one unchanged mutation anchor; refusing to edit');
 writeFileSync(path,old.replace(m.before,m.after));console.log('Applied '+id+' to '+m.path);
}
