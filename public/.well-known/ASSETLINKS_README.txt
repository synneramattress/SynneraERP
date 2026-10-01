Digital Asset Links for Synnera Android (PWABuilder / TWA)

1. Package the PWA on https://www.pwabuilder.com
2. From the Android package options / signing, copy:
   - Application ID / package name (e.g. com.synnera.app)
   - SHA-256 certificate fingerprint
3. Edit public/.well-known/assetlinks.json:
   - Replace REPLACE_WITH_PACKAGE_NAME with the package name
   - Replace REPLACE_WITH_SHA256_FINGERPRINT with the SHA-256 (colon-separated hex)
4. Redeploy so https://YOUR_DOMAIN/.well-known/assetlinks.json is public
5. Verify with:
   https://developers.google.com/digital-asset-links/tools/generator
   or PWABuilder asset links helper

Without correct values, the Android app may show a browser address bar.
