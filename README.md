# Site Tracker

A simple Android app to track property and land site visits.

## What it does

- Save a property with GPS location, photos, owner details and price
- Track status: Visited, Shortlisted, Negotiating, Purchased, Rejected and more
- Log revisits and set reminders
- View all properties on a map
- Compare properties side by side
- Export to CSV or back up as JSON
- Light and dark mode
- Works offline (the map needs internet)

## How to use

1. Open the app and tap **+ ADD PROPERTY**
2. Fill in the details and save
3. Open a property to change its status, log a visit, call the owner or navigate to it

## Build the APK

The APK builds automatically with GitHub Actions on every push.

Go to **Actions → Build APK**, open the latest run, and download `site-tracker-apk`.

## Built with

HTML, CSS, JavaScript, Leaflet and Capacitor.

## Note

All data is stored on your phone only. Use **More → Backup JSON** to keep a copy.
