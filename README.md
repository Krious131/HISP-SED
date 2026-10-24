# HISP-SED — Free Flight

A free-flight 3D space experience built with Vite and Three.js. It includes a first-run launch sequence, selectable spacecraft, interactive orbital contacts, a dedicated cipher training range, authenticated AES-GCM packet demonstrations, and an optional live camera backdrop. Camera access is requested only after tapping **CAMERA**; the app does not use AR.js/Hiro tracking.

The app is branded **HISP-SED**. Its custom orbit-and-planet icon is in `assets/icon.svg`; generated Android launcher icon variants are in `android/app/src/main/res/`.

## Run locally

1. Open this folder in VS Code.
2. In the integrated terminal, run `npm install` once.
3. Run `npm run dev -- --host 0.0.0.0 --port 5173`.
4. Open [http://localhost:5173/](http://localhost:5173/) in a modern browser.
5. Drag to orbit around the spacecraft and scroll or pinch to zoom. Open **SPACECRAFT** to select AIM or either AcrimSAT model. On a phone, tap **MOTION**, then turn or tilt the phone; drag and pinch remain available.
6. Select one of the orbiting satellites in the scene, or choose it from **SPACECRAFT → ORBITAL CONTACTS**. Inspect its simulated position, altitude, speed, vector path, and ping. Tune antenna phase and elevation to lock onto its beacon.
7. Open **CIPHER RANGE** for the guided substitution, transposition, and dual-key puzzles. The tutorial appears on first entry. Cleared tiers unlock the next tier and enable an encoded return signal. The AES-256-GCM panel demonstrates packet sealing, decryption, and tamper rejection.
8. Tap **CAMERA** to request the rear camera and show a live, translucent camera view behind the 3D scene. Tap it again to stop the camera. The camera stays off until requested.
9. Tap **INTRO** to replay the launch sequence. On the first visit, **SKIP INTRO** dismisses it at any time.

The first install needs internet access for the npm packages. The satellite GLBs, Draco decoder, and Earth texture are included locally after that. Web Crypto, phone motion sensors, and camera access need localhost or HTTPS. For a physical phone visiting a server on your computer, use an HTTPS address; the phone's `localhost` is the phone itself. On iOS, Safari asks for motion permission after you tap **MOTION**, and the browser asks for camera permission after you tap **CAMERA**.

## Android APK

1. Run `npm run build` and `npm run android:sync` after changing the web app.
2. Build a debug APK with `npm run android:build` (Android Studio/SDK and JDK 17 are required).
3. The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. It installs with the **HISP-SED** name and launcher icon.

## App structure and simulation notes

- `src/main.js` owns the Three.js scene, controls, local model selection, and visual orbit paths.
- `src/satellite-interface.js` renders each contact's telemetry panel and alignment game; `src/orbital-telemetry.js` calculates its simulated coordinates, velocity, ping, and signal strength.
- `src/cipher-game.js` owns the guided puzzle screens, tier progress, tutorial, and AES packet controls. `src/cipher-engine.js` contains the training cipher operations; `src/secure-packet.js` wraps Web Crypto AES-GCM.
- The substitution, rail-fence, and layered-key ciphers are educational puzzles only and are not secure encryption. AES-GCM uses a new random 96-bit IV and a 128-bit authentication tag.
- AES packet keys and messages stay in the current page's memory. XP and unlocked training tiers are saved in local storage. Satellite coordinates, orbits, ping, and signal noise are simulation values, not live spacecraft telemetry.
- The camera view, rocket intro, satellite alignment, and packet transmission are local visual interactions. No radio connection or external service is contacted.
- The Earth, orbit, and satellite positions are visual scale approximations rather than live orbital data.

## Assets and attribution

- The AIM and AcrimSAT models were provided by the project owner. Their original source and reuse terms were not supplied with the files.
- Earth surface map: NASA Earth Observatory, [Blue Marble: Next Generation — January base map](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/), 5400 × 2700 global JPEG. The map is a satellite-data composite produced by Reto Stöckli and NASA Goddard Space Flight Center.
- Draco decoder files are copied from the installed Three.js package and served locally from `public/draco/`.
