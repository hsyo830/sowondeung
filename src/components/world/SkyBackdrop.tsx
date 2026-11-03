"use client";

import { useLayoutEffect, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import { BackSide, Color, Float32BufferAttribute } from "three";
import type { CylinderGeometry, Mesh } from "three";

import { getSkyBackdropColor } from "@/lib/game/sky";
import type { Rgb, SkyStop } from "@/lib/game/sky";
import { ATMOSPHERE_CONFIG } from "@/lib/game/worldConfig";

/** 배경막은 광선 판정 대상이 아니다 */
function ignoreRaycast() {}

/** sRGB HEX → three 작업 색공간(선형) RGB. 정점 색은 선형 값으로 넣어야 화면에 HEX 그대로 나온다 */
function toLinearRgb(hex: string): Rgb {
  const color = new Color(hex);
  return [color.r, color.g, color.b];
}

/**
 * 초저녁 하늘 배경막. 섬을 둘러싼 원통 안쪽 면에 높이별 노을 그라데이션을 정점 색으로 칠한다
 * (OKLab + 단조 3차 보간, lib/game/sky.ts).
 * 셰이더·텍스처 없이 MeshBasicMaterial 하나다. 안개·톤 매핑을 받지 않아 칠한 색이 그대로 보이고,
 * 아래쪽 색이 안개색과 같아서 바닥 연장 원판의 끝(완전히 안개색)과 이어진다 (ATMOSPHERE_CONFIG 주석).
 * 원통은 매 프레임 카메라 XZ를 따라간다 (스카이박스 방식). 원판도 카메라 중심이라 둘이 만나는 높이가 위치와 상관없이 같다.
 */
export function SkyBackdrop() {
  const geometryRef = useRef<CylinderGeometry>(null);
  const meshRef = useRef<Mesh>(null);
  const { skyBackdrop } = ATMOSPHERE_CONFIG;
  const height = skyBackdrop.topY - skyBackdrop.bottomY;
  const centerY = (skyBackdrop.topY + skyBackdrop.bottomY) / 2;

  useFrame(({ camera }) => {
    meshRef.current?.position.set(camera.position.x, centerY, camera.position.z);
  });

  // Geometry는 JSX가 만들고 R3F가 해제한다. 여기서는 정점 색 속성만 한 번 채운다.
  useLayoutEffect(() => {
    const geometry = geometryRef.current;
    if (!geometry) return;
    const stops: SkyStop[] = skyBackdrop.stops.map((stop) => ({
      y: stop.y,
      color: toLinearRgb(stop.color),
      glowColor: "glowColor" in stop ? toLinearRgb(stop.glowColor) : undefined,
    }));
    const glow = { x: skyBackdrop.glowDirection[0], z: skyBackdrop.glowDirection[1] };

    const position = geometry.getAttribute("position");
    const values = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const length = Math.hypot(x, z) || 1;
      // 원통 가운데를 centerY에 둔다 (아래 mesh position)
      const worldY = position.getY(i) + centerY;
      const [r, g, b] = getSkyBackdropColor(worldY, x / length, z / length, stops, glow);
      values[i * 3] = r;
      values[i * 3 + 1] = g;
      values[i * 3 + 2] = b;
    }
    geometry.setAttribute("color", new Float32BufferAttribute(values, 3));
  }, [skyBackdrop, centerY]);

  return (
    <mesh ref={meshRef} position-y={centerY} raycast={ignoreRaycast} renderOrder={-1}>
      {/* 높이 0.25 간격(rowsPerUnit 4)으로 나눠 그라데이션이 줄마다 꺾여 보이지 않게 한다 */}
      <cylinderGeometry
        ref={geometryRef}
        args={[
          skyBackdrop.radius,
          skyBackdrop.radius,
          height,
          64,
          height * skyBackdrop.rowsPerUnit,
          true,
        ]}
      />
      <meshBasicMaterial vertexColors side={BackSide} fog={false} toneMapped={false} />
    </mesh>
  );
}
