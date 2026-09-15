/* GPS Viewer v66 address normalization: preserve house/road and show India as a fifth line. */
(function(){
  function text(id){return (document.getElementById(id)?.textContent||'').trim()}
  function ensureCountryLine(){
    const card=document.querySelector('.address-card'),content=card?.querySelector('.address-content');
    if(!content)return;
    let country=document.getElementById('addressLine4');
    if(!country){country=document.createElement('div');country.id='addressLine4';country.className='address-line';country.textContent='India';content.appendChild(country)}
    let saved=null;try{saved=JSON.parse(localStorage.getItem('gpsViewer.lastAddress')||'null')}catch(e){}
    const house=document.getElementById('addressLine2'),area=document.getElementById('addressLine3');
    let houseText=String(saved?.line2||'').trim();
    if(!houseText){
      const current=text('addressLine2');
      if(current && !/^India$/i.test(current))houseText=current;
    }
    if(house && houseText)house.textContent=houseText;
    if(house)house.style.display=houseText?'block':'none';
    if(area){let s=text('addressLine3').replace(/\s*,\s*India\s*$/i,'').trim();area.textContent=s}
    country.textContent='India';
    country.style.display='block';country.style.visibility='visible';
  }
  function start(){ensureCountryLine();setInterval(ensureCountryLine,400);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
