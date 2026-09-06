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
      <body className="bg-[#1E1F20] font-sans text-gray-300 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
