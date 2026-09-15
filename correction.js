/* Privacy-first map correction helper. No API keys, accounts, names, emails, or correction history are stored. */
(function(){
  const $=id=>document.getElementById(id);
  const text=id=>(($(id)?.textContent)||'—').trim();
  function coords(){
    const lat=parseFloat(text('lat').replace(/[^0-9+-.]/g,''));
    const lon=parseFloat(text('lon').replace(/[^0-9+-.]/g,''));
    return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
  }
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function copy(v){
    if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(v);
    const ta=document.createElement('textarea');ta.value=v;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return Promise.resolve