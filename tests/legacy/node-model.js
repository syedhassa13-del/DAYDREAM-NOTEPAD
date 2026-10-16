(function(root) {
  'use strict';
  const categories = { characters: 'Characters', timeline: 'Timeline', plotline: 'Plotline', locations: 'Locations & names', rules: 'Rules & powers', objects: 'Tools & objects', notes: 'General notes' };
  function worldGraph(world) {
    const nodes = [], edges = [], rootId = `world:${world.id}`;
    nodes.push({ id: rootId, type: 'world', name: world.name, subtitle: world.universe, text: world.description, x: 300, y: 200 });
    world.chapters.forEach((chapter, index) => {
      const id = `chapter:${chapter.id}`, y = 100 + index * 230;
      nodes.push({ id, type: 'chapter', entryId: chapter.id, name: chapter.name, subtitle: `Chapter ${index + 1}`, text: chapter.text, x: 710, y });
      edges.push({ id: `auto:${id}`, source: rootId, target: id });
      chapter.scenes.forEach((scene, i) => { const sceneId = `scene:${scene.id}`; nodes.push({ id: sceneId, type: 'scene', entryId: scene.id, parentId: chapter.id, name: scene.name, subtitle: chapter.name, text: scene.text, x: 1100 + i * 340, y }); edges.push({ id: `auto:${sceneId}`, source: id, target: sceneId }); });
    });
    if (!world.chapters.length) { nodes.push({ id: 'create-chapter', type: 'create-chapter', name: 'Your first chapter', subtitle: 'BEGIN YOUR STORY', text: 'Add a chapter, then create scenes beneath it.', x: 710, y: 100 }); edges.push({ id: 'auto:create', source: rootId, target: 'create-chapter' }); }
    const noteY = Math.max(480, 100 + world.chapters.length * 230);
    let index = 0;
    for (const [category, label] of Object.entries(categories)) {
      const items = world.references[category];
      if (!items.length) { const id = `category:${category}`; nodes.push({ id, type: 'category', category, name: label, subtitle: 'WORLD NOTES', text: 'Add a note to this section.', x: 710 + index % 3 * 340, y: noteY + Math.floor(index / 3) * 210 }); edges.push({ id: `auto:${id}`, source: rootId, target: id }); index++; }
      for (const note of items) { const id = `note:${category}:${note.id}`; nodes.push({ id, type: 'note', category, entryId: note.id, name: note.name, subtitle: label, text: note.text, x: 710 + index % 3 * 340, y: noteY + Math.floor(index / 3) * 210 }); edges.push({ id: `auto:${id}`, source: rootId, target: id }); index++; }
    }
    return applyLayout({ nodes, edges }, world.graph);
  }
  function overviewGraph(worlds) {
    const nodes = [], edges = [];
    const universes = [...new Set(worlds.map(world => world.universe))];
    let y = 130;
    universes.forEach(universe => {
      const group = worlds.filter(w => w.universe === universe), id = `universe:${universe}`;
      nodes.push({ id, type: 'universe', name: universe, subtitle: 'UNIVERSE', text: `${group.length} ${group.length === 1 ? 'world' : 'worlds'}`, x: 300, y: y + Math.max(0, group.length - 1) * 105 });
      group.forEach((world, i) => { const worldId = `world:${world.id}`; nodes.push({ id: worldId, type: 'world', worldId: world.id, name: world.name, subtitle: 'WORLD', text: world.description, updatedAt: world.updatedAt, x: 720, y: y + i * 210 }); edges.push({ id: `auto:${worldId}`, source: id, target: worldId }); });
      y += Math.max(450, group.length * 210 + 120);
    });
    if (!nodes.length) { nodes.push({ id: 'first-universe', type: 'universe', name: 'Your imagined universe', subtitle: 'YOUR CANVAS', text: 'A space for your worlds.', x: 300, y: 160 }, { id: 'create-world', type: 'create-world', name: 'Create your first world', subtitle: 'A NEW POSSIBILITY', text: 'Give an idea a name. Build the rest at your own pace.', x: 720, y: 160 }); edges.push({ id: 'auto:first', source: 'first-universe', target: 'create-world' }); }
    return { nodes, edges };
  }
  function applyLayout(model, graph) {
    const positions = graph?.positions || {};
    model.nodes.forEach(node => { const p = positions[node.id]; if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) { node.x = p.x; node.y = p.y; } });
    const ids = new Set(model.nodes.map(n => n.id));
    for (const link of graph?.connections || []) if (ids.has(link.source) && ids.has(link.target) && link.source !== link.target) model.edges.push({ ...link, custom: true });
    return model;
  }
  function addConnection(graph, source, target, nodes, id) {
    if (source === target || !nodes.some(n => n.id === source) || !nodes.some(n => n.id === target)) throw new Error('Choose two different existing nodes.');
    const connections = graph.connections || [];
    if (connections.some(link => link.source === source && link.target === target || link.source === target && link.target === source)) throw new Error('These nodes are already connected.');
    return { positions: graph.positions || {}, connections: [...connections, { id, source, target }] };
  }
  root.DaydreamNodeModel = { worldGraph, overviewGraph, applyLayout, addConnection };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.DaydreamNodeModel;
})(typeof window !== 'undefined' ? window : globalThis);
