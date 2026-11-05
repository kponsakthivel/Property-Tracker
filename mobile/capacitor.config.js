// The APK is a thin wrapper that opens the Property Tracker page on your Frappe site.
// Run `SITE_URL=https://your-site npm run configure` first (the GitHub workflow does this).
let site;
try {
  site = require("./site.json");
} catch (e) {
  throw new Error("site.json missing: run `SITE_URL=https://your-site npm run configure` first");
}

/** @type {import('@capacitor/cli').CapacitorConfig} */
module.exports = {
  appId: "com.propertytracker.frappe",
  appName: "Property Tracker",
  webDir: "www",
  server: {
    url: `${site.origin}/property-tracker`,
    allowNavigation: [site.host],
    cleartext: site.http,
    errorPath: "error.html",
  },
  android: {
    allowMixedContent: false,
  },
};
