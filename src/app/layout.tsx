import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DPSG Reisekosten",
  description: "Digitale Reise- und Sachkostenabrechnung für DPSG-Gremienmitglieder",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
