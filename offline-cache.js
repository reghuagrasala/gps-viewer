/* GPS Viewer cache disabled.
   Weather/location results are now fetched fresh; no IndexedDB cache is retained. */
const GV_CACHE_DB = "gps-viewer-cache-v1";
const GV_STORE = "locationResults";

async function gvClearCache(){
  try{
    if(window.indexedDB) await new Promise(resolve=>{
      const r=indexedDB.deleteDatabase(GV_CACHE_DB);
      r.onsuccess=resolve;r.onerror=resolve;r.onblocked=resolve;
    });
  }catch(_){ }
}

async function gvPut(){ return; }
async function gvGetNearby(){ return null; }

/* Remove any old cached weather/location data left by earlier versions. */
gvClearCache();
try{
  Object.keys(localStorage).forEach(k=>{
    if(k.startsWith('gpsViewer.lastAddress')||k.startsWith('gpsViewer.lastPlace')||k.startsWith('gpsViewer.postOffice.')) localStorage.removeItem(k);
  });
}catch(_){ }
