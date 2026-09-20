/* Public frontend configuration.
   HERE remains server-side in Cloudflare Workers.
   Mapbox uses a PUBLIC browser token (pk...). Restrict it to this GitHub Pages URL in Mapbox.
*/
window.GPS_VIEWER_CONFIG = {
  apiBase: "https://my-location-here.hrcvb7p7r5.workers.dev",
  apiBases: [
    "https://my-location-here.hrcvb7p7r5.workers.dev",
    "https://small-sky-cec5.hrcvb7p7r5.workers.dev"
  ],
  // Paste your restricted Mapbox public token here.
  // Do NOT use an sk... secret token in this browser app.
  mapboxAccessToken: ""
};
