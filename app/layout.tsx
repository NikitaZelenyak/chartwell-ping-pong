import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";

import { NavigationFeedback } from "@/components/navigation-feedback";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Chartwell Ping Pong",
  description:
    "Tournament registration, doubles teams, player profiles, and ratings for Chartwell Ping Pong.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MotionProvider>
          <Suspense fallback={null}>
            <NavigationFeedback />
          </Suspense>
          {children}
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
