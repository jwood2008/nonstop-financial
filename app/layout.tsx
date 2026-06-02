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
    <html
      lang="en"
      className={`dark ${inter.variable} ${oswald.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved theme before paint to avoid a flash of the wrong mode. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nf.theme')||'dark';var r=document.documentElement;r.classList.toggle('dark',t!=='light');r.classList.toggle('light',t==='light');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
