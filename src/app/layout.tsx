import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DPSG Reisekosten",
  description: "Digitale Reise- und Sachkostenabrechnung für DPSG-Gremienmitglieder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&family=Source+Serif+4:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
