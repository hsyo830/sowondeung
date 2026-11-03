"use client";

import { useLayoutEffect, useRef } from "react";

import { BackSide, Color, Float32BufferAttribute } from "three";
import type { CylinderGeometry } from "three";

import { getSkyBackdropColor } from "@/lib/game/sky";
import type { Rgb, SkyPalette } from "@/lib/game/sky";
import { ATMOSPHERE_CONFIG } from "@/lib/game/worldConfig";

/** 배경막은 광선 판정 대상이 아니다 */
function ignoreRaycast() {}

/** sRGB HEX → three 작업 색공간(선형) RGB. 정점 색은 선형 값으로 넣어야 화면에 HEX 그대로 나온다 */
function toLinearRgb(hex: string): Rgb {
  const color = new Color(hex);
  return [color.r, color.g, color.b];
}

/**
 * 초저녁 하늘 배경막. 섬을 둘러싼 원통 안쪽 면에 높이별 노을 그라데이션을 정점 색으로 칠한다.
 * 셰이더·텍스처 없이 MeshBasicMaterial 하나다. 안개·톤 매핑을 받지 않아 칠한 색이 그대로 보이고,
 * 아래쪽 색이 안개색과 같아서 완전히 안개에 덮인 먼 바닥과 이어진다 (ATMOSPHERE_CONFIG 주석).
 */
export function SkyBackdrop() {
  const geometryRef = useRef<CylinderGeometry>(null);
  const { skyBackdrop } = ATMOSPHERE_CONFIG;

  // Geometry는 JSX가 만들고 R3F가 해제한다. 여기서는 정점 색 속성만 한 번 채운다.
  useLayoutEffect(() => {
    const geometry = geometryRef.current;
    if (!geometry) return;
    const { colors } = skyBackdrop;
    const palette: SkyPalette = {
      horizon: toLinearRgb(colors.horizon),
      band: toLinearRgb(colors.band),
      glow: toLinearRgb(colors.glow),
      upper: toLinearRgb(colors.upper),
      zenith: toLinearRgb(colors.zenith),
    };
    const shape = {
      bottomY: skyBackdrop.bottomY,
      bandY: skyBackdrop.bandY,
      upperY: skyBackdrop.upperY,
      topY: skyBackdrop.topY,
      glowDirX: skyBackdrop.glowDirection[0],
      glowDirZ: skyBackdrop.glowDirection[1],
    };

    const position = geometry.getAttribute("position");
    const values = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const length = Math.hypot(x, z) || 1;
      // 원통은 y 0에서 시작하도록 height / 2만큼 올려 둔다 (아래 mesh position)
      const worldY = position.getY(i) + skyBackdrop.height / 2;
      const [r, g, b] = getSkyBackdropColor(worldY, x / length, z / length, palette, shape);
      values[i * 3] = r;
      values[i * 3 + 1] = g;
      values[i * 3 + 2] = b;
    }
    geometry.setAttribute("color", new Float32BufferAttribute(values, 3));
  }, [skyBackdrop]);

  return (
    <mesh position-y={skyBackdrop.height / 2} raycast={ignoreRaycast} renderOrder={-1}>
      {/* 높이 0.5 간격으로 나눠 아래쪽 노을 띠가 부드럽게 보이게 한다 */}
      <cylinderGeometry
        ref={geometryRef}
        args={[
          skyBackdrop.radius,
          skyBackdrop.radius,
          skyBackdrop.height,
          64,
          skyBackdrop.height * 2,
          true,
        ]}
      />
      <meshBasicMaterial vertexColors side={BackSide} fog={false} toneMapped={false} />
    </mesh>
  );
}
