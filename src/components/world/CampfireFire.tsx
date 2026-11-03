"use client";

import { useLayoutEffect, useRef } from "react";

import { useFrame, useLoader } from "@react-three/fiber";
import { DynamicDrawUsage, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from "three";
import type { BufferAttribute, BufferGeometry, PointLight } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { deformFlamePositions, getFlameMotion } from "@/lib/game/campfire";
import { BACKGROUND_CONFIG, CAMPFIRE_CONFIG } from "@/lib/game/worldConfig";

/** 정점 흔들림이 원래 경계 구를 벗어나지 않도록 넉넉히 키우는 배율 (늘어남 9% + 흔들림 0.15) */
const BOUNDING_SPHERE_MARGIN = 1.3;

/** 한 번 준비해 두고 매 프레임 재사용하는 버퍼 */
interface FlameBuffers {
  /** 원래 정점의 월드 좌표 */
  baseWorld: Float32Array;
  /** 움직인 정점의 월드 좌표 (매 프레임 덮어씀) */
  deformedWorld: Float32Array;
  /** 월드 → 메시 로컬 변환 */
  worldToLocal: Matrix4;
  /** 메시에 붙인 복제 Geometry의 위치 속성 */
  position: BufferAttribute;
  material: MeshStandardMaterial | null;
}

const scratch = new Vector3();

/**
 * 모닥불 불꽃 일렁임 + 주변을 비추는 따뜻한 pointLight.
 * 배경 GLB의 기존 불꽃 메시(`Mball018_0`)를 그대로 쓴다. 새 에셋·셰이더 없이 정점만 매 프레임 옮긴다.
 *
 * - 원본 Geometry는 useLoader 캐시가 공유하므로 직접 바꾸지 않는다. 같은 effect에서 **복제본을 만들어 메시에 연결**하고,
 *   정리 함수에서 원본으로 되돌린 뒤 복제본을 dispose한다 (CODING_CONVENTIONS §7).
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
    const original: BufferGeometry = flameMesh.geometry;
    const geometry = original.clone();
    const position = geometry.getAttribute("position") as BufferAttribute;
    // 매 프레임 덮어쓰는 버퍼라고 알린다
    position.setUsage(DynamicDrawUsage);
    geometry.computeBoundingSphere();
    if (geometry.boundingSphere) geometry.boundingSphere.radius *= BOUNDING_SPHERE_MARGIN;

    const baseWorld = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
      scratch.fromBufferAttribute(position, i).applyMatrix4(flameMesh.matrixWorld);
      baseWorld[i * 3] = scratch.x;
      baseWorld[i * 3 + 1] = scratch.y;
      baseWorld[i * 3 + 2] = scratch.z;
    }

    const material = flameMesh.material instanceof MeshStandardMaterial ? flameMesh.material : null;
    const originalEmissiveIntensity = material?.emissiveIntensity ?? 1;

    flameMesh.geometry = geometry;
    buffersRef.current = {
      baseWorld,
      deformedWorld: new Float32Array(baseWorld.length),
      worldToLocal: flameMesh.matrixWorld.clone().invert(),
      position,
      material,
    };

    return () => {
      buffersRef.current = null;
      flameMesh.geometry = original;
      geometry.dispose();
      if (material) material.emissiveIntensity = originalEmissiveIntensity;
    };
  }, [gltf]);

  useFrame(({ clock }) => {
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
    const { deformedWorld, position, worldToLocal } = buffers;
    for (let i = 0; i < position.count; i++) {
      scratch
        .set(deformedWorld[i * 3], deformedWorld[i * 3 + 1], deformedWorld[i * 3 + 2])
        .applyMatrix4(worldToLocal);
      position.setXYZ(i, scratch.x, scratch.y, scratch.z);
    }
    position.needsUpdate = true;

    if (buffers.material) {
      buffers.material.emissiveIntensity = CAMPFIRE_CONFIG.emissiveIntensity * motion.glow;
    }
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
