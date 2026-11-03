// 월드 배치·크기·충돌 값의 단일 원본 (SPEC §3). 시각 메시·충돌 계산·카메라가 모두 여기서 읽는다.
//
// 좌표 기준: background.glb를 Y축으로 π 회전해 배치한 뒤의 **월드 좌표**다 (Y = 높이, XZ = 이동 평면).
// GLB 원본 좌표 (x, z)는 월드에서 (-x, -z)가 된다. 수치는 GLB의 실제 메시를 측정해서 정했다
// (측정 방법과 원본 노드 이름은 DEV_LOG 2026-11-03 · 2단계 참고). 추측한 값이 아니다.

/** XZ 평면의 축 정렬 사각형 */
export interface Bounds2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CircleCollider {
  kind: "circle";
  /** GLB 원본 노드 이름 (추적용) */
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface BoxCollider extends Bounds2D {
  kind: "box";
  id: string;
}

export type Collider = CircleCollider | BoxCollider;

export const BACKGROUND_CONFIG = {
  url: "/models/background.glb",
  /**
   * 카메라는 +z 쪽에서 -z를 바라본다 (SPEC §4). GLB 원본의 +z 쪽에 큰 바위·숲이 몰려 있어서
   * 그대로 두면 카메라와 캐릭터 사이를 가린다. π 회전하면 이것들이 화면 안쪽 배경이 된다.
   */
  rotationY: Math.PI,
  /** 이동 가능한 바닥으로 쓰는 메시. GLB 노드 `Cube_0` (재질 `Ground`, 섬 윗면) */
  groundMeshName: "Cube_0",
} as const;

export const TERRAIN_CONFIG = {
  /** 바닥 메시(Cube_0)의 XZ 범위. 이 밖에는 바닥이 없다 */
  bounds: { minX: -9.7, maxX: 9.7, minZ: -9.7, maxZ: 9.7 } satisfies Bounds2D,
  /** 높이 격자 간격. 바닥 높이 차가 0.60~0.83으로 완만해서 0.5면 충분하다 */
  cellSize: 0.5,
  /** 높이를 잴 때 위에서 아래로 쏘는 광선의 시작 높이 (모든 메시보다 높게) */
  rayOriginY: 50,
  /**
   * 섬 가장자리 절벽을 가리는 바닥 연장 평면의 높이. 바닥 최저점(0.60)보다 조금 낮게 둔다.
   * 평면이 섬 옆면을 덮어서, 카메라에 절벽 대신 이어지는 풀밭이 보인다.
   */
  extensionY: 0.57,
  /** 섬 바깥 띠의 높이. 가장자리 바닥 최고점(0.76)보다 높아야 옆면을 가린다 */
  edgeCoverY: 0.77,
  extensionSize: 400,
} as const;

/**
 * 이동 가능 범위 (설계값). 실제 이동 판정은 '바닥 메시 위' **그리고** 이 범위 안이어야 한다.
 * 바닥 전체(±9.7) 중에서 카메라를 크게 가리는 구역(울창한 숲 x < -5, 바위 지대 z < -4.5)과
 * 가장자리 0.7을 제외한 빈터다.
 */
export const WALK_BOUNDS: Bounds2D = { minX: -5, maxX: 9, minZ: -4.5, maxZ: 9 };

export const PLAYER_CONFIG = {
  /** 빈터 남쪽. 앞(-z)에 모닥불과 테이블이 보인다 */
  start: { x: 0, z: 5.5 },
  /** 충돌 원 반지름. 모델 크기가 아니라 이 값이 기준이고, 모델 스케일을 여기에 맞춘다 (SPEC §4) */
  radius: 0.4,
  speed: 3.5,
  /** 한 번의 이동에서 허용하는 최대 높이 차 */
  maxStepHeight: 0.3,
  /** 허용하는 최대 경사 (높이 차 / 수평 거리). 0.9 ≈ 42° */
  maxSlope: 0.9,
} as const;

export const CHARACTER_CONFIG = {
  url: "/models/character.glb",
  /** 원본 높이 0.48 → 약 1.9. 테이블 윗면(지면 + 1.38)이 가슴 높이가 된다 */
  scale: 4,
  /** 이동 방향으로 회전하는 속도 (지수 감쇠 계수, 1/초) */
  turnRate: 12,
} as const;

export const CAMERA_CONFIG = {
  /**
   * 플레이어 기준 고정 월드 오프셋 (SPEC §4). 높이 4.2는 나무 캐노피 최저점(지면 위 약 5)보다 낮게 둔 값이다.
   * 더 높이면 카메라가 캐노피 메시 안으로 들어가 화면이 잎으로 덮인다.
   */
  offset: [0, 4.2, 6.5],
  lookAtOffset: [0, 1, 0],
  fov: 50,
  near: 0.1,
  far: 200,
  /** 추적 속도 (지수 감쇠 계수, 1/초) */
  followRate: 6,
} as const;

export const ATMOSPHERE_CONFIG = {
  /** 배경색 = 안개색. 바닥 연장 평면의 먼 끝이 하늘과 이어지게 한다 */
  skyColor: "#a9bccb",
  fogNear: 18,
  fogFar: 48,
} as const;

/** 상호작용 대상의 실제 위치 (상호작용 연결은 3·4단계) */
export const LANDMARKS = {
  /** 나무 테이블 윗면 (GLB `Cube.001`). 윗면 높이 2.08, 지면 약 0.7 */
  table: { x: -3.3, z: 1.42, topY: 2.08 },
  /** 모닥불 (GLB `Mball.018` 불꽃 + `NurbsPath.008~014` 장작 + 돌 링) */
  campfire: { x: 1.05, z: 1.1 },
} as const;

/**
 * 충돌 영역. 몸통 높이(지면 + 0.25~1.8)에서 각 메시를 수평으로 잘라 얻은 XZ 단면을 원·사각형으로 감쌌다.
 * 꽃·풀·작은 버섯·흙더미·조약돌은 통과할 수 있는 장식으로 보고 넣지 않는다.
 * 이동 범위(WALK_BOUNDS) 밖의 나무·바위는 닿을 수 없으므로 넣지 않는다.
 */
export const COLLIDERS: readonly Collider[] = [
  {
    kind: "circle",
    id: "campfire (Mball.018, NurbsPath.008~014, 돌 링)",
    x: 1.05,
    z: 1.1,
    radius: 2.2,
  },
  { kind: "circle", id: "campfire-rock Icosphere.005", x: 0.76, z: 2.76, radius: 0.7 },
  { kind: "circle", id: "campfire-rock Icosphere.022", x: 0.64, z: -0.63, radius: 0.75 },
  { kind: "circle", id: "campfire-rock Icosphere.023", x: 1.66, z: 2.95, radius: 0.75 },
  // 테이블 상판(지면 위 0.6~1.38)이 캐릭터 머리 높이다. Chibi 머리 반지름(최대 0.70)이 충돌 원(0.4)보다
  // 0.30 크므로, 머리 높이 단면(x ≤ -2.56, z ≥ -0.82)에서 0.30 + 여유 0.02만큼 바깥으로 둔다 (동·북 면).
  // 남쪽(3.65)은 기존 값으로 여유가 충분하고, 서쪽(-4.6)은 이동 범위 밖이라 그대로 둔다. (DEV_LOG 테이블 머리 겹침)
  {
    kind: "box",
    id: "table (Cube.001 + NurbsPath + NurbsPath.001)",
    minX: -4.6,
    maxX: -2.24,
    minZ: -1.14,
    maxZ: 3.65,
  },
  { kind: "circle", id: "tree Cylinder.001", x: -5.94, z: 3.95, radius: 0.85 },
  { kind: "circle", id: "tree Cylinder.008", x: 1.75, z: -5.34, radius: 0.35 },
  { kind: "circle", id: "tree Cylinder.011", x: -0.37, z: -5.48, radius: 0.5 },
  { kind: "circle", id: "stump Cylinder.014", x: 4.63, z: -4.54, radius: 0.5 },
  {
    kind: "box",
    id: "lantern-post (LanternLargeStem, LanternLargeStem.001, Rope)",
    minX: 5.4,
    maxX: 7.3,
    minZ: -5.3,
    maxZ: -4,
  },
  { kind: "circle", id: "rock Icosphere.004", x: -6.15, z: -2.85, radius: 1.5 },
  { kind: "circle", id: "rock Icosphere.006", x: -4.06, z: -4.05, radius: 1.7 },
  { kind: "circle", id: "rock Icosphere.011", x: 5.29, z: 5.87, radius: 0.5 },
  { kind: "circle", id: "rock Icosphere.012", x: -1.22, z: -5.09, radius: 0.5 },
  { kind: "circle", id: "rock Icosphere.029", x: 0.43, z: -5.21, radius: 0.3 },
  { kind: "circle", id: "rock Icosphere.030", x: 6.63, z: 5.47, radius: 1.25 },
  { kind: "circle", id: "rock Icosphere.055", x: 7.9, z: -0.93, radius: 0.35 },
  { kind: "circle", id: "mushroom Circle.011", x: 5.71, z: 6.56, radius: 0.45 },
];
