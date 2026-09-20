/* Public frontend configuration.
   HERE remains server-side in Cloudflare Workers.
   Mapbox uses a PUBLIC browser token (pk...). Restrict it to this GitHub Pages URL in Mapbox.
*/
const MAPBOX_PUBLIC_TOKEN =
  "pk.eyJ1IjoicmVnaHVhLWFncmFzYWxhIiwiYSI6ImNtdTlqaTR3YzExc2syeHNiODdybWpvazEifQ." +
  "QvxbqX2jLykuo3PuqpgBHw";

window.GPS_VIEWER_CONFIG = {
  apiBase: "https://my-location-here.hrcvb7p7r5.workers.dev",
  apiBases: [
    "https://my-location-here.hrcvb7p7r5.workers.dev",
    "https://small-sky-cec5.hrcvb7p7r5.workers.dev"
  ],
  // Restricted Mapbox public token for this GPS Viewer.
  // Do NOT use an sk... secret token in this browser app.
  mapboxAccessToken: MAPBOX_PUBLIC_TOKEN
};
