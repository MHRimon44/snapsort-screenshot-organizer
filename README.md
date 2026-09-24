# SnapSort UI, dark mode, and duplicate detection patch

Copy `src/` and `android/app/src/main/java/com/snapsort/SnapSortModule.kt` into your existing SnapSort project, replacing the matching files. Do not replace your existing package.json, Gradle files, AndroidManifest.xml, App.tsx, or MainApplication.kt. Your current Android setup already builds.

The app requests library permission once on first launch; Android may show Full / Selected / Deny depending on its version. A denial is not repeatedly requested on every launch. Use Settings to change access. If permission was previously denied while testing, Android may suppress repeat dialogs; open system App Info → Permissions → Photos and videos to change it. Existing installations preserve their SQLite metadata and migrate the database to add a visual hash.

A background duplicate check now runs after permission is granted or photos are selected. Cleanup also triggers a check. Exact matching uses SHA-256 file bytes; visually similar suggestions use a downsampled difference hash and aspect ratio. Similarity is not proof of redundancy. The user chooses individual images and Android confirms every deletion. OCR remains a separate on-demand scan.

Appearance can follow the device or be set to Light or Dark in Settings. The color palette follows the indigo SnapSort icon.

From the project root:

```bash
yarn tsc --noEmit
# Keep Metro running in another terminal:
yarn android
```

The Kotlin module changed, so a native rebuild is required. No new npm package is needed. Test permission grant/denial, two exact copies, a recompressed copy, cancellation of a deletion, the appearance choices, and an app restart. Large galleries take time to hash; Cleanup shows a pending count. This patch has not been compiled on an Android SDK in this workspace.
