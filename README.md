# SnapSort

SnapSort is an offline Android app that helps you find and organize screenshots. It reads text on your phone, lets you search that text, and suggests duplicates for review. Your images and recognized text stay on the device.

## Run locally

You need Node.js 20.19.4 or newer, JDK 17, Android Studio with the Android SDK, and an Android 11 or newer emulator or phone. From the project folder:

```bash
corepack yarn install
corepack yarn tsc --noEmit
corepack yarn start:reset
```

Keep Metro running. Open a second terminal in the same folder:

```bash
corepack yarn android
```

If you have already set up `yarn` to use Corepack, you can use `yarn install`, `yarn start:reset`, and `yarn android` instead. For a phone connected by USB, enable USB debugging, check `adb devices`, then run `adb reverse tcp:8081 tcp:8081` before launching the app. An emulator normally connects automatically.

## How the app works

1. On first launch, choose full photo access, selected photos, or deny access. You can change your choice later in Settings.
2. **Home** shows your accessible screenshots and recent items. Tap **Scan text** to recognize words on the device.
3. **Library** lets you browse screenshots, open one, favorite it, and set its category.
4. **Search** finds screenshots by recognized words, filename, or category. Unscanned images need a text scan before their contents are searchable.
5. **Cleanup** checks images for exact copies and visually similar candidates. Review each suggestion before deleting; Android asks you to confirm every deletion.
6. **Settings** offers System, Light, and Dark appearance, photo access controls, and local data export/import. The backup is readable JSON containing recognized text and metadata, not image files; store it privately.

## Project layout

| Path                                     | Purpose                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `src/app`                                | App shell, tabs, theme selection                                                |
| `src/screens`                            | Home, Library, Search, Detail, Cleanup, Settings                                |
| `src/components`                         | Reusable buttons, cards, and screenshot tiles                                   |
| `src/hooks`                              | Permission, library, and scan state                                             |
| `src/services`                           | Native bridge and category/duplicate rules                                      |
| `src/theme`, `src/types`                 | Colors and shared TypeScript types                                              |
| `android/app/src/main/java/com/snapsort` | Android photo access, local SQLite storage, OCR, hashing, and deletion requests |

SnapSort has no account or app server. Similarity is a suggestion, so always check images before deleting them. On-device OCR currently uses the bundled Latin text model.
