import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { themeScript } from "@/lib/theme-config";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wayprint",
  description: "A personal, location-based photo gallery.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The theme script adds the `dark` class and color-scheme before React
    // hydrates, so the attributes are expected to differ from the server HTML.
    <html
      lang="en"
      className={`${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-tui-bg text-tui-fg">
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{ style: { borderRadius: 0, fontFamily: "var(--font-jetbrains-mono), monospace" } }}
        />
      </body>
    </html>
  );
}
