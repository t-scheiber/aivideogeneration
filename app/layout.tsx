import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Generate Videos with AI",
  description: "Generate videos using multiple AI models with advanced features",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <header>
        <title>Generate Videos with AI</title>
        <meta name="description" content="Generate videos using multiple AI models with advanced features" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon?<generated>" type="image/<generated>" sizes="<generated>" />
        <link rel="apple-touch-icon" href="/apple-icon?<generated>" type="image/<generated>" sizes="<generated>" />
      </header>
      <body className="bg-[#1E1F20] font-sans text-gray-300 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
