import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/i18n";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Synnera PWA",
  description: "Synnera Mattress Order & Production Management",
  manifest: "/manifest.json",
  applicationName: "Synnera",
  metadataBase: new URL("https://app.synnera.com"),
  appleWebApp: {
    capable: true,
    title: "Synnera",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/synnera-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/synnera-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-152.png", sizes: "152x152", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#330066",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Keep the SW registration in the initial HTML for reliable PWA tooling detection. */}
        <Script id="sw-register" strategy="beforeInteractive">{`
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
          }
        `}</Script>
        <ServiceWorkerRegistration />
        <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
