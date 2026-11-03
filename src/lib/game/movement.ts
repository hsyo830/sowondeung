// 키 입력 → 이동 방향, 이동 방향 → 바라보는 각도, 프레임 독립 보간. 모두 순수 함수다.

/** SPEC §4 [결정] 이동 방향은 월드 기준: W = -z, S = +z, A = -x, D = +x */
const KEY_DIRECTIONS: Readonly<Record<string, readonly [number, number]>> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

/** 이동키인가 (KeyboardEvent.code 기준. 키보드 배열·한글 입력 상태와 무관하다) */
export function isMovementKey(code: string): boolean {
  return code in KEY_DIRECTIONS;
}

/**
 * 눌린 키 목록 → 길이 1(또는 0)의 이동 방향.
 * 대각선도 길이를 1로 맞춰서 더 빨라지지 않게 한다. 반대 방향 키를 함께 누르면 그 축은 상쇄된다.
 */
export function getMoveDirection(pressedCodes: ReadonlySet<string>): { x: number; z: number } {
  let x = 0;
  let z = 0;
  for (const code of pressedCodes) {
    const direction = KEY_DIRECTIONS[code];
    if (!direction) continue;
    x += direction[0];
    z += direction[1];
  }
  // 같은 방향의 키 두 개(W + ↑)는 한 번만 센다
  x = Math.sign(x);
  z = Math.sign(z);
  const length = Math.hypot(x, z);
  if (length === 0) return { x: 0, z: 0 };
  return { x: x / length, z: z / length };
}

/**
 * 이동 방향을 바라보는 Y축 회전 각도 (rad).
 * 캐릭터 모델은 회전 0일 때 +z를 바라본다 (character.glb 확인 결과).
 */
export function getYawFromDirection(x: number, z: number): number {
  return Math.atan2(x, z);
}

/** 지수 감쇠 보간 비율. 프레임레이트가 달라도 같은 시간에 같은 만큼 따라간다 */
export function getDampFactor(rate: number, deltaSec: number): number {
  return 1 - Math.exp(-rate * deltaSec);
}

/** current에서 target으로 회전을 보간한다. -π ~ π 경계를 넘을 때 먼 쪽으로 돌지 않게 가까운 방향을 고른다 */
export function dampAngle(current: number, target: number, rate: number, deltaSec: number): number {
  const fullTurn = Math.PI * 2;
  let diff = (target - current) % fullTurn;
  if (diff > Math.PI) diff -= fullTurn;
  if (diff < -Math.PI) diff += fullTurn;
  return current + diff * getDampFactor(rate, deltaSec);
}
