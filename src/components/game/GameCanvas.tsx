"use client";

import { Suspense, useEffect, useRef, useState } from "react";

import { Canvas } from "@react-three/fiber";
import type { Group, Object3D } from "three";

import { GameHUD } from "@/components/game/GameHUD";
import { MemoryProbe } from "@/components/game/MemoryProbe";
import { InteractionSensor } from "@/components/interactions/InteractionSensor";
import { FlyingLanterns } from "@/components/lantern/FlyingLanterns";
import { HeldLantern, HeldLanternLight } from "@/components/lantern/HeldLantern";
import { launchHeldLantern } from "@/components/lantern/launchHeldLantern";
import { CameraRig } from "@/components/player/CameraRig";
import { CharacterModel } from "@/components/player/CharacterModel";
import { PlayerController } from "@/components/player/PlayerController";
import { CampfireFire } from "@/components/world/CampfireFire";
import { ColliderDebug } from "@/components/world/ColliderDebug";
import { ForestBackground } from "@/components/world/ForestBackground";
import { InteractionHighlight } from "@/components/world/InteractionHighlight";
import { SkyBackdrop } from "@/components/world/SkyBackdrop";
import { WritingPaper } from "@/components/writing/WritingPaper";
import type { Heightfield } from "@/lib/game/terrain";
import { ATMOSPHERE_CONFIG, CAMERA_CONFIG, LANDMARKS, PLAYER_CONFIG } from "@/lib/game/worldConfig";
import { useGameStore } from "@/stores/gameStore";
import type { PlayerState } from "@/types/game";

const IS_DEV = process.env.NODE_ENV === "development";
/** 개발 모드에서 충돌 영역 표시를 켜고 끄는 키 (` 키) */
const DEBUG_TOGGLE_CODE = "Backquote";
/** 바닥 격자가 만들어지기 전 임시 높이 (바닥 높이 0.60~0.83의 중간쯤) */
const INITIAL_PLAYER_Y = 0.7;

/**
 * 게임 3D 영역 + HUD. 플레이어 상태·바닥 격자·손 본은 매 프레임 읽고 쓰는 값이라 ref로 공유한다 (SPEC §7).
 * 천등 상태·모드처럼 이벤트로 바뀌는 값은 store(useGameStore)에 있다.
 * HTML 요소 ref 2개(버튼 위치, 작성 Canvas 위치)는 Canvas 안 컴포넌트가 화면 좌표를 직접 써 넣는 곳이다.
 */
export function GameCanvas() {
  const playerRef = useRef<PlayerState>({
    x: PLAYER_CONFIG.start.x,
    y: INITIAL_PLAYER_Y,
    z: PLAYER_CONFIG.start.z,
    // 시작할 때 -z(모닥불·테이블 쪽)를 바라본다
    targetYaw: Math.PI,
    isMoving: false,
  });
  const terrainRef = useRef<Heightfield | null>(null);
  const handBoneRef = useRef<Object3D | null>(null);
  // 손에 든 천등의 중심 그룹(발사 출발 위치·손 천등 빛 위치)과 점화 발광 세기. 매 프레임 값이라 ref로 공유한다
  const heldAnchorRef = useRef<Group>(null);
  const heldGlowRef = useRef(0);
  const memoryTextRef = useRef<HTMLSpanElement>(null);
  const promptAnchorRef = useRef<HTMLDivElement>(null);
  const paperOverlayRef = useRef<HTMLDivElement>(null);
  const [isColliderDebugVisible, setIsColliderDebugVisible] = useState(false);

  useEffect(() => {
    if (!IS_DEV) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== DEBUG_TOGGLE_CODE || event.repeat) return;
      setIsColliderDebugVisible((visible) => !visible);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{
          fov: CAMERA_CONFIG.fov,
          near: CAMERA_CONFIG.near,
          far: CAMERA_CONFIG.far,
          position: [
            PLAYER_CONFIG.start.x + CAMERA_CONFIG.offset[0],
            INITIAL_PLAYER_Y + CAMERA_CONFIG.offset[1],
            PLAYER_CONFIG.start.z + CAMERA_CONFIG.offset[2],
          ],
        }}
      >
        <color attach="background" args={[ATMOSPHERE_CONFIG.fogColor]} />
        {/* 바닥 연장 평면의 먼 끝을 안개색으로 녹이고, 그 너머 배경막 아래쪽도 같은 색이라 경계가 보이지 않는다 */}
        <fog
          attach="fog"
          args={[ATMOSPHERE_CONFIG.fogColor, ATMOSPHERE_CONFIG.fogNear, ATMOSPHERE_CONFIG.fogFar]}
        />
        {/* 초저녁 조명: 연보라 반구광 + 노을 쪽의 약한 분홍빛. 모닥불 pointLight는 CampfireFire,
            손 천등 pointLight는 HeldLanternLight. 라이트 수는 4개로 고정 (점화·작성 모드에서도 바뀌지 않음) */}
        <hemisphereLight
          args={[
            ATMOSPHERE_CONFIG.hemisphere.skyColor,
            ATMOSPHERE_CONFIG.hemisphere.groundColor,
            ATMOSPHERE_CONFIG.hemisphere.intensity,
          ]}
        />
        <directionalLight
          position={ATMOSPHERE_CONFIG.sunset.position}
          color={ATMOSPHERE_CONFIG.sunset.color}
          intensity={ATMOSPHERE_CONFIG.sunset.intensity}
        />
        <SkyBackdrop />
        <HeldLanternLight anchorRef={heldAnchorRef} glowRef={heldGlowRef} />

        <Suspense fallback={null}>
          <ForestBackground terrainRef={terrainRef} />
          <CampfireFire />
          <InteractionHighlight targetId="table" meshNames={LANDMARKS.table.meshNames} />
          <InteractionHighlight targetId="campfire" meshNames={LANDMARKS.campfire.meshNames} />
          {/* 발사 동작: Throw에서 손을 놓는 순간 손 천등의 실제 위치에서 분리하고, Praying까지 끝나면 탐색으로 돌아간다 */}
          <CharacterModel
            playerRef={playerRef}
            handBoneRef={handBoneRef}
            onThrowRelease={() => launchHeldLantern(playerRef.current, heldAnchorRef.current)}
            onLaunchAnimationEnd={() => useGameStore.getState().finishLaunch()}
          >
            <HeldLantern
              handBoneRef={handBoneRef}
              anchorRef={heldAnchorRef}
              glowRef={heldGlowRef}
            />
          </CharacterModel>
        </Suspense>
        {/* 발사 천등은 캐릭터와 독립된 인스턴스다. 새 천등을 받아도 그대로 날아간다 */}
        <FlyingLanterns />
        <PlayerController playerRef={playerRef} terrainRef={terrainRef} />
        <CameraRig playerRef={playerRef} />
        <InteractionSensor playerRef={playerRef} promptAnchorRef={promptAnchorRef} />
        <WritingPaper overlayRef={paperOverlayRef} />
        {isColliderDebugVisible && <ColliderDebug />}
        {IS_DEV && <MemoryProbe targetRef={memoryTextRef} />}
      </Canvas>

      <GameHUD
        playerRef={playerRef}
        promptAnchorRef={promptAnchorRef}
        paperOverlayRef={paperOverlayRef}
      />
      {IS_DEV && (
        // 개발 모드 누수 확인용 (IMPLEMENTATION_PLAN 4단계: 1단계 표시 재사용)
        <span
          ref={memoryTextRef}
          className="pointer-events-none absolute top-4 right-4 rounded bg-black/55 px-2 py-1 font-mono text-xs text-white/85"
        />
      )}
    </div>
  );
}
