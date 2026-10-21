const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const {SpeechInput}=require('../dist/speech-input.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const result=(text,isFinal=true)=>Object.assign([{transcript:text}],{isFinal});
(async()=>{
 let instances=[],texts=[],ended=0;
 class Recognition{
  constructor(){instances.push(this);}
  start(){this.onstart?.();}
  stop(){this.onend?.();}
  abort(){}
 }
 const speech=new SpeechInput(Recognition,{onText:t=>texts.push(t),onInterim(){},onStatus(){},onEnd(){ended++;}});
 speech.start('en-US');let mic=instances.at(-1);
 mic.onresult({resultIndex:0,results:[result('Beyond the observatory, unfamiliar constellations shimmered.'),result('The archivist',false)]});
 mic.onresult({resultIndex:1,results:[result('Beyond the observatory, unfamiliar constellations shimmered.'),result('The archivist continued across the courtyard.')]});
 assert.equal(texts.length,2);mic.onend();await sleep(340);assert.equal(instances.length,2);assert.equal(speech.active,true);
 mic=instances.at(-1);mic.onresult({resultIndex:0,results:[result('After a pause, the story continued.')]});await speech.stop();assert.equal(ended,1);assert.equal(speech.active,false);assert.equal(texts.length,3);await sleep(340);assert.equal(instances.length,2);
 speech.start('ur-PK');mic=instances.at(-1);assert.equal(mic.lang,'ur-PK');mic.onerror({error:'not-allowed'});mic.onend();await sleep(340);assert.equal(speech.active,false);assert.equal(instances.length,3);
 speech.start('en-US');instances.at(-1).onend();speech.abort();await sleep(340);assert.equal(instances.length,4);
 console.log('PASS multi-sentence recognition, session restarts, duplicate events, stop, permission denial and abort');
 const dom=new JSDOM('<div id="workspace-content"></div>',{url:'https://example.test/#capture',runScripts:'outside-only'}),w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 let saved=[],calls=0;w.SpeechRecognition=Recognition;
 w.DaydreamDB={escape:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),TYPES:{note:'Note'}};
 w.DaydreamRepository={open:async()=>{},all:async table=>table==='captures'?saved:[],get:async(table,id)=>table==='realities'?{id,name:'My world'}:saved.find(c=>c.id===id),saveCapture:async c=>{calls++;const next={...c,id:c.id||'capture1'};saved=[next];return next;}};
 w.DaydreamWorkspace={context:()=>({reality:{id:'world1',name:'My world'}})};
 for(const file of ['speech-input.js','workspace-ui.js','dream-capture.js'])w.eval(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'));
 await w.DaydreamCapture.render();
 assert.equal(w.document.querySelectorAll('header').length,1);
 assert.equal(w.document.querySelector('.compact-header a[title="Return to canvas"]').getAttribute('href'),'#world/world1/canvas');
 assert.equal(w.document.querySelector('.compact-header a[aria-current=page]').textContent,'Dream Capture');
 assert.equal(w.document.querySelector('.storage-note'),null);assert.equal(w.document.querySelector('.speech-area'),null);
 assert.equal(w.document.querySelector('[data-capture-action=save]'),null);assert.ok(w.document.querySelector('.capture-input-wrap #voice-start'));
 const field=w.document.querySelector('#capture-text');field.value='Existing writing.';field.dispatchEvent(new w.Event('input',{bubbles:true}));
 w.document.querySelector('#voice-start').click();assert.equal(w.document.querySelector('dialog').open,true);w.document.querySelector('#speech-allow').click();mic=instances.at(-1);
 mic.onresult({resultIndex:0,results:[result('Ethan crossed',false)]});assert.equal(field.value,'Existing writing. Ethan crossed');
 mic.onresult({resultIndex:0,results:[result('Ethan crossed the extraordinary landscape.',false)]});assert.equal(field.value,'Existing writing. Ethan crossed the extraordinary landscape.');
 mic.onresult({resultIndex:0,results:[result('Ethan crossed the extraordinary landscape.'),result('His journey had only just begun.',false)]});
 assert.equal(field.value,'Existing writing. Ethan crossed the extraordinary landscape. His journey had only just begun.');
 mic.onresult({resultIndex:1,results:[result('Ethan crossed the extraordinary landscape.'),result('His journey had only just begun.')]});
 await w.DaydreamCapture.beforeNavigate();assert.equal(field.value,'Existing writing. Ethan crossed the extraordinary landscape. His journey had only just begun.');assert.equal(saved[0].text,field.value);assert.equal(calls,1);assert.equal(w.document.querySelector('#voice-start').hidden,false);
 await w.DaydreamCapture.render();w.document.querySelector('#voice-start').click();assert.equal(w.document.querySelector('dialog').open,false);mic=instances.at(-1);mic.onresult({resultIndex:0,results:[result('Another passage.')]});

 const liveField=w.document.querySelector('#capture-text');assert.ok(liveField.value.endsWith('Another passage.'));
 liveField.dispatchEvent(new w.InputEvent('beforeinput',{bubbles:true,inputType:'insertText',data:'Typed edit'}));
 liveField.value+=' Typed edit';liveField.dispatchEvent(new w.Event('input',{bubbles:true}));
 await w.DaydreamCapture.beforeNavigate();assert.ok(saved[0].text.endsWith('Another passage. Typed edit'));
 w.DaydreamCapture.reset();await sleep(340);assert.ok(!w.DaydreamCapture.hasUnsaved());dom.window.close();
 console.log('PASS in-box microphone, live partial words and revisions, preserved text, save-before-navigation, one header and Canvas return');
 const fallback=new JSDOM('<div id="workspace-content"></div>',{url:'https://example.test/#capture',runScripts:'outside-only'}),v=fallback.window;
 v.HTMLDialogElement.prototype.close=function(){};v.DaydreamDB=w.DaydreamDB;v.DaydreamRepository=w.DaydreamRepository;v.DaydreamWorkspaceUI={header:()=>'<header></header>'};v.eval(fs.readFileSync(path.join(__dirname,'../dist/dream-capture.js'),'utf8'));await v.DaydreamCapture.render();assert.ok(v.document.querySelector('.speech-fallback'));assert.equal(v.document.querySelector('#voice-start'),null);fallback.window.close();
 console.log('PASS unsupported-browser typing fallback');
})().catch(e=>{console.error(e);process.exitCode=1;});
