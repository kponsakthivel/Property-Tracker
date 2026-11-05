# Property Tracker

A [Frappe](https://frappeframework.com) app for tracking property and land site visits. Capture a
site's GPS location, photos, owner details and price on your phone, then move it through your buying
pipeline with visit notes, reminders, a map and side-by-side comparison.

- **Version:** 1.0.0
- **Requires:** Frappe v16 (`>=16.0.0,<17.0.0`), Python 3.14
- **License:** MIT

## Features

**Recording a site**
- GPS location captured automatically. The fix keeps improving until it's within about 15 m, shows live
  accuracy, and you can fine-tune it by dragging a pin on the map.
- Address / landmark, locality and district
- Photos (resized on the phone before upload, stored as private files)
- Length, width and road width in **feet**. If you leave Area empty, it's worked out from length × width
  in the unit you choose (sq.ft, cent, acre, ground, sq.m).
- Expected price as a total or per cent / sq.ft / acre / ground. Total, per-cent and per-sq.ft prices
  are calculated automatically.
- Owner name and phone, with one-tap **Call** and **WhatsApp**

**Following up**
- Status pipeline: New, Visited, Shortlisted, Follow-up, Negotiating, Revisit Required, Document
  Verification, Final Discussion, Purchased, Rejected, On Hold. Every change is logged with a note.
- Visit log, negotiated price and a 1–5 rating
- Reminders with **alarms on the phone** (Android app), **push notifications** (browser / installed web
  app) and the Desk notification bell

**Finding and comparing**
- Home dashboard: counts by status, follow-ups due, average prices, properties by location
- Search by name, address, owner, phone or ID, and filter by status
- **Map** with Street (OpenStreetMap), Clean (CARTO), Satellite (Esri) and Terrain (OpenTopoMap) styles.
  Pin cards have **Directions** and Google **Street View** links, and **My location** shows where you are.
  No map API keys are needed.
- Compare 2–5 properties side by side (differences are highlighted)
- Export to CSV (opens in Excel), back up as JSON and import a backup

**Everywhere**
- Mobile-first design, light and dark themes, works on desktop too
- Install it on a phone as a home-screen app (PWA) or as an Android APK
- Account page with your profile, roles and sign-out
- All data is ordinary Frappe records, so it's also available in Desk, reports and the REST API

## Install

### On your own bench

```bash
cd ~/frappe-bench
bench get-app https://github.com/kponsakthivel/Property-Tracker.git --branch develop
bench --site <your-site> install-app property_tracker
bench --site <your-site> enable-scheduler      # needed for reminder notifications
bench build --app property_tracker
```

Give users the **Property Manager** role (created on install), then open
`https://<your-site>/property-tracker`. It's also on the Frappe apps screen. System Managers have
access too.

### On Frappe Cloud

Add the app from GitHub (`kponsakthivel/Property-Tracker`, branch **`develop`**) to a **Frappe v16**
bench, deploy, and install it on your site. The scheduler is on by default.

### Updating

```bash
cd ~/frappe-bench/apps/property_tracker && git pull
cd ~/frappe-bench
bench --site <your-site> migrate
bench build --app property_tracker
```

Use `bench build --app property_tracker` rather than a plain `bench build`, so a build problem in
another app can't stop this one.

## Using it on a phone

The phone has to reach your Frappe site, ideally over **HTTPS**.

### Option 1: install from the browser (PWA)

Open `https://<your-site>/property-tracker` and sign in. Then:
- **Android (Chrome):** tap **⋮ → Install app** (or *Add to Home screen*).
- **iPhone (Safari):** tap **Share → Add to Home Screen** (iOS 16.4 or later for notifications).

It opens full screen with its own icon and picks up updates on its own.

### Option 2: Android APK

The [`mobile/`](mobile/) folder is a [Capacitor](https://capacitorjs.com) wrapper that opens
`/property-tracker` on your site. It adds native GPS, camera access, reminder alarms and proper
handling of the Back button.

1. On GitHub, open **Settings → Secrets and variables → Actions → Variables** and add `SITE_URL`
   (for example `https://erp.example.com`). Or enter the URL when you run the workflow.
2. Open **Actions → Build APK → Run workflow**.
3. Download the `property-tracker-apk` artifact, unzip it, copy `app-debug.apk` to the phone and
   install it (allow installing from that source when asked).

Good to know:
- The site address is built into the APK, so rebuild it if the address changes. Changes to the
  tracker itself come from the server and don't need a new APK.
- `SITE_URL` can be a local address such as `http://192.168.1.42:8000` while testing on the same
  Wi-Fi. GPS still works in the APK.
- It's a debug build, which is fine for installing yourself. Publishing on Google Play needs a signed
  release build.

<details>
<summary>Building the APK on your own computer</summary>

Needs Node 20, JDK 17 and the Android SDK.

```bash
cd mobile
npm install
SITE_URL=https://<your-site> npm run configure
npx cap add android
# then apply the "Allow GPS, camera and on-time reminder alarms" and "Notification icon"
# steps from .github/workflows/build-apk.yml (permissions + res/drawable/ic_stat_notify.xml)
npx capacitor-assets generate --android
npx cap sync android
cd android && ./gradlew assembleDebug
```
</details>

### GPS on a local `http://` site

Browsers only allow location on secure pages.

| How you open the tracker | GPS |
| --- | --- |
| `https://…` on any device | ✅ |
| `http://localhost:8000` (or `<site>.localhost`) on the same computer | ✅ localhost counts as secure |
| **Android APK**, even with `SITE_URL=http://192.168.x.x:8000` | ✅ uses the phone's own GPS |
| Phone browser at `http://192.168.x.x:8000` | ❌ unless allowed in Chrome (below) |

To allow a local address in Chrome on Android, for testing only:
1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
2. Enable it and enter the exact address, for example `http://192.168.1.42:8000`.
3. Tap **Relaunch**, open the tracker again and allow location.

If location fails, the app tells you why: permission off, Location turned off, only approximate
location allowed, no fix, or an insecure page.

## Reminder alarms and notifications

On each device that should alert you, open **Reminders → Turn on**, then **Send test**.

| Where | How it alerts | Needs |
| --- | --- | --- |
| **Android APK** | A native alarm rings at the due time, even if the app is closed, the phone is offline or has restarted | Allow notifications when asked |
| **Browser / installed web app** | Web Push sent by the server when the reminder is due | `https://` (or localhost) and the scheduler |
| **Desk** | Notification bell | The scheduler |

- The server checks for due reminders **every minute**. Tapping a notification opens the property.
- Web Push is built in and needs no Firebase or other account. Its keys are generated automatically
  and kept in **Property Tracker Settings**.
- Each subscribed browser is listed under **Property Push Subscription**. Expired ones are removed
  automatically.

## Maps

Base maps come from free public services: OpenStreetMap, CARTO, Esri World Imagery and OpenTopoMap.
They're fine for a small team. For heavy or commercial use, follow each provider's usage policy (for
example a paid or self-hosted tile service).

Google Street View can't be embedded without a paid Google API key. The **Street View** buttons open
it at the property's location in the Google Maps app or website instead.

## Moving data from the old standalone app

The earlier version stored everything in the phone's browser. To bring that data in:
1. In the old app, open **More → Backup JSON**.
2. In this app, open **Account → Data → Import backup** and choose the file.

Properties, photos, visits, status history and reminders are imported as new records. The APK uses a
different app id, so it installs alongside the old app; export the data before removing the old one.

## Data model

| DocType | Purpose |
| --- | --- |
| **Property** | A site, named `P0001`, `P0002`, … Area, total and per-unit prices and the status history are maintained automatically. |
| Property Photo | Child table: photos (private files) |
| Property Visit | Child table: visit notes |
| Property Status Log | Child table: status changes |
| **Property Reminder** | A user's follow-up reminder, optionally linked to a property |
| Property Push Subscription | A browser registered for reminder notifications |
| Property Tracker Settings | Web Push keys and contact address |

Roles: **Property Manager** (created on install) and **System Manager**.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `bench build` fails in another app (for example helpdesk's posthog import) | Build only this app: `bench build --app property_tracker` |
| Frappe Cloud: "Could not find a compatible Frappe version" | Use the `develop` branch on a Frappe v16 bench |
| No reminder notifications | `bench --site <site> enable-scheduler`; turn alerts on under **Reminders** on that device; browsers need https |
| GPS says the page is opened over http:// | Use https, localhost, the APK, or the Chrome flag above |
| Changes don't show on the phone | Run `bench build --app property_tracker`, then reopen the app twice (the installed app updates on the next launch) |

## Development

```
property_tracker/
├── api.py                    # whitelisted API used by the page (data, saves, reminders, push)
├── webpush.py                # Web Push sender (RFC 8291 encryption, VAPID), no extra packages
├── pwa.py                    # serves the web-app manifest and service worker
├── www/property-tracker.html # the /property-tracker page (controller: www/property_tracker.py)
├── public/js|css/            # the tracker UI (plain JavaScript + Leaflet)
└── property_tracker/doctype/
mobile/                       # Capacitor Android wrapper (APK)
.github/workflows/            # CI tests, linters, APK build
```

Run the tests:

```bash
bench --site <site> set-config allow_tests true
bench --site <site> run-tests --app property_tracker
```

This app uses `pre-commit` for formatting and linting (ruff, eslint, prettier, pyupgrade):

```bash
cd apps/property_tracker
pre-commit install
```

### CI

- **CI** installs the app and runs the tests on every push to `main` and `develop`.
- **Linters** run [Frappe Semgrep Rules](https://github.com/frappe/semgrep-rules) and
  [pip-audit](https://pypi.org/project/pip-audit/) on pull requests.
- **Build APK** builds the Android app (manually, or on changes under `mobile/` when `SITE_URL` is set).

## License

MIT. See [license.txt](license.txt).
