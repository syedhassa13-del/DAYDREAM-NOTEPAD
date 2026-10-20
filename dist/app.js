const menu=document.querySelector('.mobile-toggle'),nav=document.querySelector('nav');
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');nav.classList.toggle('open',open);});
nav.querySelectorAll('a,button').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');}));
let routing=0;
const protectedRoute=hash=>hash==='#workspace'||hash==='#capture'||hash.startsWith('#world/');
function showLanding(){document.getElementById('landing').hidden=false;document.getElementById('workspace').hidden=true;document.body.classList.remove('workspace-active','graph-active');window.DaydreamNodeCanvas.dispose();}
async function route(){
 const token=++routing;await window.DaydreamAuth?.ready;await window.DaydreamAuth?.switching;if(token!==routing)return;
 document.body.classList.remove('auth-checking');
 if(protectedRoute(location.hash)&&window.DaydreamAuth&&!window.DaydreamAuth.user){const destination=location.hash;showLanding();history.replaceState(null,'','#home');window.DaydreamAuth.require(destination);return;}
 if(!await window.DaydreamStoryEditor.beforeNavigate()||!await window.DaydreamCapture.beforeNavigate()||token!==routing)return;
 const workspace=protectedRoute(location.hash);document.getElementById('landing').hidden=workspace;document.getElementById('workspace').hidden=!workspace;document.body.classList.toggle('workspace-active',workspace);document.body.classList.toggle('graph-active',workspace&&location.hash!=='#capture');
 if(!workspace||location.hash==='#capture')window.DaydreamNodeCanvas.dispose();document.title=workspace?'Your workspace — Daydream':'Daydream — A place for your imagined worlds';
 if(workspace){if(location.hash==='#capture')await window.DaydreamCapture.render();else await window.DaydreamWorkspace.render();if(token!==routing)return;window.DaydreamAuth?.remember(location.hash);window.DaydreamAuth?.controls();window.scrollTo({top:0,behavior:'instant'});
  if(!window.DaydreamAuth?.profilePending&&window.DaydreamTutorial?.needsIntro())window.DaydreamTutorial.enter();else window.DaydreamGuide?.maybeStart();
  const heading=document.querySelector('#workspace h1');if(heading&&!document.querySelector('dialog[open]')){heading.tabIndex=-1;heading.focus({preventScroll:true});}
 }else{window.DaydreamExperience?.reveal();if(location.hash){const target=document.getElementById(location.hash.slice(1));if(target)requestAnimationFrame(()=>target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));}}
}
document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();document.getElementById('main').focus();});
window.addEventListener('hashchange',route);window.addEventListener('daydream:account-changed',route);window.addEventListener('daydream:tutorial-complete',route);route();document.getElementById('year').textContent=new Date().getFullYear();
