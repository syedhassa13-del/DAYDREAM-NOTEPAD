const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const project = path.resolve(__dirname, '..');
const { WorldStore, KEY } = require('../dist/world-store.js');
const { SpeechInput } = require('../dist/speech-input.js');
const { exportData, markdown } = require('./legacy/export-data.js');
let checks = 0;
function test(name, run) { run(); checks++; console.log(`PASS ${name}`); }
const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
let store = new WorldStore(storage), world, chapter, scene;
test('all client JavaScript parses', () => { for (const file of fs.readdirSync(path.join(project, 'dist')).filter(f => f.endsWith('.js'))) execFileSync(process.execPath, ['--check', path.join(project, 'dist', file)]); });
test('world creation and browser reopen persistence', () => {
  assert.deepEqual(store.load(), { version: 1, worlds: [], captures: [] });
  world = store.create({ name: '  Test World  ', universe: 'My Universe', description: 'Test description' });
  assert.equal(world.name, 'Test World'); store = new WorldStore(storage); assert.equal(store.load().worlds[0].id, world.id);
  assert.throws(() => store.create({ name: ' ', universe: 'U', description: '' }));
});
test('chapter and scene create, edit, rename, delete', () => {
  chapter = store.add(world.id, 'chapter'); scene = store.add(world.id, 'scene', chapter.id);
  store.update(world.id, 'chapter', chapter.id, { name: 'First Chapter', text: 'Chapter text.' });
  store.update(world.id, 'scene', scene.id, { name: 'Opening Scene', text: 'Scene text.' });
  const saved = new WorldStore(storage).load().worlds[0]; assert.equal(saved.chapters[0].scenes[0].text, 'Scene text.');
  const removable = store.add(world.id, 'scene', chapter.id); store.remove(world.id, 'scene', removable.id);
  const parent = store.add(world.id, 'chapter'); store.add(world.id, 'scene', parent.id); store.remove(world.id, 'chapter', parent.id);
  assert.equal(store.load().worlds[0].chapters.length, 1); assert.equal(store.load().worlds[0].chapters[0].scenes.length, 1);
});
test('all reference categories create, edit, rename, delete', () => {
  for (const type of ['characters', 'timeline', 'plotline', 'locations', 'rules', 'objects', 'notes']) {
    const item = store.add(world.id, type); store.update(world.id, type, item.id, { name: `${type} entry`, text: 'Reference text.' });
    assert.equal(new WorldStore(storage).load().worlds[0].references[type][0].text, 'Reference text.');
    store.remove(world.id, type, item.id); assert.equal(store.load().worlds[0].references[type].length, 0);
  }
});
test('capture editing, persistence and atomic destination assignment', () => {
  for (const type of ['world', 'chapter', 'scene', 'characters', 'timeline', 'plotline', 'locations', 'rules', 'objects', 'notes']) {
    const c = store.saveCapture({ name: `Capture ${type}`, text: 'Original thought.' });
    store.saveCapture({ name: c.name, text: `Edited ${type} thought.` }, c.id);
    store.assignCapture(c.id, { worldId: world.id, type, parentId: type === 'scene' ? chapter.id : undefined });
    const reopened = new WorldStore(storage).load().captures.find(entry => entry.id === c.id);
    assert.equal(reopened.text, `Edited ${type} thought.`); assert.equal(reopened.assignment.worldId, world.id);
    assert.throws(() => store.assignCapture(c.id, { worldId: world.id, type }));
  }
  const addition = store.saveCapture({ name: 'Append', text: 'Append text.' });
  store.assignCapture(addition.id, { worldId: world.id, type: 'scene', targetId: scene.id });
  assert.equal(store.load().worlds[0].chapters[0].scenes[0].text, 'Scene text.\n\nAppend text.');
  store.deleteCapture(addition.id); assert.ok(store.load().worlds[0].chapters[0].scenes[0].text.includes('Append text.'));
});
test('empty title and failed writes do not alter saved data', () => {
  const before = values.get(KEY);
  assert.throws(() => store.update(world.id, 'chapter', chapter.id, { name: ' ', text: 'Invalid text' })); assert.equal(values.get(KEY), before);
  const failing = new WorldStore({ getItem: storage.getItem, setItem() { throw new Error('Quota exceeded'); } });
  assert.throws(() => failing.add(world.id, 'chapter')); assert.equal(values.get(KEY), before);
  const capture = store.saveCapture({ name: 'Unplaced', text: 'Keep this thought.' }), current = values.get(KEY);
  assert.throws(() => failing.assignCapture(capture.id, { worldId: world.id, type: 'notes' })); assert.equal(values.get(KEY), current);
});
test('structured JSON and readable Markdown preserve content and scope', () => {
  const other = store.create({ name: 'Other World', universe: 'Another Universe', description: '' });
  const data = store.load(), all = exportData(data), scoped = exportData(data, world.id);
  assert.equal(JSON.parse(JSON.stringify(all)).captures.length, data.captures.length);
  assert.equal(scoped.worlds.length, 1); assert.ok(!scoped.worlds.some(w => w.id === other.id)); assert.ok(scoped.captures.every(c => c.assignment?.worldId === world.id));
  const text = markdown(all); assert.ok(text.includes('#### Scene: Opening Scene')); assert.ok(text.includes('## Dream captures')); assert.ok(text.includes('Keep this thought.')); assert.ok(text.includes('Edited characters thought.'));
});
test('legacy records and sample copies remain compatible', () => {
  const before = values.get(KEY);
  const legacy = { ...world, chapters: [{ name: 'Legacy', text: 'Legacy text' }], references: { characters: ['Mira'] } };
  values.set(KEY, JSON.stringify({ version: 1, worlds: [legacy] }));
  assert.equal(store.load().worlds[0].references.characters[0].name, 'Mira'); assert.deepEqual(store.load().captures, []);
  const copy = store.copySample(legacy); assert.notEqual(copy.id, legacy.id); assert.ok(copy.chapters[0].id); assert.deepEqual(copy.chapters[0].scenes, []);
  values.set(KEY, before);
});
test('malformed data is rejected without overwriting originals', () => {
  const before = values.get(KEY), base = JSON.parse(before);
  const invalids = ['null', '{broken', JSON.stringify({ ...base, captures: false }), JSON.stringify({ ...base, worlds: [{ ...base.worlds[0], chapters: [{ name: 'Bad', text: 123 }] }] }), JSON.stringify({ ...base, worlds: [{ ...base.worlds[0], references: { notes: [null] } }] })];
  for (const raw of invalids) { values.set(KEY, raw); assert.throws(() => store.load()); assert.throws(() => store.create({ name: 'New', universe: 'U', description: '' })); assert.equal(values.get(KEY), raw); }
  values.set(KEY, before);
});
test('speech final/interim results, permissions, stopping and fallback', () => {
  let mock; const final = [], interim = [], states = [], errors = [];
  class Recognition { constructor() { mock = this; } start() { this.onstart(); } stop() { this.onend(); } abort() {} }
  const speech = new SpeechInput(Recognition, { onText: text => final.push(text), onInterim: text => interim.push(text), onStatus: (text, error) => { states.push(text); if (error) errors.push(text); }, onEnd() {} });
  speech.start('ur-PK'); assert.equal(mock.lang, 'ur-PK');
  const result = (text, isFinal) => Object.assign([{ transcript: text }], { isFinal });
  mock.onresult({ resultIndex: 0, results: [result('Hello', true), result('next', false)] });
  mock.onresult({ resultIndex: 0, results: [result('Hello', true), result('next thought', true)] });
  assert.deepEqual(final, ['Hello', 'next thought']); assert.ok(interim.includes('next'));
  speech.stop(); assert.ok(states.at(-1).startsWith('Microphone stopped')); assert.equal(speech.active, false);
  speech.start('en-US'); mock.onerror({ error: 'not-allowed' }); mock.onend(); assert.ok(errors.at(-1).includes('denied'));
  speech.start('en-US'); speech.abort(); assert.equal(mock.onresult, null); assert.equal(speech.active, false);
  assert.throws(() => new SpeechInput(null, {}).start('en-US'));
});
test('static navigation, assets, labels, pause and keyboard structure', () => {
  const html = fs.readFileSync(path.join(project, 'dist/index.html'), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]); assert.equal(ids.length, new Set(ids).size);
  for (const m of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"#][^"]+)"/g)) if (!m[1].startsWith('data:')) assert.ok(fs.existsSync(path.join(project, 'dist', m[1])));
  for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(m[1]));
  assert.ok(html.includes('data-tutorial-open')); assert.ok(!html.includes('id="inside"')); assert.ok(!html.includes('id="how-it-works"'));
  const app = fs.readFileSync(path.join(project, 'dist/app.js'), 'utf8'); assert.ok(app.includes("event.preventDefault();document.getElementById('main').focus()"));
  const pause = fs.readFileSync(path.join(project, 'dist/pause.js'), 'utf8'); assert.ok(pause.includes('prepareAction()')); assert.ok(pause.includes('.reset()')); assert.ok(!pause.includes('localStorage'));
});
test('main theme text contrast and reduced-motion override', () => {
  function lum(hex) { const c = hex.match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return c[0] * .2126 + c[1] * .7152 + c[2] * .0722; }
  for (const background of ['101010', '202020', '343434']) for (const foreground of ['f5f5f5', 'b8b8b8', 'ededed']) { const a = lum(background), b = lum(foreground); assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5); }
  const css = fs.readFileSync(path.join(project, 'dist/refinements.css'), 'utf8'); assert.ok(css.includes('prefers-reduced-motion')); assert.ok(css.includes('min-height:44px')); assert.ok(css.includes('@media(max-width:760px)'));
});
test('node topology, saved layout, custom links and deletion cleanup', () => {
  const model = require('./legacy/node-model.js');
  const current = store.load().worlds.find(w => w.id === world.id), nodes = model.worldGraph(current);
  assert.ok(nodes.nodes.some(n => n.id === `chapter:${chapter.id}`));
  assert.ok(nodes.edges.some(e => e.source === `chapter:${chapter.id}` && e.target === `scene:${scene.id}`));
  const character = store.add(world.id, 'characters'), updated = store.load().worlds.find(w => w.id === world.id);
  let graph = { positions: { [`chapter:${chapter.id}`]: { x: 991, y: 400 } }, connections: [] };
  graph = model.addConnection(graph, `chapter:${chapter.id}`, `note:characters:${character.id}`, model.worldGraph(updated).nodes, 'custom-test');
  store.saveGraph(world.id, graph);
  const reopened = new WorldStore(storage).load().worlds.find(w => w.id === world.id), rendered = model.worldGraph(reopened);
  assert.equal(rendered.nodes.find(n => n.id === `chapter:${chapter.id}`).x, 991);
  assert.ok(rendered.edges.some(e => e.custom && e.id === 'custom-test'));
  assert.throws(() => model.addConnection(graph, `chapter:${chapter.id}`, `chapter:${chapter.id}`, rendered.nodes, 'bad'));
  assert.throws(() => model.addConnection(graph, `chapter:${chapter.id}`, `note:characters:${character.id}`, rendered.nodes, 'duplicate'));
  assert.throws(() => model.addConnection(graph, 'missing', `chapter:${chapter.id}`, rendered.nodes, 'missing'));
  assert.ok(markdown(exportData(store.load())).includes('### Node connections'));
  const before = values.get(KEY); assert.throws(() => store.saveGraph(world.id, { positions: { a: { x: NaN, y: 0 } }, connections: [] })); assert.equal(values.get(KEY), before);
  store.remove(world.id, 'characters', character.id); assert.equal(store.load().worlds.find(w => w.id === world.id).graph.connections.length, 0);
  const overview = model.overviewGraph(store.load().worlds); assert.equal(overview.nodes.filter(n => n.type === 'world').length, store.load().worlds.length); assert.equal(overview.edges.length, store.load().worlds.length);
  assert.ok(model.overviewGraph([]).nodes.some(n => n.type === 'create-world'));
});
test('styles use neutral shades or approved landing purple and graph controls exist', () => {
  for(const file of fs.readdirSync(path.join(project,'dist')).filter(f=>f.endsWith('.css'))) {
    const css=fs.readFileSync(path.join(project,'dist',file),'utf8');
    for(const match of css.matchAll(/#([0-9a-f]{6})(?:[0-9a-f]{2})?\b/gi)) {
      const [r,g,b]=match[1].match(/../g).map(c=>parseInt(c,16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
      const hue=delta===0?0:((max===r?(g-b)/delta:max===g?(b-r)/delta+2:(r-g)/delta+4)*60+360)%360;
      assert.ok(delta===0||(['landing.css','landing-ribbon.css','lavender-theme.css','tutorial.css','appearance.css','account.css','experience.css','workspace-refinements.css'].includes(file)&&hue>=260&&hue<=285),`Unapproved color ${match[0]} in ${file}`);
    }
  }
  const script=fs.readFileSync(path.join(project,'dist/node-canvas.js'),'utf8');assert.ok(script.includes('pointermove'));assert.ok(script.includes('ArrowLeft'));assert.ok(script.includes('onConnect'));assert.ok(script.includes('Fit canvas'));
});
test('ribbon moves continuously, cursor disruption stays local, headline cycles and motion can stop', () => {
 const vm=require('node:vm'),{createCanvas}=require('@napi-rs/canvas');
 function field(){
  const canvas=createCanvas(1000,600),listeners={},pageListeners={},frames=new Map(),buttonListeners={};let sequence=0,change;
  const thought={style:{}},writing={style:{}},toggle={addEventListener:(n,f)=>buttonListeners[n]=f,setAttribute(){}};
  canvas.getBoundingClientRect=()=>({width:1000,height:600,left:0,top:0});
  const motion={matches:false,addEventListener:(n,f)=>change=f};
  const hero={querySelector:s=>s==='.starfield'?canvas:s==='.motion-toggle'?toggle:s==='.headline-thought'?thought:writing,addEventListener:(n,f)=>listeners[n]=f};
  const document={hidden:false,querySelector:()=>hero,createElement:()=>createCanvas(40,40),addEventListener:(n,f)=>pageListeners[n]=f};
  vm.runInNewContext(fs.readFileSync(path.join(project,'dist/landing-stars.js'),'utf8'),{document,matchMedia:()=>motion,devicePixelRatio:1,performance:{now:()=>0},requestAnimationFrame:f=>{const id=++sequence;frames.set(id,f);return id;},cancelAnimationFrame:id=>frames.delete(id),IntersectionObserver:class{constructor(f){this.f=f;}observe(){this.f([{isIntersecting:true}]);}},ResizeObserver:class{constructor(f){this.f=f;}observe(){this.f();}}});
  return {canvas,listeners,pageListeners,frames,thought,writing,document,motion,change:()=>change(),pause:()=>buttonListeners.click(),advance:time=>{const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(time));}};
 }
 const a=field(),b=field(),before=a.canvas.toBuffer('image/png');
 a.listeners.pointermove({clientX:500,clientY:300,pointerType:'mouse'});
 const initial=b.canvas.toBuffer('image/png');b.advance(16);assert.notDeepEqual(b.canvas.toBuffer('image/png'),initial,'Normal display frames must not be skipped by a 32ms gate');
 a.advance(16);for(let t=40;t<=400;t+=40){a.advance(t);b.advance(t);}
 assert.notDeepEqual(b.canvas.toBuffer('image/png'),before,'Ambient stars must move without a pointer');
 assert.notDeepEqual(a.canvas.toBuffer('image/png'),b.canvas.toBuffer('image/png'),'Pointer must disrupt the moving field');
 assert.deepEqual(a.canvas.getContext('2d').getImageData(0,0,80,600).data,b.canvas.getContext('2d').getImageData(0,0,80,600).data,'Outside cursor radius matches undisturbed motion');
 for(let t=440;t<=3480;t+=40)b.advance(t);
 assert.equal(b.thought.style.opacity,1,'First phrase holds for 3.5 seconds');
 for(let t=3520;t<=4000;t+=40)b.advance(t);
 assert.ok(b.thought.style.opacity>0&&b.thought.style.opacity<1,'Outgoing fade remains gradual');assert.ok(b.writing.style.opacity>0&&b.writing.style.opacity<.15,'Incoming phrase begins subtly during the outgoing fade');
 for(let t=4040;t<=4800;t+=40)b.advance(t);
 assert.ok(b.writing.style.opacity>0&&b.writing.style.opacity<1,'Incoming phrase fades in gradually');
 for(let t=4840;t<=6400;t+=40)b.advance(t);
 assert.equal(b.writing.style.opacity,1);assert.equal(b.thought.style.opacity,0);
 for(let t=6440;t<=12400;t+=40)b.advance(t);
 assert.equal(b.thought.style.opacity,1);assert.equal(b.writing.style.opacity,0);
 b.pause();assert.equal(b.frames.size,0);b.pause();assert.ok(b.frames.size>0);
 b.motion.matches=true;b.change();assert.equal(b.frames.size,0);assert.equal(b.thought.style.opacity,1);assert.equal(b.writing.style.opacity,0);
 b.motion.matches=false;b.change();b.document.hidden=true;b.pageListeners.visibilitychange();assert.equal(b.frames.size,0);
 b.document.hidden=false;b.pageListeners.visibilitychange();assert.ok(b.frames.size>0);
 const html=fs.readFileSync(path.join(project,'dist/index.html'),'utf8');assert.ok(html.includes('ribbon-cta'));assert.ok(!html.includes('landing-figures'));assert.ok(html.includes('ChakraPetch-400.ttf'));
});
test('single-screen landing keeps its footer and all local typeface assets',()=>{
 const html=fs.readFileSync(path.join(project,'dist/index.html'),'utf8'),landing=html.slice(html.indexOf('<div id="landing">'),html.indexOf('<section id="workspace"'));
 assert.equal((landing.match(/<section/g)||[]).length,1);assert.ok(html.includes('<footer'));
 assert.ok(!landing.includes('BEGIN WITH ONE THOUGHT'));assert.ok(!landing.includes('Room for the rest of your day'));
 const css=fs.readFileSync(path.join(project,'dist/appearance.css'),'utf8');
 for(const url of css.matchAll(/url\('([^']+)'\)/g))assert.ok(fs.existsSync(path.join(project,'dist',url[1])));
});
console.log(`${checks} review groups passed. Live browser layout and real microphone hardware were not tested.`);
