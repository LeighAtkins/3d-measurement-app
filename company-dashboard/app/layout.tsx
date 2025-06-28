import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Company Dashboard - 3D Measurement App",
  description: "Manage orders and 3D measurements",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}