# FishLog V1 Test App

A simple iPhone-friendly fishing log web app.

## What is included
- Satellite map
- Topo overlay
- Catch pins
- Pin clustering
- Tap cluster to zoom and show individual pins
- Animated trophy pin for largest fish in a cluster
- Big Fish Zone overlay
- Big Fish Zone rule: 3+ bass, 15 inches or larger, in the same general area
- Lure library
- Add New Lure / Other option while logging a catch
- Catch history
- Basic stats and smart lure suggestion
- Live weather via Open-Meteo


## Map looks like one small square / does not fill the screen
This fixed version includes local Leaflet fallback CSS and mobile Safari full-screen sizing. If you already published the older files, replace `index.html`, `styles.css`, and `app.js` with the files from this ZIP, then commit changes. Refresh Safari after GitHub Pages finishes updating.

## Important notes
This is a test version. Data is saved in your browser's local storage. That means it stays on the device/browser you use unless you clear browser data.

The map uses free public map tiles for testing. A production app may need a paid or licensed map/depth-contour provider depending on your needs.

# Run locally
Open `index.html` in a browser. For best mobile testing, publish it with GitHub Pages using the steps below.

# Publish for free with GitHub Pages

## From an iPhone only
1. Install the GitHub app or go to github.com in Safari.
2. Create a free GitHub account or sign in.
3. Tap the `+` button and create a new repository.
4. Name it something like `fishlog-v1`.
5. Set it to `Public`.
6. Upload these files into the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
7. After upload, open the repository in Safari.
8. Tap `Settings`.
9. Tap `Pages`.
10. Under `Build and deployment`, choose:
    - Source: `Deploy from a branch`
    - Branch: `main`
    - Folder: `/root`
11. Tap `Save`.
12. Wait a minute or two, then GitHub will show a live website link.
13. Open that link on your iPhone.
14. Tap the iPhone share button.
15. Tap `Add to Home Screen`.
16. Now it behaves like a simple app icon on your phone.

## From a desktop
1. Go to github.com and sign in.
2. Click `New repository`.
3. Name it `fishlog-v1`.
4. Set it to `Public`.
5. Click `Create repository`.
6. Click `uploading an existing file`.
7. Drag in:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
8. Click `Commit changes`.
9. Go to `Settings` → `Pages`.
10. Set Source to `Deploy from a branch`.
11. Set Branch to `main` and folder to `/root`.
12. Click `Save`.
13. Open the GitHub Pages link once it appears.
14. On your iPhone, open the link and use `Add to Home Screen`.

## Updating the app later
1. Replace the old file with the new version.
2. Commit changes.
3. GitHub Pages will update automatically.
4. If your iPhone still shows the old version, refresh Safari or remove/re-add the Home Screen shortcut.

