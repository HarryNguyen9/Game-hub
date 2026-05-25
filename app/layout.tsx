import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game Hub",
  description: "A friendly multiplayer game hub MVP"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
