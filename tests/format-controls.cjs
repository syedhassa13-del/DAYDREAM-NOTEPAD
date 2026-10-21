const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<div id="toolbar"></div><div id="body" contenteditable="true" tabindex="0"><p>Ethan ran away.</p><p>Another paragraph.</p></div>',{runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.eval(fs.readFileSync(path.join(__dirname,'../dist/writing-format.js'),'utf8'));
const body=d.getElementById('body'),toolbar=d.getElementById('toolbar');toolbar.innerHTML=w.DaydreamFormat.toolbar();let changes=0;
const format=w.DaydreamFormat.mount(body,toolbar,()=>changes++);
function selectFirst(){body.focus();const r=d.createRange();r.setStart(body.querySelector('p').firstChild,0);r.setEnd(body.querySelector('p').firstChild,5);w.getSelection().removeAllRanges();w.getSelection().addRange(r);d.dispatchEvent(new w.Event('selectionchange'));}
function control(property,value){const input=toolbar.querySelector(`[data-style="${property}"]`);input.focus();w.getSelection().removeAllRanges();d.dispatchEvent(new w.Event('selectionchange'));input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(d.activeElement,input,'Formatting must not steal focus');return input;}
selectFirst();const size=control('font-size','20');
assert.equal(body.querySelector('span').textContent,'Ethan');assert.equal(body.querySelector('span').style.fontSize,'20pt');
size.value='24';size.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(body.querySelector('span').style.fontSize,'24pt');assert.equal(body.querySelectorAll('span').length,1,'Repeated size steps must not build nested spans');assert.equal(format.range().toString(),'Ethan');
const committed=changes;size.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(changes,committed,'Blur/change must not apply the same live change twice');
const line=control('line-height','1.7');assert.equal(body.querySelector('p').style.lineHeight,'1.7');assert.equal(body.querySelectorAll('p')[1].style.lineHeight,'');
line.value='1.8';line.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(body.querySelector('p').style.lineHeight,'1.8');assert.equal(d.activeElement,line);assert.equal(format.range().toString(),'Ethan');
const wheel=new w.WheelEvent('wheel',{deltaY:-100,bubbles:true,cancelable:true});line.dispatchEvent(wheel);assert.equal(wheel.defaultPrevented,true);assert.equal(line.value,'1.9');assert.equal(body.querySelector('p').style.lineHeight,'1.9');
line.value='';line.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(body.querySelector('p').style.lineHeight,'1.9');line.value='9';line.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(body.querySelector('p').style.lineHeight,'1.9','Out-of-range input must not affect writing');
body.focus();const unownedWheel=new w.WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true});line.dispatchEvent(unownedWheel);assert.equal(unownedWheel.defaultPrevented,false,'Unfocused controls must not hijack scrolling');
assert.ok(w.DaydreamFormat.sanitize(body.innerHTML).includes('line-height: 1.9'));assert.equal(body.textContent,'Ethan ran away.Another paragraph.');
format.dispose();dom.window.close();console.log('PASS live formatting preserves selection and control focus; repeated steps, wheel, validation and saving remain predictable');
