// 캐릭터 애니메이션 통합 스크립트 (앱 번들에 포함되지 않는 개발용 도구)
//
// Mixamo의 Idle.fbx(모델 + Idle) + Walking.fbx(Walk, In Place)를 GLB 하나로 합친다.
// Mixamo FBX에는 재질 색이 없으므로 원본 character.glb의 재질 객체를 이름으로 옮긴다.
// Blender 없이 설치된 three의 FBXLoader·GLTFLoader·GLTFExporter만 쓴다 (추가 패키지 없음).
//
// 사용법 (저장소 루트에서):
//   node scripts/merge-character.mjs            # 통합 + 검증 → assets-source/character/character.merged.glb (public은 건드리지 않음)
//   node scripts/merge-character.mjs --replace  # 검증을 모두 통과하면 현재 public 파일을 백업한 뒤 교체
//
// 입력 (Git에 넣지 않는 로컬 파일, .gitignore의 /assets-source/):
//   assets-source/character/mixamo/Idle.fbx
//   assets-source/character/mixamo/Walking.fbx
//   assets-source/character/character.original.glb   ← Sketchfab 원본 (재질·크기 기준)

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
const PATHS = {
  idleFbx: path.join(SOURCE_DIR, "mixamo", "Idle.fbx"),
  walkFbx: path.join(SOURCE_DIR, "mixamo", "Walking.fbx"),
  original: path.join(SOURCE_DIR, "character.original.glb"),
  draft: path.join(SOURCE_DIR, "character.merged.glb"),
  backupDir: path.join(SOURCE_DIR, "backups"),
  target: path.join(ROOT, "public", "models", "character.glb"),
};

/** 앱 코드(constants/animation.ts)의 CHARACTER_CLIPS와 같아야 한다 */
const CLIP_NAMES = { idle: "Idle", walk: "Walk" };
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

/** 루트 위치 트랙의 처음·끝 차이 (In Place 판정) */
function getRootDrift(clip) {
  const track = clip.tracks.find((candidate) => candidate.name.endsWith(".position"));
  if (!track) return 0;
  const values = track.values;
  const last = values.length - 3;
  return Math.hypot(
    values[last] - values[0],
    values[last + 1] - values[1],
    values[last + 2] - values[2],
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

  for (const [key, filePath] of Object.entries(PATHS)) {
    if (["idleFbx", "walkFbx", "original"].includes(key) && !existsSync(filePath)) {
      throw new Error(`입력 파일이 없다: ${path.relative(ROOT, filePath)}`);
    }
  }

  // 1. 입력 읽기
  const idleFbx = loadFbx(PATHS.idleFbx);
  const walkFbx = loadFbx(PATHS.walkFbx);
  const idleClip = takeClip(idleFbx, CLIP_NAMES.idle);
  const walkClip = takeClip(walkFbx, CLIP_NAMES.walk);
  const original = await loadGlb(readArrayBuffer(PATHS.original));

  const failures = [];
  console.log("입력 검사");
  check(
    failures,
    getRootDrift(walkClip) < IN_PLACE_TOLERANCE,
    `Walk 루트 이동 ${getRootDrift(walkClip).toFixed(3)} (In Place)`,
  );

  // 2. 원본 재질을 이름으로 옮기고, FBXLoader가 펼친 정점을 다시 합친다
  const originalMaterials = {};
  original.scene.traverse((object) => {
    if (object.isMesh) originalMaterials[object.material.name] = object.material;
  });
  idleFbx.traverse((object) => {
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
  characterRoot.add(idleFbx);
  const exportScene = new Scene();
  exportScene.add(characterRoot);

  const glb = await new GLTFExporter().parseAsync(exportScene, {
    binary: true,
    animations: [idleClip, walkClip],
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
  for (const name of Object.values(CLIP_NAMES)) {
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
