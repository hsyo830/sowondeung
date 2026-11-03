"use client";

import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

import { useFrame, useLoader } from "@react-three/fiber";
import { AnimationMixer } from "three";
import type { AnimationAction, Group } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { CHARACTER_CLIPS, CLIP_CROSS_FADE_SEC } from "@/constants/animation";
import { dampAngle } from "@/lib/game/movement";
import { CHARACTER_CONFIG } from "@/lib/game/worldConfig";
import type { PlayerState } from "@/types/game";

interface CharacterModelProps {
  playerRef: RefObject<PlayerState>;
}

interface CharacterAnimation {
  mixer: AnimationMixer;
  idle: AnimationAction | null;
  walk: AnimationAction | null;
}

/**
 * 캐릭터 GLB와 애니메이션. playerRef를 **읽기만** 하고 위치를 정하지 않는다 (SPEC §4 로직 분리).
 * 충돌을 모른다. 모델을 바꿔도 PlayerController와 충돌 코드는 바뀌지 않는다.
 */
export function CharacterModel({ playerRef }: CharacterModelProps) {
  const gltf = useLoader(GLTFLoader, CHARACTER_CONFIG.url);
  const groupRef = useRef<Group>(null);
  const animationRef = useRef<CharacterAnimation | null>(null);
  const wasMovingRef = useRef(false);

  // AnimationMixer는 new로 만드는 객체라 effect 안에서 만들고 같은 effect에서 정리한다 (CODING_CONVENTIONS §7)
  useLayoutEffect(() => {
    const scene = gltf.scene;
    const mixer = new AnimationMixer(scene);
    const idleClip = gltf.animations.find((clip) => clip.name === CHARACTER_CLIPS.idle);
    const walkClip = gltf.animations.find((clip) => clip.name === CHARACTER_CLIPS.walk);
    if (!idleClip || !walkClip) {
      // 현재 character.glb에는 두 클립이 있다 (DEV_LOG 2026-11-03 애니메이션 통합). 에셋을 바꿔 클립이 빠지면 정지 자세로 표시한다.
      console.warn(
        `[CharacterModel] '${CHARACTER_CLIPS.idle}'·'${CHARACTER_CLIPS.walk}' 클립이 없어 정지 자세로 표시한다. ` +
          `GLB 클립: [${gltf.animations.map((clip) => clip.name).join(", ")}]`,
      );
    }
    const idle = idleClip ? mixer.clipAction(idleClip) : null;
    const walk = walkClip ? mixer.clipAction(walkClip) : null;
    idle?.play();
    animationRef.current = { mixer, idle, walk };
    wasMovingRef.current = false;

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
      animationRef.current = null;
    };
  }, [gltf]);

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
    // 클립은 이동 여부가 **바뀔 때만** 전환한다. 매 프레임 play()하면 처음 프레임으로 계속 되돌아간다.
    if (player.isMoving !== wasMovingRef.current) {
      wasMovingRef.current = player.isMoving;
      const from = player.isMoving ? animation.idle : animation.walk;
      const to = player.isMoving ? animation.walk : animation.idle;
      if (from && to) {
        to.reset().play();
        from.crossFadeTo(to, CLIP_CROSS_FADE_SEC, false);
      }
    }
    animation.mixer.update(delta);
  });

  // 위치는 렌더 중에 ref를 읽지 않고 useFrame에서 쓴다. R3F는 매 프레임 렌더 직전에 useFrame을 실행하므로
  // 첫 화면부터 올바른 위치에 그려진다.
  return (
    <group ref={groupRef}>
      <group scale={CHARACTER_CONFIG.scale}>
        {/* 씬에 캐릭터는 하나뿐이라 복제(SkeletonUtils) 없이 캐시된 씬을 그대로 쓴다 */}
        <primitive object={gltf.scene} />
      </group>
    </group>
  );
}
