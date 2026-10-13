import "./globals.css";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { COPY } from "@/config/copy";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: { default: COPY.appName, template: `%s · ${COPY.appName}` },
  description: COPY.appDescription,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn(GeistSans.variable, GeistMono.variable)}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
