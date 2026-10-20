(function(){
'use strict';
const q=s=>document.querySelector(s),repo=window.DaydreamRepository;
const storageKey=()=>window.DaydreamWorkspaceUI.isMobile()?'workspace-guide-mobile-v1':'workspace-guide-v1';
let key=storageKey();
const ctx=()=>window.DaydreamWorkspace?.context?.()||{};
const node=id=>[...document.querySelectorAll('[data-node-id]')].find(el=>el.dataset.nodeId===id);
let state=null,owner=null,loading=null,active=false,frame=0,persistTimer,history=[],opener=null,lastText='',fallback=false,expandedFor='';
const layer=document.createElement('div');layer.className='workspace-guide-layer';layer.hidden=true;
layer.innerHTML='<div class="guide-focus"></div><svg class="guide-arrow" aria-hidden="true"><defs><marker id="workspace-guide-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1 L7 4 L1 7"/></marker></defs><path class="guide-line" marker-end="url(#workspace-guide-arrow)"/></svg><aside class="workspace-guide-card" role="region" aria-label="Workspace guide"><div class="guide-top"><button type="button" data-guide-action="skip" aria-label="Dismiss workspace guide">×</button></div><p class="guide-copy" aria-live="polite"></p><div class="guide-controls"><button type="button" data-guide-action="back">Back</button><span class="guide-count"></span><button type="button" data-guide-action="next">Next</button></div><div class="guide-progress" aria-hidden="true"><span></span></div></aside>';
document.body.append(layer);
const card=layer.querySelector('.workspace-guide-card'),spot=layer.querySelector('.guide-focus');
const section=()=>ctx().sections?.find(d=>d.id===state?.sectionId)||ctx().sections?.[0];
const steps={
 create:{target:()=>q('[data-work="create-reality"]')||node('create'),text:'Create your alternative reality here.'},
 rename:{target:()=>node('root:'+ctx().reality?.id)?.querySelector('[data-node-edit]'),text:'Edit your world’s name with the pencil.'},
 connect:{target:()=>node('root:'+ctx().reality?.id)?.querySelector('[data-port="out"]'),text:'Drag this dot onto empty canvas to add a section.'},
 'open-section':{target:()=>node(section()?.id),text:'Click your section to open it.'},
 entry:{target:()=>q('[data-work="add-in-section"]'),text:()=>`Click ${q('[data-work="add-in-section"]')?.textContent.trim().replace(/^\+\s*/,'')||'Add entry'}.`},
 write:{target:()=>q('#document-title'),text:'Write your title and text here.'},
 canvas:{target:()=>q('.compact-header [data-work="canvas"]'),text:'Return to Canvas to see your nodes.'},
 manuscript:{target:()=>q('[data-node-kind="manuscript"]'),text:'World Manuscript brings all your writing together for export.'},
 capture:{target:()=>q('.compact-header a[href="#capture"]'),text:'Dream Capture keeps your quick ideas.'},
 'all-worlds':{target:()=>q('.compact-header .all-worlds-link'),text:'All Worlds returns to your realities.'},
 help:{target:()=>q('.compact-header [data-menu-toggle="help"]'),text:'Replay the guide and slideshow here.'}
};
const order=Object.keys(steps);
function persist(){clearTimeout(persistTimer);if(!state||!owner)return;const saved={...state,id:key,version:3},account=repo.active||repo,uid=owner;persistTimer=setTimeout(async()=>{if((repo.active||repo)!==account||(window.DaydreamAuth?.user?.uid||'guest')!==uid)return;try{await account.put('settings',saved);}catch{/* Guidance must never interrupt writing. */}},250);}
function setStep(step,remember=true,manual=false){if(!steps[step]||state?.step===step)return;if(remember&&state?.step)history.push(state.step);state={...state,step,status:'active',manual};lastText='';persist();refresh();}
function close(){active=false;expandedFor='';layer.hidden=true;cancelAnimationFrame(frame);frame=0;window.DaydreamWorkspaceUI?.closeMenus();window.DaydreamWorkspaceUI?.closeNavigation();}
function finish(status='complete'){if(state){state.status=status;persist();}close();if(opener?.isConnected)opener.focus({preventScroll:true});}
function initialStep(){const c=ctx();return location.hash==='#capture'?'all-worlds':c.view==='overview'?'create':c.view==='doc'?'write':c.view==='library'&&c.group?'entry':'rename';}
async function load(){const uid=window.DaydreamAuth?.user?.uid||(!window.DaydreamAuth?'guest':null);if(!uid)return false;const requested=storageKey();if(owner===uid&&key===requested&&state)return true;if(loading){await loading;return load();}close();owner=uid;key=requested;state=null;history=[];
 loading=(async()=>{let saved;try{await repo.open();saved=await repo.get('settings',requested);}catch{}if(owner!==uid||key!==requested)return false;state=saved?{...saved,version:3,manual:false,step:saved.version===3&&steps[saved.step]?saved.step:initialStep()}:{id:key,version:3,status:'new',step:initialStep()};return true;})().finally(()=>loading=null);return loading;}
async function maybeStart(){if(!document.body.classList.contains('workspace-active')||window.DaydreamAuth?.profilePending||q('dialog[open]'))return;if(!await load())return;if(!['new','active'].includes(state.status))return;if(state.status==='new')state.step=initialStep();state.status='active';active=true;persist();refresh();}
async function start(){if(!await load())return;window.DaydreamTutorial?.close();opener=document.activeElement;history=[];expandedFor='';state={id:key,version:3,status:'active',step:initialStep(),realityId:ctx().reality?.id};active=true;persist();refresh();}
function reconcile(){const c=ctx();if(c.reality&&location.hash!=='#capture'){state.realityId=c.reality.id;if(c.view==='library'&&c.group)state.sectionId=c.group;}
 if(state.manual)return;
 if(state.step==='create'&&c.reality&&location.hash.startsWith('#world/'))setStep('rename');
 else if(['connect','open-section'].includes(state.step)&&c.view==='library'&&c.group)setStep('entry');
 else if(['connect','open-section','entry'].includes(state.step)&&c.view==='doc')setStep('write');
 else if(state.step==='canvas'&&c.view==='canvas'&&location.hash.startsWith('#world/'))setStep('manuscript');
 else if(state.step==='manuscript'&&c.view==='manuscript'&&location.hash.startsWith('#world/'))setStep('capture');
 else if(['manuscript','capture'].includes(state.step)&&location.hash==='#capture'&&q('#capture-text'))setStep('all-worlds');
 else if(state.step==='all-worlds'&&location.hash==='#workspace'&&c.view==='overview')setStep('help');
}
function placement(rect,width,height,vw,vh){const gap=24,pad=12;const choices=[{x:rect.right+gap,y:rect.top},{x:rect.left-width-gap,y:rect.top},{x:rect.left,y:rect.bottom+gap},{x:rect.left,y:rect.top-height-gap}];const fit=choices.find(p=>p.x>=pad&&p.x+width<=vw-pad&&p.y>=pad&&p.y+height<=vh-pad);const p=fit||choices.reduce((a,b)=>{const overflow=p=>Math.max(0,pad-p.x)+Math.max(0,p.x+width-vw+pad)+Math.max(0,pad-p.y)+Math.max(0,p.y+height-vh+pad);return overflow(a)<overflow(b)?a:b;});return {x:Math.max(pad,Math.min(p.x,vw-width-pad)),y:Math.max(pad,Math.min(p.y,vh-height-pad))};}
function render(){if(!active||!state)return;reconcile();if(!active)return;
 const c=ctx(),modal=q('dialog[open]');if(!document.body.classList.contains('workspace-active')||window.DaydreamAuth?.profilePending||modal?.classList.contains('tutorial-dialog')||modal?.classList.contains('account-dialog')){layer.hidden=true;return;}
 const step=steps[state.step];let target=step.target();fallback=!target;const navigationKey=state.step+location.hash;if(target?.closest('.writer-actions')&&window.DaydreamWorkspaceUI.isMobile()&&expandedFor!==navigationKey){window.DaydreamWorkspaceUI.openNavigation();const group=target.closest('.workspace-dropdown');if(group&&target.closest('.workspace-menu'))window.DaydreamWorkspaceUI.openMenu(group.dataset.menuGroup);expandedFor=navigationKey;}if(target?.closest('.writer-actions')&&window.DaydreamWorkspaceUI.isMobile()&&!q('.compact-header.navigation-open'))target=q('[data-mobile-nav]');
 if(!target)target=q('.compact-header [data-work="canvas"]')||q('.compact-header .all-worlds-link');if(!target){layer.hidden=true;return;}
 if(modal){layer.hidden=true;return;}
 const parent=modal||document.body;if(layer.parentElement!==parent)parent.append(layer);layer.hidden=false;
 let text=typeof step.text==='function'?step.text():step.text;
 spot.hidden=fallback;layer.querySelector('.guide-arrow').style.display=fallback?'none':'';
 if(lastText!==text){layer.querySelector('.guide-copy').textContent=text;lastText=text;}
 const next=layer.querySelector('[data-guide-action="next"]');next.disabled=false;next.textContent=state.step==='help'?'Finish':'Next';
 layer.querySelector('[data-guide-action="back"]').disabled=!history.length;
 const n=order.indexOf(state.step)+1;layer.querySelector('.guide-count').textContent=`${n} / ${order.length}`;layer.querySelector('.guide-progress span').style.width=`${n/order.length*100}%`;
 let rect=target.getBoundingClientRect();const vw=window.innerWidth,vh=window.innerHeight;
 if(rect.bottom<0||rect.top>vh||rect.right<0||rect.left>vw){const graphNode=target.closest('[data-node-id]');if(graphNode){window.DaydreamNodeCanvas?.reveal(graphNode.dataset.nodeId);rect=target.getBoundingClientRect();}else target.scrollIntoView?.({block:'nearest',inline:'nearest'});}
 Object.assign(spot.style,{left:`${Math.max(2,rect.left-5)}px`,top:`${Math.max(2,rect.top-5)}px`,width:`${rect.width+10}px`,height:`${rect.height+10}px`});
 const box=card.getBoundingClientRect(),p=placement(rect,box.width||280,box.height||100,vw,vh);card.style.left=p.x+'px';card.style.top=p.y+'px';
 const line=straightArrow(rect,{left:p.x,top:p.y,width:box.width||280,height:box.height||100});
 layer.querySelector('.guide-line').setAttribute('d',line);

}
function refresh(){if(!active||frame)return;frame=requestAnimationFrame(()=>{frame=0;render();});}
function straightArrow(rect,box){const cx=box.left+box.width/2,cy=box.top+box.height/2,tx=rect.left+rect.width/2,ty=rect.top+rect.height/2,dx=tx-cx,dy=ty-cy,distance=Math.hypot(dx,dy);if(distance<1)return '';const from=Math.min(box.width/2/(Math.abs(dx)||1),box.height/2/(Math.abs(dy)||1)),to=Math.min(rect.width/2/(Math.abs(dx)||1),rect.height/2/(Math.abs(dy)||1));return `M ${cx+dx*from} ${cy+dy*from} L ${tx-dx*to} ${ty-dy*to}`;}
function manualNext(){const i=order.indexOf(state.step)+1;if(i>=order.length){finish();return;}setStep(order[i],true,true);}
layer.addEventListener('click',e=>{const action=e.target.closest('[data-guide-action]')?.dataset.guideAction;if(action==='skip')finish('dismissed');if(action==='back'&&history.length)setStep(history.pop(),false,true);if(action==='next')manualNext();});
function documentInteraction(e){if(active&&state.step==='write'&&e.target.closest('#document-title,#document-body'))setStep('canvas');}
document.addEventListener('pointerdown',documentInteraction,true);
document.addEventListener('input',documentInteraction,true);
document.addEventListener('click',e=>{
 if(e.target.closest('[data-guide-start]')){window.DaydreamWorkspaceUI.closeMenus();start();return;}
 if(!active||layer.contains(e.target))return;
 state.manual=false;documentInteraction(e);
 if(state.step==='rename'&&e.target.closest('[data-node-edit]'))setStep('connect');
 else if(state.step==='help'&&e.target.closest('[data-menu-toggle="help"]'))finish();
 else if(state.step==='canvas'&&e.target.closest('[data-work="canvas"]'))state.manual=false;
 else if(['manuscript','capture'].includes(state.step)&&e.target.closest('.compact-header a[href="#capture"]'))setStep('capture');
 else if(state.step==='all-worlds'&&e.target.closest('.all-worlds-link'))state.manual=false;
 refresh();
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active&&!q('dialog[open]'))finish('dismissed');});
window.addEventListener('daydream:workspace-action',e=>{if(!active)return;const d=e.detail||{};if(d.action==='reality-created'){state.realityId=d.realityId;setStep('rename');}else if(d.action==='section-created'){state.sectionId=d.sectionId;setStep('open-section');}refresh();});
window.addEventListener('daydream:account-changed',()=>{const uid=window.DaydreamAuth?.user?.uid;if(uid!==owner){clearTimeout(persistTimer);close();state=null;owner=null;history=[];}refresh();});
window.addEventListener('hashchange',refresh);window.addEventListener('daydream:canvas-view',refresh);window.addEventListener('resize',()=>{expandedFor='';if(storageKey()!==key)maybeStart();else refresh();});document.addEventListener('scroll',refresh,true);
new MutationObserver(records=>{if(records.some(r=>r.target!==layer&&!layer.contains(r.target)))refresh();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
window.DaydreamGuide={start,maybeStart,close,refresh,get step(){return active?state?.step:null;},placement,straightArrow};
})();
