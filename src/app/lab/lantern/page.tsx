import type { Metadata } from "next";

import { LanternLab } from "@/components/lab/LanternLab";

// 프로덕션에서는 lab/layout.tsx가 404를 돌려준다. 메타데이터는 렌더링과 따로 결정되므로
// 404 응답에 개발 페이지 제목·설명이 실리지 않도록 프로덕션에서는 비운다 (루트 제목 '소원등'이 쓰인다).
export const metadata: Metadata =
  process.env.NODE_ENV === "production"
    ? {}
    : {
        title: "천등 기술 검증 | 소원등",
        description:
          "1단계 핵심 기술 검증: Geometry 천등, 손글씨 Canvas, CanvasTexture, 상승 애니메이션",
      };

export default function LanternLabPage() {
  return <LanternLab />;
}
