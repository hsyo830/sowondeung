"use client";

import { useRef } from "react";

import { Quaternion, Vector3 } from "three";
import type { MeshStandardMaterial } from "three";

import { LANTERN_GEOMETRY, LANTERN_SIZE } from "@/lib/lantern/lanternGeometry";
import { useLanternTexture } from "@/lib/lantern/useLanternTexture";
import type { Stroke } from "@/types/game";

const { width, height, depth, shoulderHeight, shoulderTopRatio } = LANTERN_SIZE;
const HALF_W = width / 2;
const HALF_H = height / 2;
const HALF_D = depth / 2;
/** 어깨 윗변의 반 너비·반 깊이 (lanternGeometry의 shoulder와 같은 값에서 계산) */
const TOP_HALF_W = HALF_W * shoulderTopRatio;
const TOP_HALF_D = HALF_D * shoulderTopRatio;
const SHOULDER_TOP_Y = HALF_H + shoulderHeight;

const LIT_EMISSIVE_INTENSITY = 0.6;
const FRAME_COLOR = "#5b3a1e";
const FLAME_COLOR = "#ffc46b";
const FUEL_COLOR = "#ff7a1a";

/** 세로 테두리 4개의 (x, z) */
const VERTICAL_FRAME_XZ = [
  [-HALF_W, -HALF_D],
  [HALF_W, -HALF_D],
  [-HALF_W, HALF_D],
  [HALF_W, HALF_D],
] as const;

/** 위·아래 테두리의 y */
const RIM_Y = [-HALF_H, HALF_H] as const;

/**
 * 어깨 윗변 테두리: 몸통 가로·깊이 테두리 Geometry를 길이 축으로만 줄여 재사용한다.
 * 두께 축은 1배라 몸통 테두리와 굵기가 같다.
 */
const SHOULDER_RIM_X_SCALE = [shoulderTopRatio, 1, 1] as const;
const SHOULDER_RIM_Z_SCALE = [1, 1, shoulderTopRatio] as const;

/**
 * 어깨 사선 테두리 4개: 세로 테두리 Geometry(Y축 길이 = height)를 Y로만 늘이고
 * 몸통 위 모서리 → 어깨 위 모서리 방향으로 회전한다. 모듈 로드 시 1회만 계산한다
 * (렌더 중 Three 객체 생성 금지, 결과는 숫자 튜플로만 보관).
 */
const SHOULDER_EDGES = (
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const
).map(([sx, sz]) => {
  const direction = new Vector3(
    sx * (TOP_HALF_W - HALF_W),
    shoulderHeight,
    sz * (TOP_HALF_D - HALF_D),
  );
  const length = direction.length();
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
  return {
    key: `s${sx}${sz}`,
    // Box는 중심 기준이므로 두 끝점의 중점에 둔다
    position: [
      (sx * (HALF_W + TOP_HALF_W)) / 2,
      HALF_H + shoulderHeight / 2,
      (sz * (HALF_D + TOP_HALF_D)) / 2,
    ] as const,
    quaternion: [q.x, q.y, q.z, q.w] as const,
    scale: [1, length / height, 1] as const,
  };
});

interface PaperMaterialProps {
  colorHex: string;
  emissiveIntensity: number;
}

/** 뒷면·좌우면·어깨가 쓰는 단색 종이 재질 */
function PaperMaterial({ colorHex, emissiveIntensity }: PaperMaterialProps) {
  return (
    <meshStandardMaterial
      color={colorHex}
      roughness={0.9}
      emissive={colorHex}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

interface LanternModelProps {
  colorHex: string;
  strokes: readonly Stroke[];
  lit: boolean;
}

/**
 * Geometry만으로 만든 천등 (SPEC §5). 수령·소지·발사·미리보기가 모두 이 컴포넌트를 재사용한다.
 * - 공유 Geometry는 prop으로만 넘기고, Material은 JSX 자식으로 선언해 R3F가 해제하게 한다.
 * - 모든 면은 FrontSide(기본값). DoubleSide를 쓰면 뒤에서 볼 때 반전된 글씨가 비친다.
 * - `lit`이 바뀌어도 메시를 마운트·언마운트하지 않고 visible·emissiveIntensity만 바꾼다.
 * - 앞면 텍스처는 이 인스턴스가 만들고 이 인스턴스가 해제한다 (useLanternTexture).
 */
export function LanternModel({ colorHex, strokes, lit }: LanternModelProps) {
  const frontMaterialRef = useRef<MeshStandardMaterial>(null);
  useLanternTexture(frontMaterialRef, colorHex, strokes);

  const emissiveIntensity = lit ? LIT_EMISSIVE_INTENSITY : 0;

  return (
    <group>
      {/* 앞면: +z를 향한다. 색은 텍스처가 담당하므로 color·emissive는 흰색(곱해도 그대로)으로 둔다.
          map·emissiveMap은 useLanternTexture가 명령형으로 연결한다 (JSX prop 금지) */}
      <mesh geometry={LANTERN_GEOMETRY.face} position={[0, 0, HALF_D]}>
        <meshStandardMaterial
          ref={frontMaterialRef}
          color="#ffffff"
          roughness={0.9}
          emissive="#ffffff"
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* 뒷면: Y축 180° 회전으로 -z를 향한다 */}
      <mesh geometry={LANTERN_GEOMETRY.face} position={[0, 0, -HALF_D]} rotation={[0, Math.PI, 0]}>
        <PaperMaterial colorHex={colorHex} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {/* 좌·우면 */}
      <mesh
        geometry={LANTERN_GEOMETRY.side}
        position={[-HALF_W, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <PaperMaterial colorHex={colorHex} emissiveIntensity={emissiveIntensity} />
      </mesh>
      <mesh
        geometry={LANTERN_GEOMETRY.side}
        position={[HALF_W, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <PaperMaterial colorHex={colorHex} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {/* 어깨: 몸통 윗변(y = HALF_H)에서 시작해 안쪽으로 좁아지는 사다리꼴 상단. 글씨 없음.
          아래 모서리가 몸통 윗변과 정확히 같아 틈이 없고, 이음매는 위 테두리가 덮는다.
          아랫면은 실제 천등처럼 열어 둔다 */}
      <mesh geometry={LANTERN_GEOMETRY.shoulder} position={[0, HALF_H, 0]}>
        <PaperMaterial colorHex={colorHex} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {/* 테두리 */}
      {VERTICAL_FRAME_XZ.map(([x, z]) => (
        <mesh key={`v${x}${z}`} geometry={LANTERN_GEOMETRY.frameVertical} position={[x, 0, z]}>
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.8} />
        </mesh>
      ))}
      {RIM_Y.map((y) =>
        [-HALF_D, HALF_D].map((z) => (
          <mesh key={`x${y}${z}`} geometry={LANTERN_GEOMETRY.frameAlongX} position={[0, y, z]}>
            <meshStandardMaterial color={FRAME_COLOR} roughness={0.8} />
          </mesh>
        )),
      )}
      {RIM_Y.map((y) =>
        [-HALF_W, HALF_W].map((x) => (
          <mesh key={`z${y}${x}`} geometry={LANTERN_GEOMETRY.frameAlongZ} position={[x, y, 0]}>
            <meshStandardMaterial color={FRAME_COLOR} roughness={0.8} />
          </mesh>
        )),
      )}

      {/* 어깨 테두리: 사선 4개 + 윗변 4개. 몸통 위 테두리(RIM_Y의 HALF_H)와 모서리에서 이어진다 */}
      {SHOULDER_EDGES.map((edge) => (
        <mesh
          key={edge.key}
          geometry={LANTERN_GEOMETRY.frameVertical}
          position={edge.position}
          quaternion={edge.quaternion}
          scale={edge.scale}
        >
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.8} />
        </mesh>
      ))}
      {[-TOP_HALF_D, TOP_HALF_D].map((z) => (
        <mesh
          key={`tx${z}`}
          geometry={LANTERN_GEOMETRY.frameAlongX}
          position={[0, SHOULDER_TOP_Y, z]}
          scale={SHOULDER_RIM_X_SCALE}
        >
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.8} />
        </mesh>
      ))}
      {[-TOP_HALF_W, TOP_HALF_W].map((x) => (
        <mesh
          key={`tz${x}`}
          geometry={LANTERN_GEOMETRY.frameAlongZ}
          position={[x, SHOULDER_TOP_Y, 0]}
          scale={SHOULDER_RIM_Z_SCALE}
        >
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.8} />
        </mesh>
      ))}

      {/* 하단 불꽃 + 연료. 점화 전에는 숨기기만 한다 (재마운트·셰이더 재컴파일 방지) */}
      <mesh geometry={LANTERN_GEOMETRY.flame} position={[0, -HALF_H + 0.06, 0]} visible={lit}>
        <meshBasicMaterial color={FLAME_COLOR} toneMapped={false} />
      </mesh>
      <mesh geometry={LANTERN_GEOMETRY.fuel} position={[0, -HALF_H - 0.08, 0]} visible={lit}>
        <meshBasicMaterial color={FUEL_COLOR} toneMapped={false} />
      </mesh>
    </group>
  );
}
