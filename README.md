# Gaspari Gridiron NFL

A dice-driven NFL season simulator: schedules, standings, playoffs, league history, expansion teams and your own team logos.
One copy of the app (`www/`) serves all three platforms.

## Turn on the web app (one time)

1. In this repository open **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Open **Actions → Publish web app (iPhone and Windows) → Run workflow**.

The app is then at **https://histscot.github.io/GaspNFLari/**

## Install

**iPhone** — open the address in Safari, tap **Share → Add to Home Screen**, then always open it from that icon.
Do this *before* uploading logos: the Home Screen app keeps its own saves, separate from the Safari tab.

**Windows** — open the address in Edge or Chrome, then use the install button in the address bar
(Edge: **… → Apps → Install this site as an app**).

**Android** — on the phone, open **Releases → latest**, download `Gaspari-Gridiron-NFL.apk` and open it.
Allow "install unknown apps" if asked.

The web versions work offline after the first visit and pick up changes the next time they are opened online.
The Android app changes when you install a newer APK.

## Saves

Each device keeps its own saves. To move a league (logos included) use **Saves → Export this universe**
on one device and **Saves → Import a save file** on the other. Export now and then as a backup.

## Android updates and the signing key

Android only installs an update over an existing app when both are signed with the same key.
Until you add one, every build is signed differently: **export your universe, uninstall, install the new APK, import.**

To keep one key, create it once on a computer that has Java, keep the file somewhere safe,
and **never commit it** (this repository is public):

```
keytool -genkeypair -keystore debug.keystore -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
```

Turn it into text. In Windows PowerShell:

```
[Convert]::ToBase64String([IO.File]::ReadAllBytes("debug.keystore")) | Set-Clipboard
```

Then add it under **Settings → Secrets and variables → Actions → New repository secret**,
named `ANDROID_KEYSTORE_BASE64`.

## Editing

| Folder | What's in it |
|---|---|
| `www/js/engine.js` | dice charts, scoring, standings, scheduling |
| `www/js/core.js` | league defaults, saving, season and history logic |
| `www/js/views.js` | screens |
| `www/js/actions.js` | buttons, uploads, save files |
| `www/js/platform.js` | Android, iPhone and desktop differences |
| `android/` | Android project (Capacitor) |
| `assets/app-logo.png` | app logo; run `python3 tools/make_icons.py` after changing it |

Try it locally with `npm run serve`. When you add a file to `www/`, also add it to the list in `www/sw.js`.

Bundled: [SheetJS](https://sheetjs.com) (Apache-2.0) and the Barlow fonts (SIL Open Font License).
