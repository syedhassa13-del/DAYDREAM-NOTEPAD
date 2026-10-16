(function(root) {
  'use strict';
const idGenerator=root.DaydreamId||(typeof require==='function'?require('./daydream-id.js'):null);
  const KEY = 'daydream.worlds.v1';
  const CATEGORIES = ['characters', 'timeline', 'plotline', 'locations', 'rules', 'objects', 'notes'];
  function validGraph(graph) {
    return graph && graph.positions && typeof graph.positions === 'object' && !Array.isArray(graph.positions) && Array.isArray(graph.connections) && Object.values(graph.positions).every(p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.y >= 0) && graph.connections.every(link => link && ['id', 'source', 'target'].every(key => typeof link[key] === 'string') && link.source !== link.target);
  }
  function normalize(world) {
    const entryValid = entry => entry && typeof entry.name === 'string' && (entry.text === undefined || typeof entry.text === 'string') && (entry.id === undefined || typeof entry.id === 'string');
    if (!world || !Array.isArray(world.chapters) || !world.chapters.every(c => entryValid(c) && (c.scenes === undefined || Array.isArray(c.scenes) && c.scenes.every(entryValid)))) throw new Error('Saved chapters could not be read. Your original data has been left untouched.');
    if (world.references !== undefined && (!world.references || typeof world.references !== 'object' || Array.isArray(world.references))) throw new Error('Saved reference notes could not be read. Your original data has been left untouched.');
    for (const category of CATEGORIES) { const notes = world.references?.[category]; if (notes !== undefined && (!Array.isArray(notes) || !notes.every(note => typeof note === 'string' || entryValid(note)))) throw new Error('Saved reference notes could not be read. Your original data has been left untouched.'); }
    if (world.graph !== undefined && !validGraph(world.graph)) throw new Error('Saved node connections could not be read. Your original data has been left untouched.');
    const copy = JSON.parse(JSON.stringify(world));
    copy.chapters = (copy.chapters || []).map((chapter, index) => ({ ...chapter, id: chapter.id || `chapter-${index}`, text: chapter.text || '', scenes: (chapter.scenes || []).map((scene, i) => ({ ...scene, id: scene.id || `scene-${index}-${i}`, text: scene.text || '' })) }));
    copy.references = Object.fromEntries(CATEGORIES.map(category => [category, (copy.references?.[category] || []).map((note, i) => typeof note === 'string' ? { id: `${category}-${i}`, name: note, text: '' } : { ...note, id: note.id || `${category}-${i}`, text: note.text || '' })]));
    return copy;
  }
  class WorldStore {
    constructor(storage) { this.storage = storage; }
    load() {
      const raw = this.storage.getItem(KEY);
      if (raw === null) return { version: 1, worlds: [], captures: [] };
      const data = JSON.parse(raw);
      if (!data || data.version !== 1 || !Array.isArray(data.worlds) || !data.worlds.every(w => w && ['id', 'name', 'universe', 'description', 'createdAt', 'updatedAt'].every(k => typeof w[k] === 'string') && Array.isArray(w.chapters) && w.name.trim() && w.universe.trim())) throw new Error('Saved worlds could not be read. Your original data has been left untouched.');
      data.worlds = data.worlds.map(normalize);
      if (data.captures === undefined) data.captures = [];
      if (!Array.isArray(data.captures) || !data.captures.every(c => c && ['id', 'name', 'text', 'createdAt', 'updatedAt'].every(key => typeof c[key] === 'string') && (c.assignment == null || typeof c.assignment === 'object' && ['worldId', 'type', 'itemId', 'assignedAt'].every(key => typeof c.assignment[key] === 'string')))) throw new Error('Saved captures could not be read. Your original data has been left untouched.');
      return data;
    }
    create(input) {
      const name = input.name.trim(), universe = input.universe.trim(), description = input.description.trim();
      if (!name || !universe) throw new Error('Add a world name and universe to continue.');
      if (name.length > 100 || universe.length > 100 || description.length > 600) throw new Error('Please shorten the name or description.');
      const data = this.load(), date = new Date().toISOString();
      const world = { id: idGenerator.create(), name, universe, description, createdAt: date, updatedAt: date, chapters: [], references: { characters: [], timeline: [], plotline: [], locations: [], rules: [], objects: [], notes: [] } };
      data.worlds.push(world);
      this.storage.setItem(KEY, JSON.stringify(data));
      return world;
    }
    mutate(id, operation) {
      const data = this.load(), world = data.worlds.find(w => w.id === id);
      if (!world) throw new Error('This world is no longer available in this browser.');
      const result = operation(world);
      world.updatedAt = new Date().toISOString();
      this.storage.setItem(KEY, JSON.stringify(data));
      return result;
    }
    saveGraph(id, graph) {
      if (!validGraph(graph)) throw new Error('Invalid node position or connection.');
      return this.mutate(id, world => { world.graph = JSON.parse(JSON.stringify(graph)); return world.graph; });
    }
    add(id, type, parentId) {
      return this.mutate(id, world => {
        const item = { id: idGenerator.create(), name: type === 'chapter' ? 'Untitled chapter' : type === 'scene' ? 'Untitled scene' : 'Untitled note', text: '' };
        if (type === 'chapter') { item.scenes = []; world.chapters.push(item); }
        else if (type === 'scene') { const chapter = world.chapters.find(c => c.id === parentId); if (!chapter) throw new Error('Choose a chapter for this scene.'); chapter.scenes.push(item); }
        else { if (!CATEGORIES.includes(type)) throw new Error('Unknown note category.'); world.references[type].push(item); }
        return item;
      });
    }
    update(id, type, itemId, input) {
      return this.mutate(id, world => {
        const items = type === 'chapter' ? world.chapters : type === 'scene' ? world.chapters.flatMap(c => c.scenes) : world.references[type];
        const item = items?.find(entry => entry.id === itemId);
        if (!item) throw new Error('This entry is no longer available.');
        const name = input.name.trim();
        if (!name || name.length > 200) throw new Error('Use a title between 1 and 200 characters.');
        item.name = name; item.text = input.text;
        return item;
      });
    }
    remove(id, type, itemId) {
      return this.mutate(id, world => {
        const lists = type === 'chapter' ? [world.chapters] : type === 'scene' ? world.chapters.map(c => c.scenes) : [world.references[type]];
        const list = lists.find(items => items?.some(entry => entry.id === itemId));
        if (!list) throw new Error('This entry is no longer available.');
        const removed = list.find(entry => entry.id === itemId);
        const removedNodes = type === 'chapter' ? [`chapter:${itemId}`, ...removed.scenes.map(scene => `scene:${scene.id}`)] : type === 'scene' ? [`scene:${itemId}`] : [`note:${type}:${itemId}`];
        list.splice(list.findIndex(entry => entry.id === itemId), 1);
        if (world.graph) { world.graph.connections = world.graph.connections.filter(link => !removedNodes.includes(link.source) && !removedNodes.includes(link.target)); removedNodes.forEach(id => { delete world.graph.positions[id]; }); }
      });
    }
    copySample(sample) {
      const data = this.load(), date = new Date().toISOString(), world = normalize(sample);
      world.id = idGenerator.create(); world.createdAt = date; world.updatedAt = date;
      world.chapters.forEach(chapter => { chapter.id = idGenerator.create(); chapter.scenes.forEach(scene => { scene.id = idGenerator.create(); }); });
      CATEGORIES.forEach(category => world.references[category].forEach(note => { note.id = idGenerator.create(); }));
      data.worlds.push(world); this.storage.setItem(KEY, JSON.stringify(data)); return world;
    }
    saveCapture(input, id) {
      const data = this.load(), name = input.name.trim() || 'Untitled capture';
      if (name.length > 200 || !input.text.trim()) throw new Error('Add a thought or transcript, and keep the title under 200 characters.');
      const now = new Date().toISOString();
      let capture = id ? data.captures.find(c => c.id === id) : null;
      if (id && !capture) throw new Error('This capture is no longer available.');
      if (!capture) { capture = { id: idGenerator.create(), createdAt: now, assignment: null }; data.captures.push(capture); }
      Object.assign(capture, { name, text: input.text, updatedAt: now });
      this.storage.setItem(KEY, JSON.stringify(data)); return capture;
    }
    deleteCapture(id) {
      const data = this.load(), index = data.captures.findIndex(c => c.id === id);
      if (index === -1) throw new Error('This capture is no longer available.');
      data.captures.splice(index, 1); this.storage.setItem(KEY, JSON.stringify(data));
    }
    assignCapture(id, destination) {
      const data = this.load(), capture = data.captures.find(c => c.id === id), world = data.worlds.find(w => w.id === destination.worldId);
      if (!capture || !world) throw new Error('Choose an existing capture and personal world.');
      if (capture.assignment) throw new Error('This capture has already been placed. Its original is still kept here.');
      const type = destination.type === 'world' ? 'notes' : destination.type;
      let items;
      if (type === 'chapter') items = world.chapters;
      else if (type === 'scene') {
        if (destination.targetId) items = world.chapters.flatMap(c => c.scenes);
        else { const chapter = world.chapters.find(c => c.id === destination.parentId); if (!chapter) throw new Error('Create or choose a chapter for this scene.'); items = chapter.scenes; }
      } else { if (!CATEGORIES.includes(type)) throw new Error('Choose a valid reference section.'); items = world.references[type]; }
      let item;
      if (destination.targetId) {
        item = items.find(i => i.id === destination.targetId); if (!item) throw new Error('The chosen entry is no longer available.');
        item.text = item.text ? `${item.text}\n\n${capture.text}` : capture.text;
      } else { item = { id: idGenerator.create(), name: capture.name, text: capture.text }; if (type === 'chapter') item.scenes = []; items.push(item); }
      const now = new Date().toISOString(); world.updatedAt = now; capture.updatedAt = now;
      capture.assignment = { worldId: world.id, type, itemId: item.id, assignedAt: now };
      this.storage.setItem(KEY, JSON.stringify(data)); return capture;
    }
  }
  root.DaydreamWorldStore = WorldStore;
  root.DaydreamNormalizeWorld = normalize;
  if (typeof module !== 'undefined' && module.exports) module.exports = { WorldStore, KEY, normalize };
})(typeof window !== 'undefined' ? window : globalThis);
