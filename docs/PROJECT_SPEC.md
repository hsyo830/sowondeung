# 소원등 — 3D 인터랙티브 천등 날리기 (확정 기획)

> 원본 기획을 검토해 모호한 부분을 결정하고 예외 상황을 보완한 **확정본**입니다.
> 원본에서 바뀌었거나 새로 결정한 항목에는 **[결정]** 표시를 붙였습니다.
> 마지막 수정: 2026-11-03 (모바일 범위, 텍스처 소유권, 상호작용 실행 검증, 순수 함수 범위, React 버전 고정, 캐릭터 에셋 반영)

---

## 1. 개요

- 3인칭 캐릭터로 실내·야외가 이어진 3D 공간을 이동하며 **천등 받기 → 손글씨 소원 작성 → 점화 → 3초 홀드 발사**를 진행하는 웹서비스.
- 프론트엔드 포트폴리오 프로젝트. AI와 협업하되 핵심 기술은 직접 이해·검증한다.
- 참고 서비스(온라인 절 '산사')의 디자인·에셋은 복제하지 않는다.

### 최우선 목표
1. 외부 3D 모델 없이 Geometry로 만든 **입체** 천등
2. 직접 쓴 손글씨가 3D 천등 앞면에 **정확히**(반전·잘림·왜곡 없이) 반영
3. 실내·야외를 오가는 3인칭 캐릭터
4. 소원 작성 시 1인칭 카메라 전환
5. 천등 상태에 따른 일관된 인터랙션
6. 작은 MVP부터 단계별 검증 (한 번에 전부 구현하지 않음)

### 범위 밖 (MVP 전체 기간)
물리 엔진, DB/Supabase, 인증, 멀티플레이, 서버 저장, 커스텀 셰이더, 애니메이션 라이브러리, 자유 시점 회전, 필압·먹 번짐, **모바일 게임 플레이**.
- **[결정] 외부 3D 에셋은 캐릭터에만 사용한다** (§4 캐릭터 에셋). 천등과 월드는 Three.js Geometry로 직접 만든다.
- Three.js에 내장된 `AnimationMixer`는 '애니메이션 라이브러리'로 보지 않는다 (추가 패키지가 아님).

---

## 2. 기술 스택 (현재 프로젝트 기준)

| 항목 | 버전 | 상태 |
|---|---|---|
| Next.js (App Router, `src/` 구조) | 16.4.4 | 설치됨 |
| React / React DOM | 19.3.0 (정확한 버전으로 고정) | 설치됨 |
| TypeScript | ^5 (strict) | 설치됨 |
| Tailwind CSS | ^4 | 설치됨 |
| ESLint | ^9 + eslint-config-next 16.4.4 | 설치됨 |
| three / @types/three | 0.187.0 (정확한 버전으로 고정) | **1단계에서 설치** |
| @react-three/fiber | 9.8.2 (정확한 버전으로 고정) | **1단계에서 설치** |
| zustand | ^5 | **3단계에서 설치** |
| vitest | ^5 | **1단계에서 설치 (devDependency)** |

- **[결정] 버전 호환성 (2026-11-03 재확인):**
  - `@react-three/fiber`의 최신 안정판은 9.8.2이고, peer 범위는 `react`·`react-dom` `>=19 <19.4`, `three >=0.156`이다. 10.x는 canary뿐이라 사용하지 않는다.
  - 설치된 React는 19.3.0, npm 최신은 19.3.1이다. 둘 다 peer 범위 안이다.
  - **React·React DOM을 19.4 이상으로 올리면 R3F peer 범위를 벗어난다.** R3F 안정판이 지원 범위를 넓히기 전까지 올리지 않는다.
- **[결정] 자동 업데이트 방지 규칙:**
  - `react`, `react-dom`, `next`는 이미 `package.json`에 캐럿(^) 없이 정확한 버전으로 적혀 있다. 이 상태를 유지한다.
  - 3D 관련 패키지는 `--save-exact`로 설치해 정확한 버전으로 고정한다 (`three@0.187.0`, `@types/three@0.187.0`, `@react-three/fiber@9.8.2`).
  - 버전 이름 없이 `npm install react`처럼 설치하거나 `npm update`를 실행하지 않는다.
  - peer 충돌이 나도 `--force`나 `--legacy-peer-deps`로 우회하지 않는다. 원인을 확인하고 사용자에게 보고한다.
  - 설치 후 `npm ls react react-dom @react-three/fiber three`로 버전과 invalid·peer 경고를 확인한다. `package-lock.json`도 함께 커밋한다.
- **[결정] 3D 모델 로딩:** `@react-three/drei`를 설치하지 않으므로, R3F의 `useLoader`와 three에 포함된 `GLTFLoader`(`three/examples/jsm`)로 직접 불러온다. 추가 패키지는 필요 없다.
- **[결정] `@react-three/drei`는 설치하지 않는다.** 필요한 기능(카메라, 텍스처)은 R3F + three로 직접 구현할 수 있고, 핵심 개념을 직접 이해한다는 목표와도 맞다. 필요성이 생기면 그때 다시 판단한다.
- **[결정] Zustand는 3단계에서 설치한다.** 1단계 테스트 화면에는 공유 게임 상태가 없다.
- **[결정] Vitest는 순수 함수 테스트 용도로만 사용한다** (node 환경, jsdom·React Testing Library 없음). 상태 전이와 충돌 계산 검증에 필요하다.
- `next.config.ts`에 `cacheComponents: true`가 켜져 있다. WebGL Canvas는 서버에서 렌더링할 수 없으므로 **3D 영역은 Client Component 안에서 `next/dynamic(..., { ssr: false })`로 불러온다.** (`ssr: false`는 Server Component에서 사용할 수 없음 — Next 문서 `02-guides/lazy-loading.md`)

---

## 3. 3D 공간

### 좌표계
- Y축 = 높이, XZ 평면 = 이동 공간.
- 실내 `z < 0`, 야외 `z > 0`, 출입구는 `z = 0` 벽에 있음.
- 하나의 R3F `<Canvas>` 안에 실내와 야외를 모두 배치한다 (페이지·Canvas 분리 금지).

### [결정] 초기 배치값 (WorldConfig 기본값, 2단계에서 조정 가능)

| 요소 | 위치 / 범위 |
|---|---|
| 실내 바닥 | x ∈ [-6, 6], z ∈ [-10, 0] |
| 야외 바닥 | x ∈ [-12, 12], z ∈ [0, 14] |
| 출입구 (z=0 벽의 틈) | x ∈ [-1, 1] |
| 플레이어 시작 | (0, 0, -8) |
| 천등 수령대 (실내 왼쪽) | (-4, 0, -5) |
| 소원 작성 책상 (실내 오른쪽) | (4, 0, -5) |
| 모닥불 (야외 중앙) | (0, 0, 7) |

- 벽·기둥·지붕·책상·수령대·모닥불은 Three.js 기본 Geometry를 쓴 로우폴리 형태로 만든다.
- **모든 위치·크기·충돌 박스는 `WorldConfig` 한 곳에서 정의**하고, 시각 메시와 충돌 계산이 같은 값을 읽는다.

### 충돌
- XZ 평면 AABB. 플레이어는 원(반지름 r)으로 근사하고, 벽·오브젝트는 사각형으로 처리한다.
- **[결정] X축과 Z축을 따로 이동·검사해서 벽을 따라 미끄러지듯 이동할 수 있게 한다.**
- **[결정] z=0 벽은 출입구 틈을 기준으로 좌·우 두 개의 AABB로 나눈다.** 실내외 이동은 그 틈으로만 가능하다.
- **[결정] 프레임 delta 상한 0.1초.** 탭이 비활성화됐다 돌아오면 delta가 매우 커지므로, 상한이 없으면 벽을 뚫고 지나갈 수 있다.
- **[결정] LIT 상태에서는 실내 진입을 막는다.** 다음 위치가 `z < 0`이 되는 이동을 막고 안내 문구를 표시한다 (§6 STEP 4).

### [결정] 실내 가림 처리
카메라는 플레이어 기준 `+z` 쪽 위에서 `-z` 방향을 바라본다. 이 배치에서 플레이어가 실내에 있으면 **z=0 벽과 지붕이 카메라와 플레이어 사이를 막는다.**
- 실내 지붕은 렌더링하지 않는다.
- 플레이어가 실내(`z < 0`)에 있으면 z=0 벽 메시를 숨기거나 낮은 높이로 바꾼다. **충돌 박스는 그대로 유지한다.**

---

## 4. 플레이어와 카메라

### [결정] 캐릭터 에셋 (원본 기획 변경)
기존 기획의 'Geometry로 직접 만든 캐릭터'를 아래 외부 에셋으로 바꾼다. **외부 에셋은 캐릭터에만 사용하고, 천등은 계속 Geometry로 직접 만든다.**

| 항목 | 내용 |
|---|---|
| 모델 | Sketchfab 'Free Pack - Chibi Base Mesh (Rigged)' |
| 제작자 | PolyOne Studio |
| 원본 | https://sketchfab.com/3d-models/free-pack-chibi-base-mesh-rigged-fed4fb329f224f1594f631eae8d2626b |
| 라이선스 | CC BY (Sketchfab 표기 기준. 정확한 버전은 다운로드 페이지에서 확인) |
| 애니메이션 | Mixamo `Idle`, `Walking` (**In Place 옵션 체크**) |
| 파일 제공 | **2단계 시작 시 사용자가 제공** |

- **파일 형식:** 제공받은 FBX를 필요하면 **GLB 하나로 변환**하고, 클립 이름을 `Idle`, `Walk`로 통합한다. 결과 파일은 `public/models/character.glb`에 둔다. 런타임에서 FBX를 직접 불러오지 않는다 (로더 추가와 파일 크기 문제).
- **로딩:** `useLoader(GLTFLoader, '/models/character.glb')`로 불러오고, `Suspense` fallback 동안에는 아무것도 그리지 않는다. 씬에 캐릭터는 하나뿐이므로 SkeletonUtils 복제는 필요 없다.
- **[결정] Walking은 In Place로 준비한다:**
  - Mixamo에서 `Walking`을 내보낼 때 **In Place** 옵션을 체크한다. 그러면 클립이 제자리에서 걷는 동작만 담고, 엉덩이(Hips) 본의 XZ 이동은 들어가지 않는다.
  - Idle과 Walking은 **같은 캐릭터를 Mixamo에 올려서** 내보낸다. 그래야 본 구조와 이름이 일치한다.
  - **캐릭터의 실제 위치 이동은 `PlayerController`만 담당한다.** Walk 클립은 다리와 팔 동작만 재생하고, 모델 루트는 항상 `PlayerController`가 정한 위치에 있다.
  - In Place가 아니면 루트 모션과 코드 이동이 겹친다. 캐릭터가 두 배로 이동하거나, 충돌 위치와 보이는 위치가 어긋나거나, 루프할 때마다 원위치로 튀는 문제가 생긴다.
  - 변환 후 검증: Walk 클립의 Hips position 트랙에서 XZ 변화량이 거의 0이어야 한다. 0이 아니면 In Place로 다시 내보낸다. 코드에서 트랙을 잘라 내는 우회는 하지 않는다.
- **애니메이션:** three 내장 `AnimationMixer`를 사용한다. 이동 중이면 `Walk`, 멈추면 `Idle`을 재생하고, 짧은 `crossFadeTo`(약 0.2초)로 전환한다. **클립은 이동 여부가 바뀔 때만 전환**하고 프레임마다 다시 재생하지 않는다. `mixer.update(delta)`는 `useFrame`에서 호출한다.
- **회전:** 이동 방향을 바라보도록 캐릭터 루트의 Y축 회전을 보간한다 (기존 규칙과 같음).
- **로직 분리:**
  - `PlayerController`: 입력, 이동, 충돌. 모델을 모르고 위치·회전·이동 여부만 ref로 내보낸다. **위치를 바꾸는 유일한 주체다.**
  - `CharacterModel`: GLB, 스켈레톤, 애니메이션. 충돌을 모르고 ref 값만 읽어서 표시한다. **위치를 바꾸지 않는다** (In Place 클립만 재생).
  - 모델을 교체해도 이동·충돌 코드는 바뀌지 않는다.
- **충돌 크기:** 충돌 원 반지름은 모델 크기가 아니라 `WorldConfig`의 상수로 정한다. 모델 스케일만 이 크기에 맞게 조정한다.
- **천등 부착 위치:** 2단계에서 모델 본(bone) 이름을 확인해 손 본(예: `mixamorigRightHand`)이 있는지 기록한다. 3단계에서 아래처럼 처리한다.
  - 손 본의 **월드 위치만** 매 프레임 읽어서 `HeldLantern` 위치로 사용한다. 회전은 캐릭터 Y축 회전만 따른다.
  - 천등을 본의 자식으로 붙이지 않는다. FBX에서 변환한 본은 스케일(예: 0.01)을 물려줄 수 있고, 걷는 동작에서 손이 흔들리면 천등도 과하게 흔들리기 때문이다.
  - 손 본을 찾지 못하면 캐릭터 루트 기준의 고정 오프셋을 사용한다.
- **출처 표기:** CC BY에 따라 `README.md`에 모델명, 제작자, 원본 링크, 라이선스를 표시한다. Mixamo 애니메이션 사용 사실도 함께 적는다 (Mixamo는 출처 표기 의무가 없지만 투명성을 위해 기재).
- **WRITING 모드:** 캐릭터 모델을 숨기고, 숨겨진 동안에는 `mixer.update`도 호출하지 않는다.

### 탐색 모드 (EXPLORE)
- 3인칭. 캐릭터는 위의 에셋을 사용한다.
- WASD / 방향키로 이동하며, **[결정] 이동 방향은 월드 기준이다** (W = `-z`, S = `+z`, A = `-x`, D = `+x`).
- 캐릭터는 이동하는 방향을 바라본다 (회전은 보간).
- **[결정] 카메라는 고정된 월드 오프셋에서 부드럽게 따라간다** (예: 플레이어 위치 + (0, 6, 8)를 lerp로 추적). 캐릭터가 회전해도 카메라는 같이 돌지 않는다. 원본의 "캐릭터 뒤쪽"은 이렇게 해석했다. 화면 기준 위쪽이 W 방향과 일치해서 조작이 직관적이다.
- 자유 시점 회전은 넣지 않는다.

### 소원 작성 모드 (WRITING)
1. 이동 입력 잠금. **[결정] 잠글 때 눌려 있던 키 상태를 초기화한다** (키가 눌린 채로 남는 문제 방지).
2. 카메라를 책상 앞 눈높이로 옮기고 책상을 내려다보는 1인칭 시점으로 전환한다.
3. 캐릭터와 손에 든 천등을 숨긴다.
4. 책상 위에 선택한 색상의 종이(평면)를 놓아 연출한다.
5. 화면 위에 HTML Canvas 작성 UI를 표시한다 (필기 입력은 2D Canvas에서만 처리하고 Raycasting은 쓰지 않는다).
6. 완료하거나 취소하면 3인칭으로 돌아간다.

- **카메라는 하나만 둔다.** `CameraRig` 하나가 모드에 따라 목표 위치·시선을 바꾸고, 카메라 컴포넌트를 모드별로 따로 만들지 않는다.
- **1인칭은 WRITING 모드에서만 사용한다.**

### [결정] 입력 공통 규칙
- 창 `blur` 시 눌린 키 상태를 전부 초기화한다.
- `e.repeat`인 키 입력은 상호작용 액션에서 무시한다.
- EXPLORE가 아닌 모드에서는 이동키와 E키를 무시한다.

### [결정] 모바일 — MVP는 데스크톱 전용
- **게임(`/`)은 데스크톱에서만 실행한다.** 모바일에서는 3D Canvas를 불러오지 않고 "데스크톱에서 이용해 주세요" 안내 화면을 표시한다.
- 판별 방법: 클라이언트에서 `matchMedia('(any-pointer: fine)')`로 확인한다. false이면(마우스·트랙패드가 없으면) 안내 화면을 표시한다. User-Agent 문자열은 쓰지 않는다. 판별 전에는 빈 화면이나 로딩 화면만 보여 줘서, 모바일에서 3D 번들이 로드되지 않게 한다.
- **모바일 터치 필기는 1단계 기술 검증 페이지(`/lab/lantern`)에서만 테스트한다.** 이 페이지에는 안내 화면을 적용하지 않는다.
- 게임 안의 `WritingCanvas`도 Pointer Events로 만들기 때문에 터치 입력 코드는 같지만, 게임 안에서의 모바일 동작은 지원하거나 검증하지 않는다.

---

## 5. 3D 천등

### 형태
- 외부 모델·GLB·Blender를 사용하지 않는다. Geometry + Material로만 만든다.
- 크기: 가로 1.2, 세로 1.8, 깊이 0.7. **앞면 1.2 × 1.8 = 2:3 = Canvas 512 × 768.**
- 구성:
  - 앞면: `PlaneGeometry(1.2, 1.8)` + 손글씨 텍스처
  - 뒷면: 기본 색상 평면
  - 좌우면: 종이 재질 평면 (0.7 × 1.8)
  - 테두리: 얇은 Box
  - 하단: 불꽃 + 발광 요소
- 모든 요소를 `LanternModel` 하나로 묶고, **수령·소지·점화·발사·작성 미리보기 모두 같은 컴포넌트를 재사용한다.**
- 앞면은 평평하게 유지한다 (곡면·사다리꼴 금지). 둥근 장식은 핵심 기능 검증 후 추가한다.
- **[결정] 각 면은 `side = FrontSide`로 바깥쪽을 향하게 둔다.** DoubleSide를 쓰면 뒤에서 볼 때 손글씨가 좌우 반전된 채로 비친다.

### 색상
- 빨강·주황·노랑·분홍 4종. **`constants/lanternColors.ts` 단일 상수**에 id·이름·HEX를 정의한다.
- 같은 HEX를 2D Canvas 배경, 3D 종이, 색상 선택 UI에서 공유한다.
- **[결정] 2D와 3D의 색 일치:** 텍스처의 `colorSpace = SRGBColorSpace`로 설정한다. 그래도 R3F 기본 톤 매핑 때문에 색이 달라 보이면 종이 재질에 `toneMapped = false`를 적용한다 (1단계 검증 항목).

### 소원 작성 Canvas
- 논리 크기 **512 × 768 고정**. 화면 표시 크기만 CSS로 반응형으로 조절한다.
- 입력 좌표 변환: `(clientX - rect.left) × 512 / rect.width`.
- **[결정] Canvas 내부 해상도는 DPR과 상관없이 512 × 768로 고정한다.** 고해상도 화면에서 조금 흐릴 수 있지만, 텍스처와 1:1로 대응해서 변환이 단순해진다.
- Pointer Events 사용. `setPointerCapture`, `pointerup`, `pointercancel`을 처리한다.
- `touch-action: none`으로 필기 중 스크롤을 막는다.
- 검정 붓: `lineCap = 'round'`, `lineJoin = 'round'`, 고정 두께.
- 기능: 되돌리기, 전체 지우기, 완료(1획 이상일 때만), 취소.
- **[결정] 동시에 여러 손가락으로 입력하면 첫 번째 pointerId만 처리한다.**

### [결정] 손글씨 데이터의 단일 원본 = 획(stroke) 배열
- `strokes: Point[][]` (512 × 768 논리 좌표)를 천등 데이터에 저장한다.
- 텍스처는 `drawLanternFace(ctx, colorHex, strokes)` **결정적 그리기 유틸리티 하나**로 만든다. 이 함수는 전달받은 Canvas 컨텍스트를 변경하므로 순수 함수가 아니다. 다만 같은 입력에는 항상 같은 그림을 그린다. 작성 Canvas 화면과 3D 텍스처가 같은 함수를 쓰므로 결과가 항상 같다.
- **[결정] 순수 함수로 분리하는 대상** (`lib/writing/`, `lib/game/`, Vitest로 테스트):
  - 좌표 계산: `toLogicalPoint(clientX, clientY, rect)` → 512 × 768 논리 좌표 (범위 밖 값은 clamp)
  - 획 데이터 변경: `startStroke`, `appendPoint`, `undoStroke`, `clearStrokes`, `hasInk`. 원본 배열을 수정하지 않고 새 배열을 반환한다.
  - 상태 전이 (§7), 충돌·거리·상호작용 가능 여부 (§3, §8)
- `drawLanternFace`는 단위 테스트 대상이 아니다. 1단계 브라우저 시각 검증으로 확인한다 (node 환경에는 Canvas가 없고, 그리기 결과는 눈으로 확인하는 편이 정확하다).
- 이미지(dataURL·Canvas 요소)를 저장하지 않고 획 배열을 저장하는 이유:
  - 되돌리기와 재편집이 쉽다.
  - 직렬화할 수 있어 상태 저장에 적합하다.
  - 단위 테스트가 가능하다.
  - 원본 데이터가 하나로 유지된다.
- 작성 중인 초안 획은 `WritingOverlay`의 로컬 상태로 관리하고, **완료할 때만 store에 반영한다.** 그래서 취소하면 마지막으로 완료한 내용이 그대로 남는다.

### 텍스처 적용
1. 오프스크린 Canvas(512 × 768)에 색상 배경과 획을 그린다.
2. `new CanvasTexture(canvas)`로 텍스처를 만든다. `colorSpace = SRGBColorSpace`를 설정하고 `flipY`는 기본값(true)을 유지한다.
3. 앞면 Plane의 `map`에 적용한다. 메시 자식이므로 이동·회전해도 표면에 붙어 있다.
4. 다시 작성하면 같은 Canvas에 다시 그리고 `needsUpdate = true`로 갱신한다 (텍스처를 새로 만들지 않음).
- 검증 항목: 상하 반전, 좌우 반전, 잘림, 비율 왜곡 (모서리 마커가 있는 테스트 글씨로 확인).

### [결정] 텍스처 소유권과 생명주기
**원칙: 획 데이터는 공유하고, GPU 텍스처는 공유하지 않는다.**

| 자원 | 소유자 | 생성 | 해제 |
|---|---|---|---|
| 획 데이터 `strokes` | store (`held`, `flying[i]`) | 작성 완료 시 | 발사 천등 제거 시 store에서 삭제 |
| 오프스크린 Canvas + `CanvasTexture` | **`useLanternTexture`를 호출한 컴포넌트 인스턴스 하나** | 해당 인스턴스의 `useLayoutEffect` 실행 시 | **같은 effect의 정리 함수**에서 `dispose()` |
| 천등 Geometry | `lib/lantern/lanternGeometry.ts` 모듈 상수 (앱 전체 소유) | 모듈 로드 시 1회 | **해제하지 않음.** 개수가 고정이라 누수가 아니다 |
| Material | JSX 자식 요소로 선언 (`<meshStandardMaterial />`), R3F가 관리 | 마운트 | R3F가 언마운트 시 자동 해제 |

- `HeldLantern`, `FlyingLantern`, `/lab` 미리보기는 **각자 자기 텍스처를 만들고 각자 해제한다.** 다른 컴포넌트에 텍스처 객체를 넘기거나 store에 저장하지 않는다.
- **발사 시 전환 순서:**
  1. `launchLantern(spawnPos)`가 store 한 번의 갱신으로 `held.status = NONE`으로 바꾸고, `flying`에 `{ id, colorId, strokes(같은 배열 참조), spawn }`을 추가한다.
  2. React 커밋에서 `HeldLantern`이 언마운트되면서 **자기** 텍스처를 해제하고, `FlyingLantern`이 마운트되면서 같은 획 데이터로 **새** 텍스처를 만든다.
  3. 두 텍스처가 서로 독립적이므로, 어느 쪽이 먼저 실행되든 상관없다.
- **공유와 참조 카운트를 쓰지 않는 이유:** React는 커밋할 때 언마운트되는 effect의 정리(cleanup)를 새로 마운트되는 effect의 실행보다 **먼저** 처리한다. 텍스처를 참조 카운트로 공유하면 카운트가 잠깐 0이 되면서, `FlyingLantern`이 받기 전에 텍스처가 해제된다. 이를 막으려면 지연 해제 같은 추가 장치가 필요하다. 512 × 768 텍스처를 한 번 더 그리는 비용은 무시할 수 있으므로 소유자를 하나로 두는 쪽이 단순하고 안전하다.
- **[결정] 텍스처 생성·해제는 하나의 `useLayoutEffect` 안에서 짝을 이룬다** (StrictMode 대응):
  ```
  useLayoutEffect(() => {              // deps: [] — 마운트 1회
    const canvas = 512×768 오프스크린 Canvas
    const tex = new CanvasTexture(canvas)
    textureRef.current = tex
    materialRef.current.map = tex      // 앞면 재질에 명령형으로 연결
    return () => {
      materialRef.current.map = null
      tex.dispose()                    // 이 effect가 만든 것만 해제
      textureRef.current = null
    }
  }, [])
  useLayoutEffect(() => {              // deps: [colorHex, strokes]
    drawLanternFace(ctx, colorHex, strokes); textureRef.current.needsUpdate = true
  }, [colorHex, strokes])
  ```
  - Next App Router는 개발 모드에서 StrictMode가 기본으로 켜져 있다. 그래서 마운트 → 정리 → 재마운트가 실행된다. 이때 첫 번째 텍스처 T1은 **한 번도 렌더링되지 않은 상태로 해제**되고, 재마운트에서 새 T2를 만든다. **해제된 텍스처를 다시 쓰는 경로가 없다.**
  - 렌더링 중(`useState` 초기화, `useMemo`)에는 텍스처를 만들지 않는다. 렌더링 중에 만든 객체는 effect 정리 함수에서 해제된 뒤에도 같은 값으로 남아 다시 쓰이게 되기 때문이다.
  - `useLayoutEffect`는 브라우저 페인트와 다음 R3F 프레임 전에 실행된다. 그래서 첫 프레임부터 `map`이 연결되어 있고, 글씨가 비어 있는 공백 프레임이 없다.
  - 텍스처를 state에 넣지 않고 ref와 명령형 할당을 사용한다. 이렇게 하면 effect 안에서 setState를 호출하지 않아도 된다 (현재 ESLint 설정의 `react-hooks/set-state-in-effect`가 error 규칙이다).
  - `map`은 JSX prop으로 넘기지 않는다. prop으로 넘기면 R3F가 리렌더링할 때 명령형으로 연결한 값을 덮어쓴다.
- **[결정] 공유 Geometry는 R3F가 해제하지 않도록 넘기는 방식을 고정한다:**
  - R3F는 언마운트할 때 **JSX 요소로 선언되어 R3F가 만든 객체**(`<planeGeometry />`, `<meshStandardMaterial />` 등)를 해제한다.
  - 공유 Geometry는 반드시 `<mesh geometry={LANTERN_GEOMETRY.front}>`처럼 **prop으로만** 넘긴다. JSX 자식 요소, `<primitive attach="geometry">`, `useMemo`로 만든 Geometry는 사용하지 않는다.
  - 천등 그룹에는 `dispose={null}`을 쓰지 않는다. 이 옵션은 하위 Material의 자동 해제까지 막아 Material 누수를 일으킨다.
  - 실제로 해제되지 않는지 1단계에서 검증한다. 개발 모드에서 공유 Geometry에 `addEventListener('dispose', ...)` 경고를 걸어 두고, 마운트·언마운트를 반복해도 경고가 나오지 않는지 확인한다. Three.js는 해제된 Geometry를 자동으로 다시 업로드하므로 화면만 봐서는 문제를 알아챌 수 없다.
- `map`으로 연결한 텍스처는 **R3F가 해제해 줄 것으로 가정하지 않고** 소유자가 직접 해제한다. Material을 해제해도 그 `map`은 해제되지 않는다.

### 조명·발광
- 점화 전: 종이 색상만 표시, 발광 없음.
- 점화 후: 하단 불꽃 메시, 종이 재질 `emissive` 강화, 범위가 제한된 따뜻한 `pointLight`.
- **[결정] 소지 중인 천등의 pointLight는 처음부터 마운트해 두고 intensity만 0 ↔ N으로 바꾼다.** Three.js는 라이트 개수가 바뀌면 셰이더를 다시 컴파일해서 화면이 순간적으로 멈춘다.
- **[결정] 발사된 천등에는 pointLight를 붙이지 않고 emissive만 사용한다.** 성능 때문이다.
- 투명 재질과 커스텀 셰이더는 사용하지 않는다.

### 발사 연출
- 손에서 분리되어 발사 시점의 월드 위치에서 시작한다.
- 상승(Y 증가)하면서 sin 기반으로 좌우로 흔들리고 Y축으로 천천히 회전한다.
- 멀어질수록 작아 보이는 효과는 원근 카메라로 자연스럽게 생기므로 scale을 따로 조절하지 않는다.
- 위치·회전은 `useFrame`에서 `delta` 기반으로 ref에 직접 갱신한다. **프레임마다 React 상태를 바꾸지 않는다.**
- **[결정] 제거 조건:** 높이 > 40 또는 경과 시간 > 20초. **동시에 존재하는 발사 천등은 최대 5개**로 제한하고, 초과하면 가장 오래된 것부터 제거한다.
- 제거되면 `FlyingLantern`이 언마운트되면서 자기 텍스처를 해제한다. 공유 Geometry는 해제되지 않는다 (위 소유권 규칙).
- **누수 검증:** 수령 → 작성 → 점화 → 발사 → 자동 제거를 10회 이상 반복한 뒤 `renderer.info.memory.textures`와 `geometries`가 처음 값으로 돌아와야 한다 (소지 천등 1개 + 남아 있는 발사 천등 수만큼만 증가한 상태).

---

## 6. 사용자 시나리오

### STEP 1. 천등 받기 (수령대)
- 범위 안 + 상태 NONE → **'천등 받기'** → 색상 선택 UI (모드 COLOR_SELECT, 이동 잠금).
- 색상 선택 → BLANK. 캐릭터 손에 천등이 렌더링된다.
- **[결정] 범위 안 + BLANK → '색상 다시 고르기'** 버튼을 표시한다.
- **[결정] WRITTEN·LIT 상태에서는 수령대 버튼을 표시하지 않는다.**
- **[결정] 색상 선택 UI에는 '닫기'(ESC)가 있다.** 닫으면 상태는 바뀌지 않는다 (NONE이면 NONE, BLANK이면 기존 색 유지).

### STEP 2. 소원 작성 (책상)
- 범위 안 + BLANK 또는 WRITTEN → **'소원 작성하기'** (WRITTEN이면 기존 글씨를 불러와 이어서 수정할 수 있다).
- 1획 이상일 때만 완료 버튼이 활성화된다. 전부 지우거나 되돌려서 0획이 되면 완료 버튼이 다시 비활성화된다.
- 완료 → WRITTEN, 텍스처 갱신, 3인칭으로 복귀.
- 취소(ESC 포함) → 데이터 변경 없이 복귀.

### STEP 3. 야외 이동
- 출입구로만 이동할 수 있고 장면 전환은 없다. 천등이 없거나 작성 전이어도 이동할 수 있다.

### STEP 4. 불 붙이기 (모닥불)
- 범위 안 + WRITTEN → **'불 붙이기'** → LIT. 불꽃과 발광이 활성화된다.
- BLANK에서는 점화 버튼을 표시하지 않는다. **[결정] 대신 "먼저 소원을 적어 주세요" 안내를 표시한다** (사용자가 왜 안 되는지 알 수 있도록).
- LIT 이후에는 다시 작성하거나 색상을 바꿀 수 없다.
- LIT 상태로 실내 진입을 시도하면 이동을 막고 **"불을 붙인 천등은 실내로 가져갈 수 없어요"** 토스트를 표시한다 (약 2초, 반복 시도 시 타이머만 연장).

### STEP 5. 천등 날리기
- **[결정] 버튼 표시 조건:** LIT + 야외(z > 0)이면 위치와 상관없이 '천등 날리기' 버튼을 표시한다. 모닥불 범위 제한은 두지 않는다.
- **3초 홀드:** 버튼 pointerdown 또는 E keydown으로 시작하고, pointerup·pointerleave·pointercancel·E keyup·window blur에서 초기화한다.
- **[결정] 진행률은 `performance.now()`로 측정한 경과 시간**으로 계산한다. setTimeout 누적 방식은 쓰지 않는다. 진행 바는 DOM ref로 직접 갱신하고 React 상태로 프레임마다 렌더링하지 않는다.
- **[결정] 홀드 중에 실내로 들어가려 하거나 모드가 바뀌면 진행률을 초기화한다.**
- 3초가 지나면 `launchLantern()`을 **한 번만** 호출한다. 액션 자체가 LIT일 때만 성공하므로, 같은 프레임에 두 번 호출돼도 두 번째 호출은 무시된다 (액션 단의 멱등성).
- 발사 후: 소지 상태 NONE, 발사 천등 목록에 추가, 실내 진입 가능, 새 천등 수령 가능.

---

## 7. 상태 관리

### 천등 상태 (소지 중인 천등)
`NONE → BLANK → WRITTEN → LIT → (발사) → NONE`

| 액션 | 허용 이전 상태 | 결과 |
|---|---|---|
| `receiveLantern(color)` | NONE, BLANK | BLANK (BLANK이면 색상만 교체) |
| `finishWriting(strokes)` | BLANK, WRITTEN (strokes ≥ 1) | WRITTEN |
| `lightLantern()` | WRITTEN | LIT |
| `launchLantern(spawnPos)` | LIT | NONE + 발사 천등 추가 |
| `removeFlyingLantern(id)` | — | 목록에서 제거 |

- 위 표에 없는 전이는 모두 **거부**한다 (상태 변화 없음, false 반환). 예: NONE→WRITTEN, BLANK→LIT, LIT→BLANK, LIT에서 다시 작성.
- 전이 규칙은 `lib/game/lanternTransitions.ts`의 **순수 함수**로 두고 Vitest로 테스트한다. store 액션은 이 함수를 호출만 한다.

### 모드 (카메라·UI)
`EXPLORE | COLOR_SELECT | WRITING`
- 천등 상태와는 별도 필드로 관리한다.
- `openColorSelect()`, `openWriting()`, `closeOverlay()`처럼 모드 전환도 액션을 통해서만 한다.
- `openWriting`은 상태가 BLANK·WRITTEN이고 모드가 EXPLORE일 때만 허용한다.
- 이동, E키, 상호작용 버튼은 EXPLORE일 때만 동작한다.

### Store 구조 (Zustand 하나)
```ts
type LanternStatus = 'NONE' | 'BLANK' | 'WRITTEN' | 'LIT'
type GameMode = 'EXPLORE' | 'COLOR_SELECT' | 'WRITING'

interface HeldLantern { id: string; colorId: LanternColorId; strokes: Stroke[]; status: LanternStatus }
interface FlyingLanternData { id: string; colorId: LanternColorId; strokes: Stroke[]; spawn: [number, number, number]; launchedAt: number }

interface GameState {
  held: HeldLantern            // status NONE이면 다른 필드는 의미 없음
  mode: GameMode
  flying: FlyingLanternData[]
  toast: string | null
  // actions...
}
```
- **store에 넣는 것:** 이벤트로 바뀌는 값 (천등 상태, 모드, 발사 목록, 토스트).
- **ref·Three 객체로 관리하는 것:** 매 프레임 바뀌는 값 (플레이어 위치·회전, 카메라 위치, 발사 천등 위치, 홀드 진행률).
- **[결정] 예외:** 플레이어 위치는 ref로 관리하지만, 근접 상호작용 대상(`nearbyInteractionId`)은 **값이 바뀔 때만** store에 쓴다. HUD가 프레임마다 다시 렌더링되지 않게 하기 위해서다.
- 같은 정보를 useState로 따로 들고 있지 않는다. 단, 작성 중 초안 획은 확정 전 임시 UI 상태이므로 `WritingOverlay` 로컬 상태로 둔다 (중복이 아님).

---

## 8. 상호작용 시스템

```ts
interface InteractionDef {
  id: 'station' | 'desk' | 'firepit'
  position: [number, number]   // XZ, WorldConfig에서 참조
  radius: number
  getAction(state): { label: string; run: () => void } | { hint: string } | null
}
```
- XZ 거리 ≤ radius인 대상 중 **가장 가까운 하나만** 표시한다.
- **[결정] 각 오브젝트의 상호작용 범위가 서로 겹치지 않도록 WorldConfig에서 배치한다.**
- 버튼 클릭과 E키는 같은 `run()`을 실행한다.
- 범위를 벗어나면 버튼을 숨긴다.
- **[결정] 실행 시점 재검증:** 버튼이 표시됐다는 사실을 믿지 않는다. 클릭이나 E키로 실행할 때 `executeInteraction(id)`가 다음을 **다시** 확인하고, 하나라도 맞지 않으면 아무것도 하지 않는다.
  1. 현재 모드가 EXPLORE인가
  2. 플레이어의 **현재** 위치(ref)에서 대상까지의 XZ 거리가 radius 이하인가
  3. 현재 천등 상태에서 그 액션이 가능한가 (`getAction` 재평가)
  4. 마지막으로 store 액션이 전이 규칙으로 한 번 더 확인한다
- 표시 판정과 실행 판정은 **같은 순수 함수** `resolveInteraction(defs, playerXZ, state)`를 사용한다. 그래서 '보이는데 실행 안 됨'이나 '안 보이는데 실행됨' 같은 불일치가 생기지 않는다.
- 이런 검증이 필요한 이유: 근접 대상은 값이 바뀔 때만 store에 반영되므로 한 프레임 늦을 수 있다. 또 버튼을 누른 순간과 실제 실행 사이에 플레이어가 이동했을 수 있다.
- **[결정] HUD 버튼을 클릭한 뒤 포커스가 남아 Space/Enter로 다시 실행되는 문제를 막는다.** 클릭 후 blur하거나 `onMouseDown preventDefault`로 처리한다.
- '천등 날리기' 홀드 버튼은 근접 상호작용과 별도로 표시한다 (§6 STEP 5).

---

## 9. 코드 구조 (`src/` 기준)

```
src/
  app/
    page.tsx                 # 게임 진입 (2단계~), 데스크톱 판별 후 GameCanvas 로드
    lab/lantern/page.tsx     # 1단계 기술 검증 화면 (모바일 필기 테스트 포함)
  components/
    game/        GameCanvas(ssr:false 로드), GameHUD, DesktopOnlyNotice
    world/       IndoorRoom, OutdoorArea, WritingDesk, LanternStation, FirePit
    player/      Player, PlayerController(이동·충돌), CharacterModel(GLB·애니메이션), CameraRig
    lantern/     LanternModel, HeldLantern, FlyingLantern
    writing/     WritingCanvas, WritingOverlay
    interactions/ InteractionPrompt
  stores/        gameStore.ts
  lib/
    game/        lanternTransitions.ts, worldConfig.ts, collision.ts, interaction.ts  # 순수 함수
    writing/     coords.ts, strokes.ts                                             # 순수 함수
    lantern/     drawLanternFace.ts(결정적 그리기 유틸), useLanternTexture.ts(텍스처 소유), lanternGeometry.ts(공유 Geometry)
public/
  models/        character.glb (2단계에 추가)
  constants/     lanternColors.ts, interaction.ts, animation.ts
  types/         game.ts
```
- 책임을 하나의 거대한 컴포넌트에 몰지 않는다. 다만 파일이 너무 잘게 나뉘지 않도록, 실제로 필요해진 시점에 파일을 만든다.

---

## 10. Git 브랜치 운영 규칙

간소화한 Git Flow를 사용한다.

| 브랜치 | 역할 |
|---|---|
| `main` | 정식 배포 전용. 1차·2차 배포 때만 반영 |
| `develop` | 검토를 마친 기능을 통합 |
| `feature/*` | 신규 기능 개발 |
| `fix/*` | 버그 수정 |

1. 신규 작업은 최신 `develop`에서 `feature/*`를 만들어 시작한다.
2. 브랜치명은 목적이 드러나게 짓는다 (예: `feature/lantern-prototype`).
3. 구현 후 타입 검사·린트·테스트·빌드로 검증한다.
4. 검증을 마치면 GitHub PR로 `develop`에 병합한다.
5. `main`에서 직접 개발하거나 커밋하지 않는다.
6. 정식 배포를 결정했을 때만 `develop → main` PR로 병합한다.
7. 배포 후 `main`에 `v1.0.0` 같은 태그를 붙인다. 버전은 실제 변경 범위에 따라 정한다.
8. Claude Code는 작업 시작 전에 현재 브랜치를 확인하고 새 기능의 브랜치명을 제안한다.
9. **커밋·푸시·PR 생성·병합은 사용자의 요청이나 승인 없이 진행하지 않는다.**
