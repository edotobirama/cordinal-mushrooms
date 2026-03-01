// Fix BigInt serialization for JSON.stringify
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { DbProvider } from "@/components/providers/db-provider";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Cordinal Mushrooms",
  description: "Facility Management System",
  appleWebApp: {
    capable: true,
    title: "Cordinal",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} flex h-screen bg-background`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DbProvider>
            <div className="flex h-screen w-full flex-col md:flex-row bg-background">
              {/* Desktop Sidebar */}
              <Sidebar />

              {/* Mobile Sidebar (Header) */}
              <MobileSidebar />

              <main className="flex-1 overflow-y-auto p-4 md:p-8">
                {children}
              </main>
            </div>
          </DbProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
