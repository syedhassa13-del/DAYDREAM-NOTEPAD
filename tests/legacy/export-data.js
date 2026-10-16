(function(root) {
  'use strict';
  const categories = { characters: 'Characters', timeline: 'Timeline', plotline: 'Plotline', locations: 'Locations & names', rules: 'Rules & power systems', objects: 'Tools & objects', notes: 'General notes' };
  function exportData(data, worldId) {
    return { format: 'daydream-notebook', version: 1, exportedAt: new Date().toISOString(), worlds: worldId ? data.worlds.filter(w => w.id === worldId) : data.worlds, captures: worldId ? data.captures.filter(c => c.assignment?.worldId === worldId) : data.captures };
  }
  function markdown(data) {
    const heading = value => String(value).replace(/[\r\n]/g, ' ');
    const out = ['# Daydream notebook', '', `Exported: ${data.exportedAt}`, ''];
    for (const world of data.worlds) {
      out.push(`## ${heading(world.name)}`, '', `Universe: ${heading(world.universe)}`, '', world.description, '');
      for (const chapter of world.chapters) {
        out.push(`### ${heading(chapter.name)}`, '', chapter.text, '');
        for (const scene of chapter.scenes) out.push(`#### Scene: ${heading(scene.name)}`, '', scene.text, '');
      }
      for (const [key, label] of Object.entries(categories)) {
        if (!world.references[key].length) continue;
        out.push(`### ${label}`, '');
        for (const note of world.references[key]) out.push(`#### ${heading(note.name)}`, '', note.text, '');
      }
      if (world.graph?.connections.length) {
        const names = new Map([[`world:${world.id}`, world.name]]);
        world.chapters.forEach(chapter => { names.set(`chapter:${chapter.id}`, chapter.name); chapter.scenes.forEach(scene => names.set(`scene:${scene.id}`, scene.name)); });
        Object.entries(world.references).forEach(([category, notes]) => notes.forEach(note => names.set(`note:${category}:${note.id}`, note.name)));
        Object.entries(categories).forEach(([key, name]) => names.set(`category:${key}`, name));
        out.push('### Node connections', '');
        world.graph.connections.forEach(link => out.push(`- ${heading(names.get(link.source) || link.source)} / ${heading(names.get(link.target) || link.target)}`)); out.push('');
      }
    }
    if (data.captures.length) {
      out.push('## Dream captures', '');
      for (const capture of data.captures) out.push(`### ${heading(capture.name)}`, '', `Captured: ${capture.createdAt}`, capture.assignment ? `Placed in world: ${heading(data.worlds.find(w => w.id === capture.assignment.worldId)?.name || capture.assignment.worldId)}` : 'Unassigned capture', '', capture.text, '');
    }
    return out.join('\n');
  }
  root.DaydreamExport = { exportData, markdown };
  if (typeof module !== 'undefined' && module.exports) module.exports = { exportData, markdown };
})(typeof window !== 'undefined' ? window : globalThis);
