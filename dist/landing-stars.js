/* Local cursor warp and repulsion on a stationary, landing-wide starfield. */
(() => {
  const landing = document.querySelector('#landing');
  const canvas = landing?.querySelector('.starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const stars = [], sprites = new Map();
  const copy = landing.querySelector('.hero-copy');
  let textBounds = null;
  function updateTextBounds() {
    const text = copy?.getBoundingClientRect(), field = canvas.getBoundingClientRect();
    textBounds = text ? {left:text.left-field.left, top:text.top-field.top, right:text.left-field.left+text.width, bottom:text.top-field.top+text.height} : null;
  }
  let width = 0, height = 0, dpr = 1, radius = 340, frame = 0, last = 0, visible = false;
  const pointer = {x: 0, y: 0, active: false};
  let seed = 7341;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function sprite(color, size) {
    const key = `${color}/${size}`;
    if (sprites.has(key)) return sprites.get(key);
    const image = document.createElement('canvas'); image.width = image.height = 40;
    const brush = image.getContext('2d');
    if (!brush) return null;
    const glow = brush.createRadialGradient(20, 20, 0, 20, 20, 18);
    glow.addColorStop(0, `rgba(${color},.9)`);
    glow.addColorStop(.18, `rgba(${color},.22)`);
    glow.addColorStop(1, `rgba(${color},0)`);
    brush.fillStyle = glow; brush.fillRect(0, 0, 40, 40);
    brush.beginPath(); brush.arc(20, 20, size, 0, Math.PI * 2);
    brush.fillStyle = `rgb(${color})`; brush.fill(); sprites.set(key, image); return image;
  }
  function prepare() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width; height = rect.height; dpr = Math.min(devicePixelRatio || 1, 1.5);
    radius = Math.min(340, width * .55);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    stars.length = 0; seed = 7341;
    const count = Math.min(1300, Math.round(width * height / 1500));
    for (let i = 0; i < count; i++) {
      const x = random() * width, y = random() * height;
      const depth = random(), color = random() < .4 ? '255,255,255' : random() < .5 ? '157,54,255' : '213,183,255';
      const size = depth < .65 ? .9 : depth < .9 ? 1.5 : 2.1;
      const image = sprite(color, size);
      if (!image) return;
      stars.push({x, y, dx: 0, dy: 0, depth, image, alpha: .5 + random() * .5});
    }
    updateTextBounds(); draw(); start();
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#030303'; ctx.fillRect(0, 0, width, height);
    for (const star of stars) {
      const x = star.x + star.dx, y = star.y + star.dy;
      // Keep the centre quiet without dimming stars across the whole screen.
      const inset = textBounds ? Math.min(x-textBounds.left, textBounds.right-x, y-textBounds.top, textBounds.bottom-y) : -1;
      const quiet = inset > 0 ? 1 - .6 * Math.min(1, inset / 48) : 1;
      ctx.globalAlpha = star.alpha * quiet;
      const size = 8 + star.depth * 15;
      ctx.drawImage(star.image, star.x + star.dx - size / 2, star.y + star.dy - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }
  function tick(time) {
    frame = 0;
    if (!visible || document.hidden || motion.matches) return;
    if (time - last < 32) { frame = requestAnimationFrame(tick); return; }
    const ease = 1 - Math.exp(-Math.min(time - last, 100) / 170);
    let moving = false;
    for (const star of stars) {
      let targetX = 0, targetY = 0;
      const dx = star.x - pointer.x, dy = star.y - pointer.y, distance = Math.hypot(dx, dy);
      if (pointer.active && distance < radius) {
        const falloff = (1 - distance / radius) ** 2;
        const force = falloff * (70 + star.depth * 90);
        const curl = falloff * (55 + star.depth * 65);
        const angle = distance > .01 ? Math.atan2(dy, dx) : star.depth * Math.PI * 2;
        targetX = Math.cos(angle) * force - Math.sin(angle) * curl;
        targetY = Math.sin(angle) * force + Math.cos(angle) * curl;
      }
      star.dx += (targetX - star.dx) * ease; star.dy += (targetY - star.dy) * ease;
      if (Math.abs(targetX - star.dx) + Math.abs(targetY - star.dy) > .02) moving = true;
      else { star.dx = targetX; star.dy = targetY; }
    }
    draw(); last = time;
    if (moving) frame = requestAnimationFrame(tick);
  }
  function start() {
    if (!frame && visible && !document.hidden && !motion.matches) { last = performance.now(); frame = requestAnimationFrame(tick); }
  }
  function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; }
  landing.addEventListener('pointermove', event => {
    if (motion.matches || event.pointerType === 'touch') return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left; pointer.y = event.clientY - rect.top;
    pointer.active = true; start();
  }, {passive: true});
  landing.addEventListener('pointerleave', () => { pointer.active = false; start(); });
  // Reset on scroll so repulsion never follows a stale pointer position.
  document.addEventListener('scroll', () => { pointer.active = false; start(); }, {passive: true});
  motion.addEventListener('change', () => {
    stop(); pointer.active = false; stars.forEach(star => { star.dx = star.dy = 0; }); draw(); start();
  });
  document.addEventListener('visibilitychange', () => { pointer.active = false; if (document.hidden) stop(); else start(); });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) start(); else { stop(); pointer.active = false; } }).observe(landing);
  new ResizeObserver(prepare).observe(canvas);
  if (copy) new ResizeObserver(() => { updateTextBounds(); draw(); }).observe(copy);
  prepare();
})();
