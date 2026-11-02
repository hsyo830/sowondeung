import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  Float32BufferAttribute,
  PlaneGeometry,
  SphereGeometry,
} from "three";

/**
 * 천등 크기 (SPEC §5). 앞면 1.2 × 1.8 = 2:3 = 손글씨 Canvas 512 × 768.
 * 비율이 다르면 텍스처가 늘어나므로 앞면 크기는 이 값 하나로만 정한다.
 * 깊이 = 가로 → 위에서 보면 정사각형 단면 (2026-11-03 변경, 기존 0.7).
 */
export const LANTERN_SIZE = {
  width: 1.2,
  height: 1.8,
  depth: 1.2,
  frameThickness: 0.04,
  /** 몸통 위 어깨(사다리꼴 상단)의 높이 */
  shoulderHeight: 0.28,
  /** 어깨 윗변 / 아랫변 비율. 가로 1.2 → 0.9. 깊이도 같은 비율로 좁힌다 */
  shoulderTopRatio: 0.75,
} as const;

const { width, height, depth, frameThickness, shoulderHeight, shoulderTopRatio } = LANTERN_SIZE;

/**
 * 어깨: 아래(y = 0)는 몸통 윗면과 같은 크기, 위(y = h)로 갈수록 좁아지는 사각뿔대.
 * 네 사다리꼴 옆면 + 윗뚜껑, 아랫면은 몸통과 맞닿으므로 열어 둔다.
 * 꼭짓점을 공유하지 않아 computeVertexNormals가 면마다 평평한 법선을 만든다
 * (CylinderGeometry 4분할은 꼭짓점을 공유해서 모서리 음영이 둥글게 뭉개진다).
 * 글씨를 붙이지 않으므로 UV는 만들지 않는다.
 */
function createShoulderGeometry(
  bottomWidth: number,
  bottomDepth: number,
  topWidth: number,
  topDepth: number,
  h: number,
): BufferGeometry {
  const bx = bottomWidth / 2;
  const bz = bottomDepth / 2;
  const tx = topWidth / 2;
  const tz = topDepth / 2;

  // 아래 b0~b3, 위 t0~t3: (-x,-z) (+x,-z) (+x,+z) (-x,+z)
  const b0 = [-bx, 0, -bz];
  const b1 = [bx, 0, -bz];
  const b2 = [bx, 0, bz];
  const b3 = [-bx, 0, bz];
  const t0 = [-tx, h, -tz];
  const t1 = [tx, h, -tz];
  const t2 = [tx, h, tz];
  const t3 = [-tx, h, tz];

  // 각 사각형은 바깥에서 봤을 때 반시계 방향 (FrontSide가 바깥을 향하도록)
  const quads = [
    [b3, b2, t2, t3], // 앞 (+z)
    [b1, b0, t0, t1], // 뒤 (-z)
    [b2, b1, t1, t2], // 오른쪽 (+x)
    [b0, b3, t3, t0], // 왼쪽 (-x)
    [t3, t2, t1, t0], // 윗뚜껑 (+y)
  ];

  const positions = quads.flatMap(([a, b, c, d]) => [...a, ...b, ...c, ...a, ...c, ...d]);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * 모든 천등 인스턴스가 공유하는 Geometry (SPEC §5 소유권: 앱 전체 소유, 해제하지 않음).
 * 반드시 `<mesh geometry={LANTERN_GEOMETRY.face}>`처럼 prop으로만 넘긴다.
 * JSX 자식으로 선언하면 R3F가 언마운트 때 dispose해서 다른 인스턴스까지 망가진다.
 */
export const LANTERN_GEOMETRY = {
  /** 앞·뒷면 */
  face: new PlaneGeometry(width, height),
  /** 좌·우면 */
  side: new PlaneGeometry(depth, height),
  /** 몸통 위 어깨. 몸통 윗면을 덮으므로 별도 윗면 평면은 두지 않는다 */
  shoulder: createShoulderGeometry(
    width,
    depth,
    width * shoulderTopRatio,
    depth * shoulderTopRatio,
    shoulderHeight,
  ),
  /** 세로 테두리 4개 */
  frameVertical: new BoxGeometry(frameThickness, height, frameThickness),
  /** 가로(x) 테두리 */
  frameAlongX: new BoxGeometry(width, frameThickness, frameThickness),
  /** 깊이(z) 테두리 */
  frameAlongZ: new BoxGeometry(frameThickness, frameThickness, depth),
  /** 하단 불꽃 */
  flame: new ConeGeometry(0.08, 0.24, 12),
  /** 불꽃 아래 연료 덩어리 (발광 요소) */
  fuel: new SphereGeometry(0.07, 12, 8),
} as const satisfies Record<string, BufferGeometry>;

// 개발 모드 검증 (IMPLEMENTATION_PLAN 1단계 #6):
// Three.js는 dispose된 Geometry를 다음 렌더에서 조용히 다시 업로드하므로 화면만 봐서는 알 수 없다.
// 공유 Geometry가 한 번이라도 dispose되면 경고를 남긴다.
if (process.env.NODE_ENV !== "production") {
  for (const [name, geometry] of Object.entries(LANTERN_GEOMETRY)) {
    geometry.addEventListener("dispose", () => {
      console.warn(
        `[lanternGeometry] 공유 Geometry "${name}"가 dispose되었습니다. ` +
          "geometry를 prop이 아닌 방식으로 넘겼는지 확인하세요.",
      );
    });
  }
}
