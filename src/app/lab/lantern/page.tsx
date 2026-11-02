import type { Metadata } from "next";

import { LanternLab } from "@/components/lab/LanternLab";

export const metadata: Metadata = {
  title: "천등 기술 검증 | 소원등",
  description: "1단계 핵심 기술 검증: Geometry 천등, 손글씨 Canvas, CanvasTexture, 상승 애니메이션",
};

export default function LanternLabPage() {
  return <LanternLab />;
}
