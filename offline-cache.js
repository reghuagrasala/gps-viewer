/* GPS Viewer offline location cache.
   Stores successful online reverse-geocode and weather results locally.
   Cache keys are rounded to ~100 m cells so travel data is reusable nearby. */
const GV_CACHE_DB = "gps-viewer-cache-v1";
const GV_STORE = "locationResults";

function gvCell(lat, lon) {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

function gvOpenDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("IndexedDB unavailable"));
    const r = indexedDB.open(GV_CACHE_DB, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(GV_STORE)) {
        const s = db.createObjectStore(GV_STORE, { keyPath: "key" });
        s.createIndex("type", "type", { unique: false });
        s.createIndex("saved", "saved", { unique: false });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error("IndexedDB error"));
  });
}

async function gvPut(type, lat, lon, data) {
  try {
    const db = await gvOpenDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(GV_STORE, "readwrite");
      tx.objectStore(GV_STORE).put({
        key: `${type}:${gvCell(lat, lon)}`,
        type, lat, lon, saved: Date.now(), data
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (_) {}
}

async function gvGetNearby(type, lat, lon, maxDistanceM = 250) {
  try {
    const db = await gvOpenDB();
    const rows = await new Promise((resolve, reject) => {
      const tx = db.transaction(GV_STORE, "readonly");
      const req = tx.objectStore(GV_STORE).index("type").getAll(type);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    let best = null;
    for (const row of rows) {
      const d = gvDistanceM(lat, lon, row.lat, row.lon);
      if (d <= maxDistanceM && (!best || d < best.distance)) best = { ...row, distance: d };
    }
    return best;
  } catch (_) { return null; }
}

function gvDistanceM(aLat, aLon, bLat, bLon) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad, dLon = (bLon - aLon) * rad;
  const x = Math.sin(dLat/2)**2 + Math.cos(aLat*rad)*Math.cos(bLat*rad)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
