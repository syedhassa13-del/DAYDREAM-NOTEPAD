(function(){
'use strict';
const key='daydream.reveal.seen.v1';
function reveal(){if(window.DaydreamAuth?.user)return;try{if(localStorage.getItem(key))return;localStorage.setItem(key,'true');}catch{}if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;document.body.classList.add('first-visit-reveal');setTimeout(()=>document.body.classList.remove('first-visit-reveal'),1400);}
function greeting(){const name=window.DaydreamAuth?.profile?.displayName?.trim();if(!name)return 'Welcome back.';const h=new Date().getHours(),period=h>=5&&h<12?'Good morning':h>=12&&h<17?'Good afternoon':h>=17&&h<22?'Good evening':'Welcome back';const options=[`${period}, ${name}.`,`Welcome back, ${name}.`,`Where shall we begin, ${name}?`,`What’s on your mind, ${name}?`];const storageKey='daydream.greeting.'+(window.DaydreamAuth?.user?.uid||'local');let last='';try{last=sessionStorage.getItem(storageKey)||'';}catch{}const available=[...new Set(options)].filter(s=>s!==last);const next=available[Math.floor(Math.random()*available.length)]||options[0];try{sessionStorage.setItem(storageKey,next);}catch{}return next;}
const accountScroll=new WeakMap();
function setupAccountScroll(el,inner){
 let state=accountScroll.get(el);if(state?.inner!==inner){state?.resize?.disconnect();
  inner.id='account-scroll-content';inner.tabIndex=0;inner.setAttribute('role','region');inner.setAttribute('aria-label','Account form');
  const button=document.createElement('button');button.type='button';button.className='account-scroll-more';button.hidden=true;button.setAttribute('aria-label','Show more account options below');button.setAttribute('aria-controls',inner.id);button.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';el.append(button);
  const update=()=>{const hidden=!el.open||inner.scrollHeight-inner.clientHeight-inner.scrollTop<=3;if(button.hidden!==hidden)button.hidden=hidden;if(hidden&&document.activeElement===button)inner.focus({preventScroll:true});};
  button.onclick=()=>inner.scrollBy({top:Math.max(140,inner.clientHeight*.7),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  inner.addEventListener('scroll',update,{passive:true});const resize=window.ResizeObserver?new ResizeObserver(update):null;resize?.observe(inner);state={inner,update,resize};accountScroll.set(el,state);
 }state.update();
}
function wrap(el){let inner=el.firstElementChild;if(!inner?.classList.contains('surface-scroll')){inner=document.createElement('div');inner.className='surface-scroll';while(el.firstChild)inner.append(el.firstChild);el.append(inner);}if(el.classList.contains('account-dialog'))setupAccountScroll(el,inner);}
window.addEventListener('resize',()=>document.querySelectorAll('.account-dialog').forEach(wrap));
document.fonts?.ready.then(()=>document.querySelectorAll('.account-dialog').forEach(wrap));
// The luminous rim belongs to the fixed surface; only its contents scroll.
const observer=new MutationObserver(()=>{document.querySelectorAll('dialog,.writer-sidebar').forEach(wrap);});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
document.querySelectorAll('dialog,.writer-sidebar').forEach(wrap);
window.DaydreamExperience={reveal,greeting};
})();
