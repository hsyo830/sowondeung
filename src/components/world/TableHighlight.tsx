"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

import { useLoader } from "@react-three/fiber";
import { BackSide, Matrix4, Mesh, Quaternion, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { BACKGROUND_CONFIG, LANDMARKS, TABLE_HIGHLIGHT_CONFIG } from "@/lib/game/worldConfig";
import { useGameStore } from "@/stores/gameStore";

/** 강조 껍데기는 광선 판정 대상이 아니다 (바닥 높이 측정 등에 끼어들지 않게) */
function ignoreRaycast() {}

interface TableHullProps {
  /** 배경 GLB 안의 테이블 메시 (읽기만 한다) */
  source: Mesh;
}

/**
 * 테이블 메시 하나의 inverted hull. 같은 Geometry를 **prop으로** 재사용하고(R3F가 해제하지 않음, SPEC §5),
 * 뒷면만 그린 단색 재질을 메시 중심 기준으로 조금 키운다. 원래 메시가 앞을 가리므로 실루엣 둘레만 테두리로 보인다.
 * 배경 GLB 노드는 바꾸지 않는다 (자식 추가·재질 변경 없음). 이 껍데기는 GLB 밖의 별도 메시다.
 */
function TableHull({ source }: TableHullProps) {
  const hullRef = useRef<Mesh>(null);

  useLayoutEffect(() => {
    const hull = hullRef.current;
    if (!hull) return;
    // 커밋 후라 배경 그룹(π 회전)에 붙어 있다. 월드 행렬을 갱신해서 회전까지 포함한 값을 쓴다
    source.updateWorldMatrix(true, false);
    const geometry = source.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return;

    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const worldScale = new Vector3();
    source.matrixWorld.decompose(new Vector3(), new Quaternion(), worldScale);
    // 축마다 월드 기준으로 같은 두께가 되도록 배율을 따로 정한다 (상판처럼 납작한 메시도 테두리 굵기가 같게)
    const t = TABLE_HIGHLIGHT_CONFIG.thickness;
    const grow = (localSize: number, axisScale: number) =>
      1 + (2 * t) / Math.max(localSize * Math.abs(axisScale), 1e-6);
    const scaleAboutCenter = new Matrix4()
      .makeTranslation(center.x, center.y, center.z)
      .multiply(
        new Matrix4().makeScale(
          grow(size.x, worldScale.x),
          grow(size.y, worldScale.y),
          grow(size.z, worldScale.z),
        ),
      )
      .multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z));

    hull.matrix.copy(source.matrixWorld).multiply(scaleAboutCenter);
    hull.matrixWorldNeedsUpdate = true;

    // 개발 모드 검증: 껍데기를 언마운트할 때 R3F가 배경의 Geometry를 해제하면 안 된다 (테이블이 조용히 재업로드됨)
    if (process.env.NODE_ENV === "production") return;
    function warnDispose() {
      console.warn(`[TableHighlight] 배경 Geometry "${source.name}"가 dispose되었습니다.`);
    }
    geometry.addEventListener("dispose", warnDispose);
    return () => geometry.removeEventListener("dispose", warnDispose);
  }, [source]);

  return (
    // 행렬은 위 effect에서 한 번 계산한다 (배경은 움직이지 않는다). 부모 그룹은 월드 원점이다
    <mesh ref={hullRef} geometry={source.geometry} matrixAutoUpdate={false} raycast={ignoreRaycast}>
      {/* 발광·투명·후처리 없이 단색 뒷면만. 톤 매핑을 빼서 어두운 숲에서도 은은한 종이색이 유지된다 */}
      <meshBasicMaterial color={TABLE_HIGHLIGHT_CONFIG.color} side={BackSide} toneMapped={false} />
    </mesh>
  );
}

/**
 * 탁자 선택 강조. 캐릭터가 테이블을 바라보며 상호작용할 수 있을 때만 보인다.
 * 테이블 메시(`Cube001_0`, `Cube001_1`)에만 적용하고 GLB 전체나 뿌리·나무·모닥불에는 적용하지 않는다.
 * 껍데기는 처음부터 마운트해 두고 visible만 바꾼다 (보일 때마다 재질을 다시 만들지 않게).
 */
export function TableHighlight() {
  const gltf = useLoader(GLTFLoader, BACKGROUND_CONFIG.url);
  const isActive = useGameStore((state) => state.nearbyInteractionId === "table");

  // 읽기만 한다 (ForestBackground의 바닥 메시 찾기와 같은 방식)
  const tableMeshes = useMemo(() => {
    const found = LANDMARKS.table.meshNames.map((name) => gltf.scene.getObjectByName(name));
    return found.filter((object): object is Mesh => object instanceof Mesh);
  }, [gltf]);

  useLayoutEffect(() => {
    if (tableMeshes.length === LANDMARKS.table.meshNames.length) return;
    console.error(
      `[TableHighlight] 테이블 메시를 찾지 못했다. 기대: [${LANDMARKS.table.meshNames.join(", ")}], ` +
        `찾음: [${tableMeshes.map((mesh) => mesh.name).join(", ")}]`,
    );
  }, [tableMeshes]);

  return (
    <group visible={isActive}>
      {tableMeshes.map((mesh) => (
        <TableHull key={mesh.uuid} source={mesh} />
      ))}
    </group>
  );
}
