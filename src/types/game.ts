import type { LanternColorId } from "@/constants/lanternColors";

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

/** 손에 든 천등의 상태 (SPEC §7). NONE → BLANK → WRITTEN → LIT → (발사) → NONE */
export type LanternStatus = "NONE" | "BLANK" | "WRITTEN" | "LIT";

/** 카메라·UI 모드 (SPEC §7). 천등 상태와는 별도로 관리한다 */
export type GameMode = "EXPLORE" | "COLOR_SELECT" | "WRITING";

/** 손에 든 천등. status가 NONE이면 다른 필드는 의미가 없다 (SPEC §7) */
export interface HeldLantern {
  id: string;
  colorId: LanternColorId;
  /** 확정된 손글씨 (작성 완료 시에만 바뀐다). 작성 중 초안은 WritingOverlay의 로컬 상태다 */
  strokes: readonly Stroke[];
  status: LanternStatus;
}

/** 상호작용 대상 (SPEC §8). 3단계에서는 table만 연결한다. campfire는 4단계 점화에서 연결한다 */
export type InteractionId = "table" | "campfire";

/** 상호작용 버튼 하나가 실행하는 액션 */
export type InteractionActionId = "receiveLantern" | "writeWish" | "reselectColor" | "editWish";
