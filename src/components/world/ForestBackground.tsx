"use client";

import { useLayoutEffect, useMemo } from "react";
import type { RefObject } from "react";

import { useLoader } from "@react-three/fiber";
import { Mesh, Raycaster, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { createHeightfield } from "@/lib/game/terrain";
import type { Heightfield } from "@/lib/game/terrain";
import { BACKGROUND_CONFIG, TERRAIN_CONFIG } from "@/lib/game/worldConfig";

interface ForestBackgroundProps {
  /** 바닥 높이 격자를 여기에 써 준다. 로드 전·언마운트 후에는 null */
  terrainRef: RefObject<Heightfield | null>;
}

/**
 * 숲 배경 GLB와 바닥 연장 평면. 원본 GLB는 수정하지 않고, 회전만 준 그룹에 그대로 넣는다.
 * 마운트 시 바닥 메시(Cube_0)에 위에서 광선을 쏴서 높이 격자를 만든다. 이동 판정은 이 격자만 읽는다.
 */
export function ForestBackground({ terrainRef }: ForestBackgroundProps) {
  const gltf = useLoader(GLTFLoader, BACKGROUND_CONFIG.url);

  // 읽기만 한다 (씬을 바꾸지 않음). 연장 평면이 같은 재질을 써서 섬 바닥과 색·조명이 똑같이 보이게 한다.
  const groundMesh = useMemo(() => {
    const object = gltf.scene.getObjectByName(BACKGROUND_CONFIG.groundMeshName);
    return object instanceof Mesh ? object : null;
  }, [gltf]);

  useLayoutEffect(() => {
    if (!groundMesh) {
      console.error(
        `[ForestBackground] 바닥 메시 '${BACKGROUND_CONFIG.groundMeshName}'를 찾지 못했다`,
      );
      return;
    }
    // 이 effect는 부모 그룹의 회전이 적용된 뒤(커밋 후)에 실행된다. 월드 행렬을 갱신하고 월드 좌표로 잰다.
    groundMesh.updateWorldMatrix(true, false);
    const raycaster = new Raycaster();
    const origin = new Vector3();
    const down = new Vector3(0, -1, 0);

    terrainRef.current = createHeightfield(
      TERRAIN_CONFIG.bounds,
      TERRAIN_CONFIG.cellSize,
      (x, z) => {
        origin.set(x, TERRAIN_CONFIG.rayOriginY, z);
        raycaster.set(origin, down);
        // 위에서 처음 맞는 면 = 섬 윗면 (옆면은 그 아래에 있다)
        const hit = raycaster.intersectObject(groundMesh, false)[0];
        return hit ? hit.point.y : null;
      },
    );

    return () => {
      terrainRef.current = null;
    };
  }, [groundMesh, terrainRef]);

  // 냄비·가로 가지 숨김. useLoader 캐시 객체라 언마운트 때 원래대로 되돌린다 (GLB 파일·Geometry는 그대로)
  useLayoutEffect(() => {
    const hidden: Mesh[] = [];
    for (const name of BACKGROUND_CONFIG.hiddenMeshNames) {
      const object = gltf.scene.getObjectByName(name);
      if (!(object instanceof Mesh)) {
        console.error(`[ForestBackground] 숨길 메시 '${name}'를 찾지 못했다`);
        continue;
      }
      object.visible = false;
      hidden.push(object);
    }
    return () => {
      for (const mesh of hidden) mesh.visible = true;
    };
  }, [gltf]);

  return (
    <>
      <group rotation-y={BACKGROUND_CONFIG.rotationY}>
        {/* useLoader가 캐시한 객체라 R3F는 primitive를 해제하지 않는다 */}
        <primitive object={gltf.scene} />
      </group>
      {groundMesh && (
        <>
          <mesh
            rotation-x={-Math.PI / 2}
            position-y={TERRAIN_CONFIG.extensionY}
            material={groundMesh.material}
          >
            <planeGeometry args={[TERRAIN_CONFIG.extensionSize, TERRAIN_CONFIG.extensionSize]} />
          </mesh>
          {EDGE_COVER_STRIPS.map((strip) => (
            <mesh
              key={strip.id}
              rotation-x={-Math.PI / 2}
              position={[strip.x, TERRAIN_CONFIG.edgeCoverY, strip.z]}
              material={groundMesh.material}
            >
              <planeGeometry args={[strip.width, strip.depth]} />
            </mesh>
          ))}
        </>
      )}
    </>
  );
}

/**
 * 섬 바깥을 둘러싸는 띠 4개 (바닥 범위 밖만 덮는다). 섬 가장자리 높이(0.60~0.76)보다 조금 높게 두어
 * 섬 옆면(어두운 수직면)을 위에서 가린다. 같은 재질의 수평면이라 섬 윗면과 색·밝기가 같다.
 */
const EDGE_COVER_STRIPS = (() => {
  const { minX, maxX, minZ, maxZ } = TERRAIN_CONFIG.bounds;
  const half = TERRAIN_CONFIG.extensionSize / 2;
  const rect = (id: string, x0: number, x1: number, z0: number, z1: number) => ({
    id,
    x: (x0 + x1) / 2,
    z: (z0 + z1) / 2,
    width: x1 - x0,
    // 평면을 -π/2로 눕히면 로컬 y가 월드 -z가 된다. 크기만 쓰므로 부호는 상관없다
    depth: z1 - z0,
  });
  return [
    rect("north", -half, half, -half, minZ),
    rect("south", -half, half, maxZ, half),
    rect("west", -half, minX, minZ, maxZ),
    rect("east", maxX, half, minZ, maxZ),
  ];
})();
