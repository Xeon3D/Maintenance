import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ServiceWorkerRegistrar } from "@/components/service-worker";
import { getAppName } from "@/lib/server-settings";
import { getTheme } from "@/lib/theme-server";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const name = await getAppName();
  return {
    title: { default: name, template: `%s · ${name}` },
    description: "Maintenance management for high-end villa technical systems",
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
    icons: { apple: "/icons/apple.png" },
  };
}

export const viewport: Viewport = { themeColor: "#1f4f8f" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  return (
    // The boot script adds/removes "dark" before paint (for "system"), hence suppressHydrationWarning.
    <html
      lang={locale}
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${theme === "dark" ? " dark" : ""}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full font-sans">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
