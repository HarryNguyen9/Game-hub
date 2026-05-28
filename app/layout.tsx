import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GameHub",
  description: "A friendly multiplayer game hub",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
