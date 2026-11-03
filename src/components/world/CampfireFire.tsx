"use client";

import { useLayoutEffect, useRef } from "react";

import { useFrame, useLoader } from "@react-three/fiber";
import {
  BufferAttribute,
  Color,
  DynamicDrawUsage,
  Matrix3,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from "three";
import type { BufferGeometry, Material, PointLight } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { deformFlamePositions, getFlameMotion, writeFlameColors } from "@/lib/game/campfire";
import type { FlamePalette } from "@/lib/game/campfire";
import { BACKGROUND_CONFIG, CAMPFIRE_CONFIG } from "@/lib/game/worldConfig";

/** 정점 흔들림이 원래 경계 구를 벗어나지 않도록 넉넉히 키우는 배율 (늘어남 9% + 흔들림 0.15) */
const BOUNDING_SPHERE_MARGIN = 1.3;

/** sRGB HEX → three 작업 색공간(선형) RGB. 정점 색은 선형 값으로 넣어야 화면에 HEX 그대로 나온다 */
function toLinearRgb(hex: string): [number, number, number] {
  const color = new Color(hex);
  return [color.r, color.g, color.b];
}

const FLAME_PALETTE: FlamePalette = {
  core: toLinearRgb(CAMPFIRE_CONFIG.flameColors.core),
  mid: toLinearRgb(CAMPFIRE_CONFIG.flameColors.mid),
  edge: toLinearRgb(CAMPFIRE_CONFIG.flameColors.edge),
};

/** 한 번 준비해 두고 매 프레임 재사용하는 버퍼 */
interface FlameBuffers {
  /** 원래 정점의 월드 좌표 */
  baseWorld: Float32Array;
  /** 원래 정점의 월드 법선 (단위 벡터). 일렁임은 작아서 법선은 다시 계산하지 않는다 */
  normalWorld: Float32Array;
  /** 움직인 정점의 월드 좌표 (매 프레임 덮어씀) */
  deformedWorld: Float32Array;
  /** 월드 → 메시 로컬 변환 */
  worldToLocal: Matrix4;
  /** 메시에 붙인 복제 Geometry의 위치·색 속성 */
  position: BufferAttribute;
  color: BufferAttribute;
}

const scratch = new Vector3();

/**
 * 모닥불 불꽃 일렁임·색 + 주변을 비추는 따뜻한 pointLight.
 * 배경 GLB의 기존 불꽃 메시(`Mball018_0`)를 그대로 쓴다. 새 에셋·셰이더 없이 정점 위치와 정점 색만 매 프레임 바꾼다.
 *
 * - 원본 Geometry·재질은 useLoader 캐시가 공유하므로 직접 바꾸지 않는다. 같은 effect에서 **복제 Geometry와 새 재질을
 *   만들어 메시에 연결**하고, 정리 함수에서 원본으로 되돌린 뒤 둘 다 dispose한다 (CODING_CONVENTIONS §7).
 * - 새 재질은 정점 색 MeshBasicMaterial이다. 불꽃은 스스로 빛나므로 조명·반사를 받지 않고, 톤 매핑을 빼서 색이 바래지 않는다.
 * - 계산은 `lib/game/campfire`의 순수 함수가 하고, 여기서는 월드 ↔ 로컬 변환과 GPU 업로드 표시만 한다.
 * - pointLight는 항상 마운트해 두고 intensity만 바꾼다 (라이트 수 고정, 셰이더 재컴파일 없음).
 */
export function CampfireFire() {
  const gltf = useLoader(GLTFLoader, BACKGROUND_CONFIG.url);
  const lightRef = useRef<PointLight>(null);
  const buffersRef = useRef<FlameBuffers | null>(null);

  // 메시는 effect 안에서 찾는다. 렌더 중 값(useMemo)을 effect에서 바꾸지 않기 위해서다 (react-hooks/immutability)
  useLayoutEffect(() => {
    const flameMesh = gltf.scene.getObjectByName(CAMPFIRE_CONFIG.flameMeshName);
    if (!(flameMesh instanceof Mesh)) {
      console.error(`[CampfireFire] 불꽃 메시 '${CAMPFIRE_CONFIG.flameMeshName}'를 찾지 못했다`);
      return;
    }
    // 커밋 후라 배경 그룹(π 회전)에 붙어 있다. 회전까지 포함한 월드 행렬로 잰다
    flameMesh.updateWorldMatrix(true, false);
    const originalGeometry: BufferGeometry = flameMesh.geometry;
    const originalMaterial: Material | Material[] = flameMesh.material;
    const geometry = originalGeometry.clone();
    const position = geometry.getAttribute("position") as BufferAttribute;
    const normal = geometry.getAttribute("normal") as BufferAttribute;
    // 매 프레임 덮어쓰는 버퍼라고 알린다
    position.setUsage(DynamicDrawUsage);
    const color = new BufferAttribute(new Float32Array(position.count * 3), 3);
    color.setUsage(DynamicDrawUsage);
    geometry.setAttribute("color", color);
    geometry.computeBoundingSphere();
    if (geometry.boundingSphere) geometry.boundingSphere.radius *= BOUNDING_SPHERE_MARGIN;

    const normalMatrix = new Matrix3().getNormalMatrix(flameMesh.matrixWorld);
    const baseWorld = new Float32Array(position.count * 3);
    const normalWorld = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
      scratch.fromBufferAttribute(position, i).applyMatrix4(flameMesh.matrixWorld);
      baseWorld[i * 3] = scratch.x;
      baseWorld[i * 3 + 1] = scratch.y;
      baseWorld[i * 3 + 2] = scratch.z;
      scratch.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize();
      normalWorld[i * 3] = scratch.x;
      normalWorld[i * 3 + 1] = scratch.y;
      normalWorld[i * 3 + 2] = scratch.z;
    }

    const material = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });

    flameMesh.geometry = geometry;
    flameMesh.material = material;
    buffersRef.current = {
      baseWorld,
      normalWorld,
      deformedWorld: new Float32Array(baseWorld.length),
      worldToLocal: flameMesh.matrixWorld.clone().invert(),
      position,
      color,
    };

    return () => {
      buffersRef.current = null;
      flameMesh.geometry = originalGeometry;
      flameMesh.material = originalMaterial;
      geometry.dispose();
      material.dispose();
    };
  }, [gltf]);

  useFrame(({ clock, camera }) => {
    const buffers = buffersRef.current;
    if (!buffers) return;
    const time = clock.elapsedTime;
    const motion = getFlameMotion(time, CAMPFIRE_CONFIG.flameMotion);

    deformFlamePositions(
      buffers.baseWorld,
      buffers.deformedWorld,
      CAMPFIRE_CONFIG.flameShape,
      motion,
      CAMPFIRE_CONFIG.flameMotion,
      time,
    );
    const { deformedWorld, position, worldToLocal, color } = buffers;
    for (let i = 0; i < position.count; i++) {
      scratch
        .set(deformedWorld[i * 3], deformedWorld[i * 3 + 1], deformedWorld[i * 3 + 2])
        .applyMatrix4(worldToLocal);
      position.setXYZ(i, scratch.x, scratch.y, scratch.z);
    }
    position.needsUpdate = true;

    writeFlameColors(
      deformedWorld,
      buffers.normalWorld,
      color.array as Float32Array,
      CAMPFIRE_CONFIG.flameShape,
      camera.position.x,
      camera.position.y,
      camera.position.z,
      FLAME_PALETTE,
      CAMPFIRE_CONFIG.flameColors,
      motion.glow,
    );
    color.needsUpdate = true;

    if (lightRef.current) {
      lightRef.current.intensity = CAMPFIRE_CONFIG.light.intensity * motion.glow;
    }
  });

  const { light } = CAMPFIRE_CONFIG;
  return (
    <pointLight
      ref={lightRef}
      position={light.position}
      color={light.color}
      intensity={light.intensity}
      distance={light.distance}
      decay={light.decay}
    />
  );
}
