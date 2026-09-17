/* GPS Viewer — lightweight offline time-zone resolver.
   Version: TZ-GPS-1.0
   Uses local coordinate rules only; no network request.
   It deliberately covers common travel regions and falls back to the device zone.
*/
(function(){
  const Z=[
    {n:'Pacific/Honolulu',w:-160,e:-154,s:18,north:23,o:-600},
    {n:'America/Anchorage',w:-170,e:-130,s:51,north:72,o:-540},
    {n:'America/Los_Angeles',w:-125,e:-114,s:31,north:49,o:-480},
    {n:'America/Denver',w:-114,e:-102,s:31,north:49,o:-420},
    {n:'America/Chicago',w:-102,e:-87,s:25,north:49,o:-360},
    {n:'America/New_York',w:-87,e:-66,s:24,north:49,o:-300},
    {n:'America/Sao_Paulo',w:-54,e:-35,s:-34,north:6,o:-180},
    {n:'America/Argentina/Buenos_Aires',w:-74,e:-53,s:-56,north:-21,o:-180},
    {n:'Europe/London',w:-11,e:2,s:49,north:59,o:0},
    {n:'Europe/Paris',w:2,e:16,s:42,north:56,o:60},
    {n:'Europe/Helsinki',w:16,e:31,s:54,north:71,o:120},
    {n:'Europe/Moscow',w:31,e:61,s:41,north:70,o:180},
    {n:'Africa/Cairo',w:24,e:37,s:21,north:32,o:120},
    {n:'Africa/Johannesburg',w:16,e:33,s:-35,north:-22,o:120},
    {n:'Asia/Dubai',w:51,e:57,s:22,north:27,o:240},
    {n:'Asia/Riyadh',w:34,e:51,s:15,north:33,o:180},
    {n:'Asia/Tehran',w:44,e:64,s:25,north:40,o:210},
    {n:'Asia/Kolkata',w:68,e:98,s:6,north:37,o:330},
    {n:'Asia/Kathmandu',w:80,e:89,s:26,north:31,o:345},
    {n:'Asia/Dhaka',w:88,e:93,s:20,north:27,o:360},
    {n:'Asia/Bangkok',w:97,e:106,s:5,north:21,o:420},
    {n:'Asia/Singapore',w:99,e:105,s:-2,north:8,o:480},
    {n:'Asia/Shanghai',w:106,e:123,s:18,north:54,o:480},
    {n:'Asia/Tokyo',w:129,e:146,s:30,north:46,o:540},
    {n:'Australia/Perth',w:112,e:129,s:-36,north:-13,o:480},
    {n:'Australia/Adelaide',w:129,e:141,s:-39,north:-26,o:570},
    {n:'Australia/Sydney',w:141,e:154,s:-38,north:-10,o:600},
    {n:'Pacific/Auckland',w:165,e:180,s:-48,north:-30,o:720}
  ];
  function deviceZone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch(e){return 'UTC'}}
  function find(lat,lon){
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
    for(const z of Z)if(lat>=z.s&&lat<=z.north&&lon>=z.w&&lon<=z.e)return z;
    return null;
  }
  function offsetText(min){const sign=min>=0?'+':'−',a=Math.abs(min),h=Math.floor(a/60),m=a%60;return `GMT${sign}${h}${m?':'+String(m).padStart(2,'0'):''}`}
  function display(z){return z.n.replace(/^.*\//,'').replace(/_/g,' ')+' '+offsetText(z.o)}
  window.GPSViewerOfflineTZ={
    version:'TZ-GPS-1.0',
    deviceZone,
    lookup(lat,lon){const z=find(lat,lon);return z?{iana:z.n,offsetMinutes:z.o,label:display(z),approximate:true}:null},
    apply(lat,lon){const z=find(lat,lon);const el=document.getElementById('timezone');if(!el)return null;if(z){el.textContent=display(z);el.title='GPS position-based offline time zone (approximate boundary data)';return z}el.textContent=(deviceZone()||'UTC').replace(/^.*\//,'').replace(/_/g,' ');el.title='Device time zone fallback';return null}
  };
})();