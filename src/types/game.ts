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

/** 상호작용 대상 (SPEC §8). 테이블(받기·작성)과 모닥불(점화, 4단계) */
export type InteractionId = "table" | "campfire";

/** 상호작용 버튼 하나가 실행하는 액션 */
export type InteractionActionId =
  "receiveLantern" | "writeWish" | "reselectColor" | "editWish" | "lightLantern";

/** XZ 평면의 방향·거리 (x, z) */
export type Vec2 = readonly [number, number];
/** 월드 좌표 (x, y, z) */
export type Vec3 = readonly [number, number, number];

/**
 * 발사 순간의 출발 정보 (SPEC §5 발사 연출). 손에 든 천등의 실제 월드 위치·방향에서 계산한다.
 * store에는 Three 객체가 아니라 숫자 튜플로 둔다.
 */
export interface LaunchPose {
  /** 출발 위치 (손에 든 천등의 중심. 바닥 아래·몸 안이면 보정된 값) */
  spawn: Vec3;
  /** 출발 시 Y축 회전 (rad). 손에 든 천등과 같은 방향에서 시작해 회전이 튀지 않는다 */
  yaw: number;
  /** 상승 초반에 캐릭터 머리를 피해 바깥으로 흘러가는 수평 이동량 (x, z) */
  drift: Vec2;
}

/**
 * 발사된 천등 하나 (SPEC §7 flying). 발사 순간의 색·획을 그대로 들고 있다.
 * 획 배열은 손에 들던 천등과 **같은 참조**를 쓰고, 텍스처는 FlyingLantern이 새로 만든다 (SPEC §5 소유권).
 * 목록 순서가 발사 순서다 (앞이 가장 오래된 것).
 */
export interface FlyingLanternData extends LaunchPose {
  id: string;
  colorId: LanternColorId;
  strokes: readonly Stroke[];
}
