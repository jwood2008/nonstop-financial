import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
});

export const metadata: Metadata = {
  title: "NonStop Financial — Build Elite Producers Faster",
  description:
    "The operating system that turns new recruits into elite producers. Training, certification, and performance in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${oswald.variable}`}>
      <body className="min-h-screen antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
