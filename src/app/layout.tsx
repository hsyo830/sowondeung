import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { resolveSiteUrl } from "@/lib/site/siteUrl";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_NAME = "소원등";
const SITE_TITLE = "소원등 | 마음을 담아, 하늘로 날려요";
const SITE_DESCRIPTION =
  "숲속에서 소원등을 받고, 직접 소원을 적어 모닥불에 불을 붙인 뒤 하늘로 날려 보내는 3D 인터랙티브 웹 체험입니다.";

// public/images/sowondeung_og.png 실제 크기와 같아야 한다
const OG_IMAGE = {
  url: "/images/sowondeung_og.png",
  width: 1200,
  height: 630,
  alt: "소원등 — 숲속 모닥불 옆에서 소원등을 든 캐릭터",
  type: "image/png",
};

// 배포 주소를 모르는 프로덕션 빌드면 null → og:image·og:url·canonical을 만들지 않는다 (localhost 노출 방지)
const siteUrl = resolveSiteUrl({
  SITE_URL: process.env.SITE_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  NODE_ENV: process.env.NODE_ENV,
});

export const metadata: Metadata = {
  ...(siteUrl && { metadataBase: siteUrl, alternates: { canonical: "/" } }),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ko_KR",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    ...(siteUrl && { url: "/", images: [OG_IMAGE] }),
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    ...(siteUrl && { images: [{ url: OG_IMAGE.url, alt: OG_IMAGE.alt }] }),
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko-KR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
