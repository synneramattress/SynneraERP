import { NextResponse } from "next/server";

/**
 * Digital Asset Links for Android TWA / PWABuilder APK.
 * Served via Next.js route so Netlify always publishes it
 * (static public/.well-known was returning 404 on this site).
 */
const assetlinks = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.synnera.app.twa",
      sha256_cert_fingerprints: [
        "72:E8:9A:D7:64:41:E3:92:2A:45:68:DA:4B:9E:94:02:50:91:A2:83:9B:4F:3E:26:80:72:95:84:DD:38:27:62",
      ],
    },
  },
];

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(assetlinks, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
