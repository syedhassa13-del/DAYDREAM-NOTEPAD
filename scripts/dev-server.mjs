import http from 'node:http';
import https from 'node:https';
import {readFile,realpath,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(projectRoot,'dist');
const stateFile=path.join(projectRoot,'.daydream-runtime','port.json');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ttf':'font/ttf','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};

export function parsePort(value){if(value===undefined||value==='')return undefined;if(!/^\d+$/.test(String(value))||Number(value)>65535)throw Error('DAYDREAM_PORT must be a number from 0 to 65535.');return Number(value);}
export function networkUrls(port,protocol='http',interfaces=os.networkInterfaces()){
 const addresses=new Set(Object.values(interfaces).flat().filter(n=>n&&!n.internal&&(n.family==='IPv4'||n.family===4)).map(n=>n.address));
 return {local:`${protocol}://localhost:${port}`,network:[...addresses].map(ip=>`${protocol}://${ip}:${port}`)};
}
export async function handleRequest(req,res,root=dist){
 const send=(status,text)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:text);};
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');send(405,'Method not allowed');return;}
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://daydream.invalid').pathname);
  if(pathname.includes('\0')||pathname.includes('\\')){send(400,'Invalid path');return;}
  const base=await realpath(root),candidate=path.resolve(base,'.'+(pathname==='/'?'/index.html':pathname));
  if(!candidate.startsWith(base+path.sep)){send(403,'Forbidden');return;}
  const actual=await realpath(candidate);if(!actual.startsWith(base+path.sep)){send(403,'Forbidden');return;}
  const bytes=await readFile(actual);
  res.writeHead(200,{'Content-Type':mime[path.extname(actual)]||'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch(error){send(error instanceof URIError?400:error.code==='ENOENT'||error.code==='ENOTDIR'||error.code==='EISDIR'?404:500,'File unavailable');}
}
export async function startDevServer(env=process.env){
 const explicit=parsePort(env.DAYDREAM_PORT??env.PORT);let previous;
 try{previous=parsePort(JSON.parse(await readFile(stateFile,'utf8')).port);}catch{}
 const host=env.DAYDREAM_HOST||'0.0.0.0';
 const cert=env.DAYDREAM_HTTPS_CERT,key=env.DAYDREAM_HTTPS_KEY;
 if(Boolean(cert)!==Boolean(key))throw Error('Provide both DAYDREAM_HTTPS_CERT and DAYDREAM_HTTPS_KEY, or neither.');
 const server=cert?https.createServer({cert:await readFile(cert),key:await readFile(key)},handleRequest):http.createServer(handleRequest);
 const listen=port=>new Promise((resolve,reject)=>{const fail=e=>{server.off('listening',ready);reject(e);};const ready=()=>{server.off('error',fail);resolve();};server.once('error',fail);server.once('listening',ready);server.listen({host,port});});
 try{await listen(explicit??previous??0);}catch(e){if(e.code!=='EADDRINUSE'||explicit!==undefined)throw e;await listen(0);}
 const port=server.address().port;await mkdir(path.dirname(stateFile),{recursive:true});await writeFile(stateFile,JSON.stringify({port})+'\n');
 const urls=networkUrls(port,cert?'https':'http');console.log('\nDaydream is running\nLocal:   '+urls.local);for(const url of urls.network)console.log('Network: '+url);
 if(!urls.network.length)console.log('Network: connect to Wi-Fi/Ethernet to get a LAN address.');
 if(previous&&previous!==port)console.log('The previous port was unavailable. Cloud writing follows your account; device-only changes remain at the previous origin until synced.');
 console.log('Use the Network address on another device on the same network. Allow Node on your private network if the firewall asks.\nStop: Ctrl+C\n');return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){startDevServer().catch(e=>{console.error('Could not start Daydream:',e.message);process.exitCode=1;});}
