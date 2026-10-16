(function(){
'use strict';
const repo=window.DaydreamRepository,{escape:esc,plain}=window.DaydreamDB;
const order=['volume','arc','chapter','scene','character','timeline','plotline','location','name','rules','object','note'];
const labels={volume:'Volumes',arc:'Story arcs',chapter:'Chapters',scene:'Scenes',character:'Characters',timeline:'Timeline',plotline:'Plotline',location:'Locations',name:'Names',rules:'World rules',object:'Objects',note:'General notes'};
const compare=(a,b)=>(a.number??Infinity)-(b.number??Infinity)||String(a.createdAt||'').localeCompare(String(b.createdAt||''))||a.name.localeCompare(b.name,undefined,{numeric:true})||a.id.localeCompare(b.id);
async function collect(reality){
 await repo.open();const [saved,edges]=await Promise.all([repo.all('documents',reality.id),repo.all('edges',reality.id)]),groups=[],documents=[];
 for(const type of order){const typed=saved.filter(d=>d.type===type),hub=typed.find(d=>d.canvasType),entries=typed.filter(d=>!d.canvasType).sort(compare);if(hub&&plain(hub.html).trim())entries.unshift({...hub,name:'Section notes'});if(!entries.length)continue;const name=hub?.name||labels[type];groups.push({type,name,entries});entries.forEach((d,i)=>documents.push({...d,sectionHeading:i===0?name:null,displayName:d.number&&d.type==='chapter'?`Chapter ${d.number}: ${d.name}`:d.name}));}
 const names=new Map(saved.map(d=>[d.id,d.name]));names.set(`root:${reality.id}`,reality.name);const relationships=edges.filter(e=>e.kind==='relationship'&&names.has(e.source)&&names.has(e.target)).map(e=>({source:e.source,target:e.target,sourceName:names.get(e.source),targetName:names.get(e.target)}));
 return {reality,groups,documents,relationships};
}
function exportDocuments(data){const docs=[{id:`root:${data.reality.id}`,name:data.reality.name,html:data.reality.description?`<p>${esc(data.reality.description).replace(/\n/g,'<br>')}</p>`:''},...data.documents.map(d=>({...d,name:d.displayName,html:window.DaydreamFormat.sanitize(d.html)}))];if(data.relationships.length)docs.push({id:`connections:${data.reality.id}`,name:'Connections',html:data.relationships.map(e=>`<p>${esc(e.sourceName)} — ${esc(e.targetName)}</p>`).join('')});return docs;}
function html(data){return data.groups.map(g=>`<section class="manuscript-section"><h2>${esc(g.name)}</h2>${g.entries.map(d=>`<article class="manuscript-entry" id="manuscript-${esc(d.id)}"><h3><a href="#world/${encodeURIComponent(data.reality.id)}/doc/${encodeURIComponent(d.id)}">${esc(d.number&&d.type==='chapter'?`Chapter ${d.number}: ${d.name}`:d.name)}</a></h3><div class="manuscript-writing">${window.DaydreamFormat.sanitize(d.html)}</div></article>`).join('')}</section>`).join('')+(data.relationships.length?`<section class="manuscript-section"><h2>Connections</h2><ul>${data.relationships.map(e=>`<li>${esc(e.sourceName)} — ${esc(e.targetName)}</li>`).join('')}</ul></section>`:'');}
window.DaydreamManuscript={collect,html,exportDocuments};
})();
