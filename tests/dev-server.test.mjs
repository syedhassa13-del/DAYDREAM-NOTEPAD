import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleRequest,parsePort,networkUrls} from '../scripts/dev-server.mjs';
async function request(url,method='GET'){
 const result={headers:{},status:0,body:null};const res={setHeader(k,v){result.headers[k]=v;},writeHead(s,h){result.status=s;Object.assign(result.headers,h);},end(body){result.body=body;}};
 await handleRequest({url,method},res);return result;
}
test('automatic port selection and real LAN URLs',()=>{assert.equal(parsePort(undefined),undefined);assert.equal(parsePort('0'),0);assert.throws(()=>parsePort('-1'));assert.throws(()=>parsePort('65536'));assert.throws(()=>parsePort('word'));assert.deepEqual(networkUrls(49123,'http',{wifi:[{family:'IPv4',address:'192.168.1.9',internal:false}],loop:[{family:'IPv4',address:'127.0.0.1',internal:true}]}),{local:'http://localhost:49123',network:['http://192.168.1.9:49123']});});
test('root, Firebase module, styles, fonts and HEAD serve valid assets',async()=>{for(const [url,type] of [['/','text/html'],['/firebase-client.js','text/javascript'],['/experience.css','text/css'],['/fonts/KumbhSans-400.ttf','font/ttf']]){const r=await request(url);assert.equal(r.status,200);assert.ok(r.headers['Content-Type'].startsWith(type));assert.ok(r.body.length>0);}const r=await request('/','HEAD');assert.equal(r.status,200);assert.equal(r.body,undefined);});
test('source, private files, traversal and unsupported methods stay unavailable',async()=>{for(const url of ['/package.json','/.git/config','/firestore.rules','/.env','/unknown'])assert.equal((await request(url)).status,404);assert.equal((await request('/%2e%2e%2fpackage.json')).status,403);assert.equal((await request('/%zz')).status,400);assert.equal((await request('/','POST')).status,405);});
