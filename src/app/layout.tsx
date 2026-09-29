import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ServiceWorkerRegistrar } from "@/components/service-worker";
import { getAppName } from "@/lib/server-settings";
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
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
