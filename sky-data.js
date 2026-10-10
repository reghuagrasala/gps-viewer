/* Offline sky calculations powered by the locally bundled Astronomy Engine. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  let lat = null, lon = null, lastKey = "", timer = null;
  const rad = Math.PI / 180;
  const fmtTime = d => d ? d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", hour12:true}) : "No event";
  const fmtDuration = ms => {
    if (ms == null || !Number.isFinite(ms)) return "Unavailable";
    const mins = Math.max(0, Math.round(ms / 60000));
    return Math.floor(mins / 60) + "h " + String(mins % 60).padStart(2, "0") + "m";
  };
  function eventTime(body, direction, observer, start) {
    try { const t = Astronomy.SearchRiseSet(body, observer, direction, start, 1); return t && t.date ? t.date : null; }
    catch (_) { return null; }
  }
  function render() {
    if (lat == null || lon == null || !window.Astronomy) return;
    const now = new Date();
    const observer = new Astronomy.Observer(lat, lon, 0);
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sunrise = eventTime("Sun", +1, observer, midnight);
    const sunset = eventTime("Sun", -1, observer, midnight);
    const moonrise = eventTime("Moon", +1, observer, midnight);
    const moonset = eventTime("Moon", -1, observer, midnight);
    const sunEq = Astronomy.Equator("Sun", now, observer, true, true);
    const sunH = Astronomy.Horizon(now, observer, sunEq, "normal");
    const phase = ((Astronomy.MoonPhase(now) % 360) + 360) % 360;
    const illum = Math.round(50 * (1 - Math.cos(phase * rad)));
    const phaseDays = phase / 360 * 29.530588853;
    let phaseName;
    if (phase < 22.5 || phase >= 337.5) phaseName = "New Moon";
    else if (phase < 67.5) phaseName = "Waxing Crescent";
    else if (phase < 112.5) phaseName = "First Quarter";
    else if (phase < 157.5) phaseName = "Waxing Gibbous";
    else if (phase < 202.5) phaseName = "Full Moon";
    else if (phase < 247.5) phaseName = "Waning Gibbous";
    else if (phase < 292.5) phaseName = "Last Quarter";
    else phaseName = "Waning Crescent";
    const moonEq = Astronomy.Equator("Moon", now, observer, true, true);
    const distanceKm = Number.isFinite(moonEq.dist) ? Math.round(moonEq.dist * 149597870.7) : null;
    const solarNoon = sunrise && sunset ? new Date((sunrise.getTime() + sunset.getTime()) / 2) : null;
    const duration = sunrise && sunset ? sunset.getTime() - sunrise.getTime() : null;
    const values = {
      skySunrise: fmtTime(sunrise), skySunset: fmtTime(sunset), skyMoonrise: fmtTime(moonrise), skyMoonset: fmtTime(moonset),
      skyNoon: fmtTime(solarNoon), skyDayLength: fmtDuration(duration),
      skySunAltitude: Number.isFinite(sunH.altitude) ? sunH.altitude.toFixed(1) + "°" : "Unavailable",
      skySunAzimuth: Number.isFinite(sunH.azimuth) ? sunH.azimuth.toFixed(0) + "°" : "Unavailable",
      skyMoonPhase: phaseName, skyMoonIllumination: illum + "% illuminated",
      skyMoonAge: "Approx. phase age " + phaseDays.toFixed(1) + " days",
      skyMoonDistance: distanceKm == null ? "Unavailable" : distanceKm.toLocaleString() + " km"
    };
    Object.entries(values).forEach(([id, value]) => { const e = $(id); if (e) e.textContent = value; });
    const stamp = $("skyUpdated"); if (stamp) stamp.textContent = "Calculated offline • " + now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
  }
  function setPosition(detail) {
    if (!detail || !Number.isFinite(detail.latitude) || !Number.isFinite(detail.longitude)) return;
    const key = detail.latitude.toFixed(5) + "," + detail.longitude.toFixed(5);
    lat = detail.latitude; lon = detail.longitude;
    if (key !== lastKey) { lastKey = key; render(); }
  }
  document.addEventListener("gpsviewer:position", e => setPosition(e.detail));
  // Also read the already-populated position fields if GPS started before this script.
  function readDisplayedPosition() {
    const a = Number.parseFloat($("lat")?.textContent);
    const b = Number.parseFloat($("lon")?.textContent);
    if (Number.isFinite(a) && Number.isFinite(b)) setPosition({latitude:a, longitude:b});
  }
  window.addEventListener("load", readDisplayedPosition);
  timer = window.setInterval(render, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
})();
