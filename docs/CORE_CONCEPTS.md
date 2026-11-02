# 직접 이해해야 할 핵심 개념

> AI가 코드를 작성하더라도 **아래 개념은 직접 설명할 수 있어야** 합니다 (포트폴리오 면접 대비).
> 각 항목의 "확인 질문"에 답할 수 있으면 이해한 것으로 봅니다.

---

## 1. R3F의 렌더링 모델: React 렌더링 vs `useFrame`

- R3F는 JSX를 Three.js 씬 그래프로 바꿔 주는 React 렌더러다. **JSX는 "무엇이 존재하는가"를, `useFrame`은 "매 프레임 어떻게 움직이는가"를 담당한다.**
- `useFrame((state, delta) => { ref.current.position.y += speed * delta })` — 프레임마다 Three 객체를 직접 바꾼다. React 리렌더링은 일어나지 않는다.
- 프레임마다 `setState`를 호출하면 1초에 60번 리렌더링이 일어나 성능이 무너진다.
- **확인 질문:** 플레이어 위치는 왜 store가 아니라 ref에 두는가? 그런데 "근처 상호작용 대상"은 왜 store에 두는가?

## 2. delta time과 프레임 독립성

- 이동량 = 속도 × delta. 이렇게 해야 60Hz와 144Hz 모니터에서 같은 속도로 움직인다.
- 탭이 비활성화됐다 돌아오면 delta가 매우 커진다 → 상한(0.1초)을 두지 않으면 벽을 뚫고 지나간다.
- **확인 질문:** delta를 곱하지 않으면 어떤 기기에서 어떤 문제가 생기는가?

## 3. Canvas 좌표 변환 (CSS 크기 ≠ Canvas 크기)

- `<canvas width=512 height=768>`은 내부 픽셀 크기이고, CSS 크기는 화면 표시 크기다.
- 입력 좌표: `x = (e.clientX - rect.left) * (512 / rect.width)`
- 이 변환이 틀리면 글씨가 커서와 어긋난 위치에 그려진다.
- 변환은 순수 함수 `toLogicalPoint(clientX, clientY, rect)`로 분리한다. DOM 없이 숫자만으로 테스트할 수 있다.
- **확인 질문:** 화면이 리사이즈되면 무엇을 다시 계산해야 하는가? (답: `getBoundingClientRect`는 이벤트마다 새로 읽는다)

## 4. Pointer Events: capture와 cancel

- 마우스·터치·펜을 하나의 API로 처리한다.
- `setPointerCapture(e.pointerId)`: 포인터가 요소 밖으로 나가도 move/up 이벤트를 계속 받는다. 선이 끊기는 문제를 막는다.
- `pointercancel`: 브라우저가 제스처를 가로채거나 전화가 오는 등 입력이 중단될 때 발생한다. 진행 중인 획과 홀드를 안전하게 종료해야 한다.
- `touch-action: none`: 터치 드래그가 스크롤로 처리되지 않게 한다.
- **확인 질문:** 3초 홀드 버튼에서 `pointerleave`와 `pointercancel`을 둘 다 처리해야 하는 이유는?

## 5. UV 매핑과 CanvasTexture

- UV는 Geometry의 각 꼭짓점이 텍스처의 어느 지점(0~1)에 대응하는지를 나타낸다. `PlaneGeometry`는 좌하단 (0,0), 우상단 (1,1)이다.
- 2D Canvas는 y가 **아래로** 증가하고, 텍스처 UV의 v는 **위로** 증가한다 → `flipY = true`(CanvasTexture 기본값)가 이 차이를 맞춰 준다. 그래서 flipY를 임의로 바꾸면 글씨가 위아래로 뒤집힌다.
- 평면의 앞면(법선 +z)에서 볼 때만 좌우가 올바르다. DoubleSide를 쓰면 뒤에서 볼 때 좌우가 반전된 글씨가 보인다.
- 종횡비: Plane 1.2 × 1.8 = Canvas 512 × 768 = 2:3. 비율이 다르면 글씨가 늘어나거나 눌린다.
- 같은 Canvas에 다시 그린 뒤에는 `texture.needsUpdate = true`로 GPU에 다시 업로드해야 한다.
- **확인 질문:** 텍스처의 글씨가 위아래로 뒤집혔다면 어떤 순서로 원인을 찾겠는가?

## 6. 색공간과 톤 매핑

- CSS HEX 색상은 sRGB이고, Three.js는 내부적으로 선형 색공간에서 계산한다. 텍스처에 `colorSpace = SRGBColorSpace`를 지정하지 않으면 색이 바래 보인다.
- R3F는 기본적으로 ACES 톤 매핑을 사용해 밝기·채도가 바뀐다. 2D와 3D 색을 똑같이 맞추려면 `toneMapped={false}`를 고려한다.
- **확인 질문:** 같은 HEX인데 3D 종이가 더 어두워 보인다면 어떤 두 가지를 확인하는가?

## 7. GPU 리소스 생명주기 (dispose)

- Geometry·Material·Texture는 GPU 메모리를 차지하고, JavaScript GC가 자동으로 해제해 주지 않는다.
- JSX로 선언한 것은 R3F가 언마운트할 때 dispose한다. **직접 `new`로 만든 것(CanvasTexture 등)은 직접 dispose해야 한다.** `map` prop으로 넘긴 텍스처를 R3F가 해제해 준다고 가정하지 않는다.
- **소유권 원칙: 만든 쪽이 해제한다.** 텍스처는 `useLanternTexture`를 호출한 컴포넌트 인스턴스 하나가 소유한다. 획 데이터만 공유하고 텍스처는 공유하지 않는다.
- **공유하면 생기는 문제:** React는 커밋할 때 사라지는 컴포넌트의 effect 정리를 새 컴포넌트의 effect 실행보다 먼저 처리한다. HeldLantern → FlyingLantern 전환 때 참조 카운트가 잠깐 0이 되면서 Flying이 받기 전에 텍스처가 해제된다.
- **StrictMode와 생성 위치:** StrictMode(Next App Router 개발 모드 기본값)는 effect를 마운트 → 정리 → 재마운트 순서로 실행한다.
  - 렌더링 중(`useState` 초기화, `useMemo`)에 만들고 effect에서 해제하면, 재마운트 때 **이미 해제된 객체를 다시 쓴다.**
  - 그래서 **생성과 해제를 같은 `useLayoutEffect` 안에서 짝짓는다.** 재실행돼도 정리 단계에서 T1을 해제하고 재마운트에서 새 T2를 만들기 때문에, 해제된 객체가 다시 쓰이지 않는다.
  - `useLayoutEffect`는 페인트와 R3F 프레임 전에 실행되므로 첫 프레임부터 텍스처가 연결된다.
- **R3F의 자동 해제 범위:** R3F는 JSX 요소로 선언해서 **자기가 만든 객체**(`<planeGeometry />`, `<meshStandardMaterial />`)를 언마운트할 때 해제한다.
  - 여러 컴포넌트가 쓰는 공유 Geometry는 `geometry={SHARED}` prop으로 넘겨서 R3F의 해제 대상에서 빠지게 한다.
  - `dispose={null}`은 하위 Material까지 해제를 막으므로 쓰지 않는다.
  - Three.js는 해제된 Geometry를 다음 렌더링에서 조용히 다시 업로드하므로 화면만 봐서는 문제를 알 수 없다. `geometry.addEventListener('dispose', ...)`로 검증한다.
- **확인 질문:**
  - 천등 10개를 날린 뒤 텍스처가 해제됐는지 어떻게 확인하는가? (`renderer.info.memory.textures`)
  - Held와 Flying이 텍스처 하나를 공유하면 발사 순간 무슨 일이 생기는가?
  - `useMemo`로 만든 텍스처를 effect에서 해제하면 StrictMode에서 무슨 일이 생기는가?

## 8. 상태 머신과 순수 함수

- **순수 함수:** 같은 입력이면 항상 같은 출력을 내고, 인자나 외부 상태를 바꾸지 않는다 (부수 효과 없음).
- **결정적이지만 순수하지 않은 함수:** `drawLanternFace(ctx, color, strokes)`는 같은 입력이면 항상 같은 그림을 그리지만, 전달받은 `ctx`를 변경한다. 그래서 순수 함수가 아니라 **결정적 그리기 유틸리티**다. Vitest가 아니라 브라우저에서 눈으로 검증한다.
- 순수 함수로 분리하는 대상:
  - 좌표 변환 (`toLogicalPoint`)
  - 획 데이터 변경 (`startStroke`, `appendPoint`, `undoStroke`, `clearStrokes`, `hasInk`). 원본 배열을 수정하지 않고 새 배열을 반환한다.
  - 상태 전이, 충돌, 상호작용 판정 (`resolveInteraction`)
- 천등 상태(NONE/BLANK/WRITTEN/LIT)와 허용 전이 표를 순수 함수로 표현한다 → UI 없이 테스트할 수 있다.
- **상호작용 실행 시점 재검증:** 버튼이 보인다고 해서 실행해도 된다는 보장은 없다. 클릭하는 순간에는 이미 플레이어가 범위 밖에 있을 수 있다. 표시와 실행이 같은 순수 함수를 각각의 시점에 다시 호출해야 둘 사이에 불일치가 생기지 않는다.
- 액션이 현재 상태를 검사하기 때문에 **중복 발사 방지가 액션 자체에서 보장된다** (멱등성). 버튼 비활성화는 보조 수단일 뿐이다.
- 천등 상태(무엇을 들고 있나)와 모드(무엇을 보고 있나)를 분리한다. 하나로 합치면 경우의 수가 곱해진다.
- **확인 질문:** 3초가 지난 순간 클릭 핸들러와 E키 핸들러가 동시에 발사를 호출하면 어떻게 되는가? `undoStroke`가 원본 배열을 직접 `pop()`하면 '작성 취소' 시나리오에서 무엇이 깨지는가?

## 9. Zustand 구독과 리렌더링

- `useGameStore(s => s.mode)`처럼 셀렉터로 필요한 값만 구독하면, 그 값이 바뀔 때만 리렌더링된다.
- `useFrame` 안에서는 훅 대신 `useGameStore.getState()`로 읽는다. 구독하지 않으므로 리렌더링이 없다.
- **확인 질문:** HUD 전체가 프레임마다 리렌더링된다면 무엇을 의심하는가?

## 10. XZ 평면 AABB 충돌

- 플레이어(원)와 벽(축 정렬 사각형)의 겹침: 원 중심에서 사각형 위 가장 가까운 점까지의 거리가 반지름보다 작으면 충돌이다.
- 축별 해석: X로 이동한 뒤 충돌하면 X 이동을 취소하고, Z도 같은 방식으로 처리한다 → 벽을 따라 미끄러진다.
- **확인 질문:** 출입구 폭이 플레이어 지름보다 좁으면 어떻게 되는가?

## 11. Next.js에서 WebGL을 다루는 방식

- Server Component에서는 `window`나 WebGL을 쓸 수 없다. 3D 영역은 `'use client'` 컴포넌트 안에서 `dynamic(() => import(...), { ssr: false })`로 불러온다.
- `ssr: false`는 Server Component에서 사용할 수 없다 (Next 16 문서).
- **확인 질문:** `page.tsx`에서 Canvas를 직접 import하면 무슨 일이 생기는가?

## 12. 패키지 버전과 peer dependency

- peer dependency는 "이 라이브러리는 호스트가 설치한 이 범위의 버전과 함께 동작한다"는 선언이다. R3F 9.8.2는 `react >=19 <19.4`를 요구한다.
- `package.json`의 `^19.3.0`은 19.x 범위 안에서 최신으로 올라갈 수 있다는 뜻이다. 그러면 19.4가 설치되어 R3F 범위를 벗어날 수 있다. 그래서 캐럿 없이 정확한 버전(`19.3.0`)으로 고정하고 `--save-exact`로 설치한다.
- `--force`나 `--legacy-peer-deps`는 경고를 숨길 뿐 호환성 문제를 해결하지 않는다.
- **확인 질문:** `npm ls react`에 `invalid`가 표시되면 무엇을 의미하는가?

## 13. 스켈레탈 애니메이션 (GLB + AnimationMixer)

- 리깅된 모델은 메시와 스켈레톤(본 계층)으로 이루어지고, 애니메이션 클립은 본의 회전·위치를 시간에 따라 바꾼다.
- `AnimationMixer`가 클립을 재생한다. 매 프레임 `mixer.update(delta)`를 호출하고, `action.crossFadeTo()`로 Idle과 Walk를 부드럽게 섞는다.
- 클립 전환은 상태가 **바뀔 때만** 한다. 매 프레임 `play()`를 호출하면 애니메이션이 처음으로 계속 되돌아간다.
- 이동·충돌(어디에 있나)과 모델·애니메이션(어떻게 보이나)을 분리한다. 그래야 모델을 바꿔도 게임 로직은 그대로 유지된다.
- **루트 모션 vs In Place:**
  - 루트 모션 클립은 엉덩이 본이 실제로 앞으로 이동한다.
  - In Place 클립은 제자리에서 걷는 동작만 한다.
  - 이 프로젝트는 위치를 코드(`PlayerController`)가 정하므로 In Place를 쓴다. 루트 모션을 쓰면 코드 이동과 겹쳐서, 모델이 충돌 위치보다 앞서 나가거나 루프할 때마다 뒤로 튄다.
- 본에 물건을 붙일 때는 본의 자식으로 넣으면 본의 스케일과 흔들림까지 그대로 물려받는다. 그래서 월드 위치만 복사하는 방식을 쓴다.
- **확인 질문:** 캐릭터가 멈춰 있는데 Walk 애니메이션이 계속 재생된다면 어디를 확인하는가? 걷는 동안 캐릭터가 1초마다 뒤로 튄다면 원인은 무엇인가?
