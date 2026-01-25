import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

// Cairo font - excellent for Arabic text
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
  weight: ["300", "400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "نظام إدارة المحتوى للصحفيين",
    template: "%s | نظام إدارة المحتوى",
  },
  description: "نظام إدارة محتوى عربي متكامل للصحفيين ومبدعي المحتوى",
  keywords: ["نظام إدارة المحتوى", "صحافة", "محتوى عربي", "مدونة"],
  authors: [{ name: "المسؤول" }],
  openGraph: {
    title: "نظام إدارة المحتوى للصحفيين",
    description: "نظام إدارة محتوى عربي متكامل للصحفيين ومبدعي المحتوى",
    locale: "ar_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: "نظام إدارة المحتوى للصحفيين",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
