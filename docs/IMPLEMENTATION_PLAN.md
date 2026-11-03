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

## 2단계 — 숲속 월드와 이동

- **브랜치:** `feature/world-setup`
- **설치:** 없음 (GLB는 three에 포함된 `GLTFLoader`로 불러온다)
- **에셋 (사용자 제공, 수정하지 않음):** `public/models/background.glb`(숲 배경), `public/models/character.glb`(캐릭터)
- **2026-11-03 기획 변경:** 실내·야외 구조 대신 숲속 캠프파이어 공간 하나 (SPEC §3). 기존 `IndoorRoom`·`OutdoorArea`·`LanternStation`·`WritingDesk`·`FirePit`, 출입구 충돌, 벽 가림 처리는 만들지 않는다.

### 작업 범위

1. **에셋 구조 확인 (구현 전):** 두 GLB의 노드·메시·재질·스킨·애니메이션·크기·원점을 직접 확인하고, 테이블·모닥불 노드를 식별한다. 이름이나 좌표를 추측하지 않는다. 결과는 DEV_LOG에 기록한다.
2. `lib/game/worldConfig.ts`: 배경 배치(회전), 바닥 메시 이름·범위, 이동 범위, 충돌 영역(원·사각형), 테이블·모닥불 위치, 플레이어·캐릭터·카메라·안개 값을 한 곳에 정의
3. 순수 함수 + 테스트
   - `lib/game/terrain.ts`: 높이 격자 생성(`createHeightfield`, 샘플러를 인자로 받음), 쌍선형 높이(`getTerrainHeight`), 바닥 위 판정(`canStandOnTerrain`), 단차·경사(`canStep`)
   - `lib/game/collision.ts`: 원 대 원·사각형(`circleOverlapsCollider`), 범위(`isCircleInsideBounds`), 위치 판정(`canOccupy`), 축별 이동 해석(`resolveMove`)
   - `lib/game/movement.ts`: 키 → 방향(`getMoveDirection`), 방향 → 각도(`getYawFromDirection`), 프레임 독립 보간(`getDampFactor`, `dampAngle`)
4. `ForestBackground`: 배경 GLB를 Y축 π 회전한 그룹에 그대로 넣는다. 마운트 시 바닥 메시(`Cube_0`)에 광선을 쏴서 높이 격자를 만들어 ref로 넘긴다. 바닥 연장 평면 + 가장자리 띠 + 안개로 섬 경계를 숨긴다.
5. `PlayerController`: 키 입력 ref, useFrame 이동, delta 상한 0.1초, blur·visibilitychange 시 키 초기화. 위치·바라볼 각도·`isMoving`을 ref로 내보낸다. **모델을 참조하지 않는다.** 높이 격자가 준비되기 전에는 움직이지 않는다.
6. `CharacterModel`: `useLoader(GLTFLoader)`, `AnimationMixer`(effect에서 생성·정리), `isMoving`이 바뀔 때만 Idle ↔ Walk crossFade, 이동 방향으로 회전 보간.
   - **충돌을 참조하지 않고 위치도 정하지 않는다.** playerRef를 읽어서 그대로 표시한다.
   - 스케일은 충돌 반지름에 맞춘다 (스케일 4, 반지름 0.4).
   - 클립이 없으면 정지 자세로 표시하고 개발 콘솔에 경고한다 (에셋이 바뀌어 클립이 빠질 때 대비).
7. 손 본 이름을 기록한다 (애니메이션 통합 후 `RightHand`). 실제 부착은 3단계에서 한다.
8. `README.md`에 두 에셋의 출처·라이선스 표기
9. `CameraRig`: 고정 월드 오프셋 (0, 4.2, 6.5) 지수 감쇠 추적, 첫 프레임은 바로 배치
10. `app/page.tsx` → `GameEntry`(Client): `(any-pointer: fine)`을 `useSyncExternalStore`로 읽는다. 데스크톱이면 `GameCanvas`를 `ssr: false`로 동적 로드하고, 그 외에는 `DesktopOnlyNotice`를 표시한다.
11. 개발 모드 전용 `ColliderDebug`(` 키): 충돌 영역·이동 범위를 와이어프레임으로 표시해 에셋과 맞는지 눈으로 확인한다.
12. **(추가) 캐릭터 애니메이션 통합:** 제공 GLB에 클립이 없어 Mixamo `Idle.fbx`·`Walking.fbx`(In Place)를 Node에서 `FBXLoader` + `GLTFExporter`로 `character.glb` 하나로 합친다. 원본 GLB는 `assets-source/character/`에 백업하고 FBX도 그곳으로 옮긴다 (`public` 밖, `.gitignore`). 절차는 `scripts/merge-character.mjs`로 보존한다 (기본은 초안만 생성, `--replace`일 때만 백업 후 교체).

### 기술 선택 이유

- **물리 엔진 없이 높이 격자 + 2D 충돌:** 바닥 높이 차가 0.23뿐이고 장애물이 모두 정적이다. 직접 구현하는 편이 단순하고 테스트하기 쉽다.
- **바닥 높이를 매 프레임 광선으로 재지 않고 격자로 미리 샘플링:** 이동 판정이 Three 없이 순수 함수로 테스트된다. 광선은 로드 시 한 번(39 × 39)만 쏜다.
- **장애물은 메시 단면을 측정한 원·사각형:** 메시 충돌(삼각형 단위)은 비용이 크고, 비스듬한 줄기·뿌리 때문에 바운딩 박스는 실제보다 훨씬 크다. 몸통 높이에서 자른 단면이 실제로 부딪히는 범위다.
- **축별 이동 해석:** 장애물에 비스듬히 부딪혀도 막히지 않은 축으로 미끄러진다.
- **배경 회전 + 카메라 높이 제한 + 이동 범위 설계로 가림 해결:** 가리는 메시를 매 프레임 숨기는 방식보다 단순하고, GLB 노드를 건드리지 않는다.
- **경계 숨김은 연장 평면·띠·안개만:** 배경 GLB의 `Ground` 재질 객체를 그대로 써서 색이 맞는다. 셰이더·지형 생성 없이 메시 5개로 끝난다.
- **이동 상태는 ref로 관리:** 매 프레임 바뀌는 값이므로 React 렌더링과 분리한다.
- **이동·충돌과 모델·애니메이션 분리:** 에셋을 교체하거나 클립이 없어도 이동 로직과 테스트에 영향이 없다. 충돌 크기가 모델 크기에 좌우되지 않는다.
- **모바일은 안내 화면만 표시:** MVP 범위를 데스크톱으로 한정하고, 모바일에서는 3D 번들을 로드하지 않는다.

### 완료 조건

- [ ] 단위 테스트: 장애물 통과 불가, 모서리 미끄러짐, 큰 delta에서도 관통하지 않음, 이동 범위·바닥 밖(허공)으로 나가지 못함, 급경사·높은 단차를 넘지 못함, 높이 격자 보간, 시작 위치가 이동 가능한 곳
- [ ] 브라우저: 테이블·모닥불·나무·바위에서 충돌하고, 그 위로 올라가지 않는다
- [ ] 브라우저: 개발 모드 ` 키로 본 충돌 영역(빨강)이 실제 에셋과 육안으로 맞는다
- [ ] 브라우저: 이동 범위 어디에서도 섬 절벽·허공이 보이지 않는다 (가장자리의 가는 선 정도는 기록)
- [ ] 브라우저: 카메라가 나무 잎 속에 들어가거나 바위에 가려 캐릭터가 안 보이는 위치가 없다 (풀 덤불은 예외로 기록)
- [ ] 다른 탭에 다녀온 직후에도 장애물을 관통하지 않는다
- [ ] 캐릭터가 이동 방향을 바라보고, 지면에 떠 있거나 파묻히지 않는다
- [ ] 이동하면 Walk, 멈추면 Idle로 자연스럽게 전환된다
- [ ] 걷는 동안 모델이 충돌 위치보다 앞서 나가거나, 루프할 때마다 뒤로 튀지 않는다 (In Place 확인)
- [ ] 캐릭터 시각 크기와 충돌 범위가 육안으로 일치한다
- [ ] 손 본 이름이 DEV_LOG에 기록되어 있다
- [ ] README에 두 에셋의 출처 표기가 있다
- [ ] DevTools 모바일 에뮬레이션(any-pointer: coarse)에서 `/`는 안내 화면을 표시하고, 네트워크 탭에 three 청크가 없다
- [ ] `/lab/lantern`이 1단계와 같이 동작한다

---

## 3단계 — 수령 및 작성 플로우

- **브랜치:** `feature/lantern-flow` (실제 작업: `feature/lantern-interaction`)
- **설치:** `zustand@^5` → 5.0.16 `--save-exact`로 설치

### 작업 범위

1. `lib/game/lanternTransitions.ts`: 상태 전이 순수 함수 + **전이 표 전체 테스트**
2. `stores/gameStore.ts`: held·mode·flying·toast·nearbyInteractionId 상태와 액션
3. 상호작용 시스템:
   - `lib/game/interaction.ts`: `resolveInteraction(defs, playerXZ, state)` **순수 함수** (가장 가까운 대상과 가능한 액션 목록을 반환)
   - 대상은 `table`·`campfire` 두 개다. 거리는 WorldConfig 충돌 영역 **표면까지** 잰다 (SPEC §8). 두 범위가 통로(폭 1.35)에서 겹치므로 더 가까운 쪽만 표시하고, `reach` 값을 여기서 정한다.
   - 테이블은 상태별로 버튼이 다르다: NONE '천등 받기' / BLANK '소원 작성하기' + '색상 다시 고르기' / WRITTEN '소원 수정하기' / LIT 없음 (SPEC §6). E키는 주 액션만 실행한다.
   - 표시: 값이 바뀔 때만 store `nearbyInteractionId` 갱신
   - 실행: `executeInteraction(id)`가 실행 시점에 모드, **현재 플레이어 위치**, 상태를 같은 함수로 다시 판정하고, 하나라도 맞지 않으면 아무것도 하지 않는다
   - `InteractionPrompt`, E키
4. 색상 선택 UI (COLOR_SELECT, ESC로 닫기), 테이블에서 BLANK일 때 색상 재선택
5. `HeldLantern`: 손 본 `RightHand`의 월드 위치(없으면 루트 기준 고정 오프셋)에 `LanternModel` 표시. 회전은 캐릭터 Y축 회전만 따른다. 자기 텍스처를 소유한다.
   - Idle·Walk에서 손이 몸 옆으로 내려와 흔들린다. 손 본 위치를 그대로 쓸지, 고정 오프셋(몸 앞)을 쓸지 여기서 정한다.
6. `WritingOverlay`: 초안 획(로컬) → 완료 시 `finishWriting`, 취소 시 폐기
7. `CameraRig`의 WRITING 모드: 테이블 상판(`LANDMARKS.table`) 시점 lerp, 캐릭터 숨김, 모드 진입·이탈 시 키 상태 초기화

### 구현 결과와 계획 비교 (2026-11-03, 브랜치 `feature/lantern-interaction`)

| 계획                                                 | 구현                                                                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1. 전이 순수 함수 + 전이 표 전체 테스트              | 완료. 4개 액션 × 4개 상태 16칸 테스트. light·launch는 함수·테스트만 있고 store 연결은 4단계                            |
| 2. store: held·mode·flying·toast·nearbyInteractionId | **변경:** held·mode·nearbyInteractionId만. flying·toast는 쓰는 곳이 생기는 4단계에서 추가                              |
| 3. 상호작용: 대상 table·campfire, 표면 거리          | **변경:** 대상은 table만 (모닥불은 4단계). **추가:** 바라보는 방향 판정(60°)과 히스테리시스(유지 0.9 / 75°). reach 0.7 |
| 3. `executeInteraction(id)` 실행 시점 재검증         | 완료 (`components/interactions/interactionRuntime.ts`). 표시와 같은 함수·같은 입력                                     |
| (추가) 탁자 선택 강조                                | `TableHighlight`: 탁자 메시 2개에만 inverted hull                                                                      |
| 4. 색상 선택 UI, BLANK 재선택                        | 완료 (`ColorSelectPanel`, ESC·닫기)                                                                                    |
| 5. HeldLantern (손 본 위치 or 몸 앞 고정)            | 손 본 위치 + 오프셋, 스케일 0.26. 캐릭터 바깥 그룹의 자식으로 두고 위치만 복사                                         |
| 6. WritingOverlay                                    | 완료. 3D 종이(`WritingPaper`)의 화면 투영 위치에 `WritingCanvas`를 겹침                                                |
| 7. CameraRig WRITING                                 | 완료. 진행률 블렌드 0.6초, 캐릭터 숨김, 모드 전환 시 키 초기화(`PlayerController`)                                     |

- 자동 검증과 headless 사전 점검 결과는 DEV_LOG 2026-11-03 · 3단계. 아래 완료 조건 중 테스트로 확인한 항목도 **브라우저 직접 확인 전에는 체크하지 않는다.**
- 테스트로 확인됨: #1(전이·store), #5(store 취소 시 획 유지), `resolveInteraction` 단위 테스트 전 항목, 중복 수령 방지.

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
- [ ] (추가) 탁자를 바라볼 때만 강조·버튼이 나타나고, 멀어지거나 돌아서면 사라진다. 강조가 탁자 외 메시에 번지지 않는다
- [ ] (추가) NONE·BLANK에서 모닥불을 바라봐도 강조·버튼이 없다
- [ ] (추가) 작성·수정을 반복해도 `renderer.info.memory`가 늘지 않는다

---

## 4단계 — 점화와 발사

- **브랜치:** `feature/light-and-launch` (실제 작업: `feature/lantern-ignition-launch`)
- **설치:** 없음

### 작업 범위

1. 모닥불(`campfire`) 상호작용 → `lightLantern` (WRITTEN에서만), ~~BLANK 상태 안내 문구~~ (4단계 요청으로 모닥불 앞 안내 없음, 상태 표시줄이 안내)
2. 점화 시각 효과 (천등 불꽃 메시, emissive, 미리 마운트해 둔 pointLight의 intensity 전환)
3. 3초 홀드 버튼 (**F키** 또는 버튼): LIT이면 이동 가능 영역 어디서든 표시 (`performance.now` 기반, ref로 진행 바 갱신, 모든 취소 이벤트 처리)
4. `launchLantern(spawnPos)` → `FlyingLantern` (useFrame 상승, 제거 조건, 최대 5개)
   - 획 데이터는 같은 배열을 참조로 넘기고, **텍스처는 FlyingLantern이 새로 만든다.** HeldLantern은 자기 텍스처만 해제한다 (SPEC §5 소유권).
   - 개발 모드에서 `renderer.info.memory`를 확인할 수 있게 한다 (1단계 표시를 재사용)

### 구현 결과와 계획 비교 (2026-11-03, 브랜치 `feature/lantern-ignition-launch`)

| 계획                                                   | 구현                                                                                                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. 모닥불 상호작용 → `lightLantern` (WRITTEN에서만)    | 완료. `INTERACTION_TARGETS`에 `campfire`(충돌 원 그대로) 추가, 거리·방향·히스테리시스·실행 재검증은 3단계 함수 그대로                                                                                  |
| 1. BLANK 안내 문구                                     | **변경:** 모닥불 앞 안내 없음 (요청: NONE·BLANK·LIT에서 버튼·강조 없음). 상태 표시줄 문구로 안내                                                                                                       |
| (추가) 모닥불 강조                                     | `TableHighlight` → `InteractionHighlight`로 일반화, 돌 링 18개에 inverted hull. 불꽃·장작·조명 제외                                                                                                    |
| 2. 점화 효과 (불꽃 메시, emissive, pointLight)         | 완료. emissive = 손글씨 텍스처 × 안쪽 불빛 색, 흔들림 ±8% + 점화 순간 밝아짐(`lanternGlow.ts`). pointLight는 씬 루트에 하나, intensity만 변경                                                          |
| 3. 3초 홀드 버튼                                       | 완료. **F키**(SPEC 기존 E에서 변경) + 화면 아래 고정 버튼. `launchHold.ts` 순수 함수, rAF로 DOM 직접 갱신                                                                                              |
| 4. `launchLantern(spawnPos)` → FlyingLantern, 최대 5개 | **변경:** `launchLantern(pose)` (위치 + 방향 + drift). 손 천등 그룹의 실제 월드 위치에서 출발, 크기는 손 천등과 같게. 1단계 FlyingLantern에 선택 prop(yaw·drift·scale·profile·glow)만 추가해 랩과 공유 |
| 4. 텍스처는 FlyingLantern이 새로 만듦                  | 완료 (같은 획 참조, 인스턴스별 텍스처)                                                                                                                                                                 |
| 4. 개발 모드 `renderer.info.memory`                    | 랩의 `MemoryProbe`를 `components/game/`으로 분리해 게임 화면 오른쪽 위에 표시 (개발 모드만)                                                                                                            |
| (추가) 발사 카메라 연출                                | 사용자 요청으로 추가. 대기 1초 → 실제 천등 위치를 속도 제한 스프링으로 3초 추적 → 1초 복귀. `CameraRig` 하나, 카메라 위치·궤적 변경 없음. 천등 위치는 FlyingLantern과 같은 순수 함수로 계산            |

- 자동 검증과 headless 사전 점검 결과는 DEV_LOG 2026-11-03 · 4단계. 아래 완료 조건 중 테스트·headless로 확인한 항목도 **브라우저 직접 확인 전에는 체크하지 않는다.**
- 테스트로 확인됨: #2, #6, #9(액션 멱등성), #10, 최대 5개(목록 함수·store), 홀드 규칙(3초 미만 취소·반복 시작 무시·재시작 0%), 모닥불 상태별 판정.
- headless로 확인됨(사람 확인 대체 아님): #7, #8(떼기·pointerleave·blur), #9(포인터 + F 동시), #12(글씨 반전 없음), 누수(20회), 최대 개수, 점화 시 프레임 간격, 발사 카메라 연출(시간·각속도·복귀·이동 중 추적).
- **최종 검증 (2026-11-03, 4단계 마무리):** typecheck · lint · format · test 222개 · build 통과. headless 회귀 43항목 (1~3단계 흐름·`/lab/lantern` 포함) 통과. 상세는 DEV_LOG '4단계 마무리'.

### 다음 단계로 미룬 항목

- ~~새 Idle·Walk 애니메이션 교체, Throw(발사)·Praying 애니메이션 추가 → 별도 브랜치~~ → 아래 '4단계 추가 개선 — 캐릭터 애니메이션'
- 발소리·버튼·모닥불 효과음 → 별도 브랜치
- UI 리디자인 (홀드 버튼·상호작용 버튼 포함) → 5단계 또는 별도 브랜치
- 장작 강조 (법선 방향 Geometry 가공 필요), 발사 천등이 화면 밖으로 나간 뒤의 하늘 연출 → 필요 시 검토
- 위 완료 조건의 **브라우저 직접 확인** (아직 하지 않음)

### 완료 조건 (기획 §11 매핑)

- [ ] #2 글씨 없는 천등 점화 불가
- [ ] #6 점화 후 수정 불가
- [ ] #7 LIT이면 테이블·모닥불 범위 밖을 포함한 이동 가능 영역 어디서든 발사 버튼이 보인다 (2026-11-03 변경, 기존: 점화 후 실내 재진입 불가)
- [ ] 발사 천등이 나무 캐노피에 가려져도 상승·제거가 정상이다 (숲 배경 추가로 새로 생긴 확인 항목)
- [ ] #8 3초 전에 손을 떼면 발사 안 됨 (마우스 이탈, 창 전환 포함)
- [ ] #9 중복 발사 없음 (액션 멱등성 테스트 + F키와 클릭 동시 입력)
- [ ] #10 발사 후 다시 수령 가능
- [ ] #12 발사 천등의 글씨 유지, 반전 없음
- [ ] 점화 순간 프레임 끊김이 없음 (라이트 재컴파일 방지 확인)
- [ ] 발사 직후 첫 프레임부터 FlyingLantern에 글씨가 보인다 (Held → Flying 전환 중 텍스처 공백이나 해제 없음)
- [ ] **누수 검증:** 수령 → 작성 → 점화 → 발사 → 자동 제거를 10회 반복한 뒤 `textures`가 기준값(소지 천등 + 남아 있는 발사 천등 + DFG LUT 1)으로, `geometries`가 처음 값으로 돌아온다
- [ ] 최대 5개를 넘겨 연속 발사해도 오래된 천등이 제거되면서 텍스처도 함께 줄어든다
- [ ] (추가) 모닥불을 바라볼 때만 돌 링에 얇은 테두리와 'E 불 붙이기'가 나타나고, 멀어지거나 돌아서면 사라진다. 불꽃·장작·조명은 강조되지 않는다
- [ ] (추가) 점화 직후 천등이 0에서 따뜻하게 밝아졌다가 은은하게 흔들린다. 4색 모두 선택한 색이 유지되고 손글씨가 읽힌다
- [ ] (추가) 발사 순간 천등이 손 위치에서 같은 크기·방향으로 출발하고(튐 없음), 머리를 뚫지 않고 오른다
- [ ] (추가) F를 누른 채 다른 창으로 전환했다 돌아오면 0%이고, 다시 누르면 0%부터 센다
- [ ] (추가) 발사 후 1초는 기존 시점, 이후 3초 동안 시선이 오르는 천등을 천천히 따라 들리고, 1초 동안 원래 시점으로 튐 없이 돌아온다. 연출 중 이동해도 카메라가 따라온다

---

## 4단계 추가 개선 — 캐릭터 애니메이션 (Idle·Walk 교체, Throw·Praying)

- **브랜치:** `feature/character-animations`
- **설치:** 없음 (Blender 미사용, 기존 `scripts/merge-character.mjs` 재사용)

### 작업 범위

1. Mixamo `updated/` FBX 4개 사전 검증 (스켈레톤·바인드 행렬·클립 길이·루트 이동·`RightHand`)
2. `character.glb`를 클립 4개(`Idle`·`Walk`·`Throw`·`Praying`)로 다시 통합. 외형·재질·크기·방향·손 본 유지, 기존 GLB 백업
3. Idle·Walk 교체 (팔과 몸통·손 천등 사이 간격 확인, 필요하면 손 오프셋 최소 조정)
4. 발사 흐름 Idle/Walk → Throw → Praying → Idle. 천등 분리 = Throw에서 손을 놓는 순간, 카메라 연출 = 분리 순간부터
5. 발사·기도 중 이동 잠금은 기존 모드 잠금 재사용 (`LAUNCHING`)

### 구현 결과 (2026-11-03)

| 계획                  | 구현                                                                                                                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. 사전 검증          | 4개 모두 본 32·트랙 26·스킨 본 순서·바인드 역행렬이 기존 모델과 같음 (rest 차이는 매 프레임 덮이는 `Head` 하나). **처음 받은 Walking은 In Place가 아니어서(루프마다 22.7cm 전진) 다시 받음.** Throw는 루트 XZ 최대 23.7cm 이동            |
| 2. GLB 통합           | 모델은 2단계 `mixamo/Idle.fbx` 그대로, 클립만 `updated/`. Throw만 스크립트에서 루트 XZ 고정. 검사 24항목 통과, 정점·재질·bbox 원본과 같음. 319 KB → 407 KB. 백업 2개(`backups/`)                                                          |
| 3. Idle·Walk 교체     | 손 천등 중심과 몸 축의 최소 수평 거리 Idle 0.43 → 0.50, Walk 0.39 → 0.45. `handOffset`은 그대로 두고, 손 본이 없을 때 쓰는 `fallbackPosition`만 새 Idle 기준으로 바꿈                                                                     |
| 4. Throw·Praying 연동 | 홀드 완료 → `beginLaunch`(LAUNCHING, 천등은 손에) → Throw(0.6초부터, 1.3배속) → 클립 3.33초에 `launchLantern(pose)` → Praying → `finishLaunch`. 단계 전이·놓는 시점 판정은 `lib/game/launchAnimation.ts` 순수 함수. 카메라 코드 변경 없음 |
| 5. 이동 잠금          | `GameMode`에 `LAUNCHING` 추가 → 이동·키·상호작용·홀드 버튼은 기존 `mode !== "EXPLORE"` 규칙으로 잠김. `closeOverlay`가 LAUNCHING을 풀지 않도록 수정                                                                                       |

- 자동 검증: typecheck · lint · format · test **235개**(222 + 13) · build 통과. 실제 GLB + `AnimationMixer` 60fps 시뮬레이션(사람 확인 대체 아님): 놓기 2.12초 · Throw 끝 3.97초 · 기도 끝 7.42초, 2회 반복 동안 finished 각 1회·리스너 1개, 놓는 순간 천등 수평 거리 0.45(위치 보정 없음). 상세는 DEV_LOG.
- 브라우저 직접 확인은 아직 하지 않았다. 아래 완료 조건은 직접 확인 후 체크한다.

### 완료 조건

- [ ] 정지하면 새 Idle, 이동하면 새 Walk. 전환이 부드럽고 걷는 동안 앞으로 미끄러지거나 루프마다 튀지 않는다
- [ ] 팔이 몸통과 덜 겹친다. 빈손·천등을 든 상태 모두 오른손과 몸통 사이에 공간이 있고 천등이 몸을 뚫지 않는다
- [ ] 홀드 완료 → Throw가 **한 번** 재생되고, 손을 앞으로 뻗는 순간 천등이 손에서 떨어져 오른다 (먼저 떨어지거나 손이 지나간 뒤 떨어지지 않음)
- [ ] Throw 중 천등이 머리·몸을 심하게 뚫지 않는다 (와인드업에서 손이 머리 뒤로 간다)
- [ ] Throw → Praying → Idle이 갑자기 튀지 않고, Praying은 한 번만 재생된다
- [ ] Throw·Praying 동안 이동·E키·홀드 버튼이 잠기고, 끝나면 입력 없이 다시 움직일 수 있다. 걷는 중에 홀드가 끝나도 미끄러지지 않고 멈춰서 던진다
- [ ] 카메라 연출이 천등이 실제로 떨어진 순간부터 1초 대기 → 3초 추적 → 1초 복귀한다
- [ ] 반복 발사(5회 이상)해도 천등이 한 번에 하나씩만 생기고, 애니메이션이 겹치거나 빨라지지 않는다
- [ ] 탁자 받기·작성·모닥불 점화·색상·손글씨가 이전과 같다

---

## 5단계 작업 — 플레이 방법·사운드 (도움말 모달, BGM·효과음)

- **브랜치:** `feature/game-guide-audio`
- **설치:** 없음 (브라우저 Web Audio API·`<dialog>`·인라인 SVG. 오디오·UI 라이브러리 추가 없음)
- **디자인 기준:** 사용자 제공 레퍼런스 `조작UI.png` (크림·금색 패널, 위쪽 원형 천등 장식, 단계별 일러스트 카드, 채널 카드)

### 작업 범위

1. 우측 상단 버튼 2개(플레이 방법 `?`, 소리 설정 스피커). 개발용 메모리 표시는 버튼 아래로 이동(`NODE_ENV` 조건 유지)
2. 플레이 방법 모달: 4단계 안내(실제 키·판정과 일치), 조작 방법, 3D 에셋 출처 카드 2개
3. 소리 설정 모달: BGM·효과음 독립 볼륨(0~100)·음소거(이전 볼륨 복원), localStorage 저장
4. 오디오 엔진: BGM 반복, 모닥불 근접 음량, 발소리(Walk 발 디딤 시점), UI 클릭, 종이(받기·색 변경·작성 열기), 점화·발사(파일 받으면 연결)
5. 모달 중 게임 입력 잠금(이동·E·F·ESC로 작성 닫기), 키 눌림 초기화, 포커스 이동·복원
6. 기존 게임 로직(상태 전이·이동·충돌·애니메이션·카메라)은 바꾸지 않는다. 입력 처리부에 잠금 확인 한 줄씩, `CharacterModel`에 `onFootstep` 콜백만 더한다

### 구현 결과 (2026-11-03)

| 계획           | 구현                                                                                                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. 버튼        | `components/menu/GameMenuBar.tsx`. 44px 정사각형 둥근 버튼 2개(같은 크기·간격), 크림 배경·금색 테두리·갈색 아이콘. 소리 버튼은 두 채널이 모두 꺼지면 음소거 아이콘. 상태 표시줄은 버튼과 겹치지 않게 너비 제한                |
| 2. 플레이 방법 | `PlayGuideDialog.tsx`. 일러스트 4개는 인라인 SVG(천등 색은 `LANTERN_COLORS`), 조작 표, 출처 카드(넓으면 2열·좁으면 1열). 문구에 '바라보고 E'(방향 판정)를 반영                                                                |
| 3. 소리 설정   | `SoundSettingsDialog.tsx` + `stores/audioSettingsStore.ts` + `lib/audio/audioSettings.ts`(순수). 음소거는 플래그라 볼륨 값이 남는다. 슬라이더를 움직이면 음소거 해제. 저장 값은 검사 후 기본값으로 채운다                     |
| 4. 오디오      | `lib/audio/audioEngine.ts`(모듈 싱글턴), `components/audio/GameAudio.tsx`(입력 시 unlock·store 구독·클릭 위임), `CampfireAudio.tsx`(useFrame 거리). 판정은 `lib/audio/soundRules.ts`(순수)                                    |
| 5. 입력 잠금   | `stores/menuStore.ts`의 `isGameInputBlocked()`를 PlayerController·InteractionPrompt·LaunchHoldButton·ColorSelectPanel·WritingOverlay가 확인. 창 열고 닫을 때 눌린 키 비움·홀드 취소. 네이티브 `<dialog>`(inert·포커스 가두기) |
| 6. 기존 기능   | 상태 전이·store 액션 변경 없음. 효과음은 store 변화 구독으로만 연결                                                                                                                                                           |

- 파일 현황: `bgm`·`campfire`·`footstep`·`paper`·`ui-click` 있음. **`ignite`(점화)·`launch`(발사)는 없음** → `AUDIO_FILES`에 `null`, 요청·재생하지 않는다. 받으면 경로와 `ONE_SHOT_CONFIG` 값만 채운다.

### 완료 조건

자동 (2026-11-03 통과): typecheck · lint · format · test · build, headless Chrome 사전 점검(DEV_LOG).

브라우저 직접 확인:

- [ ] 우측 상단 버튼이 게임 배경 위에서 잘 보이고, hover·active가 가볍다. 개발 표시(textures·geometries)와 겹치지 않는다
- [ ] 두 모달이 열리고 ESC·닫기 버튼·바깥 클릭으로 닫힌다. 작은 창에서도 잘리지 않고 안쪽만 스크롤된다
- [ ] 출처 링크 4개가 새 창으로 열리고, 제작자·라이선스가 README와 같다
- [ ] 첫 클릭·키 입력 후 BGM이 페이드 인되고, 모달을 열고 닫아도 다시 시작하지 않는다. 반복 지점이 자연스럽다
- [ ] BGM·효과음 슬라이더가 즉시, 서로 독립으로 반영된다. 음소거 → 해제하면 이전 볼륨. 새로고침 후 유지
- [ ] 걷는 동안만 발소리가 걸음에 맞춰 나고, 멈추거나 벽에 막히면 멈춘다. 끊기거나 겹치지 않는다
- [ ] 모닥불에 다가가면 타닥 소리가 커지고 멀어지면 작아진다. 갑자기 시작·끊기지 않는다. 효과음 볼륨·음소거를 따른다
- [ ] 버튼 클릭 소리가 작고 부드럽고, 빠르게 연타해도 커지지 않는다. 홀드 버튼은 클릭 소리를 내지 않는다
- [ ] 천등 받기·색 다시 고르기·작성 화면 열기에서 종이 소리가 난다
- [ ] (파일 받은 뒤) 점화 성공 시에만 점화 소리, Throw에서 천등이 손을 떠나는 순간 발사 소리 한 번
- [ ] 모달이 열린 동안 이동·E·F가 실행되지 않는다. 이동키를 누른 채 열거나 닫아도 계속 걷지 않는다. 작성·색상 선택 중에 열고 닫으면 그 화면으로 돌아온다 (작성 중인 글씨 유지)
- [ ] 기존 기능 회귀: 숲·조명·불꽃, 이동·충돌, Idle·Walk·Throw·Praying, 받기·색상·작성·수정·점화·3초 발사·상승·카메라 추적

---

## 5단계 — 완성도와 QA

- **브랜치:** 작업 단위로 분리. 예: `feature/night-sky-lighting`, `feature/ui-design`, `fix/*`
- **설치:** 원칙적으로 없음 (필요하면 그때 판단)

### 작업 범위

카메라 보간 개선, UI 디자인, 데스크톱 안내 화면 다듬기, 이동·충돌 회귀 테스트, 성능 점검.
(밤하늘·조명·모닥불 빛은 4단계 전에 `feature/forest-atmosphere`에서 먼저 했다: 초저녁 분위기, 모닥불 냄비 숨김·불꽃 일렁임·pointLight. DEV_LOG 2026-11-03 · forest-atmosphere. 5단계에서는 브라우저 확인 결과에 따라 값만 다듬는다.)
`/lab/lantern` 페이지를 유지할지 제거할지 결정한다. → **결정 (visual-polish):** 삭제하지 않고 개발 환경에서만 접근한다. `app/lab/layout.tsx`가 프로덕션에서 `notFound()`로 404를 돌려준다.

- 성능 점검 대상 (2단계에서 확인한 배경 GLB 특성):
  - 배경 GLB 4.1 MB, 삼각형 약 4.8만 개, 메시 약 250개 → draw call 약 250 이상. 필요하면 정적 메시 병합을 검토한다 (원본 GLB는 수정하지 않고 런타임에서).
  - 등불의 `Glass` 재질이 `KHR_materials_transmission`을 쓴다. three는 투과 재질이 있으면 불투명 씬을 한 번 더 렌더링한다. 프레임이 부족하면 런타임에서 이 재질만 대체하는 것을 검토한다.
  - 캐릭터 GLB 용량 (클립 추가 후)

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
| 캐릭터 GLB에 애니메이션 클립이 없음 (2단계 확인)                                     | Mixamo FBX를 Node에서 GLB로 통합, 재질은 원본 GLB에서 이전 (해결)               | 2    |
| 배경 GLB 노드 이름·좌표를 추측해서 배치가 어긋남                                     | 노드 트리·바운딩 박스·단면을 직접 측정해 WorldConfig에 기록                     | 2    |
| 카메라가 나무 캐노피 안에 들어가거나 큰 바위가 캐릭터를 가림                         | 배경 π 회전, 카메라 높이를 캐노피 아래로, 가림이 심한 구역은 이동 범위에서 제외 | 2    |
| 섬 가장자리 절벽·허공이 보임                                                         | 바닥 연장 평면 + 가장자리 띠 + 안개 (Ground 재질 재사용)                        | 2    |
| StrictMode 재실행으로 해제된 텍스처를 재사용                                         | 생성과 해제를 같은 `useLayoutEffect`에서 짝짓고, 렌더링 중에는 생성하지 않음    | 1    |
| R3F가 공유 Geometry를 자동 해제                                                      | prop으로만 전달, dispose 경고 리스너로 검증                                     | 1    |
| Walk 루트 모션과 코드 이동이 중복                                                    | Mixamo In Place로 준비, 위치는 PlayerController만 변경                          | 2    |
| 손 본에 천등을 붙이면 스케일 상속·과도한 흔들림                                      | 본의 월드 위치만 복사                                                           | 3    |
| `cacheComponents`·SSR 환경에서 WebGL 오류                                            | Client Component에서 `ssr: false`로 로드                                        | 1, 2 |
| 텍스처 반전·색상 차이                                                                | 앞면 FrontSide, SRGB, 필요 시 toneMapped=false                                  | 1    |
| 큰 delta로 장애물 관통                                                               | delta 상한                                                                      | 2    |
| 모드 전환 시 키가 눌린 채로 남음                                                     | 진입·이탈·blur 시 키 초기화                                                     | 2, 3 |
| 점화 순간 셰이더 재컴파일로 멈춤                                                     | 라이트를 미리 마운트하고 intensity만 변경                                       | 4    |
| 중복 발사                                                                            | 액션이 LIT일 때만 성공 (멱등)                                                   | 4    |
| 모바일에서 게임 플레이 불가                                                          | MVP는 데스크톱 전용, 모바일은 안내 화면 표시 (필기는 `/lab`에서만 테스트)       | 1, 2 |
| eslint-config-next의 React Compiler 계열 hooks 규칙이 렌더 중 Three 객체 변경을 경고 | 객체 변경은 useFrame·effect·핸들러에서만 수행                                   | 전체 |
