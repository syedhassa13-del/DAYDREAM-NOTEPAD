/* One evolving star field: loose ribbons, gradual capture/release, local cursor warp. */
(() => {
 const landing=document.querySelector('#landing'),canvas=landing?.querySelector('.starfield');
 if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),toggle=landing.querySelector('.motion-toggle');
 const thought=landing.querySelector('.headline-thought'),writing=landing.querySelector('.headline-writing');
 const sprites=new Map();
 const stars=[],pointer={x:0,y:0,active:false};let width=0,height=0,dpr=1,frame=0,last=0,elapsed=0,visible=false,paused=false,seed=41;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 function starSprite(purple,sparkle){
  const key=purple+'/'+sparkle;if(sprites.has(key))return sprites.get(key);
  const image=document.createElement('canvas');image.width=image.height=40;const brush=image.getContext('2d');
  const rgb=purple?'190,160,232':'239,235,245';
  const halo=brush.createRadialGradient(20,20,0,20,20,19);halo.addColorStop(0,`rgba(${rgb},.65)`);halo.addColorStop(.14,`rgba(${rgb},.2)`);halo.addColorStop(1,`rgba(${rgb},0)`);
  brush.fillStyle=halo;brush.fillRect(0,0,40,40);
  brush.fillStyle=purple?'#bea0e8':'#f0f0f0';brush.beginPath();brush.arc(20,20,2,0,Math.PI*2);brush.fill();
  if(sparkle){brush.beginPath();brush.moveTo(20,8);brush.lineTo(21.1,18.9);brush.lineTo(32,20);brush.lineTo(21.1,21.1);brush.lineTo(20,32);brush.lineTo(18.9,21.1);brush.lineTo(8,20);brush.lineTo(18.9,18.9);brush.closePath();brush.globalAlpha=.8;brush.fill();}
  sprites.set(key,image);return image;
 }
 function prepare(){
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
  width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  seed=41;stars.length=0;const count=Math.min(width<760?2200:5700,Math.round(width*height/165));
  for(let i=0;i<count;i++){const purple=random()<.2,sparkle=random()<.22;stars.push({u:random(),v:random(),phase:random()*Math.PI*2,band:random()<.5?0:1,depth:random(),r:6+random()*10,image:starSprite(purple,sparkle),dx:0,dy:0,free:random()<.16,visitor:random()<.18});}
  draw(0);start();
 }
 function position(star){
  const t=elapsed*.001,u=(star.u+t*.005*(.7+star.depth*.3))%1;
  // An open, folded field: no paired strands or periodic helix crossings.
  const centre=.69+.055*Math.sin(u*5.1-t*.18)+.035*Math.sin(u*9+t*.12);
  const envelope=.145+.045*Math.sin(u*4-t*.11)+.035*Math.sin(u*8+t*.17);
  const fold=Math.sin(star.phase+u*2.3+t*.23);
  const ripple=.04*Math.sin(u*10+star.v*2-t*.24);
  const ribbonX=u*width+Math.sin(star.phase+t*.14)*width*.022;
  const ribbonY=height*(centre+fold*envelope+ripple+(star.v-.5)*.035);
  const ambientX=((star.u+t*.002)%1)*width;
  const ambientY=height*(star.v+.022*Math.sin(t*.11+star.phase));
  const gathering=star.free?0:star.visitor?smooth((Math.sin(t*.13+star.phase)+.5)/1.1):1;
  return {x:ambientX*(1-gathering)+ribbonX*gathering,y:ambientY*(1-gathering)+ribbonY*gathering,g:gathering,z:fold};
 }
 function headlines(){
  if(!thought?.style||!writing?.style)return;
  const phase=elapsed%10600;
  // 3.5s holds; a 1s overlap has a subtle incoming phrase under the outgoing one.
  let a,b;if(motion.matches){a=1;b=0;}else if(phase<3500){a=1;b=0;}else if(phase<5300){a=1-smooth((phase-3500)/1400);b=smooth((phase-3900)/1400);}else if(phase<8800){a=0;b=1;}else{a=smooth((phase-9200)/1400);b=1-smooth((phase-8800)/1400);}
  thought.style.opacity=a;writing.style.opacity=b;
 }
 function draw(dt){
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#030303';ctx.fillRect(0,0,width,height);
  const radius=Math.min(300,width*.44),ease=1-Math.exp(-dt/240);
  for(const star of stars){const p=position(star);let tx=0,ty=0;
   if(pointer.active&&!paused&&!motion.matches){const dx=p.x-pointer.x,dy=p.y-pointer.y,d=Math.hypot(dx,dy);if(d<radius){const f=(1-d/radius)**2,angle=d>.1?Math.atan2(dy,dx):star.phase;tx=(Math.cos(angle)*205-Math.sin(angle)*105)*f;ty=(Math.sin(angle)*205+Math.cos(angle)*105)*f;}}
   star.dx+=(tx-star.dx)*ease;star.dy+=(ty-star.dy)*ease;
   const x=p.x+star.dx,y=p.y+star.dy;
   // Soft visual clearance behind both fixed headline positions.
   const quiet=y<height*.44?.32+.68*smooth((y-height*.28)/(height*.16)):1;
   const depth=.7+.3*(p.z+1)/2;
   ctx.globalAlpha=(.48+star.depth*.4)*quiet*(p.g?depth:1);
   const size=star.r*(.75+.35*(p.z+1)/2);
   ctx.drawImage(star.image,x-size/2,y-size/2,size,size);
  }
  ctx.globalAlpha=1;headlines();
 }
 function tick(now){frame=0;if(!visible||document.hidden||motion.matches||paused)return;if(now-last<32){frame=requestAnimationFrame(tick);return;}const dt=Math.min(now-last,80);elapsed+=dt;last=now;draw(dt);frame=requestAnimationFrame(tick);}
 function start(){if(!frame&&visible&&!document.hidden&&!motion.matches&&!paused){last=performance.now();frame=requestAnimationFrame(tick);}}
 function stop(){if(frame)cancelAnimationFrame(frame);frame=0;}
 landing.addEventListener('pointermove',e=>{if(motion.matches||paused||e.pointerType==='touch')return;const r=canvas.getBoundingClientRect();pointer.x=e.clientX-r.left;pointer.y=e.clientY-r.top;pointer.active=true;start();},{passive:true});
 landing.addEventListener('pointerleave',()=>{pointer.active=false;});
 document.addEventListener('scroll',()=>{pointer.active=false;},{passive:true});
 toggle?.addEventListener('click',()=>{paused=!paused;pointer.active=false;toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Resume landing animation':'Pause landing animation');toggle.textContent=paused?'Resume motion':'Pause motion';if(paused)stop();else start();});
 motion.addEventListener('change',()=>{stop();pointer.active=false;for(const s of stars)s.dx=s.dy=0;draw(0);start();});
 document.addEventListener('visibilitychange',()=>{pointer.active=false;if(document.hidden)stop();else start();});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();else{stop();pointer.active=false;}}).observe(landing);
 new ResizeObserver(prepare).observe(canvas);prepare();
})();
