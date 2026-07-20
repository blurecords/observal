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
  title: "Observal — Monitorización remota de sistemas AV",
  description:
    "Monitoriza en remoto proyectores, LED, audio, iluminación, matrices y todo tu equipamiento AV multiprotocolo.",
  metadataBase: new URL("https://observal.app"),
  openGraph: {
    title: "Observal — Monitorización remota de sistemas AV",
    description:
      "Tu instalación AV bajo control desde la nube. Multiprotocolo, multimarca, sin acceso local al hardware.",
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
