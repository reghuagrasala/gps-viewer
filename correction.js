/* Privacy-first map correction hub. One correction is prepared once, then opened provider-by-provider. */
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
  function providerUrl(name,d){
    const {lat,lon}=d.c;
    if(name==='HERE')return `https://share.here.com/l/${lat},${lon}?p=yes&z=19&t=normal`;
    if(name==='Google')return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    if(name==='Apple')return `https://maps.apple.com/?ll=${lat},${lon}&q=Map%20Correction`;
    if(name==='OSM')return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=19&notes=yes`;
    return `https://apps.mapbox.com/feedback/#/${lon}/${lat}/19`;
  }
  function reportUrl(name){
    if(name==='HERE')return 'https://mapcreator.here.com/';
    if(name==='Google')return 'https://support.google.com/maps/answer/3094088';
    if(name==='Apple')return 'https://support.apple.com/guide/iphone/report-an-issue-with-maps-iph2c075a8e8/26/ios/26';
    if(name==='OSM')return 'https://www.openstreetmap.org/note/new';
    return 'https://apps.mapbox.com/feedback/';
  }
  function providerHint(name){
    if(name==='HERE')return 'Open HERE at this GPS position, then use Map Creator/Map Feedback to submit.';
    if(name==='Google')return 'Open Google Maps at this GPS position, then use Suggest an edit / Report a problem.';
    if(name==='Apple')return 'Open Apple Maps at this GPS position, then Reports → Report a New Issue.';
    if(name==='OSM')return 'Open the OSM map with Notes enabled and create a map-error note at this position.';
    return 'Open Mapbox Contribute at this GPS position and submit the map-data correction.';
  }
  function openProvider(name,d){
    const result=$('correctionResults');
    const url=providerUrl(name,d);
    if(result)result.innerHTML='<b>'+name+'</b>: '+providerHint(name)+' <a href="'+esc(reportUrl(name))+'" target="_blank" rel="noopener">Reporting help / form</a>';
    const w=window.open(url,'_blank','noopener,noreferrer');
    if(!w)location.href=url;
  }
  function show(){
    const d=reportData();
    if(!d.c){alert('Waiting for a valid GPS position.');return}
    const old=$('correctionBackdrop');if(old)old.remove();
    const el=document.createElement('section');
    el.id='correctionBackdrop';el.className='correction-backdrop';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
    el.innerHTML=`<div class="correction-panel"><div class="correction-head"><h3>Suggest One Correction</h3><button class="correction-close" id="correctionClose" type="button">×</button></div><p class="correction-note">Prepare the correction once. Then open HERE, Google, Apple, OpenStreetMap or Mapbox individually from this same screen. GPS Viewer does not submit the correction through its own server.</p><div class="correction-field"><div class="correction-label">What is wrong?</div><select id="correctionType" class="correction-select"><option>Commercial place</option><option>Public / non-commercial place</option><option>Private property incorrectly shown</option><option>Missing place</option><option>Wrong place location</option><option>Wrong name or information</option><option>Place closed / no longer exists</option><option>Road name missing</option><option>Road name outdated</option><option>Road name spelling/text error</option><option>Wrong road name</option><option>New road missing</option><option>Road geometry / connection</option><option>Wrong address</option><option>Missing address</option><option>Duplicate place</option><option>Other</option></select></div><div class="correction-field"><div class="correction-label">Correct information (optional)</div><input id="correctionCorrect" class="correction-input" maxlength="300" autocomplete="off" placeholder="Correct name / road / address"></div><div class="correction-field"><div class="correction-label">Details (optional)</div><textarea id="correctionDetails" class="correction-textarea" maxlength="600" placeholder="Brief factual explanation"></textarea></div><div class="correction-label">Captured GPS</div><div class="correction-readonly correction-coords">${d.c.lat.toFixed(6)}, ${d.c.lon.toFixed(6)}<br>DIGIPIN: ${esc(d.digi)}</div><div class="correction-actions"><button id="correctionCopy" type="button">Copy prepared report</button><button class="provider-btn" data-provider="HERE" type="button">HERE</button><button class="provider-btn" data-provider="Google" type="button">Google</button><button class="provider-btn" data-provider="Apple" type="button">Apple</button><button class="provider-btn" data-provider="OSM" type="button">OSM</button><button class="provider-btn" data-provider="Mapbox" type="button">Mapbox</button><button id="correctionClose2" class="secondary" type="button">Close</button></div><div class="provider-note">Each provider opens independently. If its app is installed and accepts the link, the app may open; otherwise the provider's web page opens. The correction text stays on this screen until you close it.</div><div id="correctionResults" class="correction-results">Choose a provider above. Use “Copy prepared report” when the provider asks for the correction details.</div><div class="correction-warning">Privacy: GPS Viewer does not collect your name, phone, email, account credentials or API keys, and does not save correction history. Once you open a provider and submit something there, that provider receives the information you choose to submit under its own service and account rules.</div></div>`;
    document.body.appendChild(el);
    const close=()=>el.remove();
    $('correctionClose').onclick=close;$('correctionClose2').onclick=close;
    $('correctionCopy').onclick=()=>{const v=reportText(d,$('correctionType').value,$('correctionCorrect').value.trim(),$('correctionDetails').value.trim());copy(v).then(()=>{$('correctionResults').textContent='Prepared report copied. Nothing was sent by GPS Viewer.'})};
    el.querySelectorAll('.provider-btn').forEach(btn=>btn.addEventListener('click',()=>openProvider(btn.dataset.provider,d)));
    el.addEventListener('click',e=>{if(e.target===el)close()});
  }
  function bind(){
    const old=$('suggestCorrection');if(!old)return;
    const fresh=old.cloneNode(true);old.replaceWith(fresh);fresh.addEventListener('click',show);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();