"use client";

import { COLLIDERS, WALK_BOUNDS } from "@/lib/game/worldConfig";

const DEBUG_HEIGHT = 2;
const DEBUG_BASE_Y = 0.6;

/**
 * 개발용: WorldConfig의 충돌 영역(빨강)과 이동 범위(노랑)를 와이어프레임으로 그린다.
 * 실제 에셋과 충돌 범위가 맞는지 브라우저에서 눈으로 확인하기 위한 것이다. 게임 로직은 이것을 읽지 않는다.
 */
export function ColliderDebug() {
  const boundsWidth = WALK_BOUNDS.maxX - WALK_BOUNDS.minX;
  const boundsDepth = WALK_BOUNDS.maxZ - WALK_BOUNDS.minZ;

  return (
    <group position-y={DEBUG_BASE_Y + DEBUG_HEIGHT / 2}>
      {COLLIDERS.map((collider) =>
        collider.kind === "circle" ? (
          <mesh key={collider.id} position={[collider.x, 0, collider.z]}>
            <cylinderGeometry
              args={[collider.radius, collider.radius, DEBUG_HEIGHT, 24, 1, true]}
            />
            <meshBasicMaterial color="#ff3b30" wireframe />
          </mesh>
        ) : (
          <mesh
            key={collider.id}
            position={[(collider.minX + collider.maxX) / 2, 0, (collider.minZ + collider.maxZ) / 2]}
          >
            <boxGeometry
              args={[collider.maxX - collider.minX, DEBUG_HEIGHT, collider.maxZ - collider.minZ]}
            />
            <meshBasicMaterial color="#ff3b30" wireframe />
          </mesh>
        ),
      )}
      {/* 이동 범위. 플레이어 충돌 원 전체가 이 안에 있어야 한다 */}
      <mesh
        position={[
          (WALK_BOUNDS.minX + WALK_BOUNDS.maxX) / 2,
          0,
          (WALK_BOUNDS.minZ + WALK_BOUNDS.maxZ) / 2,
        ]}
      >
        <boxGeometry args={[boundsWidth, DEBUG_HEIGHT, boundsDepth]} />
        <meshBasicMaterial color="#ffd60a" wireframe />
      </mesh>
    </group>
  );
}
