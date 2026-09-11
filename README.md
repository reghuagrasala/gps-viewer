# GPS Viewer — iPhone Travel / Offline-First PWA

This version is designed for an iPhone portrait Home Screen web app and automatically updates location information while travelling.

## Automatic travel updating

- Uses high-accuracy `watchPosition()` so latitude, longitude, accuracy, speed, heading and DIGIPIN update as the phone moves.
- Online reverse geocoding refreshes after the phone moves roughly 60 m, with a short request cooldown to avoid excessive API calls.
- Online weather refreshes automatically and is throttled to about every 10 minutes.
- Successful online address and weather results are stored in IndexedDB.
- When data is unavailable, the app searches the local cache for a nearby previously visited result and displays it with an `OFFLINE CACHE` label.
- GPS and DIGIPIN remain fully offline.

## Important offline limitation

No browser can know an address it has never downloaded. A truly offline address search for every road/landmark in India would require a large offline geocoding database or licensed offline map/geocoding data. This app therefore builds its own travel cache automatically while online. For a new place never cached before, it can still show GPS/DIGIPIN offline, but cannot invent the road/post-office address.

## HERE integration

The current package keeps the public reverse-geocoding fallback so it remains functional. Replace the reverse-geocoding URL in `app.js` with the exact route of the user's Cloudflare Worker that proxies HERE Reverse Geocoding. The HERE API key must remain a Cloudflare Worker secret and must never be placed in browser JavaScript.

Recommended architecture:

GPS → DIGIPIN (offline)
GPS → Cloudflare Worker → HERE Reverse Geocoding (online)
GPS → local IndexedDB travel cache (offline fallback)
GPS → PIN/postal database layer (future pan-India enhancement)

## GitHub Pages

Upload the folder contents to a GitHub repository and enable GitHub Pages from the `main` branch. Open the HTTPS URL in Safari and use **Share → Add to Home Screen**.


## IMPORTANT — first test after replacing the files
Open the GitHub Pages URL and press Ctrl+F5. If the app reports
“GPS DENIED”, allow Location for `reghuagrasala.github.io` in Edge.
GPS/DIGIPIN themselves do not require internet; browser/Windows location
permission is still required to obtain the device position.
