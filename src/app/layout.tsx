import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marlow Admin",
  description: "Revenue, subscribers and team management for Marlow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
