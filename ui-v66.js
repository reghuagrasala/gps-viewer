/* GPS Viewer v66 address normalization + automatic text/icon fitting + modern weather icon. */
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
  function fitElement(el,max,min){
    if(!el)return;
    const computed=getComputedStyle(el),base=parseFloat(computed.fontSize)||max;
    let size=Math.min(max,base);
    el.style.fontSize=size+'px';el.style.whiteSpace='nowrap';
    let guard=0;
    while(el.scrollWidth>el.clientWidth+0.5&&size>min&&guard++<20){size=Math.max(min,size-0.25);el.style.fontSize=size+'px'}
  }
  function fitDashboardText(){
    document.querySelectorAll('.position-grid .metric-label,.weather-grid .metric-label').forEach(el=>fitElement(el,13.5,10.5));
    document.querySelectorAll('.position-grid .metric strong,.weather-grid .metric strong').forEach(el=>fitElement(el,13.5,10.5));
    document.querySelectorAll('.weather-main .condition').forEach(el=>fitElement(el,14,11));
  }
  function setModernWeatherIcon(){
    const box=document.getElementById('weatherIcon');
    if(!box)return;
    if(box.dataset.modernIcon==='1')return;
    box.textContent='';
    const img=document.createElement('img');
    img.src='./weather-icons.svg';img.alt='';img.setAttribute('aria-hidden','true');
    img.className='modern-weather-icon';
    box.appendChild(img);box.dataset.modernIcon='1';
  }
  function watchDashboard(){
    fitDashboardText();setModernWeatherIcon();
    if(window.ResizeObserver){const ro=new ResizeObserver(()=>{fitDashboardText();setModernWeatherIcon()});document.querySelectorAll('.position-grid,.weather-grid,.weather-main').forEach(el=>ro.observe(el))}
    setInterval(()=>{fitDashboardText();setModernWeatherIcon()},1000);
  }
  function start(){ensureCountryLine();setInterval(ensureCountryLine,400);watchDashboard()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
