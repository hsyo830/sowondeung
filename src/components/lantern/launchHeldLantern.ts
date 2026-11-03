// 손에 든 천등을 실제로 떼어 날리는 런타임 연결부. Throw에서 손을 놓는 순간 GameCanvas가 CharacterModel의 알림을 받아 부른다.
// (4단계에서는 LaunchHoldButton이 홀드 완료 즉시 불렀다. 계산은 그대로이고 호출 시점만 바뀌었다)

import { Vector3 } from "three";
import type { Group } from "three";

import { getLaunchPose } from "@/lib/game/flight";
import { FLYING_LANTERN_CONFIG } from "@/lib/game/worldConfig";
import { useGameStore } from "@/stores/gameStore";
import type { PlayerState } from "@/types/game";

// 발사 순간 한 번 쓰는 임시 벡터 (이벤트마다 새로 만들지 않는다)
const anchorWorld = new Vector3();

/**
 * 손에 든 천등의 **지금 이 순간** 월드 위치·방향에서 발사한다.
 * 손 천등 그룹은 캐릭터 바깥 그룹(위치·Y 회전)의 자식이라, 월드 행렬의 z축 열(sin yaw, ·, cos yaw)에서 Y 회전을 얻는다.
 * 그룹을 찾지 못하면(이론상 없음) 캐릭터 위치에서 계산하고, getLaunchPose가 몸 바깥·바닥 위로 보정한다.
 * store의 launchLantern이 LAUNCHING + LIT일 때만 성공하므로 두 번 불려도 천등은 하나만 생긴다.
 */
export function launchHeldLantern(player: PlayerState, anchor: Group | null): boolean {
  let yaw = player.targetYaw;
  if (anchor) {
    anchor.updateWorldMatrix(true, false);
    anchorWorld.setFromMatrixPosition(anchor.matrixWorld);
    const e = anchor.matrixWorld.elements;
    yaw = Math.atan2(e[8], e[10]);
  } else {
    anchorWorld.set(player.x, player.y, player.z);
  }
  const pose = getLaunchPose(anchorWorld, player, yaw, FLYING_LANTERN_CONFIG.launch);
  return useGameStore.getState().launchLantern(pose);
}
