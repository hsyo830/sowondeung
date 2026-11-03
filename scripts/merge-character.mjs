// 캐릭터 애니메이션 통합 스크립트 (앱 번들에 포함되지 않는 개발용 도구)
//
// Mixamo FBX의 모델 + 클립 4개(Idle·Walk·Throw·Praying)를 GLB 하나로 합친다.
// - 모델(메시·스켈레톤)은 2단계에서 쓴 mixamo/Idle.fbx 그대로다 (외형·바인드 포즈 유지). 클립만 updated/에서 가져온다.
// - Mixamo FBX에는 재질 색이 없으므로 원본 character.glb의 재질 객체를 이름으로 옮긴다.
// - 루트 이동: Idle·Walk·Praying은 In Place여야 한다(아니면 실패). Throw는 앞으로 디디는 루트 이동이 있어
//   루트 XZ를 첫 프레임 값으로 고정한다 (위치는 PlayerController만 바꾼다, SPEC §4).
// Blender 없이 설치된 three의 FBXLoader·GLTFLoader·GLTFExporter만 쓴다 (추가 패키지 없음).
//
// 사용법 (저장소 루트에서):
//   node scripts/merge-character.mjs            # 통합 + 검증 → assets-source/character/character.merged.glb (public은 건드리지 않음)
//   node scripts/merge-character.mjs --replace  # 검증을 모두 통과하면 현재 public 파일을 백업한 뒤 교체
//
// 입력 (Git에 넣지 않는 로컬 파일, .gitignore의 /assets-source/):
//   assets-source/character/mixamo/Idle.fbx                 ← 모델 (2단계와 같은 파일)
//   assets-source/character/mixamo/updated/Idle.fbx         ← Idle (팔 간격 개선)
//   assets-source/character/mixamo/updated/Walking.fbx      ← Walk (In Place, 팔 간격 개선)
//   assets-source/character/mixamo/updated/Throw.fbx        ← Throw (천등 날리기)
//   assets-source/character/mixamo/updated/Praying.fbx      ← Praying (발사 후 기도)
//   assets-source/character/character.original.glb          ← Sketchfab 원본 (재질·크기 기준)

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Box3, Group, Scene } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE_DIR = path.join(ROOT, "assets-source", "character");
const CLIP_DIR = path.join(SOURCE_DIR, "mixamo", "updated");
const PATHS = {
  modelFbx: path.join(SOURCE_DIR, "mixamo", "Idle.fbx"),
  original: path.join(SOURCE_DIR, "character.original.glb"),
  draft: path.join(SOURCE_DIR, "character.merged.glb"),
  backupDir: path.join(SOURCE_DIR, "backups"),
  target: path.join(ROOT, "public", "models", "character.glb"),
};

/**
 * 넣을 클립. name은 앱 코드(constants/animation.ts)의 CHARACTER_CLIPS와 같아야 한다.
 * rootMotion — "in-place": 처음·끝 루트 위치가 같아야 한다 (검사만, 수정하지 않음)
 *              "lock-xz": 루트 XZ를 첫 프레임 값으로 고정한다 (Y는 유지: 웅크림·디딤의 높이 변화)
 */
const CLIPS = [
  { name: "Idle", file: path.join(CLIP_DIR, "Idle.fbx"), rootMotion: "in-place" },
  { name: "Walk", file: path.join(CLIP_DIR, "Walking.fbx"), rootMotion: "in-place" },
  { name: "Throw", file: path.join(CLIP_DIR, "Throw.fbx"), rootMotion: "lock-xz" },
  { name: "Praying", file: path.join(CLIP_DIR, "Praying.fbx"), rootMotion: "in-place" },
];
/** 3단계 천등 부착에 쓰는 손 본 (PROJECT_SPEC §4) */
const HAND_BONE = "RightHand";
/** Mixamo FBX는 cm 단위다. 원본 GLB(높이 0.475)와 맞춘다 */
const UNIT_SCALE = 0.01;
const BOX_TOLERANCE = 0.002;
/** 루프 처음과 끝의 루트 위치 차이 허용값 (FBX 단위). 이보다 크면 루트 모션 = In Place가 아님 */
const IN_PLACE_TOLERANCE = 0.05;

// ── Node 호환: GLTFExporter가 쓰는 브라우저 FileReader의 최소 대체. 이 스크립트 안에서만 쓴다.
class NodeFileReader {
  result = null;
  onloadend = null;
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => this.finish(buffer));
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      const type = blob.type || "application/octet-stream";
      this.finish(`data:${type};base64,${Buffer.from(buffer).toString("base64")}`);
    });
  }
  finish(result) {
    this.result = result;
    this.onloadend?.();
  }
}
globalThis.FileReader ??= NodeFileReader;

function readArrayBuffer(filePath) {
  const buffer = readFileSync(filePath);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function loadFbx(filePath) {
  return new FBXLoader().parse(readArrayBuffer(filePath), "");
}

function loadGlb(arrayBuffer) {
  return new Promise((resolve, reject) => new GLTFLoader().parse(arrayBuffer, "", resolve, reject));
}

/** 트랙이 있는 첫 클립 (Mixamo FBX에는 빈 'Take 001'이 함께 들어 있다) */
function takeClip(fbx, name) {
  const clip = fbx.animations.find((candidate) => candidate.tracks.length > 0);
  if (!clip) throw new Error(`${name}: 트랙이 있는 클립이 없다`);
  clip.name = name;
  return clip;
}

function getRootTrack(clip) {
  return clip.tracks.find((candidate) => candidate.name.endsWith(".position"));
}

/** 루트 위치 트랙의 처음·끝 차이 (In Place 판정) */
function getRootDrift(clip) {
  const track = getRootTrack(clip);
  if (!track) return 0;
  const values = track.values;
  const last = values.length - 3;
  return Math.hypot(
    values[last] - values[0],
    values[last + 1] - values[1],
    values[last + 2] - values[2],
  );
}

/** 루트 위치 트랙의 수평 최대 이동 범위 (첫 프레임 기준) */
function getRootHorizontalRange(clip) {
  const track = getRootTrack(clip);
  if (!track) return 0;
  const values = track.values;
  let range = 0;
  for (let i = 0; i < values.length; i += 3) {
    range = Math.max(range, Math.hypot(values[i] - values[0], values[i + 2] - values[2]));
  }
  return range;
}

/** 루트 XZ를 첫 프레임 값으로 고정한다 (트랙 값을 직접 바꾼다) */
function lockRootHorizontal(clip) {
  const track = getRootTrack(clip);
  if (!track) return;
  const values = track.values;
  for (let i = 3; i < values.length; i += 3) {
    values[i] = values[0];
    values[i + 2] = values[2];
  }
}

/** 스킨 메시의 본 이름 순서와 바인드 역행렬 (모델과 클립 FBX의 스켈레톤이 같은지 비교) */
function getSkinSignature(fbx) {
  let mesh = null;
  fbx.traverse((object) => {
    if (!mesh && object.isSkinnedMesh) mesh = object;
  });
  if (!mesh) return null;
  return {
    names: mesh.skeleton.bones.map((bone) => bone.name),
    inverses: mesh.skeleton.boneInverses.map((matrix) => matrix.elements),
  };
}

function isSameSkin(a, b) {
  if (!a || !b || a.names.join("|") !== b.names.join("|")) return false;
  return a.inverses.every((elements, i) =>
    elements.every((value, k) => Math.abs(value - b.inverses[i][k]) < 1e-6),
  );
}

function describeMeshes(scene) {
  const meshes = {};
  const box = new Box3();
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (!object.isSkinnedMesh) return;
    object.geometry.computeBoundingBox();
    box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
    const material = object.material;
    meshes[material.name] = {
      vertices: object.geometry.attributes.position.count,
      color: material.color.getHexString(),
      roughness: material.roughness,
      metalness: material.metalness,
      side: material.side,
    };
  });
  return { meshes, box };
}

function check(failures, condition, message) {
  console.log(`  ${condition ? "✓" : "✗"} ${message}`);
  if (!condition) failures.push(message);
}

async function main() {
  const shouldReplace = process.argv.includes("--replace");

  for (const filePath of [PATHS.modelFbx, PATHS.original, ...CLIPS.map((clip) => clip.file)]) {
    if (!existsSync(filePath))
      throw new Error(`입력 파일이 없다: ${path.relative(ROOT, filePath)}`);
  }

  // 1. 입력 읽기
  const modelFbx = loadFbx(PATHS.modelFbx);
  const modelSkin = getSkinSignature(modelFbx);
  const original = await loadGlb(readArrayBuffer(PATHS.original));

  const failures = [];
  console.log("입력 검사");
  const animations = [];
  for (const { name, file, rootMotion } of CLIPS) {
    const fbx = loadFbx(file);
    const clip = takeClip(fbx, name);
    // 같은 스켈레톤인가: 스킨 본 순서·바인드 역행렬이 모델과 같고, 모든 트랙 대상이 모델에 있다
    check(
      failures,
      isSameSkin(modelSkin, getSkinSignature(fbx)),
      `${name}: 스켈레톤(본 ${modelSkin.names.length}개 순서·바인드 행렬)이 모델과 같음`,
    );
    const missing = clip.tracks.filter(
      (track) => !modelFbx.getObjectByName(track.name.split(".")[0]),
    );
    check(
      failures,
      missing.length === 0,
      `${name}: ${clip.duration.toFixed(3)}초, 트랙 ${clip.tracks.length}개 대상이 모델에 모두 있음`,
    );
    const drift = getRootDrift(clip);
    if (rootMotion === "lock-xz") {
      const range = getRootHorizontalRange(clip);
      lockRootHorizontal(clip);
      check(
        failures,
        getRootHorizontalRange(clip) === 0,
        `${name}: 루트 XZ 고정 (처음·끝 차이 ${drift.toFixed(2)}, 최대 이동 ${range.toFixed(2)} → 0)`,
      );
    } else {
      check(
        failures,
        drift < IN_PLACE_TOLERANCE,
        `${name}: 루트 이동 ${drift.toFixed(3)} (In Place)`,
      );
    }
    animations.push(clip);
  }

  // 2. 원본 재질을 이름으로 옮기고, FBXLoader가 펼친 정점을 다시 합친다
  const originalMaterials = {};
  original.scene.traverse((object) => {
    if (object.isMesh) originalMaterials[object.material.name] = object.material;
  });
  modelFbx.traverse((object) => {
    if (!object.isMesh) return;
    const material = originalMaterials[object.material.name];
    if (!material) throw new Error(`원본 GLB에 재질 '${object.material.name}'이 없다`);
    object.material = material;
    object.geometry = mergeVertices(object.geometry);
  });

  // 3. 루트 위치 트랙이 BaseMesh_Chibi를 움직이므로 단위 스케일은 그 위의 새 부모에 둔다
  const characterRoot = new Group();
  characterRoot.name = "Character";
  characterRoot.scale.setScalar(UNIT_SCALE);
  characterRoot.add(modelFbx);
  const exportScene = new Scene();
  exportScene.add(characterRoot);

  const glb = await new GLTFExporter().parseAsync(exportScene, {
    binary: true,
    animations,
  });
  mkdirSync(SOURCE_DIR, { recursive: true });
  writeFileSync(PATHS.draft, Buffer.from(glb));

  // 4. 결과 검증: 내보낸 GLB를 다시 읽어 원본과 비교한다
  const merged = await loadGlb(readArrayBuffer(PATHS.draft));
  const before = describeMeshes(original.scene);
  const after = describeMeshes(merged.scene);

  console.log("결과 검사");
  for (const name of Object.keys(before.meshes)) {
    const a = before.meshes[name];
    const b = after.meshes[name];
    check(failures, Boolean(b), `메시 재질 '${name}' 존재`);
    if (!b) continue;
    check(failures, a.vertices === b.vertices, `'${name}' 정점 ${b.vertices} (원본 ${a.vertices})`);
    check(
      failures,
      a.color === b.color &&
        a.roughness === b.roughness &&
        a.metalness === b.metalness &&
        a.side === b.side,
      `'${name}' 재질 #${b.color} 거칠기 ${b.roughness.toFixed(3)} (원본과 같음)`,
    );
  }
  const boxMatches =
    before.box.min.distanceTo(after.box.min) < BOX_TOLERANCE &&
    before.box.max.distanceTo(after.box.max) < BOX_TOLERANCE;
  check(
    failures,
    boxMatches,
    `크기·방향 bbox min ${after.box.min.toArray().map((v) => v.toFixed(3))} max ${after.box.max.toArray().map((v) => v.toFixed(3))}`,
  );
  for (const { name } of CLIPS) {
    const clip = merged.animations.find((candidate) => candidate.name === name);
    const resolved = clip?.tracks.every((track) =>
      merged.scene.getObjectByName(track.name.split(".")[0]),
    );
    check(
      failures,
      Boolean(clip && resolved),
      `클립 '${name}' ${clip ? `${clip.duration.toFixed(2)}초, 트랙 ${clip.tracks.length}개 대상 모두 존재` : "없음"}`,
    );
  }
  check(
    failures,
    merged.scene.getObjectByName(HAND_BONE)?.isBone === true,
    `손 본 '${HAND_BONE}' 존재`,
  );

  console.log(
    `\n초안: ${path.relative(ROOT, PATHS.draft)} (${(readFileSync(PATHS.draft).length / 1024).toFixed(0)} KB)`,
  );
  if (failures.length > 0) {
    console.error(`검증 실패 ${failures.length}건. public 파일은 바꾸지 않았다.`);
    process.exitCode = 1;
    return;
  }

  // 5. 교체는 --replace를 줬을 때만, 현재 파일을 백업한 뒤에 한다
  if (!shouldReplace) {
    console.log(
      `검증 통과. ${path.relative(ROOT, PATHS.target)}는 그대로 두었다 (교체하려면 --replace).`,
    );
    return;
  }
  if (existsSync(PATHS.target) && sha256(PATHS.target) === sha256(PATHS.draft)) {
    console.log("현재 public 파일과 내용이 같아 교체하지 않았다.");
    return;
  }
  if (existsSync(PATHS.target)) {
    mkdirSync(PATHS.backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(PATHS.backupDir, `character.${stamp}.glb`);
    copyFileSync(PATHS.target, backupPath);
    console.log(`백업: ${path.relative(ROOT, backupPath)}`);
  }
  copyFileSync(PATHS.draft, PATHS.target);
  console.log(`교체: ${path.relative(ROOT, PATHS.target)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
