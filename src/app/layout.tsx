import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal Warga Bukit Pandawa",
  description: "Portal komunitas warga perumahan Bukit Pandawa — Godean Jogja Hills",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="bg-white text-brand-black antialiased">
        {children}
      </body>
    </html>
  );
}
