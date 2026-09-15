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
    const ta=document.createElement('textarea');ta.value=v;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return Promise.resolve();
  }
  function reportData(){
    const c=coords();
    return {c,place:text('placeName'),area:text('addressLine3'),po:text('locationPO'),digi:text('locationDigi')};
  }
  function reportText(d,type,correct,details){
    return ['GPS Viewer — Map Correction','Problem: '+type,'Latitude: '+d.c.lat,'Longitude: '+d.c.lon,'DIGIPIN: '+d.digi,'Place shown: '+d.place,'Address area: '+d.area,'Post Office: '+d.po,correct?'Correct information: '+correct:'',details?'Details: '+details:''].filter(Boolean).join('\n');
  }
  function openProvider(url){
    const w=window.open(url,'_blank','noopener,noreferrer');
    if(!w)location.href=url;
  }
  function hereFallback(result){
    if(result)result.innerHTML='HERE WeGo app was not opened. Choose a reporting option: <a href="https://mapcreator.here.com/" target="_blank" rel="noopener">HERE Map Creator</a> · <a href="https://mapfeedback.here.com/" target="_blank" rel="noopener">HERE Map Feedback</a>';
  }
  function openHere(d){
    const result=$('correctionResults');
    const ua=navigator.userAgent||'';
    const mobile=/iPhone|iPad|iPod|Android/i.test(ua);
    if(!mobile){hereFallback(result);return}
    if(result)result.textContent='Trying to open the HERE WeGo app at the captured GPS position…';
    const lat=d.c.lat,lon=d.c.lon;
    const appUrl=`wego://route/mylocation/${lat},${lon}?m=d`;
    const webUrl=`https://share.here.com/l/${lat},${lon}?p=yes&z=19&t=normal`;
    let leftPage=false;
    const mark=()=>{leftPage=true};
    document.addEventListener('visibilitychange',mark,{once:true});
    window.location.href=appUrl;
    setTimeout(()=>{
      document.removeEventListener('visibilitychange',mark);
      if(!leftPage){
        if(result)result.innerHTML='HERE WeGo app was not detected. <a href="'+webUrl+'" target="_blank" rel="noopener">Open HERE location</a> · <a href="https://mapcreator.here.com/" target="_blank" rel="noopener">Report with HERE Map Creator</a> · <a href="https://mapfeedback.here.com/" target="_blank" rel="noopener">HERE Map Feedback</a>';
      }
    },1600);
  }
  function show(){
    const d=reportData();
    if(!d.c){alert('Waiting for a valid GPS position.');return}
    const old=$('correctionBackdrop');if(old)old.remove();
    const el=document.createElement('section');
    el.id='correctionBackdrop';el.className='correction-backdrop';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
    el.innerHTML=`<div class="correction-panel"><div class="correction-head"><h3>Suggest One Correction</h3><button class="correction-close" id="correctionClose" type="button">×</button></div><p class="correction-note">Prepare one correction, then choose the provider yourself. GPS Viewer does not send, store or upload this report to its own server.</p><div class="correction-field"><div class="correction-label">What is wrong?</div><select id="correctionType" class="correction-select"><option>Commercial place</option><option>Public / non-commercial place</option><option>Private property incorrectly shown</option><option>Missing place</option><option>Wrong place location</option><option>Wrong name or information</option><option>Place closed / no longer exists</option><option>Road name missing</option><option>Road name outdated</option><option>Road name spelling/text error</option><option>Wrong road name</option><option>New road missing</option><option>Road geometry / connection</option><option>Wrong address</option><option>Missing address</option><option>Duplicate place</option><option>Other</option></select></div><div class="correction-field"><div class="correction-label">Correct information (optional)</div><input id="correctionCorrect" class="correction-input" maxlength="300" autocomplete="off" placeholder="Correct name / road / address"></div><div class="correction-field"><div class="correction-label">Details (optional)</div><textarea id="correctionDetails" class="correction-textarea" maxlength="600" placeholder="Brief factual explanation"></textarea></div><div class="correction-label">Captured GPS</div><div class="correction-readonly correction-coords">${d.c.lat.toFixed(6)}, ${d.c.lon.toFixed(6)}<br>DIGIPIN: ${esc(d.digi)}</div><div class="correction-actions"><button id="correctionCopy" type="button">Copy report</button><button id="correctionHere" type="button">Try HERE WeGo app</button><button id="correctionGoogle" type="button">Google Maps</button><button id="correctionOsm" type="button">OpenStreetMap</button><button id="correctionClose2" class="secondary" type="button">Cancel</button></div><div id="correctionResults" class="correction-results"></div><div class="correction-warning">Privacy: this screen does not collect your name, phone, email, account credentials or API keys, and it does not save correction history. When you open a provider, that provider receives whatever information you submit there under its own service and account rules.</div></div>`;
    document.body.appendChild(el);
    const close=()=>el.remove();
    $('correctionClose').onclick=close;$('correctionClose2').onclick=close;
    $('correctionCopy').onclick=()=>{const v=reportText(d,$('correctionType').value,$('correctionCorrect').value.trim(),$('correctionDetails').value.trim());copy(v).then(()=>{$('correctionResults').textContent='Report copied. Nothing was sent by GPS Viewer.'})};
    $('correctionHere').onclick=()=>openHere(d);
    $('correctionGoogle').onclick=()=>openProvider(`https://www.google.com/maps/search/?api=1&query=${d.c.lat},${d.c.lon}`);
    $('correctionOsm').onclick=()=>openProvider(`https://www.openstreetmap.org/?mlat=${d.c.lat}&mlon=${d.c.lon}&zoom=19&notes=yes`);
    el.addEventListener('click',e=>{if(e.target===el)close()});
  }
  function bind(){
    const old=$('suggestCorrection');if(!old)return;
    const fresh=old.cloneNode(true);old.replaceWith(fresh);fresh.addEventListener('click',show);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();