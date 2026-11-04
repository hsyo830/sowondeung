import { Mesh, Vector4 } from "three";
import type { Camera, Material, Object3D, Scene, Texture, WebGLRenderer } from "three";

/**
 * 투과(transmission) 렌더링을 최초 로딩 화면 뒤에서 미리 한 번 준비한다. 성공하면 true.
 *
 * 왜 필요한가 (docs/DEV_LOG.md '첫 발사 멈칫 원인 분석'):
 * 나뭇가지 등불(GLB `Glass`, KHR_materials_transmission)이 **처음 화면에 들어오는 프레임**에 three가
 * 투과 렌더 타깃(화면 크기)을 만들고, 불투명 재질을 톤 매핑 없이 다시 그리는 셰이더 변형 + Glass 셰이더를 컴파일한다.
 * 평소 시점에는 등불이 화면 밖이라 첫 발사(올려다보기) 때 이 작업이 한꺼번에 일어났다.
 *
 * 방법: 실제 카메라(위치·방향 그대로)와 실제 씬으로 `gl.render`를 한 번 더 부른다. 이 한 번만 모든 객체의
 * 시야 절두체 컬링을 끄므로 화면 밖 등불·불투명 객체도 렌더 목록에 들어가 three의 실제 투과 패스가 돈다.
 * (`renderer.compile`은 톤 매핑 없는 변형·투과 렌더 타깃을 만들지 않아 쓰지 않는다.)
 * 같은 프레임의 R3F 본 렌더가 바로 덮어쓰고, 로딩 화면 아래라 사용자에게 보이지 않는다.
 *
 * useFrame 안(R3F 본 렌더 전, 중첩 렌더가 아닌 위치)에서만 호출한다. 투과 재질이 없으면 할 일이 없어 true.
 */
export function warmUpTransmission(gl: WebGLRenderer, scene: Scene, camera: Camera): boolean {
  const transmissive = collectTransmissiveMaterials(scene);
  if (transmissive.length === 0) return true;

  const culled: Object3D[] = [];
  scene.traverse((object) => {
    if (!object.frustumCulled) return;
    object.frustumCulled = false;
    culled.push(object);
  });
  try {
    gl.render(scene, camera);
  } finally {
    for (const object of culled) object.frustumCulled = true;
  }

  return transmissive.every((material) => hasTransmissionTarget(gl, material));
}

function collectTransmissiveMaterials(scene: Scene): Material[] {
  const found = new Set<Material>();
  scene.traverseVisible((object) => {
    if (!(object instanceof Mesh)) return;
    const materials: Material[] = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      if ("transmission" in material && Number(material.transmission) > 0) found.add(material);
    }
  });
  return [...found];
}

const viewport = new Vector4();

/**
 * 투과 패스가 실제로 돌았는지: 재질 uniform에 투과 렌더 타깃 텍스처가 연결됐고, 그 텍스처가 GPU에 할당됐으며,
 * 크기가 현재 뷰포트(× transmissionResolutionScale)와 같다 (처음 만들 때는 1×1이고 투과 패스에서 맞춰진다).
 * three 내부 속성(renderer.properties)을 읽는 부분이라 three 버전을 올릴 때 다시 확인한다.
 */
function hasTransmissionTarget(gl: WebGLRenderer, material: Material): boolean {
  const uniforms = (gl.properties.get(material) as TransmissionMaterialProperties).uniforms;
  const texture = uniforms?.transmissionSamplerMap?.value;
  if (!texture) return false;
  const isOnGpu = (gl.properties.get(texture) as TextureProperties).__webglTexture != null;
  gl.getCurrentViewport(viewport);
  const scale = gl.transmissionResolutionScale;
  const image = texture.image as { width: number; height: number };
  return isOnGpu && image.width === viewport.z * scale && image.height === viewport.w * scale;
}

interface TransmissionMaterialProperties {
  uniforms?: { transmissionSamplerMap?: { value: Texture | null } };
}

interface TextureProperties {
  __webglTexture?: unknown;
}
