/* GPS Viewer — offline clock
   Keeps the visible GPS date/time supplied directly by the iPhone/device clock.
   It does not depend on weather, network, GPS, or cached data.
*/
(function(){
  function update(){
    const d=new Date();
    const date=d.toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'2-digit'});
    const time=d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});
    const ids=[['gpsDate',date],['gpsTime',time],['weatherDate',date],['weatherTime',time]];
    ids.forEach(([id,value])=>{const e=document.getElementById(id);if(e)e.textContent=value});
  }
  update();
  setInterval(update,1000);
  window.addEventListener('pageshow',update);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
})();