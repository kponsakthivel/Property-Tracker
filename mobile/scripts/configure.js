// Usage: SITE_URL=https://erp.example.com npm run configure
// Records which Frappe site the APK opens (read by capacitor.config.js and www/*.html).
const fs = require("fs");
const path = require("path");

const raw = (process.env.SITE_URL || process.argv[2] || "").trim();
let url;
try {
  url = new URL(raw);
  if (!/^https?:$/.test(url.protocol)) throw new Error("protocol");
} catch (e) {
  console.error("Set SITE_URL to your Frappe site, e.g. SITE_URL=https://erp.example.com npm run configure");
  process.exit(1);
}
if (url.protocol === "http:") {
  console.warn("Warning: http:// sites work, but Android blocks GPS on non-HTTPS pages. Use https:// for real use.");
}

const site = { origin: url.origin, host: url.host, http: url.protocol === "http:" };
const root = path.join(__dirname, "..");
fs.writeFileSync(path.join(root, "site.json"), JSON.stringify(site, null, 2) + "\n");
fs.writeFileSync(path.join(root, "www", "config.js"), `window.SITE_URL = ${JSON.stringify(site.origin)};\n`);
console.log(`APK will open ${site.origin}/property-tracker`);
