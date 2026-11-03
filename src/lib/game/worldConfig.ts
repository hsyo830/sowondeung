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
  /**
   * 렌더링에서 숨기는 메시 (런타임 이름, GLTFLoader가 `.`를 지운 이름). 원본 GLB 파일은 그대로 둔다.
   * 모닥불 위의 냄비와 냄비를 거는 가로 나뭇가지 2개다 (forest-atmosphere 측정, DEV_LOG).
   * - `Circle_0` (원본 `Circle`, 재질 Metal): 냄비. 월드 y 2.20~2.76, 불꽃(최고 2.01)보다 위
   * - `NurbsPath004_0`·`NurbsPath005_0` (재질 LightWood): 큰 돌 2개(`Icosphere.022·023`) 위에 걸친 가로 가지.
   *   월드 y 2.04~2.86으로 바닥에 닿지 않는다. 장작(`NurbsPath.008~014`, 바닥 0.06~0.45에서 시작)과 별개 노드다.
   * 셋 다 독립 노드·독립 메시라 다른 오브젝트에 영향이 없다. 별도 충돌 영역도 없었다 (모닥불 원·돌 원은 그대로).
   */
  hiddenMeshNames: ["Circle_0", "NurbsPath004_0", "NurbsPath005_0"],
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
  /**
   * 천등을 드는 손 본 (SPEC §4). three의 GLTFLoader가 찾는 이름 그대로다.
   * 3단계 확인: `Bone` 타입, Idle·Walk 중 지면 위 0.33~0.43, 캐릭터 로컬 x ≈ -0.23~-0.35 (오른쪽 옆)
   */
  handBoneName: "RightHand",
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

/**
 * 초저녁 분위기 (forest-atmosphere). 색은 모두 sRGB HEX다.
 * 3인칭 카메라에는 지평선 위 하늘이 들어오지 않는다 (화면 맨 위 = 지평선 아래 1.2°). 그래서 화면 위쪽의 '하늘'은
 * 안개에 덮인 먼 바닥 + 섬 둘레의 원통 배경막(skyBackdrop)이다. 배경막 아래쪽 색 = 안개색이라 둘이 이어진다.
 */
export const ATMOSPHERE_CONFIG = {
  /** 안개색 = 배경색 = 배경막 아래쪽 색. 먼 숲이 차분한 보랏빛으로 녹아든다 */
  fogColor: "#9f86b2",
  fogNear: 16,
  /**
   * 배경막에 닿기 전에 바닥이 완전히 안개색이 되어야 이음새가 없다.
   * 카메라가 원점에서 가장 멀 때(이동 범위 모서리, 약 17.9) 화면 옆 끝 방향(수평 반각 약 36°, 16:10)의 깊이:
   * (skyBackdrop.radius 80 − 17.9) × cos 36° ≈ 50 > 46
   */
  fogFar: 46,
  skyBackdrop: {
    /** 원점 중심 원통. 카메라 far(200) 안, 안개 끝(fogFar)보다 충분히 바깥 */
    radius: 80,
    height: 40,
    /** 노을이 남은 방향 = 카메라가 바라보는 -z 쪽 */
    glowDirection: [0, -1],
    /** 높이별 색 위치 (월드 y). 섬 바깥 띠(y 0.77) 위부터 칠한다 */
    bottomY: 0.8,
    bandY: 2.2,
    upperY: 4.5,
    topY: 14,
    colors: {
      horizon: "#9f86b2",
      band: "#b48fb9",
      glow: "#e2a395",
      upper: "#7b71b1",
      zenith: "#393b76",
    },
  },
  /** 하늘(연보라)·바닥(어두운 보라) 반구광. 그늘진 면이 검게 죽지 않고 저녁빛을 띤다 */
  hemisphere: { skyColor: "#c3bcdd", groundColor: "#4f4b62", intensity: Math.PI * 0.58 },
  /** 지는 해의 남은 빛. 노을 쪽(-z) 낮은 각도에서 오는 약한 분홍빛 */
  sunset: { color: "#ffb7a1", position: [-12, 5, -7], intensity: Math.PI * 0.3 },
} as const;

/**
 * 모닥불 불꽃·조명 (forest-atmosphere 측정값). 불꽃 메시 `Mball.018_0`은 월드 y -0.54~2.01이고
 * 절반쯤은 바닥(0.73) 아래 묻혀 있다. 보이는 부분은 0.73~2.01. 정점 중심 (1.11, 0.99), 보이는 부분 중심 약 (1.09, 1.05).
 */
export const CAMPFIRE_CONFIG = {
  /** 런타임 이름 (`Mball.018_0`에서 `.` 제거). 재질 `Fire`는 이 메시만 쓴다 */
  flameMeshName: "Mball018_0",
  flameShape: { centerX: 1.09, centerZ: 1.05, baseY: 0.73, topY: 2.01 },
  flameMotion: { stretch: 0.09, sway: 0.11, flutter: 0.035, glow: 0.14 },
  /** 원본 Fire 재질의 emissive(1, 0.30, 0.002)에 곱하는 기본 세기. 일렁임에 따라 ± glow */
  emissiveIntensity: 1.3,
  light: {
    /** 장작 가운데 높이 (바닥 0.73 + 0.8) */
    position: [1.09, 1.53, 1.05],
    color: "#ff9447",
    /** 물리 단위(cd). decay 2라 가까운 돌·바닥만 밝고 멀어질수록 빠르게 어두워진다 */
    intensity: 26,
    /** 이 거리에서 빛이 0이 된다. 테이블(약 4.4)까지는 은은하게 닿는다 */
    distance: 11,
    decay: 2,
  },
} as const;

/** 상호작용 대상의 실제 위치 */
export const LANDMARKS = {
  /**
   * 나무 테이블 (GLB `Cube.001`). 윗면 최고 높이 2.08, 지면 약 0.7.
   * three의 GLTFLoader는 노드 이름의 `.`를 지운다 (PropertyBinding.sanitizeNodeName). 그래서 런타임 이름은 `Cube001`이다.
   */
  table: {
    x: -3.3,
    z: 1.42,
    topY: 2.08,
    /**
     * 테이블 메시 2개만 강조한다 (3단계 측정): `Cube001_0` = 테두리(재질 TreeBark), `Cube001_1` = 상판(LightWood).
     * 받침 뿌리(`NurbsPath`)·보라 나무(`NurbsPath001`)·주변 잎은 넣지 않는다.
     */
    meshNames: ["Cube001_0", "Cube001_1"],
    /** 상판(LightWood)의 XZ 범위 (월드, 3단계 측정). 상호작용 버튼은 이 범위에서 플레이어와 가장 가까운 점 위에 뜬다 */
    topBounds: { minX: -3.91, maxX: -2.67, minZ: -0.18, maxZ: 3.05 } satisfies Bounds2D,
  },
  /** 모닥불 (GLB `Mball.018` 불꽃 + `NurbsPath.008~014` 장작 + 돌 링). 상호작용은 4단계. 불꽃·조명은 CAMPFIRE_CONFIG */
  campfire: { x: 1.05, z: 1.1 },
} as const;

/**
 * 테이블 충돌 영역. 이동 충돌(COLLIDERS)과 상호작용 거리 판정(SPEC §8: 충돌 영역 표면까지 잰다)이 같은 값을 쓴다.
 * 테이블 상판(지면 위 0.6~1.38)이 캐릭터 머리 높이다. Chibi 머리 반지름(최대 0.70)이 충돌 원(0.4)보다
 * 0.30 크므로, 머리 높이 단면(x ≤ -2.56, z ≥ -0.82)에서 0.30 + 여유 0.02만큼 바깥으로 둔다 (동·북 면).
 * 남쪽(3.65)은 기존 값으로 여유가 충분하고, 서쪽(-4.6)은 이동 범위 밖이라 그대로 둔다. (DEV_LOG 테이블 머리 겹침)
 */
export const TABLE_COLLIDER: BoxCollider = {
  kind: "box",
  id: "table (Cube.001 + NurbsPath + NurbsPath.001)",
  minX: -4.6,
  maxX: -2.24,
  minZ: -1.14,
  maxZ: 3.65,
};

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
  TABLE_COLLIDER,
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

/**
 * 상호작용 판정 (SPEC §8). 거리는 플레이어 충돌 원 **표면**에서 대상 충돌 영역 **표면**까지 잰다.
 * 들어올 때보다 나갈 때 기준을 조금 넓게 둔다 (히스테리시스). 경계에서 버튼이 깜빡이거나,
 * 버튼을 누르려는 순간 미세한 회전 때문에 사라지는 것을 막는다.
 */
export const INTERACTION_CONFIG = {
  /** 이 거리 안이면 상호작용 시작 */
  reach: 0.7,
  /** 이미 상호작용 중이면 이 거리까지 유지 */
  keepReach: 0.9,
  /** 바라보는 방향과 대상 방향 사이 각도의 cos. 0.5 = 60° 안이면 시작 */
  facingCos: 0.5,
  /** 이미 상호작용 중이면 cos 0.26 ≈ 75°까지 유지 */
  keepFacingCos: 0.26,
  /** 버튼이 뜨는 높이 (상판 최고 높이 기준 위로) */
  promptHeightAboveTop: 0.55,
} as const;

/**
 * 탁자 선택 강조 (inverted hull). 테이블 메시와 같은 Geometry를 뒷면만 그리고 바깥으로 조금 키워
 * 실루엣 둘레에 얇은 테두리만 보이게 한다. 색은 은은한 종이색, 발광·후처리 없음.
 */
export const TABLE_HIGHLIGHT_CONFIG = {
  /** 테두리 두께 (월드 단위). 각 축 방향으로 이만큼 바깥에 껍데기가 생긴다 */
  thickness: 0.035,
  color: "#fff3d1",
} as const;

/**
 * 소원 작성 시점 (SPEC §4 WRITING). 테이블 동쪽(빈터 쪽) 위에서 상판 가운데를 내려다본다.
 * 3단계 측정: 이 위치에서 화면 광선 289개 중 테이블 71%, 바닥 22%, 받침 나무·뿌리 4%이고,
 * 카메라와 종이 사이를 가리는 메시는 없었다 (근거리 1.2 이내 충돌 0).
 */
export const WRITING_VIEW = {
  cameraPosition: [-2.81, 3.89, 1.42],
  lookAt: [-3.3, 2.05, 1.42],
  /** 3인칭 ↔ 작성 시점 전환 시간 */
  transitionSec: 0.6,
  /**
   * 테이블 위에 펼친 종이. 캔버스 위쪽이 카메라에서 먼 쪽(-x)을 향하고, 크기는 손글씨 Canvas와 같은 2:3이다.
   * 상판은 울퉁불퉁하고 약간 기울어 있다(광선 측정 1.92~2.05, 메시 최고점 2.08).
   * 2.05에서는 가까운 변 쪽 상판이 종이를 뚫고 보였다 (헤드리스 확인). 상판 최고점보다 조금 높게 둔다.
   */
  paper: { x: -3.3, y: 2.1, z: 1.42, width: 0.7, height: 1.05 },
} as const;

/**
 * 손에 든 천등 (SPEC §4 천등 부착). 손 본의 위치를 캐릭터 로컬 좌표로 읽고 아래 오프셋을 더한다.
 * Idle·Walk에서 손은 지면 위 0.33~0.43으로 낮아서, 손 아래로 매달면 천등이 땅에 박힌다.
 * 그래서 천등 가운데를 손보다 조금 바깥(-x, 캐릭터 오른쪽)·위에 두어 옆구리에 든 모양으로 만든다.
 */
export const HELD_LANTERN_CONFIG = {
  /** 천등 원본(1.2 × 1.8)이 캐릭터(높이 1.9)에 비해 크므로 줄인다. 0.26 → 약 0.31 × 0.47 */
  scale: 0.26,
  /** 손 본 위치 기준 오프셋 (캐릭터 로컬: +z = 정면, -x = 오른쪽) */
  handOffset: [-0.13, 0.06, 0.04],
  /** 손 본을 찾지 못했을 때 캐릭터 루트 기준 위치 (Idle 손 평균 위치 + handOffset) */
  fallbackPosition: [-0.45, 0.46, 0.09],
} as const;
