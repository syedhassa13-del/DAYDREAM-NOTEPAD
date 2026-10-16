// Exercise the production Firebase adapter with mocked SDK transport, not a replacement repository.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let count=0;
const test=async(name,fn)=>{await fn();count++;console.log('PASS '+name);};
(async()=>{
 const records=new Map(),calls=[],copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
 const snapshot=(ref)=>({exists:()=>records.has(ref.path),data:()=>copy(records.get(ref.path)),path:ref.path});
 const dbSDK={
  getFirestore:app=>({app}),doc:(db,...parts)=>({db,path:parts.join('/')}),collection:(db,...parts)=>({db,path:parts.join('/')}),
  getDoc:async ref=>{calls.push(['get',ref.path]);return snapshot(ref);},
  documentId:()=>('__name__'),where:(...args)=>({op:'where',args}),orderBy:(...args)=>({op:'order',args}),startAfter:(...args)=>({op:'after',args}),limit:(n)=>({op:'limit',n}),query:(ref,...constraints)=>({ref,constraints}),
  getDocs:async query=>{calls.push(['list',query]);const where=query.constraints.find(c=>c.op==='where'),after=query.constraints.find(c=>c.op==='after'),limit=query.constraints.find(c=>c.op==='limit').n;
   const docs=[...records.keys()].filter(k=>k.startsWith(query.ref.path+'/')&&(!where||records.get(k).value.realityId===where.args[2])&&(!after||k>after.args[0].path)).sort().slice(0,limit).map(k=>snapshot({path:k}));return {docs,size:docs.length};},
  runTransaction:async(db,fn)=>{const writes=[];const result=await fn({get:async ref=>snapshot(ref),set:(ref,value)=>writes.push([ref.path,copy(value)])});for(const [key,value] of writes)records.set(key,value);return result;}
 };
 let config;
 const context={window:{},navigator:{onLine:true},encodeURIComponent,Promise,Map,Error,
  sdk:{app:{initializeApp:c=>(config=c)},auth:{getAuth:app=>({app})},db:dbSDK}};
 let source=fs.readFileSync(path.resolve(__dirname,'../dist/firebase-client.js'),'utf8');
 for(const [file,sdk] of [['app','app'],['auth','auth'],['firestore-lite','db']])source=source.replace(`import(base+'firebase-${file}.js')`,`Promise.resolve(sdk.${sdk})`);
 vm.runInNewContext(source,context);
 const firebase=await context.window.DaydreamFirebaseReady,remote=firebase.makeRemote('alice');
 await test('production Firebase wiring uses the intended project and UID-scoped escaped paths',async()=>{
  assert.equal(config.projectId,'daydream-47a16');assert.equal(config.authDomain,'daydream-47a16.firebaseapp.com');
  await remote.get('documents','world/entry');assert.deepEqual(calls.at(-1),['get','users/alice/documents/world%2Fentry']);
  await firebase.makeRemote('bob').get('documents','world/entry');assert.equal(calls.at(-1)[1],'users/bob/documents/world%2Fentry');
 });
 await test('production cloud writes are atomic, revisioned, idempotent and preserve conflicts',async()=>{
  const first={id:'job-1',ops:[{table:'documents',value:{id:'chapter',realityId:'world',name:'Runaway',html:'<p>Saved</p>'}},{table:'catalog',value:{id:'chapter',realityId:'world',name:'Runaway'}}],expected:{'documents/chapter':0,'catalog/chapter':0}};
  await remote.commit(first);assert.equal(records.get('users/alice/documents/chapter').revision,1);await remote.commit(first);assert.equal(records.get('users/alice/documents/chapter').revision,1);
  const stale={...first,id:'stale',ops:[{table:'documents',value:{...first.ops[0].value,html:'<p>Stale</p>'}}]};await assert.rejects(remote.commit(stale),e=>e.code==='daydream/conflict');assert.equal(records.get('users/alice/documents/chapter').value.html,'<p>Saved</p>');
  await remote.commit({id:'job-2',ops:[{table:'documents',remove:'chapter'}],expected:{'documents/chapter':1}});const row=records.get('users/alice/documents/chapter');assert.equal(row.deleted,true);assert.equal(row.value.realityId,'world');assert.equal(row.revision,2);
  context.navigator.onLine=false;await assert.rejects(remote.commit(first),/offline/);context.navigator.onLine=true;
 });
 await test('production metadata listing pages by world and keeps other accounts separate',async()=>{
  for(let i=0;i<251;i++)records.set('users/alice/catalog/'+String(i).padStart(3,'0'),{value:{id:String(i),realityId:'large-world'},revision:1,deleted:false});
  records.set('users/bob/catalog/private',{value:{id:'private',realityId:'large-world'},revision:1});
  const before=calls.filter(c=>c[0]==='list').length,rows=await remote.list('catalog','large-world');assert.equal(rows.length,251);assert.equal(calls.filter(c=>c[0]==='list').length-before,2);assert.ok(rows.every(r=>r.value.realityId==='large-world'));assert.ok(!rows.some(r=>r.value.id==='private'));
 });
 console.log(`${count} Firebase adapter groups passed (mocked SDK; live permissions not verified).`);
})().catch(e=>{console.error(e);process.exit(1);});
