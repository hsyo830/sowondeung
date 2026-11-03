/** 손글씨 Canvas의 논리 좌표 (512 × 768, DPR과 무관) */
export interface Point {
  x: number;
  y: number;
}

/** 한 획 = 점 목록. SPEC §5: 손글씨의 단일 원본은 획 배열이다. */
export type Stroke = readonly Point[];

/**
 * 플레이어의 매 프레임 상태 (SPEC §4). ref에 담아 공유하고 React 상태로 만들지 않는다.
 * `PlayerController`만 쓰고, `CharacterModel`·`CameraRig`는 읽기만 한다.
 */
export interface PlayerState {
  x: number;
  /** 발이 닿는 바닥 높이 */
  y: number;
  z: number;
  /** 마지막 이동 방향을 바라보는 Y축 회전 (rad). 모델은 이 값으로 보간해서 돈다 */
  targetYaw: number;
  isMoving: boolean;
}
