# 개발 로그

> 최신 기록을 위에 추가한다. 자동 검사 결과와 브라우저에서 직접 확인한 결과는 나누어 적는다.

---

## 템플릿

```md
## YYYY-MM-DD · N단계 · 작업 제목

- 브랜치: feature/...
- 목표:

### 변경사항

-

### 결정 / 이유

-

### 자동 검증

- [ ] tsc - [ ] lint - [ ] test - [ ] build

### 브라우저 확인 (직접)

- [ ]

### 문제 / 다음 할 일

-
```

---

## 2026-11-03 · 1단계 · 핵심 기술 검증 (천등 + 손글씨 텍스처)

- 브랜치: `feature/lantern-prototype`
- 목표: Geometry 천등, 손글씨 Canvas, CanvasTexture 반영, 상승·회전 애니메이션을 `/lab/lantern`에서 검증

### 변경사항

- 패키지 (모두 `--save-exact`)
  - dependencies: `three@0.187.0`, `@react-three/fiber@9.8.2`
  - devDependencies: `@types/three@0.187.0`, `vitest@5.1.0`, `vite@8.3.5`, `@types/node` `^20` → `24.19.2`
  - `package.json`에 `"test": "vitest run"` 추가, `vitest.config.mts` 추가 (node 환경, `@/` 별칭)
- `constants/lanternColors.ts`(4색), `constants/writing.ts`(512 × 768, 붓 두께·색), `types/game.ts`(`Point`, `Stroke`)
- 순수 함수 + 테스트: `lib/writing/coords.ts`(`toLogicalPoint`), `lib/writing/strokes.ts`(`startStroke`·`appendPoint`·`undoStroke`·`clearStrokes`·`hasInk`), `lib/game/flight.ts`(상승·흔들림·회전·delta 상한·제거 조건)
- `lib/lantern/drawLanternFace.ts`: 배경 + 획 그리기 (점 하나짜리 획은 원으로)
- `lib/lantern/lanternGeometry.ts`: 공유 Geometry 8종 + 개발 모드 dispose 경고 리스너
- `lib/lantern/useLanternTexture.ts`: 인스턴스 소유 CanvasTexture (생성·해제를 한 `useLayoutEffect`에서 짝지음, 다시 그리기는 별도 effect + `needsUpdate`)
- `components/lantern/LanternModel.tsx`: 앞·뒤·좌·우·윗면, 테두리 12개, 하단 불꽃·연료, `lit`으로 발광 on/off
- `components/lantern/FlyingLantern.tsx`: useFrame으로 ref에 위치·회전 기록, 제거 조건 충족 시 `onExpire` 1회 호출
- `components/writing/WritingCanvas.tsx`: Pointer Events, capture, cancel, `touch-action: none`, 첫 pointerId만 처리, 되돌리기·전체 지우기·완료
- `/lab/lantern`: `app/lab/lantern/page.tsx` → `components/lab/LanternLab.tsx`(Client) → `LanternLabScene`(`next/dynamic`, `ssr: false`)
  - 색상 버튼, 작성 패널, 3D 미리보기(자동 회전 / 각도 슬라이더), 점화 토글, 톤 매핑 토글(Canvas `flat`), 상승 테스트, `renderer.info.memory` 표시
- `app/layout.tsx`: `lang="ko"`, 메타데이터

### 결정 / 이유

- **vitest 5.1.0 + `@types/node` 24로 상향 (사용자 승인):** vitest 5.1.0의 optional peer `@types/node ^22 || >=24`가 기존 `^20`과 충돌(ERESOLVE, dry-run 확인). 실행 환경이 Node v24.9.0이라 타입도 맞춤.
- **`vite@8.3.5`를 devDependency에 명시 (사용자 승인):** vite가 vitest의 peer로만 설치되면 npm 버그(npm/cli#4828 계열)로 rolldown 네이티브 바이너리가 lock에서 빠져 `npm test`가 실패했다. scratchpad 복사본에서 lock만 생성해 비교: 명시 안 함 → 바이너리 0개, 명시 → 15개. 부수 효과로 lock에 빠져 있던 다른 플랫폼 optional 바이너리(sharp, next swc 등)도 기록됐다.
- **초안과 완료본 분리:** 랩 페이지가 이후 `WritingOverlay` 역할을 한다. `WritingCanvas`는 controlled 컴포넌트이고, 획 변경을 `(prev) => next` 함수로 요청한다. pointermove가 리렌더보다 빨리 연속으로 들어와도 점이 사라지지 않게 하기 위해서다.
- **앞면 재질은 흰색 color/emissive + map·emissiveMap = 같은 텍스처:** 종이색은 텍스처가 담당한다. 점화 시 단색 emissive를 더하면 검정 글씨가 종이색으로 물들기 때문에 emissiveMap도 같은 텍스처로 둔다. 두 연결 모두 훅이 명령형으로 하고 정리 함수에서 끊는다.
- **불꽃은 `visible`로만 토글:** 마운트·언마운트하면 Geometry 업로드와 셰이더 재컴파일이 생긴다.
- **윗면 추가:** SPEC 구성에는 없지만 3인칭 카메라(위에서 내려다봄)에서 속이 비어 보이지 않게 한다. 아랫면은 실제 천등처럼 열어 둔다.
- **비행 궤적은 순수 함수(`lib/game/flight.ts`):** 계산 로직은 컴포넌트에 두지 않는다는 규칙에 따름. useFrame은 경과 시간을 누적하고(delta 상한 0.1초) 결과를 ref에 쓰기만 한다.
- **`FlyingLantern`의 `onExpire`는 useFrame 안에서 1회 호출된다 (확인 필요):** 부모가 이를 받아 목록에서 제거(setState)한다. 매 프레임 상태를 바꾸는 것이 아니라 ref 가드(`hasExpiredRef`)로 한 번만 일어나는 수명 종료 이벤트라 규칙 위반이 아니라고 판단했다. 4단계에서는 store 액션 `removeFlyingLantern`이 같은 자리에서 호출된다.
- **톤 매핑 비교는 Canvas `flat` 토글로:** `LanternModel`에 랩 전용 prop을 늘리지 않으려고 renderer 수준에서 전환한다. 2D/3D 색이 다르면 그때 종이 재질 `toneMapped=false` 적용을 결정한다.

### 자동 검증

- [x] `npm run typecheck` 통과
- [x] `npm run lint` 통과 (신규 파일 `--max-warnings=0` 통과, `set-state-in-effect`·`immutability`·`refs`·`purity` error 규칙 적용 확인)
- [x] `npm test` 3파일 27개 통과 (`coords` 6, `strokes` 13, `flight` 8)
- [x] `npm run build` 통과 (`/lab/lantern` static)
- [x] `npm ls react react-dom @react-three/fiber three` — React 19.3.0 dedupe, invalid·peer 경고 없음
- [x] Prettier: 신규·수정 파일 통과

#### headless Chrome 사전 점검 (CDP 스크립트, 사람 확인을 대체하지 않음)

| 항목                           | 결과                                         |
| ------------------------------ | -------------------------------------------- |
| 마운트 직후 memory             | textures 2 · geometries 6                    |
| 완료 1회 / 완료 10회 반복      | textures 2 → 2 (재생성 없음)                 |
| 상승 테스트 10회 비행 중       | textures 12 · geometries 8                   |
| 10개 모두 제거 후 (약 20초)    | textures 2 (기준값 복귀), 비행 중 0          |
| 공유 Geometry dispose 경고     | 없음                                         |
| 완료 버튼                      | 0획일 때 비활성, 전체 지우기 후 다시 비활성  |
| 스크린샷 0° / 180° / 점화·비행 | 마커 위치·방향 일치, 원 유지, 뒷면 비침 없음 |
| 콘솔                           | `THREE.Clock` deprecated 경고 1건 (R3F 내부) |

- **textures 기준값이 인스턴스 수 + 1인 이유:** 빈 씬은 0이다. three 0.187의 `WebGLRenderer`가 PBR 재질용 DFG LUT 텍스처를 앱 전체에 하나 만들어 두기 때문이다 (`WebGLRenderer.js`의 `getDFGLUT`). 생성 로그로 확인한 결과 천등 텍스처는 하나만 만들어졌다. 그래서 완료 조건의 "textures 수 = 인스턴스 수"는 **"인스턴스 수 + 1"** 로 읽어야 한다.
- **StrictMode 항목은 Canvas 안에서 재현되지 않는다:** R3F 9.8.2 ESM 번들은 react-reconciler의 production 빌드를 내장하고 있어서, 개발 모드에서도 Canvas 안에서는 이펙트 이중 실행이 일어나지 않는다. 생성 로그는 1회뿐이었고, Canvas 안을 `<StrictMode>`로 감싸도 같았다 (감싼 코드는 제거함). 코드는 생성·해제를 한 effect에서 짝지어 두었으므로 이중 실행이 일어나도 안전한 구조다.

### 브라우저 확인 (직접) — 아직 하지 않음

- [ ] 모서리 마커가 3D 앞면의 같은 위치에 반전·잘림 없이 보인다
- [ ] 원이 3D에서도 원이다
- [ ] 180°에서 뒷면에 글씨가 비치지 않는다
- [ ] 4색에서 2D 배경색과 3D 종이색이 같다 (톤 매핑 토글로 비교 → 필요하면 `toneMapped=false` 결정)
- [ ] 상승·회전 중에도 글씨가 표면에 붙어 있다
- [ ] 모바일(또는 DevTools 터치 에뮬레이션)에서 필기 중 스크롤이 생기지 않는다
- [ ] 필기 도중 Canvas 밖으로 나갔다 들어와도 선이 끊기거나 튀지 않는다
- [ ] 되돌리기·전체 지우기 → 완료 후 3D에 반영된다 (0획은 완료할 수 없으므로 전체 지우기는 다시 쓴 뒤 완료해서 확인)
- [ ] 완료 10회 반복 후 textures 그대로
- [ ] 상승 테스트 10회 → 전부 제거 후 textures·geometries가 처음 값으로 돌아온다
- [ ] 미리보기·상승 천등을 반복해도 dispose 경고가 없다
- [ ] 어깨와 테두리가 모든 각도에서 틈 없이 이어진다 (자동 회전으로 한 바퀴)
- [ ] 4색 각각에서 어깨 색이 몸통 옆면과 같다

### 추가 변경 (같은 날, 사용자 요청)

- 천등 깊이 0.7 → 1.2 (`LANTERN_SIZE.depth`). 높이 1.8과 앞면 크기는 그대로라 텍스처 비율에는 영향이 없다. 좌우면·윗면·깊이 방향 테두리·면 위치는 모두 이 값에서 계산되므로 다른 코드는 바뀌지 않았다. SPEC §5 크기 갱신.

- 상단 어깨 추가: `createShoulderGeometry`(lanternGeometry.ts)로 사각뿔대를 직접 만들고 공유 Geometry `shoulder`로 등록했다. 높이 0.28, 윗변은 가로·깊이 모두 0.75배다. 기존 윗면 평면(`top`)은 어깨가 덮으므로 제거했다.
  - 꼭짓점을 공유하지 않는 BufferGeometry + `computeVertexNormals`로 면마다 평평한 법선을 줬다. CylinderGeometry 4분할은 모서리 음영이 둥글게 뭉개진다. 글씨가 없으므로 UV는 만들지 않았다.
  - 요청서는 몸통을 1.2 × 1.8 × 0.7로 적었지만, 직전에 깊이를 1.2로 바꾼 상태를 유지했다. 어깨 깊이는 비율로 계산하므로 깊이를 바꾸면 따라 바뀐다.
  - 앞면 PlaneGeometry, Canvas 512 × 768, 텍스처 연결, 손글씨·애니메이션 코드는 변경 없음.
  - headless 스크린샷(0°·45°·90°·180°): 어깨만 안쪽으로 꺾이고, 몸통과 어깨 사이 틈이 없고, 어깨에 글씨가 없다. memory: textures 2 · geometries 6.

- 어깨 테두리 추가: 사선 4개와 윗변 4개. 새 Geometry 없이 기존 프레임 Box를 재사용했다.
  - 윗변은 `frameAlongX`·`frameAlongZ`를 길이 축으로만 0.75배 줄였다. 두께 축은 1배라 몸통 테두리와 굵기가 같다.
  - 사선은 `frameVertical`을 Y축으로만 늘이고, 몸통 위 모서리에서 어깨 위 모서리 방향으로 회전했다. 회전값은 모듈 로드 시 한 번만 계산해 숫자 튜플로 보관한다.
  - headless 스크린샷(0°·30°·200°): 몸통 위 테두리, 사선, 윗변이 모서리에서 끊김 없이 이어진다. memory: textures 2 · geometries 6으로 변화가 없다.

### 최종 검토 (1단계 마무리)

#### 코드 검토 결과 — 수정 필요 없음

| 영역          | 확인 내용                                                                                                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 손글씨 입력   | 첫 pointerId만 처리, capture 후 up·cancel·lostpointercapture를 같은 핸들러로 종료(중복 호출은 id 비교로 무시), 경계 clamp, 함수형 갱신으로 연속 move에서 점 유실 없음                                                               |
| 순수 함수     | `coords`·`strokes`·`flight`는 DOM·Three·시간을 참조하지 않고 readonly 인자 + 새 배열 반환. 테스트 27개                                                                                                                              |
| CanvasTexture | 생성·연결·해제를 한 `useLayoutEffect`에서 짝지음, 다시 그리기는 같은 Canvas + `needsUpdate`, state·store·prop에 넣지 않음, 인스턴스마다 소유                                                                                        |
| 색상 변경     | `colorHex`가 2D(`WritingCanvas`)와 3D(`useLanternTexture`, `PaperMaterial`)에 같은 값으로 들어감. 발사 천등은 발사 시점의 색·획을 유지                                                                                              |
| 회전·상승     | 매 프레임 값은 ref(Object3D)에만 기록, delta 상한 0.1초, 제거는 ref 가드로 1회                                                                                                                                                      |
| 어깨 Geometry | 모듈 상수로 1회 생성 → 공유 Geometry 규칙과 같다 (prop으로만 전달, 해제하지 않음, dispose 경고 리스너 대상). 꼭짓점 30개(사각형 5개 × 2삼각형)                                                                                      |
| 어깨 테두리   | 새 Geometry 없음. 기존 Box를 `scale`·`quaternion`으로 재사용. 회전값은 모듈 로드 시 계산한 숫자 튜플이라 렌더 중 Three 객체를 만들지 않는다. 비균등 scale + 회전이어도 법선은 normalMatrix로 변환되므로 음영이 맞다 (스크린샷 확인) |
| Material      | 모두 JSX 자식 → R3F가 언마운트 시 해제. `dispose={null}` 없음                                                                                                                                                                       |
| 불필요한 갱신 | 메시 position 배열은 매 렌더 새로 만들어지지만 R3F가 배열 값을 비교해 같으면 적용하지 않는다. `spawn`·`PREVIEW_POSITION`은 모듈 상수라 리렌더해도 비행 위치가 초기화되지 않는다                                                     |

#### 자동 검증 (최종)

- [x] `npm run typecheck` — 오류 0
- [x] `npm run lint` + `eslint --max-warnings=0 src vitest.config.mts` — 통과
- [x] `npm run format:check` (저장소 전체) — 통과
- [x] `npm test` — 3파일 27개 통과
- [x] `npm run build` — 통과, `/lab/lantern` static
- [x] `npm ls` — React 19.3.0 dedupe, invalid·missing 0

#### headless Chrome 사전 점검 (최종 형태 기준, 사람 확인을 대체하지 않음)

| 항목                             | 결과                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| 마운트 / 완료 1회 / 완료 10회    | textures 2 · geometries 6 → 변화 없음                                                     |
| 상승 테스트 10회 → 전부 제거     | textures 12 · geometries 8 → textures 2 (geometries 8은 불꽃·연료가 처음 업로드된 공유분) |
| 완료 버튼                        | 0획에서 비활성, 전체 지우기 후 다시 비활성                                                |
| dispose 경고 / 콘솔 오류         | 없음 (`THREE.Clock` deprecated 경고 1건은 R3F 내부)                                       |
| 모바일 에뮬레이션 (390×844 터치) | Canvas 위 드래그: scrollY 60 → 60, 1획 기록 / 대조군(Canvas 밖 드래그): 60 → 411          |

#### 1단계 주요 기술 선택 요약

- **획 배열이 단일 원본** — 2D 화면과 3D 텍스처가 같은 `drawLanternFace`를 써서 결과가 항상 같고, 되돌리기·테스트·직렬화가 쉽다.
- **Canvas 512 × 768 고정 + 앞면 1.2 × 1.8** — 2:3 비율이 같아 좌표와 UV가 1:1로 대응한다. DPR 스케일을 하지 않아 변환이 단순하다.
- **텍스처는 인스턴스 소유, 획만 공유** — 참조 카운트로 공유하면 커밋 순서(정리 → 실행) 때문에 발사 순간 텍스처가 먼저 해제된다.
- **Geometry는 모듈 상수로 공유, prop으로만 전달** — 천등이 여러 개여도 Geometry 수가 고정이다. 테두리·어깨도 새 Geometry 없이 기존 Box를 scale·회전해 재사용했다.
- **매 프레임 값은 ref + useFrame** — 회전·상승이 React 렌더를 일으키지 않는다. 궤적·제거 조건은 순수 함수로 테스트한다.
- **drei 없이 R3F + three만 사용** — 필요한 것은 Canvas, CanvasTexture, 기본 Geometry뿐이라 충분했다.
- **3D는 `ssr: false` 동적 로드** — `cacheComponents` 환경에서 WebGL을 서버에서 렌더링하지 않는다.

#### 참고 (이번 범위에서 수정하지 않음)

- 아랫면이 열려 있고 각 면이 FrontSide라, 천등 바로 아래에서 올려다보면 안쪽 면이 보이지 않아 속이 비어 보인다. 게임 카메라는 위에서 내려다보므로 1단계에서는 문제가 없다. 필요하면 5단계 디테일에서 안쪽 면을 추가한다.
- 작성 중 pointermove마다 랩 페이지 전체가 리렌더되고 R3F가 천등 props를 비교한다 (텍스처는 다시 그리지 않음). 성능은 측정하지 않았다. 모바일에서 필기가 끊겨 보이면 확인할 지점이다. 게임에서는 초안이 `WritingOverlay` 로컬 state라 3D 씬과 분리된다.

### 문서 반영 (사용자 승인)

- **`useFrame` 안의 1회성 콜백 허용:** CODING_CONVENTIONS §7 프레임 루프에 예외 조건 3가지를 명시하고, CLAUDE.md 핵심 규칙에 예외 참조를 달았다.
  - 조건 판정은 순수 함수로 한다.
  - ref 가드를 호출 전에 켜서 정확히 한 번만 호출한다.
  - 매 프레임 값을 상태로 전달하는 용도로는 쓰지 않는다.
  - `FlyingLantern`은 원래 이 조건을 만족해서 동작 변경은 없고, 규칙을 참조하는 주석만 추가했다.
- **textures 기준 = 천등 인스턴스 수 + 1:** 출처를 소스로 확인했다. three 0.187 `src/renderers/shaders/DFGLUTData.js`의 `getDFGLUT()`가 모듈 수준 `let lut`에 `DataTexture`(이름 `DFG_LUT`, 16×16, RGFormat·HalfFloat)를 한 번만 만든다. `WebGLRenderer`는 `dfgLUT` uniform이 있는 PBR 재질을 그릴 때 이 텍스처를 연결한다. three가 해제하지 않으므로 앱 전체에서 고정 1개다. 측정값(빈 씬 0, 천등 1개 2, 발사 10개 12, 제거 후 2)과 일치한다. IMPLEMENTATION_PLAN 1단계·4단계 완료 조건과 SPEC §5 누수 검증 기준에 반영했다.
- **StrictMode:** 이번 환경(R3F 9.8.2)에서 Canvas 안의 이펙트 이중 실행이 재현되지 않았다는 검증 결과를 IMPLEMENTATION_PLAN과 SPEC §5에 기록했다. 다른 버전·조건에서는 일어날 수 있다고 보고, 생성·해제를 한 effect에서 짝짓는 구조는 유지한다. R3F를 올리면 다시 확인한다.
- **SPEC §2 버전 표:** `vitest 5.1.0`, `vite 8.3.5`, `@types/node 24.19.2`를 실제 설치 버전으로 적고 설치 경위를 [결정]으로 남겼다. IMPLEMENTATION_PLAN 설치 명령도 실제 명령으로 갱신했다.

### 문제 / 다음 할 일

- ~~사용자 결정 필요: `useFrame` 안에서 `onExpire` 1회 호출을 허용할지~~ → 반영 완료 (아래 "문서 반영")
- ~~문서 반영 제안 3건~~ → 반영 완료 (아래 "문서 반영")
- 확인된 geometries 수: 불꽃·연료는 점화 전 렌더되지 않아 6 → 점화 후 8
- `npm audit` moderate 17건은 설치 전부터 있던 것과 같은 숫자다. 이번 범위에서 다루지 않음

---

## 2026-11-02 · 0단계 · 기획 확정 및 문서화

- 브랜치: `feature/project-planning`
- 목표: 기획 검토, 확정 스펙·구현 계획·학습 노트 작성 (구현 없음)

### 변경사항

- `docs/PROJECT_SPEC.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/DEV_LOG.md`, `docs/CORE_CONCEPTS.md` 추가

### 결정 / 이유

- 손글씨 원본은 획 배열로 관리 → 2D와 3D가 같은 그리기 함수를 공유
- drei 미사용, zustand는 3단계에 설치, vitest는 순수 함수 테스트용
- React 19.3에 고정 (R3F 9.8 peer 범위가 `<19.4`)
- 모바일은 필기만 지원하고 캐릭터 이동은 MVP 범위 밖

### 자동 검증

- 해당 없음 (코드 변경 없음)

### 문제 / 다음 할 일

- 사용자 검토 후 1단계 `feature/lantern-prototype` 시작
