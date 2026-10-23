import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProrateSplit — A fair split. Down to the day.",
  description:
    "Split household bills by occupied days or equal shares. Clear calculations, printable reports, and private browser storage. By ConsoleLog Studio.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
