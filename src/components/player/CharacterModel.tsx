"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";

import { useFrame, useLoader } from "@react-three/fiber";
import { AnimationMixer, LoopOnce } from "three";
import type { AnimationAction, Group, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { CHARACTER_CLIPS, CLIP_CROSS_FADE_SEC, LAUNCH_ANIMATION } from "@/constants/animation";
import { getNextLaunchPhase, shouldReleaseLantern } from "@/lib/game/launchAnimation";
import type { LaunchAnimationEvent, LaunchAnimationPhase } from "@/lib/game/launchAnimation";
import { dampAngle } from "@/lib/game/movement";
import { CHARACTER_CONFIG } from "@/lib/game/worldConfig";
import { useGameStore } from "@/stores/gameStore";
import type { PlayerState } from "@/types/game";

interface CharacterModelProps {
  playerRef: RefObject<PlayerState>;
  /** 천등을 들 손 본(CHARACTER_CONFIG.handBoneName)을 여기에 넣어 준다. 찾지 못하면 null */
  handBoneRef: RefObject<Object3D | null>;
  /** Throw에서 손을 놓는 순간 **한 번** 호출된다. 실제 천등 분리(store 갱신)는 받는 쪽이 한다 */
  onThrowRelease: () => void;
  /** Throw → Praying이 끝나 Idle로 돌아갈 때 **한 번** 호출된다 (탐색 모드 복귀) */
  onLaunchAnimationEnd: () => void;
  /**
   * 캐릭터를 따라다니는 것(손에 든 천등). 스케일 없는 바깥 그룹(위치·Y 회전)의 자식이 된다.
   * 캐릭터와 함께 숨겨지고, 모델 스케일(4 × 0.01)은 물려받지 않는다.
   */
  children?: ReactNode;
}

type LaunchEvents = Pick<CharacterModelProps, "onThrowRelease" | "onLaunchAnimationEnd">;

/** mixer 하나에 딸린 액션과 재생 상태. mixer와 수명이 같다 (effect가 다시 돌면 새로 만든다) */
interface CharacterAnimation {
  mixer: AnimationMixer;
  idle: AnimationAction | null;
  walk: AnimationAction | null;
  throwing: AnimationAction | null;
  praying: AnimationAction | null;
  /** 지금 Idle/Walk 중 Walk 쪽인가. 이동 여부가 **바뀔 때만** 전환한다 */
  isWalking: boolean;
  /** 발사 동작 단계 (NONE이면 Idle/Walk) */
  launchPhase: LaunchAnimationPhase;
  /** 이번 Throw에서 천등을 놓았는가 (발사 알림을 한 번만 보내는 가드) */
  hasReleased: boolean;
}

/**
 * from → to 크로스페이드. to는 처음부터 다시 재생한다. from이 없으면 to를 바로 재생한다.
 * LoopOnce로 끝나 멈춘(clampWhenFinished) 액션도 weight는 mixer 시간으로 줄어들므로 from이 될 수 있다.
 */
function crossFade(from: AnimationAction | null, to: AnimationAction | null, sec: number): void {
  if (!to || from === to) return;
  to.reset().play();
  from?.crossFadeTo(to, sec, false);
}

/** 놓는 시점을 지났으면 한 번만 알린다. 가드를 호출 **전에** 켠다 (CODING_CONVENTIONS §7 1회성 이벤트) */
function releaseLantern(animation: CharacterAnimation, clipTimeSec: number, events: LaunchEvents) {
  if (!shouldReleaseLantern(clipTimeSec, LAUNCH_ANIMATION.throwReleaseSec, animation.hasReleased)) {
    return;
  }
  animation.hasReleased = true;
  events.onThrowRelease();
}

/**
 * 발사 동작 단계를 한 칸 진행하고 클립을 전환한다. 순서는 getNextLaunchPhase(순수 함수)가 정하고,
 * 허용되지 않은 이벤트(재생 중 start, 중복 finished)는 아무것도 하지 않는다.
 * 단계를 먼저 바꾼 뒤 콜백을 부르므로 콜백 안에서 store가 바뀌어도 같은 전환이 두 번 일어나지 않는다.
 * 클립이 없으면 그 단계를 건너뛴다 (Throw가 없으면 바로 놓고, Praying이 없으면 바로 Idle) → 탐색 모드로 반드시 돌아간다.
 */
function advanceLaunch(
  animation: CharacterAnimation,
  event: LaunchAnimationEvent,
  events: LaunchEvents,
): void {
  const next = getNextLaunchPhase(animation.launchPhase, event);
  if (next === null) return;
  const { idle, walk, throwing, praying } = animation;
  const base = animation.isWalking ? walk : idle;

  if (event === "start") {
    animation.launchPhase = next;
    animation.hasReleased = false;
    if (!throwing) {
      advanceLaunch(animation, "throwFinished", events);
      return;
    }
    crossFade(base, throwing, LAUNCH_ANIMATION.enterFadeSec);
    // 앞쪽 정지 구간을 건너뛴다. crossFade의 reset() 뒤에 정해야 한다
    throwing.time = LAUNCH_ANIMATION.throwStartSec;
    return;
  }

  if (event === "throwFinished") {
    // Throw가 끝났으면 놓는 시점은 지났다. 큰 delta로 놓는 시점과 끝을 한 프레임에 지나도 천등은 한 번 놓는다
    releaseLantern(animation, Number.POSITIVE_INFINITY, events);
    animation.launchPhase = next;
    if (!praying) {
      advanceLaunch(animation, "prayFinished", events);
      return;
    }
    crossFade(throwing ?? base, praying, LAUNCH_ANIMATION.throwToPrayFadeSec);
    return;
  }

  // prayFinished: Idle로 돌아가고 탐색 모드 복귀를 알린다 (이동은 모드가 EXPLORE가 된 뒤부터 다시 된다)
  animation.launchPhase = next;
  crossFade(praying ?? throwing ?? base, idle, LAUNCH_ANIMATION.prayToIdleFadeSec);
  animation.isWalking = false;
  events.onLaunchAnimationEnd();
}

/**
 * 캐릭터 GLB와 애니메이션. playerRef를 **읽기만** 하고 위치를 정하지 않는다 (SPEC §4 로직 분리).
 * 충돌을 모른다. 모델을 바꿔도 PlayerController와 충돌 코드는 바뀌지 않는다.
 * 발사 동작: store 모드가 LAUNCHING이 되면 Throw → Praying → Idle을 재생하고, 손을 놓는 순간과 끝을 콜백으로 알린다.
 * 천등 상태·모드는 직접 바꾸지 않는다 (애니메이션과 게임 상태의 책임 분리).
 */
export function CharacterModel({
  playerRef,
  handBoneRef,
  onThrowRelease,
  onLaunchAnimationEnd,
  children,
}: CharacterModelProps) {
  const gltf = useLoader(GLTFLoader, CHARACTER_CONFIG.url);
  // SPEC §4 WRITING: 작성 시점에서는 캐릭터와 손에 든 천등을 숨긴다
  const isHidden = useGameStore((state) => state.mode === "WRITING");
  const groupRef = useRef<Group>(null);
  const animationRef = useRef<CharacterAnimation | null>(null);
  // 콜백은 렌더마다 새 함수일 수 있다. mixer 이벤트 리스너를 다시 달지 않도록 최신 값을 ref로 읽는다
  const eventsRef = useRef<LaunchEvents>({ onThrowRelease, onLaunchAnimationEnd });

  useLayoutEffect(() => {
    eventsRef.current = { onThrowRelease, onLaunchAnimationEnd };
  }, [onThrowRelease, onLaunchAnimationEnd]);

  // AnimationMixer는 new로 만드는 객체라 effect 안에서 만들고 같은 effect에서 정리한다 (CODING_CONVENTIONS §7)
  useLayoutEffect(() => {
    const scene = gltf.scene;
    const mixer = new AnimationMixer(scene);
    const findClip = (name: string) => gltf.animations.find((clip) => clip.name === name);
    const idleClip = findClip(CHARACTER_CLIPS.idle);
    const walkClip = findClip(CHARACTER_CLIPS.walk);
    const throwClip = findClip(CHARACTER_CLIPS.throw);
    const prayClip = findClip(CHARACTER_CLIPS.pray);
    if (!idleClip || !walkClip || !throwClip || !prayClip) {
      // 현재 character.glb에는 네 클립이 모두 있다 (DEV_LOG 'Throw·Praying 연동'). 에셋을 바꿔 빠지면
      // Idle/Walk는 정지 자세로, 발사 동작은 그 클립을 건너뛰고 표시한다.
      console.warn(
        `[CharacterModel] 클립이 일부 없다. 필요: [${Object.values(CHARACTER_CLIPS).join(", ")}], ` +
          `GLB 클립: [${gltf.animations.map((clip) => clip.name).join(", ")}]`,
      );
    }
    const idle = idleClip ? mixer.clipAction(idleClip) : null;
    const walk = walkClip ? mixer.clipAction(walkClip) : null;
    const throwing = throwClip ? mixer.clipAction(throwClip) : null;
    const praying = prayClip ? mixer.clipAction(prayClip) : null;
    // Throw·Praying은 한 번만 재생하고 마지막 자세에 멈춘다. 멈춘 자세에서 다음 클립으로 크로스페이드한다
    for (const action of [throwing, praying]) {
      if (!action) continue;
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    if (throwing) throwing.timeScale = LAUNCH_ANIMATION.throwTimeScale;
    idle?.play();

    const animation: CharacterAnimation = {
      mixer,
      idle,
      walk,
      throwing,
      praying,
      isWalking: false,
      launchPhase: "NONE",
      hasReleased: false,
    };
    // LoopOnce 액션이 끝나면 mixer.update() 안에서 한 번 발생한다. 리스너는 mixer마다 하나이고 정리 함수에서 뗀다
    // (반복 발사해도 누적되지 않는다). 순서 판정은 advanceLaunch가 하므로 다른 액션의 finished는 무시된다.
    function handleFinished(event: { action: AnimationAction }) {
      if (event.action === throwing) advanceLaunch(animation, "throwFinished", eventsRef.current);
      else if (event.action === praying)
        advanceLaunch(animation, "prayFinished", eventsRef.current);
    }
    mixer.addEventListener("finished", handleFinished);
    animationRef.current = animation;

    return () => {
      mixer.removeEventListener("finished", handleFinished);
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
      animationRef.current = null;
    };
  }, [gltf]);

  // 손 본은 읽기만 한다 (천등을 본의 자식으로 붙이지 않는다. HeldLantern이 위치만 복사한다)
  useLayoutEffect(() => {
    const hand = gltf.scene.getObjectByName(CHARACTER_CONFIG.handBoneName) ?? null;
    if (!hand) {
      console.warn(
        `[CharacterModel] 손 본 '${CHARACTER_CONFIG.handBoneName}'을 찾지 못해 천등을 캐릭터 기준 고정 위치에 표시한다.`,
      );
    }
    handBoneRef.current = hand;
    return () => {
      handBoneRef.current = null;
    };
  }, [gltf, handBoneRef]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const player = playerRef.current;

    group.position.set(player.x, player.y, player.z);
    group.rotation.y = dampAngle(
      group.rotation.y,
      player.targetYaw,
      CHARACTER_CONFIG.turnRate,
      delta,
    );

    const animation = animationRef.current;
    if (!animation) return;
    const { mode } = useGameStore.getState();
    const events = eventsRef.current;

    // 발사 모드가 되면 Throw를 시작한다. 매 프레임 보내도 NONE일 때 한 번만 시작된다 (store는 읽기만 한다)
    if (mode === "LAUNCHING") advanceLaunch(animation, "start", events);

    // Idle/Walk는 발사 동작이 아닐 때만, 이동 여부가 **바뀔 때만** 전환한다. 매 프레임 play()하면 처음 프레임으로 계속 되돌아간다.
    if (animation.launchPhase === "NONE" && player.isMoving !== animation.isWalking) {
      const from = animation.isWalking ? animation.walk : animation.idle;
      const to = animation.isWalking ? animation.idle : animation.walk;
      animation.isWalking = player.isMoving;
      if (from && to) {
        to.reset().play();
        from.crossFadeTo(to, CLIP_CROSS_FADE_SEC, false);
      }
    }
    // 숨겨진 동안(작성 모드)에는 보이지 않는 자세를 계산하지 않는다 (SPEC §4)
    if (mode === "WRITING") return;
    // LoopOnce 액션이 끝나면 이 안에서 finished → advanceLaunch가 실행된다
    animation.mixer.update(delta);

    // 이번 프레임 Throw 시간이 놓는 시점을 지났으면 천등을 놓는다
    if (animation.launchPhase === "THROW" && animation.throwing) {
      releaseLantern(animation, animation.throwing.time, events);
    }
  });

  // 위치는 렌더 중에 ref를 읽지 않고 useFrame에서 쓴다. R3F는 매 프레임 렌더 직전에 useFrame을 실행하므로
  // 첫 화면부터 올바른 위치에 그려진다.
  return (
    <group ref={groupRef} visible={!isHidden}>
      <group scale={CHARACTER_CONFIG.scale}>
        {/* 씬에 캐릭터는 하나뿐이라 복제(SkeletonUtils) 없이 캐시된 씬을 그대로 쓴다 */}
        <primitive object={gltf.scene} />
      </group>
      {children}
    </group>
  );
}
