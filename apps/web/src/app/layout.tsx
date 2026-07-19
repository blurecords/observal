import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Observal — Monitorización AV para museos",
  description:
    "Monitoriza en remoto proyectores, pantallas LED, mesas de sonido y todo tu equipamiento audiovisual.",
  metadataBase: new URL("https://observal.app"),
  openGraph: {
    title: "Observal — Monitorización AV para museos",
    description:
      "Tu AV bajo control en remoto. Proyectores, LED, audio, iluminación y más.",
    url: "https://observal.app",
    siteName: "Observal",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
