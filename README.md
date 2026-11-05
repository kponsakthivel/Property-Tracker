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
