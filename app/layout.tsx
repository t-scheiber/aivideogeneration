import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Self-hosted at build time with a size-matched fallback, so text neither
// waits on fonts.googleapis.com nor shifts when the font arrives.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Icons come from the file conventions in app/ (favicon.ico, icon.svg, apple-touch-icon.png).
export const metadata: Metadata = {
  title: "Generate Videos with AI",
  description: "Generate videos using multiple AI models with advanced features",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#1E1F20] font-sans text-gray-300 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
