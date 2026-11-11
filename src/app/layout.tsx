import type { Metadata, Viewport } from "next";
import {
  Allura,
  Cormorant_Garamond,
  Instrument_Sans,
  JetBrains_Mono,
  Newsreader,
  Noto_Sans_Devanagari,
} from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal"],
  variable: "--font-serif",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal"],
  variable: "--font-cormorant",
  display: "swap",
});

const allura = Allura({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-script",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500"],
  variable: "--font-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Patrika Studio — Wedding Invitations",
  description:
    "Interactive wedding invitation studio with guest-specific event permissions and WhatsApp dispatch.",
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
    <html
      lang="en"
      className={`${instrumentSans.variable} ${newsreader.variable} ${cormorant.variable} ${allura.variable} ${jetbrainsMono.variable} ${notoDevanagari.variable}`}
    >
      <body className="min-h-screen antialiased selection:bg-[#c22d5a]/15 selection:text-[#1f1b16]">
        {children}
      </body>
    </html>
  );
}
