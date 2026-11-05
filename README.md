### Property Tracker

A Frappe app for tracking property and land site visits: GPS location, photos, owner details,
pricing, status pipeline, visit log, reminders, map view and side-by-side comparison.

#### Features

- **Mobile-friendly tracker** at `/property-tracker` (also on the Frappe apps screen)
- Save a property with GPS location, photos, owner details and price. Area and per-cent and per-sq.ft prices are worked out automatically.
- Status pipeline: New, Visited, Shortlisted, Negotiating, Document Verification, Purchased, Rejected and more. Every change is logged.
- Log revisits, set reminders. Due reminders appear in the Desk notification bell.
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
Android blocks GPS on plain `http://` pages.

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
