/* Public web configuration. Passwords are handled exclusively by Firebase Authentication. */
window.DaydreamFirebaseReady=(async()=>{
 const base='https://www.gstatic.com/firebasejs/12.19.0/';
 const [appSDK,authSDK,dbSDK]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore-lite.js')]);
 const app=appSDK.initializeApp({apiKey:'AIzaSyDwdMgcY0ECosYzwGJ7vym3SOKndYE-3f8',authDomain:'daydream-47a16.firebaseapp.com',projectId:'daydream-47a16',storageBucket:'daydream-47a16.firebasestorage.app',messagingSenderId:'580428117090',appId:'1:580428117090:web:267eddf59f5a938abecd3b'});
 const auth=authSDK.getAuth(app),db=dbSDK.getFirestore(app);
 const makeRemote=uid=>{
  const ref=(t,id)=>dbSDK.doc(db,'users',uid,t,encodeURIComponent(id));
  return {
   backgroundSync:true,
   async get(t,id){const s=await dbSDK.getDoc(ref(t,id));return s.exists()?s.data():null;},
   async list(t,realityId){const records=[];let cursor=null;for(;;){const constraints=[...(realityId?[dbSDK.where('value.realityId','==',realityId)]:[]),dbSDK.orderBy(dbSDK.documentId()),...(cursor?[dbSDK.startAfter(cursor)]:[]),dbSDK.limit(250)];const page=await dbSDK.getDocs(dbSDK.query(dbSDK.collection(db,'users',uid,t),...constraints));records.push(...page.docs.map(s=>s.data()));if(page.size<250)break;cursor=page.docs.at(-1);if(records.length>=10000)throw Error('This section is larger than this release supports. Open a smaller project or contact support before adding more entries.');}return records;},
   async commit(job){if(navigator.onLine===false)throw Error('You are offline.');const ops=[...new Map(job.ops.map(o=>[`${o.table}/${o.remove||o.value.id}`,o])).values()];await dbSDK.runTransaction(db,async tx=>{const rows=await Promise.all(ops.map(o=>tx.get(ref(o.table,o.remove||o.value.id))));if(rows.every(s=>s.exists()&&s.data().lastJob===job.id))return;for(let i=0;i<ops.length;i++){const o=ops[i],id=o.remove||o.value.id,k=`${o.table}/${id}`,old=rows[i].exists()?rows[i].data():null;if((old?.revision||0)!==job.expected[k]){const error=Error('This entry changed on another device. Download your recovery copy, then load the cloud version from Account.');error.code='daydream/conflict';throw error;}}
    for(let i=0;i<ops.length;i++){const o=ops[i],id=o.remove||o.value.id,k=`${o.table}/${id}`,old=rows[i].exists()?rows[i].data():null;const value=o.remove?{id,...(old?.value?.realityId?{realityId:old.value.realityId}:{})}:o.value;tx.set(ref(o.table,id),{value,revision:job.expected[k]+1,deleted:!!o.remove,lastJob:job.id});}
   });}
  };
 };
 return {auth,authSDK,makeRemote};
})();
// Avoid an unhandled rejection; the Account UI presents an actionable error.
window.DaydreamFirebaseReady.catch(()=>{});
