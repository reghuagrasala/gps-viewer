# GPS Viewer — GitHub Pages Ready

## Deployment
1. Create a GitHub repository.
2. Upload these files to the repository root.
3. GitHub **Settings → Pages → Deploy from a branch**.
4. Select the main branch and `/ (root)`.
5. Open the Pages URL in iPhone Safari.
6. Use **Share → Add to Home Screen**.

## Architecture
GitHub Pages hosts the static PWA frontend.
The Cloudflare Worker handles HERE place/address lookup and the weather proxy.
The HERE API key is kept as a Cloudflare Worker secret and is NOT included in this repository.

## Privacy
Do not commit API keys, personal addresses, home coordinates, GPS history, or other private information.
GPS and DIGIPIN work offline; cached results may be displayed offline.
No automatic venue-image fetching is used.
The compact address card is designed to accommodate 2–3 address lines.


## v8 runtime fixes
- Declares all GPS/data/tab runtime state before startup.
- Requests one immediate browser location and then keeps watching position.
- Shows a useful GPS permission/location-service error instead of remaining silently on “Waiting”.
- GPS coordinates, elevation (when supplied), accuracy, speed, heading and DIGIPIN work without internet once browser location permission is available.
- DATA ON/OFF now actually changes state.
- Nearby-place results are retained for the PLACES tab.
- Service-worker cache is v8 so corrected JavaScript replaces the broken cached version.
