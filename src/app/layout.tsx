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
  metadataBase: new URL("https://avalon-app-gray.vercel.app"),
  title: "트웬티 게임타운",
  description: "친구들과 함께 즐기는 미니게임 모음 - 아발론 외 추가 예정",
  openGraph: {
    title: "트웬티 게임타운",
    description: "친구들과 함께 즐기는 미니게임 모음 - 아발론 외 추가 예정",
    images: [{ url: "/og_image.png", width: 1536, height: 1024 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
