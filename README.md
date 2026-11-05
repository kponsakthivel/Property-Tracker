### Property Tracker

A Frappe app for tracking property and land site visits: GPS location, photos, owner details,
pricing, status pipeline, visit log, reminders, map view and side-by-side comparison.

#### Features

- **Mobile-friendly tracker** at `/property-tracker` (also on the Frappe apps screen)
- Save a property with GPS location, address / landmark, photos, owner details and price. Length, width and road width are in feet; area (from length × width if left empty) and per-cent / per-sq.ft prices are worked out automatically.
- Status pipeline: New, Visited, Shortlisted, Negotiating, Document Verification, Purchased, Rejected and more. Every change is logged.
- Log revisits and set reminders, with alarms on the phone (APK), push notifications (browser / installed app) and the Desk bell
- Map of all properties (Leaflet + OpenStreetMap), nearest-first sorting
- Compare 2–5 properties, export CSV, back up as JSON
- Light and dark mode
- Install on your phone as a home-screen app (PWA) or as an Android APK
- All records are also available in Desk (`/app/property`, `/app/property-reminder`)

#### DocTypes

| DocType | Purpose |
| --- | --- |
| Property | A site, named `P0001`, `P0002`, … |
| Property Photo | Child table: photos (stored as private files) |
| Property Visit | Child table: visit log |
| Property Status Log | Child table: status change history |
| Property Reminder | Per-user follow-up reminders |

Access needs the **Property Manager** role (created on install) or System Manager.

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app https://github.com/kponsakthivel/Property-Tracker.git --branch develop
bench --site <your-site> install-app property_tracker
bench build --app property_tracker
```

Then give users the **Property Manager** role and open `/property-tracker`.

### Using it on your phone

The phone must be able to reach your Frappe site, ideally over **HTTPS**.

#### GPS on a local / `http://` site

Browsers only allow location on secure pages. Where GPS works:

| How you open the tracker | GPS |
| --- | --- |
| `https://…` (any device) | ✅ |
| `http://localhost:8000` or `http://<site>.localhost:8000` on the same computer | ✅ (localhost counts as secure) |
| **Android APK**, even when `SITE_URL` is `http://192.168.x.x:8000` | ✅ uses the phone's native GPS |
| Phone browser at `http://192.168.x.x:8000` | ❌ blocked unless you allow it in Chrome (below) |

To allow a local address in **Chrome on Android** (for testing):

1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Enable it and enter your site address exactly, e.g. `http://192.168.1.42:8000`
3. Tap **Relaunch**, then open the tracker again and allow location

Use HTTPS for real use. The flag applies only to that phone's Chrome.

#### Option 1 – Install from the browser (PWA)

Open `https://<your-site>/property-tracker` in Chrome on Android, sign in, then tap
**⋮ → Add to Home screen / Install app**. On iPhone, use Safari → **Share → Add to Home Screen**.
The app opens full screen with its own icon and updates itself automatically.

#### Option 2 – Android APK

The `mobile/` folder is a [Capacitor](https://capacitorjs.com) wrapper that opens
`/property-tracker` on your site, with GPS and camera access.

1. On GitHub, open **Settings → Secrets and variables → Actions → Variables** and add
   `SITE_URL` = `https://<your-site>`. Or enter the URL when you run the workflow manually.
2. Open **Actions → Build APK → Run workflow**.
3. When it finishes, download the `property-tracker-apk` artifact, unzip it, copy
   `app-debug.apk` to the phone and install it. You'll need to allow installing from that source.

The site address is built into the APK, so rebuild it if the address changes. Updates to the
tracker itself come from the server and don't need a new APK. The APK uses its own app id, so
it installs alongside the old standalone app. Export your old data before removing that app.

To build locally (needs JDK 17 and the Android SDK):

```bash
cd mobile
npm install
SITE_URL=https://<your-site> npm run configure
npx cap add android
npx capacitor-assets generate --android
npx cap sync android
cd android && ./gradlew assembleDebug
```

Before building, add the location and camera permissions to `android/app/src/main/AndroidManifest.xml`
(see `.github/workflows/build-apk.yml`).

#### Reminder alarms and notifications

Open **Reminders → Turn on** on each device that should be alerted.

| Where | How it alerts | Needs |
| --- | --- | --- |
| **Android APK** | A native alarm scheduled on the phone rings at the due time, even when the app is closed, the phone is offline or it has restarted | Allow notifications when asked |
| **Browser / installed web app** (Android Chrome, desktop, iPhone home-screen app on iOS 16.4+) | Web Push sent by the Frappe server when the reminder is due | `https://` (or `localhost`) and the scheduler running |
| **Desk** | Notification bell | Scheduler running |

The server checks for due reminders every minute. Make sure the scheduler is on:
`bench --site <site> enable-scheduler` (Frappe Cloud has it on by default).

Web Push keys are created automatically and stored in **Property Tracker Settings**. Each device's
registration is listed under **Property Push Subscription**. Expired registrations are removed
automatically.

#### Moving data from the old standalone app

The earlier Android/browser version kept data in the browser only. In that app open
**More → Backup JSON**, then in the Frappe tracker open **More → Import backup** and choose the file.
Properties, photos, visits, status history and reminders are imported as new records.

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/property_tracker
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### CI

This app can use GitHub Actions for CI. The following workflows are configured:

- CI: Installs this app and runs unit tests on every push to `main` and `develop`.
- Linters: Runs [Frappe Semgrep Rules](https://github.com/frappe/semgrep-rules) and [pip-audit](https://pypi.org/project/pip-audit/) on every pull request.

### License

mit
