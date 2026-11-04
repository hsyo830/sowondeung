// 최초 로딩 화면을 걷어도 되는지 판정하는 순수 함수. GameReadyProbe가 매 프레임 넣어 호출한다.
//
// 전제 (구조로 보장되는 것):
// - GameReadyProbe는 숲 배경·캐릭터와 같은 Suspense 안에 있다. Suspense는 두 GLB(useLoader)가 **모두** 끝나야
//   자식을 한 번에 커밋하므로, Probe가 마운트됐다면 GLB 로딩은 끝났다.
// - 바닥 높이 격자(ForestBackground)·AnimationMixer와 손 본(CharacterModel)은 같은 커밋의 useLayoutEffect에서 만든다.
//   R3F 프레임은 커밋이 끝난 뒤에 돌기 때문에, Probe의 첫 프레임 콜백 시점에는 이 초기화가 모두 실행된 뒤다.
// 여기서 확인하는 것은 그 결과(바닥 격자가 실제로 만들어졌는가), 렌더링(한 번이라도 그렸는가),
// 투과 렌더링 사전 준비(transmissionWarmup)를 시도했는가이다.

export type GameReadiness = "pending" | "ready" | "failed";

export interface GameReadinessInput {
  /**
   * GLB가 씬에 들어간 뒤 **이미 끝난** 렌더 횟수. 0이면 이번 프레임이 첫 렌더다 (useFrame은 렌더 직전에 실행된다).
   * 첫 렌더에서 재질 셰이더가 컴파일되므로, 1 이상이어야 화면에 숲·캐릭터가 실제로 그려진 상태다.
   */
  renderedFrames: number;
  /** 이동·충돌 판정에 쓰는 바닥 높이 격자가 있는가 */
  hasTerrain: boolean;
  /**
   * 투과 렌더링 사전 준비(나뭇가지 등불 Glass)를 한 번 시도했는가. 성공 여부는 묻지 않는다:
   * 실패해도 게임은 동작하고(첫 발사 때 three가 준비한다) 기다려도 결과가 바뀌지 않으므로 로딩을 막지 않는다.
   */
  hasAttemptedWarmup: boolean;
}

/**
 * - 아직 한 번도 그리지 않았거나 투과 사전 준비를 시도하지 않았으면 pending (가려진 채로 첫 렌더·셰이더 컴파일을 끝낸다)
 * - 그린 뒤 바닥 격자가 있으면 ready
 * - 그린 뒤에도 바닥 격자가 없으면 failed: 격자는 마운트 커밋에서 한 번만 만든다. 이 시점에 없으면 바닥 메시를
 *   찾지 못한 것이고 기다려도 생기지 않는다 (시간 초과가 아니라 초기화 결과로 판정한다).
 */
export function getGameReadiness({
  renderedFrames,
  hasTerrain,
  hasAttemptedWarmup,
}: GameReadinessInput): GameReadiness {
  if (renderedFrames < 1 || !hasAttemptedWarmup) return "pending";
  return hasTerrain ? "ready" : "failed";
}
