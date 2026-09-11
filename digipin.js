/* India Post official DIGIPIN algorithm, adapted for browser use.
   Source: https://github.com/INDIAPOST-gov/digipin
*/
const DIGIPIN_GRID = [
  ["F","C","9","8"],
  ["J","3","2","7"],
  ["K","4","5","6"],
  ["L","M","P","T"]
];
const DIGIPIN_BOUNDS={minLat:2.5,maxLat:38.5,minLon:63.5,maxLon:99.5};
function getDigiPin(lat,lon){
  if(lat<DIGIPIN_BOUNDS.minLat||lat>DIGIPIN_BOUNDS.maxLat) throw new Error("Latitude out of range");
  if(lon<DIGIPIN_BOUNDS.minLon||lon>DIGIPIN_BOUNDS.maxLon) throw new Error("Longitude out of range");
  let minLat=DIGIPIN_BOUNDS.minLat,maxLat=DIGIPIN_BOUNDS.maxLat,minLon=DIGIPIN_BOUNDS.minLon,maxLon=DIGIPIN_BOUNDS.maxLon,pin="";
  for(let level=1;level<=10;level++){
    const latDiv=(maxLat-minLat)/4,lonDiv=(maxLon-minLon)/4;
    let row=3-Math.floor((lat-minLat)/latDiv),col=Math.floor((lon-minLon)/lonDiv);
    row=Math.max(0,Math.min(row,3));col=Math.max(0,Math.min(col,3));
    pin+=DIGIPIN_GRID[row][col];
    maxLat=minLat+latDiv*(4-row);minLat=minLat+latDiv*(3-row);
    minLon=minLon+lonDiv*col;maxLon=minLon+lonDiv;
  }
  return pin;
}
function formatDigiPin(pin){pin=pin.replace(/[^23456789CJKLMPFT]/gi,"").toUpperCase();return pin.length===10?`${pin.slice(0,3)} ${pin.slice(3,7)} ${pin.slice(7)}`:pin}
function getLatLngFromDigiPin(digiPin){
  const pin=String(digiPin).trim().replace(/[-\s]/g,"").toUpperCase();
  if(!/^[23456789CJKLMPFT]{10}$/.test(pin)) throw new Error("Invalid DIGIPIN");
  let minLat=DIGIPIN_BOUNDS.minLat,maxLat=DIGIPIN_BOUNDS.maxLat,minLon=DIGIPIN_BOUNDS.minLon,maxLon=DIGIPIN_BOUNDS.maxLon;
  for(const ch of pin){
    let ri=-1,ci=-1;
    for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(DIGIPIN_GRID[r][c]===ch){ri=r;ci=c}
    const latDiv=(maxLat-minLat)/4,lonDiv=(maxLon-minLon)/4;
    const lat1=maxLat-latDiv*(ri+1),lat2=maxLat-latDiv*ri,lon1=minLon+lonDiv*ci,lon2=minLon+lonDiv*(ci+1);
    minLat=lat1;maxLat=lat2;minLon=lon1;maxLon=lon2;
  }
  return {latitude:(minLat+maxLat)/2,longitude:(minLon+maxLon)/2};
}
