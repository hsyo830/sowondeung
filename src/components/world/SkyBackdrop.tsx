"use client";

import { useLayoutEffect, useRef } from "react";

import { useFrame, useThree } from "@react-three/fiber";
import { BackSide, Color, Float32BufferAttribute } from "three";
import type { BufferGeometry, CylinderGeometry, Group, NormalOrGLBufferAttributes } from "three";

import { getSkyBackdropColor, mixRgb } from "@/lib/game/sky";
import type { Rgb, SkyGlowDirection, SkyStop } from "@/lib/game/sky";
import { createSkyStars } from "@/lib/game/stars";
import { ATMOSPHERE_CONFIG, SKY_STARS_CONFIG } from "@/lib/game/worldConfig";

/** 배경막은 광선 판정 대상이 아니다 */
function ignoreRaycast() {}

/** sRGB HEX → three 작업 색공간(선형) RGB. 정점 색은 선형 값으로 넣어야 화면에 HEX 그대로 나온다 */
function toLinearRgb(hex: string): Rgb {
  const color = new Color(hex);
  return [color.r, color.g, color.b];
}

/** 설정의 하늘 단계(HEX) → 선형 RGB 단계와 노을 방향. 배경막과 별이 같은 하늘색을 쓴다 */
function readSkyGradient(): { stops: SkyStop[]; glow: SkyGlowDirection } {
  const { skyBackdrop } = ATMOSPHERE_CONFIG;
  return {
    stops: skyBackdrop.stops.map((stop) => ({
      y: stop.y,
      color: toLinearRgb(stop.color),
      glowColor: "glowColor" in stop ? toLinearRgb(stop.glowColor) : undefined,
    })),
    glow: { x: skyBackdrop.glowDirection[0], z: skyBackdrop.glowDirection[1] },
  };
}

/**
 * 초저녁 하늘 배경막. 섬을 둘러싼 원통 안쪽 면에 높이별 노을 그라데이션을 정점 색으로 칠한다
 * (OKLab + 단조 3차 보간, lib/game/sky.ts).
 * 셰이더·텍스처 없이 MeshBasicMaterial 하나다. 안개·톤 매핑을 받지 않아 칠한 색이 그대로 보이고,
 * 아래쪽 색이 안개색과 같아서 바닥 연장 원판의 끝(완전히 안개색)과 이어진다 (ATMOSPHERE_CONFIG 주석).
 * 원통은 매 프레임 카메라 XZ를 따라간다 (스카이박스 방식). 원판도 카메라 중심이라 둘이 만나는 높이가 위치와 상관없이 같다.
 * 희미한 별(SkyStars)도 같은 그룹 안이라 하늘과 함께 움직인다.
 */
export function SkyBackdrop() {
  const geometryRef = useRef<CylinderGeometry>(null);
  const groupRef = useRef<Group>(null);
  const { skyBackdrop } = ATMOSPHERE_CONFIG;
  const height = skyBackdrop.topY - skyBackdrop.bottomY;
  const centerY = (skyBackdrop.topY + skyBackdrop.bottomY) / 2;

  useFrame(({ camera }) => {
    groupRef.current?.position.set(camera.position.x, 0, camera.position.z);
  });

  // Geometry는 JSX가 만들고 R3F가 해제한다. 여기서는 정점 색 속성만 한 번 채운다.
  useLayoutEffect(() => {
    const geometry = geometryRef.current;
    if (!geometry) return;
    const { stops, glow } = readSkyGradient();

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
  }, [centerY]);

  return (
    <group ref={groupRef}>
      <mesh position-y={centerY} raycast={ignoreRaycast} renderOrder={-1}>
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
      <SkyStars />
    </group>
  );
}

/**
 * 초저녁 하늘의 희미한 별 (SKY_STARS_CONFIG). 크기 단계마다 Points 하나 (PointsMaterial은 점 크기가 하나라서).
 * - 하늘 뒤 레이어: 배경막 바로 안쪽(반지름 78) 원통면에 놓고 배경막 그룹과 함께 카메라를 따라간다.
 * - 나무 뒤에 보이기: 깊이 테스트를 켜 둔다. 나무·바위·캐릭터는 항상 더 가까워서 별을 가린다.
 * - 은은하게: 투명 재질 없이, 그 자리 하늘색에 별빛을 조금만 섞은 불투명 색으로 칠한다. 안개·톤 매핑 없음.
 * - 크기: 거리와 상관없는 화면 픽셀 크기(sizeAttenuation false) × 기기 픽셀 비율.
 */
function SkyStars() {
  const dpr = useThree((state) => state.viewport.dpr);
  const geometryRefs = useRef<(BufferGeometry<NormalOrGLBufferAttributes> | null)[]>([]);

  useLayoutEffect(() => {
    const { stops, glow } = readSkyGradient();
    const tints = SKY_STARS_CONFIG.tints.map(toLinearRgb);
    const stars = createSkyStars(SKY_STARS_CONFIG);

    SKY_STARS_CONFIG.sizesPx.forEach((_, sizeIndex) => {
      const geometry = geometryRefs.current[sizeIndex];
      if (!geometry) return;
      const group = stars.filter((star) => star.sizeIndex === sizeIndex);
      const positions = new Float32Array(group.length * 3);
      const colors = new Float32Array(group.length * 3);
      group.forEach((star, i) => {
        const radius = Math.hypot(star.x, star.z) || 1;
        const sky = getSkyBackdropColor(star.y, star.x / radius, star.z / radius, stops, glow);
        const [r, g, b] = mixRgb(sky, tints[star.tintIndex], star.strength);
        positions.set([star.x, star.y, star.z], i * 3);
        colors.set([r, g, b], i * 3);
      });
      geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
      geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
      geometry.computeBoundingSphere();
    });
  }, []);

  return (
    <>
      {SKY_STARS_CONFIG.sizesPx.map((sizePx, sizeIndex) => (
        <points key={sizePx} raycast={ignoreRaycast}>
          <bufferGeometry
            ref={(geometry) => {
              geometryRefs.current[sizeIndex] = geometry;
            }}
          />
          <pointsMaterial
            size={sizePx * dpr}
            sizeAttenuation={false}
            vertexColors
            fog={false}
            toneMapped={false}
          />
        </points>
      ))}
    </>
  );
}
