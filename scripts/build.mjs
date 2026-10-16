import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const html=await readFile(path.join(dist,'index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
 const ref=match[1];if(/^(?:https?:|data:|mailto:)/.test(ref))continue;
 const target=path.resolve(dist,ref.split('?')[0]);if(!target.startsWith(dist+path.sep))throw Error('Asset outside dist: '+ref);await stat(target);
}
for(const file of await readdir(dist)){if(file.endsWith('.js'))new vm.Script(await readFile(path.join(dist,file),'utf8'),{filename:file});}
const config=JSON.parse(await readFile(path.join(root,'vercel.json'),'utf8'));if(config.outputDirectory!=='dist')throw Error('Vercel must publish dist.');
console.log('Build ready: dist (static files; no bundler or runtime dependencies). All linked local assets exist; client scripts parse.');
