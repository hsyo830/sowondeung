# 구현 계획

> 기준 문서: [PROJECT_SPEC.md](./PROJECT_SPEC.md) · 작업 기록: [DEV_LOG.md](./DEV_LOG.md) · 학습 노트: [CORE_CONCEPTS.md](./CORE_CONCEPTS.md)
> 원칙: **앞 단계의 검증이 끝나기 전에는 다음 단계를 시작하지 않는다.** 각 단계는 별도 feature 브랜치에서 진행하고 PR로 `develop`에 병합한다.

---

## 공통 검증 (모든 단계)

| 구분          | 명령 / 방법                                               |
| ------------- | --------------------------------------------------------- |
| 타입 검사     | `npx tsc --noEmit`                                        |
| 린트          | `npm run lint`                                            |
| 단위 테스트   | `npm test` (1단계에서 `"test": "vitest run"` 추가)        |
| 프로덕션 빌드 | `npm run build`                                           |
| 브라우저 확인 | `npm run dev` 후 단계별 체크리스트 (**사람이 직접 확인**) |

> 자동 검사 결과(명령 출력)와 브라우저에서 직접 확인해야 하는 항목은 DEV_LOG에 **따로 나누어** 기록한다.

### 패키지 설치 규칙 (버전 고정)

- 설치 명령에는 항상 정확한 버전과 `--save-exact`를 붙인다.
  - 1단계: `npm install --save-exact three@0.187.0 @react-three/fiber@9.8.2`
  - 1단계: `npm install --save-exact -D @types/three@0.187.0 vitest@5.1.0 vite@8.3.5 @types/node@24.19.2` (설치 결과. vite를 명시하는 이유와 `@types/node` 상향 이유는 DEV_LOG 2026-11-03)
  - 3단계: `npm install --save-exact zustand@<설치 시점 5.x 안정판>`
- `react`, `react-dom`, `next`는 현재처럼 정확한 버전(19.3.0 / 16.4.4)을 유지한다. 버전 없는 설치, `npm update`, `--force`, `--legacy-peer-deps`는 사용하지 않는다.
- 설치 직후 `npm ls react react-dom @react-three/fiber three`로 확인한다. `invalid`나 peer 경고가 있으면 **진행을 멈추고 보고한다.**
- 설치 전에 `npm view @react-three/fiber peerDependencies`를 다시 확인한다. 2026-11-03 기준 `react >=19 <19.4`이다.

---

## 1단계 — 핵심 기술 검증 (천등 + 손글씨 텍스처)

- **브랜치:** `feature/lantern-prototype`
- **설치:** `three@0.187.0`, `@types/three@0.187.0`, `@react-three/fiber@9.8.2`, `vitest` (dev). 모두 `--save-exact`로 설치한다 (위 설치 규칙)
- **화면:** `/lab/lantern` (독립 테스트 페이지, 게임 월드 없음). **모바일 터치 필기는 이 페이지에서만 테스트한다.**

### 작업 범위

1. `constants/lanternColors.ts`: 4색 단일 상수
2. `lib/writing/coords.ts`, `lib/writing/strokes.ts`: 좌표 변환과 획 데이터 변경을 담당하는 **순수 함수** (`toLogicalPoint`, `startStroke`, `appendPoint`, `undoStroke`, `clearStrokes`, `hasInk`)
3. `lib/lantern/drawLanternFace.ts`: `(ctx, colorHex, strokes)` → 배경과 획을 그리는 **결정적 그리기 유틸리티**. ctx를 변경하므로 순수 함수가 아니다.
4. `components/writing/WritingCanvas.tsx`: 512 × 768 논리 Canvas, Pointer Events, capture, cancel, `touch-action: none`, 되돌리기, 전체 지우기, 완료(1획 이상). 위 순수 함수와 그리기 유틸만 호출한다.
5. `lib/lantern/useLanternTexture.ts`: **호출한 인스턴스가 텍스처를 소유한다.** 앞면 material ref를 받는다.
   - 마운트 `useLayoutEffect`에서 텍스처를 생성하고 `material.map`에 연결한다. 같은 effect의 정리 함수에서 연결을 끊고 dispose한다.
   - 별도의 `useLayoutEffect([colorHex, strokes])`에서 다시 그린 뒤 `needsUpdate` 처리한다.
   - 렌더링 중에는 생성하지 않고, state에 넣지 않으며, 공유하지 않는다 (SPEC §5 소유권).
6. `lib/lantern/lanternGeometry.ts` + `components/lantern/LanternModel.tsx`
   - 앞·뒤·좌·우·테두리·하단 불꽃, `lit` prop으로 발광 on/off
   - 공유 Geometry는 `geometry={...}` **prop으로만** 넘기고, Material은 JSX 자식으로 선언한다. `dispose={null}`은 쓰지 않는다.
   - 개발 모드에서 공유 Geometry에 dispose 경고 리스너를 단다.
7. 테스트 페이지 구성:
   - 색상 버튼, 작성 패널, 3D 미리보기(자동 회전 토글)
   - '상승 테스트' 버튼: 누를 때마다 **새 FlyingLantern 인스턴스**를 띄우고, 높이 조건을 넘으면 언마운트한다. 4단계의 생명주기를 미리 재현하기 위해서다.
   - 개발용 `renderer.info.memory` 표시 (textures / geometries 개수)
8. Vitest: 순수 함수만 테스트한다 (`drawLanternFace`는 브라우저 시각 검증으로 확인)
   - `toLogicalPoint`: CSS 크기 ≠ 논리 크기일 때 변환, 경계 밖 clamp
   - 획 함수: 추가·되돌리기·전체 지우기, 원본 배열 불변, 빈 획 처리, `hasInk`
9. `app/layout.tsx`의 `lang="ko"`와 메타데이터 정리 (사소하지만 같이 처리)

### 기술 선택 이유

- **drei 미사용:** 필요한 것은 Canvas와 CanvasTexture뿐이라 R3F 기본 기능으로 충분하다.
- **획 배열을 원본으로 사용:** 되돌리기·재편집·테스트가 쉽고, 2D와 3D가 같은 그리기 함수를 공유한다.
- **텍스처는 공유하지 않고 인스턴스마다 소유:** 참조 카운트로 공유하면 React 커밋 순서(정리 → 실행) 때문에 Held에서 Flying으로 넘어가는 순간 텍스처가 먼저 해제된다. 재생성 비용은 무시할 수 있다.
- **Canvas 해상도를 512 × 768로 고정:** DPR 스케일을 적용하지 않아 2D 좌표와 텍스처 UV가 1:1로 대응한다.
- **`ssr: false` 동적 로드:** `cacheComponents`가 켜진 프로젝트에서 WebGL을 서버에서 렌더링하지 않기 위해서다.

### 완료 조건 (브라우저 체크리스트)

- [ ] 모서리 4곳에 마커(예: 좌상단 "ㄱ", 우하단 "끝")를 쓰면 3D 앞면의 같은 위치에 **반전·잘림 없이** 보인다
- [ ] 원을 그리면 3D에서도 원으로 보인다 (비율 왜곡 없음)
- [ ] 천등을 180° 돌렸을 때 뒷면에 글씨가 비치지 않는다
- [ ] 4가지 색상에서 2D 배경색과 3D 종이색이 육안으로 같다 (다르면 `toneMapped=false` 적용 후 재확인)
- [ ] 상승·회전 중에도 글씨가 표면에 붙어 있다
- [ ] 실제 모바일 기기(가능하면) 또는 DevTools 터치 에뮬레이션에서 `/lab/lantern` 필기 중 스크롤이 생기지 않는다
- [ ] 필기 도중 Canvas 밖으로 나갔다 들어와도 선이 끊기거나 튀지 않는다
- [ ] 되돌리기·전체 지우기 후 3D에 반영된다
- [ ] 다시 작성을 10회 반복해도 `renderer.info.memory.textures`가 늘지 않는다 (텍스처를 재생성하지 않고 갱신하는지 확인)
- [ ] '상승 테스트'를 10회 반복하고 모두 제거된 뒤 textures·geometries가 처음 값으로 돌아온다
- [ ] 첫 프레임부터 글씨가 보이고, 마운트 후 `textures` 수가 **천등 인스턴스 수 + 1**이다
  - +1은 three 0.187의 `getDFGLUT()`(`shaders/DFGLUTData.js`)가 만드는 모듈 수준 싱글톤 `DataTexture` `DFG_LUT`(16×16)다. PBR 재질을 처음 렌더할 때 한 번 생성되고 three가 해제하지 않는다. 빈 씬 0, 천등 1개 2로 측정했다.
- [ ] StrictMode 재마운트에서 정리된 T1이 남지 않는다
  - 2026-11-03 검증 결과: 이번 환경(R3F 9.8.2 ESM 번들, react-reconciler production 빌드 내장)에서는 Canvas 안의 이펙트 이중 실행이 **재현되지 않았다**. 생성 로그 1회, Canvas 안을 `<StrictMode>`로 감싸도 같았다. 그래서 이 항목은 이 환경에서 실행으로는 확인할 수 없다.
  - 다른 R3F 버전·번들 조건이나 Canvas 밖 사용에서는 이중 실행이 일어날 수 있다고 보고, 생성·해제를 한 effect에서 짝짓는 구조는 유지한다. R3F를 올리면 다시 확인한다.
- [ ] 미리보기·상승 테스트 천등을 반복해서 마운트·언마운트해도 공유 Geometry dispose 경고가 한 번도 나오지 않는다
- [ ] `npm run lint`에서 `set-state-in-effect`, `immutability`, `refs` 규칙 위반이 없다

---

## 2단계 — 3D 월드와 이동

- **브랜치:** `feature/world-setup`
- **설치:** 없음 (GLB는 three에 포함된 `GLTFLoader`로 불러온다)
- **사전 준비 (사용자 제공):** Chibi Base Mesh FBX + Mixamo `Idle`, `Walking` FBX. **Walking은 In Place 옵션을 체크해서** 내보내고, 두 클립 모두 같은 캐릭터를 Mixamo에 올려서 받는다.

### 작업 범위

1. `lib/game/worldConfig.ts`: 바닥·벽(z=0 좌우 분할)·오브젝트 AABB·상호작용 위치·플레이어 충돌 반지름을 한 곳에 정의
2. `lib/game/collision.ts`: 원 대 AABB, 축별 이동 해석 (**순수 함수 + 테스트**)
3. `IndoorRoom`, `OutdoorArea`, `LanternStation`, `WritingDesk`, `FirePit`: WorldConfig 값으로 메시 배치 (시각 전용, 상호작용 없음)
4. `PlayerController`: 키 입력 ref, useFrame 이동, delta 상한 0.1초, blur 시 키 초기화. 위치·Y회전·`isMoving`을 ref로 내보낸다. **모델을 참조하지 않는다.**
5. 캐릭터 에셋 준비:
   - 제공받은 FBX를 GLB 하나로 변환하고, 클립을 `Idle`·`Walk`로 통합해 `public/models/character.glb`에 둔다.
   - 변환 도구는 그때 확정한다. 후보는 Blender(클립 통합이 쉬움)와 FBX2glTF.
   - 변환 결과(파일 크기, 클립 이름, 본 이름 목록, **Walk Hips XZ 변화량**)를 DEV_LOG에 기록한다.
   - Walk 클립의 Hips XZ 변화량이 0이 아니면 In Place로 다시 내보낸다.
6. `CharacterModel`: `useLoader(GLTFLoader)`, `AnimationMixer`, `isMoving`이 바뀔 때만 Idle ↔ Walk crossFade, 이동 방향으로 회전 보간.
   - **충돌을 참조하지 않고 위치도 바꾸지 않는다.** 위치는 `PlayerController`만 바꾼다.
   - 스케일은 충돌 반지름에 맞춘다.
7. 손 본(`*RightHand` 등)이 있는지 확인하고 이름을 기록한다. 실제 부착은 3단계에서 한다.
8. `README.md`에 캐릭터 출처 표기 (모델명, PolyOne Studio, 원본 링크, CC BY 라이선스, Mixamo 애니메이션)
9. `CameraRig`(고정 월드 오프셋 lerp 추적), 플레이어가 실내에 있으면 z=0 벽 시각 메시를 숨김
10. `app/page.tsx`: `(any-pointer: fine)`로 판별한다. 데스크톱이면 `GameCanvas`를 `ssr: false`로 동적 로드하고, 그 외에는 `DesktopOnlyNotice`를 표시한다.

### 기술 선택 이유

- **물리 엔진 없이 AABB 사용:** 평면 이동과 정적 벽만 다루므로 직접 구현하는 편이 단순하고 테스트하기 쉽다.
- **축별 이동 해석:** 벽에 비스듬히 부딪혀도 벽을 따라 미끄러지며 이동할 수 있다.
- **이동 상태는 ref로 관리:** 매 프레임 바뀌는 값이므로 React 렌더링과 분리한다.
- **이동·충돌과 모델·애니메이션 분리:** 에셋을 교체하거나 로딩에 실패해도 이동 로직과 테스트에 영향이 없다. 충돌 크기가 모델 크기에 좌우되지 않는다.
- **GLB 하나로 통합:** 런타임에 FBXLoader를 쓰지 않아도 되고, 요청 한 번으로 모델과 모든 클립을 받는다.
- **모바일은 안내 화면만 표시:** MVP 범위를 데스크톱으로 한정하고, 모바일에서는 3D 번들을 로드하지 않는다.

### 완료 조건

- [ ] 단위 테스트: 벽 통과 불가, 출입구 통과 가능, 모서리 미끄러짐, 큰 delta에서도 관통하지 않음
- [ ] 브라우저: 실내외 왕복, 모든 벽과 오브젝트에서 충돌, 실내에서 캐릭터가 가려지지 않음
- [ ] 다른 탭에 다녀온 직후에도 벽을 관통하지 않는다
- [ ] 이동하면 Walk, 멈추면 Idle로 자연스럽게 전환되고, 이동 방향을 바라본다
- [ ] 걷는 동안 모델이 충돌 위치보다 앞서 나가거나, 루프할 때마다 뒤로 튀지 않는다 (In Place 확인)
- [ ] 캐릭터 시각 크기와 충돌 범위가 육안으로 일치한다 (벽에 파묻히거나 떠 보이지 않음)
- [ ] 손 본 이름이 DEV_LOG에 기록되어 있다
- [ ] README에 출처 표기가 있다
- [ ] DevTools 모바일 에뮬레이션(any-pointer: coarse)에서 `/`는 안내 화면을 표시하고, 네트워크 탭에 three 청크가 없다

---

## 3단계 — 수령 및 작성 플로우

- **브랜치:** `feature/lantern-flow`
- **설치:** `zustand@^5`

### 작업 범위

1. `lib/game/lanternTransitions.ts`: 상태 전이 순수 함수 + **전이 표 전체 테스트**
2. `stores/gameStore.ts`: held·mode·flying·toast·nearbyInteractionId 상태와 액션
3. 상호작용 시스템:
   - `lib/game/interaction.ts`: `resolveInteraction(defs, playerXZ, state)` **순수 함수** (가장 가까운 대상과 가능한 액션을 반환)
   - 표시: 값이 바뀔 때만 store `nearbyInteractionId` 갱신
   - 실행: `executeInteraction(id)`가 실행 시점에 모드, **현재 플레이어 위치**, 상태를 같은 함수로 다시 판정하고, 하나라도 맞지 않으면 아무것도 하지 않는다
   - `InteractionPrompt`, E키
4. 색상 선택 UI (COLOR_SELECT, ESC로 닫기), BLANK일 때 색상 재선택
5. `HeldLantern`: 손 본의 월드 위치(없으면 루트 기준 고정 오프셋)에 `LanternModel` 표시. 회전은 캐릭터 Y축 회전만 따른다. 자기 텍스처를 소유한다.
6. `WritingOverlay`: 초안 획(로컬) → 완료 시 `finishWriting`, 취소 시 폐기
7. `CameraRig`의 WRITING 모드: 책상 시점 lerp, 캐릭터 숨김, 모드 진입·이탈 시 키 상태 초기화

### 완료 조건 (기획 §11 매핑)

- [ ] #1 천등 없이 작성 불가 (테스트 + 브라우저)
- [ ] #4 작성 중 이동키 무시
- [ ] #5 작성 취소 후 기존 내용 유지
- [ ] #11 카메라 전환 후 이동 정상 복구 (키를 누른 채 진입·이탈하는 경우 포함)
- [ ] #3 완료한 글씨가 손에 든 천등에 반영
- [ ] 버튼이 중복으로 표시되지 않음, 범위를 벗어나면 숨겨짐
- [ ] 단위 테스트: `resolveInteraction`이 범위 경계, 여러 대상이 가까울 때, 상태별 액션, EXPLORE가 아닌 모드를 올바르게 처리
- [ ] 실행 시점 재검증: 버튼이 보이는 상태에서 범위 밖으로 이동한 직후 E키나 클릭을 해도 실행되지 않음
- [ ] 걷는 중에도 천등이 손 위치를 자연스럽게 따라간다

---

## 4단계 — 점화와 발사

- **브랜치:** `feature/light-and-launch`
- **설치:** 없음

### 작업 범위

1. 모닥불 상호작용 → `lightLantern`, BLANK 상태 안내 문구
2. 점화 시각 효과 (불꽃 메시, emissive, 미리 마운트해 둔 pointLight의 intensity 전환)
3. LIT 상태 실내 진입 차단 + 토스트
4. 3초 홀드 버튼 (`performance.now` 기반, ref로 진행 바 갱신, 모든 취소 이벤트 처리)
5. `launchLantern(spawnPos)` → `FlyingLantern` (useFrame 상승, 제거 조건, 최대 5개)
   - 획 데이터는 같은 배열을 참조로 넘기고, **텍스처는 FlyingLantern이 새로 만든다.** HeldLantern은 자기 텍스처만 해제한다 (SPEC §5 소유권).
   - 개발 모드에서 `renderer.info.memory`를 확인할 수 있게 한다 (1단계 표시를 재사용)

### 완료 조건 (기획 §11 매핑)

- [ ] #2 글씨 없는 천등 점화 불가
- [ ] #6 점화 후 수정 불가
- [ ] #7 점화 후 실내 재진입 불가
- [ ] #8 3초 전에 손을 떼면 발사 안 됨 (마우스 이탈, 창 전환 포함)
- [ ] #9 중복 발사 없음 (액션 멱등성 테스트 + E키와 클릭 동시 입력)
- [ ] #10 발사 후 다시 수령 가능
- [ ] #12 발사 천등의 글씨 유지, 반전 없음
- [ ] 점화 순간 프레임 끊김이 없음 (라이트 재컴파일 방지 확인)
- [ ] 발사 직후 첫 프레임부터 FlyingLantern에 글씨가 보인다 (Held → Flying 전환 중 텍스처 공백이나 해제 없음)
- [ ] **누수 검증:** 수령 → 작성 → 점화 → 발사 → 자동 제거를 10회 반복한 뒤 `textures`가 기준값(소지 천등 + 남아 있는 발사 천등 + DFG LUT 1)으로, `geometries`가 처음 값으로 돌아온다
- [ ] 최대 5개를 넘겨 연속 발사해도 오래된 천등이 제거되면서 텍스처도 함께 줄어든다

---

## 5단계 — 완성도와 QA

- **브랜치:** 작업 단위로 분리. 예: `feature/night-sky-lighting`, `feature/ui-design`, `fix/*`
- **설치:** 원칙적으로 없음 (필요하면 그때 판단)

### 작업 범위

카메라 보간 개선, 밤하늘·조명, 실내외 디테일, UI 디자인, 데스크톱 안내 화면 다듬기, 이동·충돌 회귀 테스트, 성능 점검(draw call, 텍스처 누수 재확인, 캐릭터 GLB 용량).
`/lab/lantern` 페이지를 유지할지 제거할지 결정한다.

### 완료 조건

- [ ] 기획 §11의 12개 시나리오 전체 회귀 확인
- [ ] 배포 판단 → `develop → main` PR → `v1.0.0` 태그 (사용자 승인 후)

---

## 계획 단계에서 확인한 위험 요소 요약

| 위험                                                                                 | 대응                                                                            | 단계 |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ---- |
| React 19.4 이상으로 올리면 R3F peer 범위(`<19.4`)를 벗어남                           | 정확한 버전 고정, `--save-exact`, `npm update`·`--force` 금지, 설치 후 `npm ls` | 전체 |
| Held → Flying 전환 시 텍스처가 먼저 해제됨                                           | 텍스처를 공유하지 않고 인스턴스마다 소유                                        | 1, 4 |
| 버튼 표시와 실제 실행 사이에 위치·상태가 바뀜                                        | 실행 시점에 같은 순수 함수로 재검증                                             | 3    |
| FBX 변환 시 스케일·본 이름·클립 손상                                                 | 변환 결과를 기록하고 충돌 반지름 기준으로 스케일 조정                           | 2    |
| StrictMode 재실행으로 해제된 텍스처를 재사용                                         | 생성과 해제를 같은 `useLayoutEffect`에서 짝짓고, 렌더링 중에는 생성하지 않음    | 1    |
| R3F가 공유 Geometry를 자동 해제                                                      | prop으로만 전달, dispose 경고 리스너로 검증                                     | 1    |
| Walk 루트 모션과 코드 이동이 중복                                                    | Mixamo In Place로 준비, 위치는 PlayerController만 변경                          | 2    |
| 손 본에 천등을 붙이면 스케일 상속·과도한 흔들림                                      | 본의 월드 위치만 복사                                                           | 3    |
| `cacheComponents`·SSR 환경에서 WebGL 오류                                            | Client Component에서 `ssr: false`로 로드                                        | 1, 2 |
| 텍스처 반전·색상 차이                                                                | 앞면 FrontSide, SRGB, 필요 시 toneMapped=false                                  | 1    |
| 3인칭 카메라를 z=0 벽이 가림                                                         | 실내에 있을 때 벽 시각 메시만 숨김                                              | 2    |
| 큰 delta로 벽 관통                                                                   | delta 상한                                                                      | 2    |
| 모드 전환 시 키가 눌린 채로 남음                                                     | 진입·이탈·blur 시 키 초기화                                                     | 2, 3 |
| 점화 순간 셰이더 재컴파일로 멈춤                                                     | 라이트를 미리 마운트하고 intensity만 변경                                       | 4    |
| 중복 발사                                                                            | 액션이 LIT일 때만 성공 (멱등)                                                   | 4    |
| 모바일에서 게임 플레이 불가                                                          | MVP는 데스크톱 전용, 모바일은 안내 화면 표시 (필기는 `/lab`에서만 테스트)       | 1, 2 |
| eslint-config-next의 React Compiler 계열 hooks 규칙이 렌더 중 Three 객체 변경을 경고 | 객체 변경은 useFrame·effect·핸들러에서만 수행                                   | 전체 |
