/* Public frontend configuration.
   HERE remains server-side in Cloudflare Workers.
   Mapbox uses a public browser token (pk...) and should be URL-restricted
   to https://reghuagrasala.github.io in the Mapbox dashboard.
*/
const MAPBOX_PUBLIC_TOKEN =
  "pk.eyJ1IjoicmVnaHVhLWFncmFzYWxhIiwiYSI6ImNtdDlrNGE0OTExejMydnNjZ2h0NDZuenoifQ." +
  "Outat1OJ0XjSZTQIGKyPLA";

window.GPS_VIEWER_CONFIG = {
  apiBase: "https://my-location-here.hrcvb7p7r5.workers.dev",
  apiBases: [
    "https://my-location-here.hrcvb7p7r5.workers.dev",
    "https://small-sky-cec5.hrcvb7p7r5.workers.dev"
  ],
  mapboxAccessToken: MAPBOX_PUBLIC_TOKEN
};
