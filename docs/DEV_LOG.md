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

## 2026-11-03 · 3단계 · 탁자 상호작용, 천등 받기, 소원 작성

- 브랜치: `feature/lantern-interaction` (계획서의 이름은 `feature/lantern-flow`. 사용자가 만든 브랜치를 그대로 씀)
- 목표: 탁자를 바라보고 상호작용 → 색상 선택 → 손에 천등 → 1인칭 작성·수정 (NONE → BLANK → WRITTEN). 점화·발사(LIT)는 4단계.

### 사전 확인 (구현 전 측정, 추측 아님)

- **노드 이름:** three `GLTFLoader`는 이름의 `.`를 지운다 (`PropertyBinding.sanitizeNodeName`). 런타임 이름은 `Cube001`이고, `Cube.001`로 찾으면 실패한다.
- **탁자 메시:** `Cube001` = `Cube001_0`(TreeBark, 테두리·다리) + `Cube001_1`(LightWood, 상판). 월드 범위 x [-4.03, -2.56], z [-0.32, 3.17], 최고 y 2.12 → 기존 `LANDMARKS.table` (-3.3, 1.42)과 일치. 받침 뿌리 `NurbsPath`, 보라 나무 `NurbsPath001`, 상판 위 잎(`Icosphere031~048`)은 별도 노드 → 강조 대상에서 제외.
- **상판 높이:** 위에서 광선 81개. 1.92(북) ~ 2.05(남)로 약간 기울고 울퉁불퉁하다.
- **손 본:** `RightHand`는 `Bone`. 캐릭터 로컬(스케일 4) 위치는 Idle (-0.29~-0.35, 0.38~0.42, 0.02~0.09), Walk (-0.23~-0.33, 0.33~0.43, -0.10~0.31). 손이 지면 위 0.4로 낮아 천등을 손 아래로 매달면 땅에 박힌다.
- **작성 카메라:** 후보 5곳에서 카메라 → 종이 9점 광선 검사. 선택한 (-2.81, 3.89, 1.42)에서 화면 광선 289개: 상판 54% + 테두리 17%, 바닥 22%, 받침 나무·뿌리 4%, 1.2 이내 가림 0.

### 변경사항

- 설치: `zustand@5.0.16` (`--save-exact`, 2026-10-22 배포 최신 5.x). `npm ls` invalid·peer 경고 없음. `npm audit` moderate 17건은 기존 `minimatch`(ESLint 체인) 건으로 설치 전과 같다.
- 순수 함수 (+ 테스트):
  - `lib/game/lanternTransitions.ts`: `applyLanternAction`(전이 표 4개 액션 전체, light·launch 포함), `canOpenColorSelect`, `canOpenWriting`
  - `lib/game/interaction.ts`: `getSurfaceGap`, `getClosestPointOnCollider`, `getFacingCos`, `getTableActionIds`, `resolveInteraction`(거리 + 방향 + 모드 + 상태 + 히스테리시스), `INTERACTION_TARGETS`(테이블만)
  - `lib/game/camera.ts`: `stepToward`, `smoothstep01`, `stepViewBlend`
- `stores/gameStore.ts`: `held`·`mode`·`nearbyInteractionId` + `openColorSelect`·`receiveLantern`·`openWriting`·`finishWriting`·`closeOverlay`·`setNearbyInteraction`·`runInteractionAction`. `flying`·`toast`·점화·발사 액션은 4단계.
- 컴포넌트:
  - `interactions/InteractionSensor`(Canvas 안: 근접 판정 → 바뀔 때만 store, 버튼 위치 투영), `interactions/InteractionPrompt`(탁자 위 버튼, E키), `interactions/interactionRuntime.ts`(표시·실행 공용 판정)
  - `world/TableHighlight`: 탁자 메시 2개 inverted hull
  - `lantern/HeldLantern`: 손 본 위치 추적, `LanternModel` 재사용
  - `writing/WritingPaper`(Canvas 안: 탁자 위 종이 + 화면 투영), `writing/WritingOverlay`(`WritingCanvas` 재사용, 초안 로컬 state)
  - `game/ColorSelectPanel`, `game/GameHUD`
- 기존 수정:
  - `CharacterModel`: 손 본 ref 제공, `children`을 스케일 없는 그룹에 렌더, 작성 모드에서 숨김 + `mixer.update` 생략
  - `PlayerController`: EXPLORE가 아니면 이동·이동키 무시, 모드가 바뀔 때 눌린 키 초기화
  - `CameraRig`: 3인칭 ↔ 작성 시점 진행률 블렌드 (진행률 0이면 2단계와 같은 계산)
  - `worldConfig`: `TABLE_COLLIDER`(값은 그대로, COLLIDERS가 같은 객체 참조), `LANDMARKS.table.meshNames/topBounds`, `INTERACTION_CONFIG`, `TABLE_HIGHLIGHT_CONFIG`, `WRITING_VIEW`, `HELD_LANTERN_CONFIG`, `CHARACTER_CONFIG.handBoneName`
  - `constants/lanternColors.ts`에 `getLanternColorHex`, 새 `constants/interaction.ts`

### 결정 / 이유

- **[기획 추가] 바라보는 방향 판정:** 사용자 요구. `targetYaw`와 "대상 표면의 가장 가까운 점" 방향의 cos ≥ 0.5(60°). 카메라 방향은 쓰지 않는다.
- **히스테리시스:** 시작 0.7 / 60°, 유지 0.9 / 75°. 실행 재검증도 같은 함수 + 같은 `currentId`를 써서 표시·실행이 어긋나지 않는다.
- **3단계 대상은 테이블만:** 모닥불 대상을 넣지 않아 NONE·BLANK에서 모닥불 강조·버튼이 생기지 않는다. 모닥불 충돌은 그대로.
- **강조 = inverted hull:** 후처리(OutlinePass·EffectComposer)는 별도 패스와 추가 코드가 필요하고 SPEC의 커스텀 셰이더 금지와도 걸린다. `EdgesGeometry`는 로우폴리 내부 모서리까지 그려 지저분하다. hull은 기존 Geometry를 prop으로 재사용하고(해제되지 않음, 개발 모드 dispose 경고 리스너), BackSide 단색 재질만 추가한다. 항상 마운트하고 `visible`만 바꾼다.
- **손 천등:** SPEC대로 본의 자식으로 붙이지 않고 위치만 복사한다. "월드 위치"를 캐릭터 바깥 그룹(위치·Y 회전, 스케일 없음)의 로컬 좌표로 바꿔 그 그룹의 자식에 둔다 → 회전은 캐릭터 Y만, 숨김은 캐릭터와 함께. 손이 낮아 손 위치 + 오프셋(-0.13, 0.06, 0.04), 스케일 0.26으로 옆구리에 든 모양.
- **작성 연출:** 3D 종이는 Canvas 안에 그리고, HTML `WritingCanvas`를 그 화면 투영 위치에 겹친다 (Raycasting 없음). 카메라 전환의 60% 이후에 Canvas를 서서히 보인다.
- **ID:** store 모듈 카운터 `lantern-N` (순수 함수에는 인자로 넘김).

### 문제와 해결

| 문제                                              | 원인                                           | 해결                                                     |
| ------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| `getObjectByName('Cube.001')`가 undefined         | GLTFLoader의 이름 정리 (`.` 제거)              | 런타임 이름 `Cube001_0`·`Cube001_1`을 WorldConfig에 기록 |
| 작성 화면에서 3D 종이 모서리가 Canvas 밖으로 나옴 | 비스듬한 시점의 원근 → 화면 속 종이가 사다리꼴 | Canvas를 투영된 최대 너비에 맞춰 3D 종이를 덮음          |
| 종이 가까운 변 쪽에 상판이 뚫고 보임              | 종이 높이 2.05 < 상판 일부(메시 최고 2.08)     | 종이 높이 2.1                                            |
| 전환 도중 큰 Canvas가 탁자 위에 떠 보임           | 카메라가 비스듬할 때도 Canvas를 바로 겹침      | 전환 진행률 0.6 이후 서서히 표시 (그 전에는 3D 종이만)   |
| 경계값 테스트 실패 (`reach` 정확히 0.7)           | 부동소수점 (역산 0.70000001)                   | 테스트를 `reach - 1e-6`으로 (판정 로직은 그대로)         |

### 자동 검증

- [x] `npm run typecheck` · `npm run lint`(warning 0) · `npm run format:check` 통과
- [x] `npm test` 10파일 132개 통과 (기존 66 + 새 66: `lanternTransitions`·`interaction`·`camera`·`gameStore`)
- [x] `npm run build` 통과 (`/`, `/lab/lantern` static)

#### headless Chrome 사전 점검 (CDP 스크립트, GPU d3d11 144fps, 사람 확인을 대체하지 않음)

WebGL `createTexture/deleteTexture`·`createBuffer/deleteBuffer`를 감싸 살아 있는 개수를 셌다.

| 항목                                          | 결과                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| 탁자 옆에서 북쪽을 봄 / 탁자 쪽(서쪽)을 봄    | 버튼 없음 / '천등 받기' + 탁자 테두리                                              |
| 탁자 앞에서 D로 돌아섬 → 다시 A               | 버튼·테두리 사라짐 → 다시 나타남                                                   |
| 강조 범위                                     | 탁자 상판·테두리 둘레에만 얇은 종이색 선. 뿌리·보라 나무·모닥불에는 없음           |
| NONE에서 E                                    | 색상 선택 (작성으로 바로 가지 않음). ESC → NONE 유지, '천등 받기' 다시 표시        |
| 주황 선택 → BLANK                             | '소원 작성하기' + '색상 다시 고르기', textures +1 (천등 텍스처)                    |
| 색상 다시 고르기 → 분홍                       | textures·buffers 변화 없음 (같은 인스턴스에 다시 그림)                             |
| 손 천등 (Idle 정면 / Walk)                    | 오른쪽 옆구리에 천등, 걷는 동안 손을 따라 이동                                     |
| 작성 모드 (W를 누른 채 진입)                  | 1인칭 내려다보기, 캐릭터 숨김, 탁자 위 종이에 Canvas 정렬, 빈 종이에서 완료 비활성 |
| 획 2개 → 되돌리기 → 전체 지우기 → 다시 그리기 | 화면 해시: 다시 그린 결과 = 처음 결과. 지운 뒤 완료 비활성                         |
| 완료                                          | WRITTEN, '소원 수정하기', 3인칭 복귀, 손 천등 앞면에 손글씨                        |
| 수정 → 획 추가 → ESC → 다시 열기              | 다시 연 Canvas = 확정본 (추가 획은 버려짐)                                         |
| 누수: 작성·완료 10회 + 수정·취소 10회         | textures 8 → 8, buffers 924 → 924                                                  |
| `/lab/lantern` 회귀                           | 1획 작성·완료, textures 2 · geometries 6 (1단계와 같음)                            |
| 콘솔                                          | R3F 내부 `THREE.Clock` deprecated 경고만                                           |

### 브라우저 확인 (직접) — 아직 하지 않음

- [ ] 탁자 동·북·남 면과 모서리에서 바라볼 때만 버튼이 뜨고, 탁자·모닥불 사이 통로를 지날 때 거슬리지 않는다
- [ ] 테두리 두께(0.035)·색이 은은하고 깜빡임(z-fighting)이 없다
- [ ] 버튼을 마우스로 누르는 동안 사라지지 않는다. 클릭 후 Space·Enter로 다시 실행되지 않는다
- [ ] 손 천등의 크기(0.26)·위치가 자연스럽다. Walk에서 몸을 뚫거나 땅에 닿지 않는다
- [ ] 작성 모드 진입 순간 캐릭터가 바로 사라지는 것이 거슬리지 않는다
- [ ] 다양한 창 비율에서 작성 Canvas가 종이를 덮고 버튼이 화면 밖으로 나가지 않는다
- [ ] 작성 Canvas의 위·왼쪽이 손 천등 앞면의 위·왼쪽과 같다 (반전 없음)
- [ ] 키를 누른 채 작성 진입·이탈 후 이동이 정상이다
- [ ] 개발 모드 `renderer.info.memory`로 반복 후 textures·geometries가 늘지 않는다 (WebGL 카운터로는 확인함)
- [ ] 2단계 이동·충돌·카메라가 그대로다

### 다음 할 일

- 4단계: 모닥불 대상 추가(WRITTEN '불 붙이기', BLANK 안내), `lightLantern`·`launchLantern` store 연결 (전이 함수·테스트는 준비됨), 손 천등 pointLight 미리 마운트

---

## 2026-11-03 · 2단계 · 테이블 접근 시 머리 겹침 수정

- 브랜치: `feature/world-setup`
- 증상: 왼쪽 나무 구조물(테이블 `Cube.001` + 뿌리 `NurbsPath` + 보라 나무 `NurbsPath.001`)에 다가가면 캐릭터 머리가 상판과 겹친다. 다른 오브젝트는 정상.

### 원인 (측정)

- 테이블은 충돌 영역에 이미 있었다 (상자 x [-4.6, -2.5], z [-0.85, 3.65]). 위치는 맞지만 **상판 끝과의 여유가 0.03~0.06**뿐이었다.
- 캐릭터의 높이별 수평 반지름 (Idle·Walk 전 프레임 최대): 다리 0.43~0.57, **머리(지면 위 1.0~1.4) 0.63~0.70**. 충돌 원은 0.4라서 머리가 원 밖으로 약 0.30 튀어나온다.
- 테이블 상판은 지면 위 0.6~1.38로 머리 높이와 같다. 그래서 테이블에서만 드러났다.
- **가림인지 실제 침범인지:** 캐릭터 메시(Idle·Walk 24프레임 × 바라보는 방향 3개)와 테이블 삼각형 사이의 3D 최소 거리를 계산했다. 동쪽 정면·북쪽 정면에서 **0.000** (머리 높이 1.1~1.3) → 카메라 가림이 아니라 **실제 침범**이었다.

### 변경

- `worldConfig.ts` 테이블 상자만 수정: 동쪽 `maxX` -2.5 → **-2.24**, 북쪽 `minZ` -0.85 → **-1.14**. 머리 높이 단면(상판 x ≤ -2.56, z ≥ -0.82)에서 머리 여유 0.30 + 0.02.
  - 남쪽(3.65)은 이미 여유 0.13 이상, 서쪽(-4.6)은 이동 범위 밖이라 그대로.
  - 충돌 원 반지름(0.4), 이동 로직, 다른 충돌 영역은 바꾸지 않았다. 반지름을 0.7로 키우면 테이블·모닥불 사이 통로(폭 1.35)가 막히고 모든 장애물이 멀어진다.
- 테스트 2개 추가 (`collision.test.ts`): 겹치던 위치에 설 수 없음, 테이블·모닥불 사이 통로 통과 가능.

### 검증

| 접근 위치 (정지 지점)  | 수정 전 최소 거리 | 수정 후       |
| ---------------------- | ----------------- | ------------- |
| 동쪽 정면              | 0.000             | 0.045         |
| 동쪽 북쪽 끝 / 남쪽 끝 | 0.001 / 0.000     | 0.301 / 0.146 |
| 북쪽 정면 / 북동쪽     | 0.000 / 0.052     | 0.200 / 0.435 |
| 남쪽 정면              | 0.275             | 0.287         |
| 북동 대각 / 남동 대각  | 0.297 / 0.295     | 0.660 / 0.392 |

- 헤드리스 개발 서버: 동쪽 정면, 북서·남서 대각선 미끄러짐에서 상판에 머리가 잘려 보이지 않음. 북쪽은 카메라와 캐릭터 사이에 테이블이 오는 위치라 화면상 가림이 생길 수 있다 (침범 아님, 위 거리로 확인).
- 자동 검증: typecheck · lint(0 warning) · format · test 66개 · build 통과

### 부작용 / 브라우저 확인

- 테이블과 모닥불 사이 통로가 좁아졌다 (플레이어 중심이 지날 수 있는 폭 0.55 → 0.29). 지나갈 수는 있지만 정확히 조준해야 한다. 거슬리면 알려 주면 된다.
- [ ] 브라우저에서 테이블 동·북·대각선으로 다가가 머리가 상판에 파고들지 않는지
- [ ] 통로 통과가 너무 어렵지 않은지
- 참고: 모닥불 꼬챙이(`NurbsPath.004·005`)도 머리 높이에 있다. 현재 보고된 문제는 없어서 바꾸지 않았다.

---

## 2026-11-03 · 2단계 · 캐릭터 애니메이션 통합 (Mixamo FBX → character.glb)

- 브랜치: `feature/world-setup`
- 목표: 클립이 없던 `character.glb`에 Mixamo `Idle`·`Walking`(In Place)을 넣는다. Blender 없이 three의 `FBXLoader` + `GLTFExporter`(Node)로 통합한다. 추가 패키지 없음.
- 아래 '숲속 월드와 이동' 기록의 **[결정 필요] 캐릭터 애니메이션 클립이 없다** 항목을 해결한다.

### 입력 확인

| 항목           | Idle.fbx                                                 | Walking.fbx (재다운로드)                              |
| -------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| 형식           | FBX Binary, 메시 포함                                    | 같음                                                  |
| 스켈레톤       | 본 32, 원본 GLB와 같은 계층                              | 같음                                                  |
| 클립           | `mixamo.com` 9.93초, 트랙 26                             | `mixamo.com` 1.40초, 트랙 26 (+ 빈 `Take 001`은 버림) |
| 루트 위치 트랙 | `BaseMesh_Chibi.position` 처음 = 끝 (-0.39, -0.70, 0.09) | 처음 = 끝 (0.77, -0.25, -0.09), Z 변화폭 1.55         |

- **In Place 확인:** 첫 Walking은 한 루프(1.03초)에 z -0.29 → 22.73으로 23 이동(루트 모션)해서 다시 받기를 요청했다. 새 파일은 처음과 끝이 같고, 남은 변화폭(1.55, 키 47.5의 약 3%)은 걸음 중 몸 흔들림이다.
- 본 호환: Mixamo가 원래 본 이름(`Hips`, `RightHand` …)을 유지했다. 원본 GLB 이름(`Hips_01`, `RightHand_011`)은 Sketchfab이 붙인 번호 접미사만 다르다.
- 위치 트랙은 `Hips`가 아니라 루트 그룹 `BaseMesh_Chibi`를 움직인다. 그래서 단위 스케일은 그 위의 새 부모에 둬야 한다 (아래).
- **재질 문제:** Mixamo FBX에는 재질 색이 없다 (`BaseMesh_Chibi_M`, `lambert1` 모두 회색 `#666666` Lambert). 그대로 내보내면 캐릭터가 회색이 된다.

### 통합 절차 (`scripts/merge-character.mjs`로 보존, 아래 정리 항목 참고)

1. 원본 백업: `public/models/character.glb` → `assets-source/character/character.original.glb` (SHA-256 `655046d4…aff4` 일치 확인)
2. `FBXLoader.parse(Idle.fbx)` → 장면(메시 + 스켈레톤) + Idle 클립, `FBXLoader.parse(Walking.fbx)` → Walk 클립. 클립 이름을 `Idle`, `Walk`로 바꾼다.
3. 원본 GLB를 `GLTFLoader.parse`로 읽고, **재질 이름이 같은 원본 재질 객체**를 FBX 메시에 그대로 넣는다 (색·거칠기·양면·`KHR_materials_specular` 유지).
4. FBXLoader는 인덱스 없이 정점을 펼친다 (몸 6270). three의 `BufferGeometryUtils.mergeVertices`로 같은 값의 정점만 합쳤다 → 몸 1233, 눈 110 (**원본 GLB와 정점 수 동일**).
5. 모든 트랙 대상이 장면에 있는지 확인한 뒤, 새 부모 `Character`(scale 0.01, cm → 원본 단위)에 넣는다.
6. `GLTFExporter.parseAsync(scene, { binary: true, animations: [Idle, Walk] })` → `public/models/character.glb` 교체.

- Node 호환성: `GLTFExporter`는 브라우저 `FileReader`를 쓴다. 스크립트에서 Node `Blob.arrayBuffer()`로 `readAsArrayBuffer`·`readAsDataURL`만 구현한 10줄짜리 대체를 넣었다. 출력 데이터에는 영향이 없다. 그 밖의 오류·경고는 없었다 (FBXLoader 버전 안내 로그만).

### 결과 비교 (원본 GLB ↔ 통합 GLB)

| 항목             | 원본                                               | 통합                                                                                  |
| ---------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 파일 크기        | 113 KB                                             | 319 KB (클립 2개 포함)                                                                |
| 메시·정점        | 몸 1233 · 눈 110                                   | 같음 (이름은 `SM_Chibi_Body`, `SM_Chibi_Eye`)                                         |
| 재질             | 분홍 `#ffa9fb` r0.626 m0 양면 / 검정 r0 spec 0.894 | 같음                                                                                  |
| 텍스처           | 0                                                  | 0                                                                                     |
| 월드 바운딩 박스 | x ±0.211, y 0~0.475, z -0.131~0.139                | 같음 (소수 셋째 자리까지)                                                             |
| 정면             | 눈 z 0.118~0.134 → +z                              | 같음                                                                                  |
| 스켈레톤         | 조인트 32                                          | 계층 노드 32 = 조인트 25 + 가중치 없는 끝 노드 7(`HeadTop_End`, 손가락 끝, `ToeBase`) |
| 오른손 본        | `RightHand_011`                                    | **`RightHand`** (왼손 `Left_Hand`)                                                    |
| 애니메이션       | 없음                                               | `Idle` 9.933초 · `Walk` 1.400초, 각 트랙 26, 대상 모두 해석됨                         |

- 끝 노드 7개는 정점 가중치가 없어 glTF 스킨 조인트에서 빠지고 일반 노드로 남았다. 계층과 애니메이션 대상(25개 본 + 루트)은 모두 있다.
- 렌더링 비교(헤드리스): 바인드 포즈에서 원본과 통합본이 똑같이 보인다. Idle은 팔을 내린 자세, Walk는 다리가 교차하고 메시 찢어짐·발 뜸이 없다.

### 자동 검증

- [x] `npm run typecheck`, `npm run lint`(warning 0), `npm run format:check`, `npm test`(64), `npm run build` 통과
- 코드 변경: `CharacterModel`의 주석 한 줄뿐 (클립 이름 `Idle`·`Walk`가 기존 상수와 같아서 코드 수정이 필요 없었다)

#### headless Chrome 사전 점검 (개발 서버, 사람 확인을 대체하지 않음)

| 항목                    | 결과                                                                        |
| ----------------------- | --------------------------------------------------------------------------- |
| 콘솔                    | 'Idle·Walk 클립이 없어' 경고가 사라짐 (R3F `THREE.Clock` 경고만 남음)       |
| 정지                    | T 포즈 대신 Idle (팔을 내린 자세)                                           |
| A 키를 누른 채 (옆모습) | 0.23초 간격 프레임마다 다리 위상이 바뀜 = Walk 재생, 이동 방향(-x)을 바라봄 |
| 키를 뗀 뒤 1초          | 다리를 모은 Idle 자세로 복귀                                                |

### 브라우저 확인 (직접) — 아직 하지 않음

- [ ] 이동하면 Walk, 멈추면 Idle로 **부드럽게**(0.2초 crossFade) 바뀐다. 짧게 톡톡 눌러도 자세가 튀지 않는다
- [ ] 걷는 동안 캐릭터가 충돌 위치보다 앞서 나가거나 루프마다 뒤로 튀지 않는다 (In Place)
- [ ] 발 미끄러짐: 이동 속도 3.5와 걸음 주기(1.4초)가 어울리는지. 어색하면 `PLAYER_CONFIG.speed` 또는 Walk `timeScale` 조정 검토
- [ ] 색·크기·방향이 통합 전과 같다 (분홍 몸, 검은 눈, 정면 +z)
- [ ] 개발 모드에서 `renderer.info.memory`가 이동·정지 반복에도 늘지 않는다

### 파일

- `public/models/character.glb`: 통합본으로 교체
- `assets-source/character/character.original.glb`: 원본 백업
- `assets-source/character/mixamo/Idle.fbx`, `Walking.fbx`: `public`에서 옮김 (배포되지 않음)
- 문서: PROJECT_SPEC §4(캐릭터 에셋·손 본), IMPLEMENTATION_PLAN 2·3단계·위험 요소, CORE_CONCEPTS §13, README(Mixamo·변경 사항 표기)

### 문제 / 다음 할 일

- (해결) `assets-source/`는 `.gitignore`, 통합 스크립트는 `scripts/merge-character.mjs`로 보존 (아래 정리 항목).

### 정리 (같은 날, 사용자 결정 반영)

- `.gitignore`에 `/assets-source/` 추가. 원본 GLB·FBX는 로컬에만 보관한다 (`git check-ignore`로 확인).
- `scripts/merge-character.mjs`: 저장소 루트 기준 상대 경로, bare import(`three`)로 재실행 가능.
  - 기본 실행은 `assets-source/character/character.merged.glb`에만 쓴다. **`--replace`를 줘야** `public/models/character.glb`를 바꾸고, 그 전에 `assets-source/character/backups/character.<UTC 시각>.glb`로 백업한다. 내용이 같으면 교체·백업하지 않는다. 검증이 하나라도 실패하면 종료 코드 1, public은 그대로.
  - 검증: Walk 루트 이동(In Place), 재질별 정점 수·색·거칠기·금속성·양면이 원본과 같음, 월드 bbox 차이 < 0.002, `Idle`·`Walk` 클립과 트랙 대상, 손 본 `RightHand`.
  - Node용 `FileReader` 대체는 이 스크립트 안에만 있다. `src/`에는 없다 (grep 확인). 앱이 import하지 않으므로 번들에 들어가지 않는다.
- 실행 결과: 기본 실행 → 11개 검사 모두 통과, 출력 SHA-256 `46d4243c…893e` = 현재 public 파일과 **바이트 단위로 같음** (재현 가능). `--replace` → 같아서 교체 안 함.
- 교체 경로 확인: public에 원본(클립 없음) GLB를 잠시 두고 `--replace` → 백업 생성 후 교체, public 해시가 `46d4243c…`로 돌아옴. 테스트로 생긴 백업(원본과 같은 파일)은 지웠다.
- README: 캐릭터 출처·라이선스, Mixamo 적용, 변환 방법, 손 본 이름 기록.
- 3단계 참고: 오른손 본 **`RightHand`** (왼손 `Left_Hand`). PROJECT_SPEC §4, IMPLEMENTATION_PLAN 3단계, README, 스크립트 검증에 같은 이름으로 기록했다.

---

## 2026-11-03 · 2단계 · 숲속 월드와 이동 (기획 변경 반영)

- 브랜치: `feature/world-setup`
- 목표: 실내·야외 구조를 숲속 캠프파이어 공간 하나로 바꾸고, 제공된 숲 배경·캐릭터 GLB로 이동·충돌·카메라를 구현한다. 상호작용(받기·작성·점화·발사)은 3·4단계.

### 기획 변경

- 실내·야외 구분, 출입구 충돌, 지붕·벽 가림 처리를 없앴다. 테이블(받기 + 작성) → 모닥불(점화) → 어디서든(발사) 흐름 (SPEC §3, §6, §8).
- 외부 에셋 사용 범위를 '캐릭터만' → '캐릭터 + 숲 배경'으로 넓혔다. 천등은 계속 Geometry.
- 수정한 문서: PROJECT_SPEC(§1·§2·§3·§4·§6·§8·§9), IMPLEMENTATION_PLAN(2~5단계, 위험 요소), CORE_CONCEPTS(§10, §10-1, §13, §14), CODING_CONVENTIONS(식별자 예시), README(출처).

### 에셋 구조 확인 (구현 전)

방법: GLB의 JSON 청크를 Node로 직접 읽고, 정점 데이터를 three `BufferGeometry`로 만들어 월드 행렬을 적용한 뒤 측정했다. 헤드리스 Chrome으로 렌더링해서 눈으로 확인했다. 스크립트는 scratchpad에만 두고 저장소에 넣지 않았다.

**background.glb** (4,123,556 B)

| 항목       | 결과                                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 출처       | Sketchfab 'Low Poly Forest Campfire [Updated]', Minzkraut, **CC BY-NC-SA 4.0** (`asset.extras`)                                                                      |
| 구성       | 노드 449, 메시 244, 재질 19, 텍스처 1(PNG 84 KB, `Glass` 재질), 삼각형 약 47,600, 애니메이션 없음, 압축 없음                                                         |
| 확장       | `KHR_materials_transmission` (`Glass` 재질 1개)                                                                                                                      |
| 원점·축    | 루트에 Z-up → Y-up 회전. 전체 범위 x [-12.8, 11.9], y [-14.6, 19.5], z [-11.2, 17.6]                                                                                 |
| 바닥       | `Cube`(노드) → `Cube_0`(재질 `Ground`, 윗면 + 옆면 띠), `Cube_1`(`Dirt`), `Cube_2`(`Material`, 아래 절벽). 윗면 x, z ∈ [-9.7, 9.7], 높이 0.60~0.83                   |
| 형태       | 떠 있는 정사각형 섬(디오라마). 옆과 아래가 흙 절벽이라 카메라에 보이면 경계가 드러난다                                                                               |
| 테이블     | **`Cube.001`** (`TreeBark` 테두리 + `LightWood` 상판), 상판 y 1.32~2.08, 1.47 × 3.50. 렌더링으로 테이블임을 확인. 뿌리 `NurbsPath`, 보라 나무 `NurbsPath.001`이 받침 |
| 모닥불     | **`Mball.018`**(`Fire`) + 장작 `NurbsPath.008~014` + 냄비 `Circle`(`Metal`) + 꼬챙이 `NurbsPath.004·005` + 돌 링 `Icosphere.*`. 중심 GLB (-1.05, -1.1)               |
| 개별 숨김  | 모든 오브젝트가 별도 노드라 개별로 숨길 수 있다 (이번에는 숨기지 않음)                                                                                               |
| 기타       | `Lamp`는 Blender 라이트지만 `KHR_lights_punctual`이 없어 three에서 빈 노드다                                                                                         |
| three 이름 | GLTFLoader가 이름의 `.`을 지운다 (`Cube.001` → `Cube001`). `Cube_0`은 그대로이고 `getObjectByName`으로 `Ground` 메시 하나만 찾아진다 (헤드리스 확인)                 |

**character.glb** (115,836 B)

| 항목       | 결과                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 출처       | 'Free Pack - Chibi Base Mesh (Rigged)', **DuNguyn Studio**, CC BY 4.0 (`asset.extras`). 기존 문서의 'PolyOne Studio'와 다르다 |
| 구성       | 메시 2(몸 `SM_Chibi_Body_BaseMesh_Chibi_M_0`, 눈 `SM_Chibi_Eye_lambert1_0`), 스킨 1(본 32), 텍스처 없음                       |
| 애니메이션 | **0개.** T 포즈. Idle·Walk가 없다                                                                                             |
| 크기·방향  | 높이 0.48, 폭 0.42(팔 포함), 발바닥이 원점, 정면 **+z** (눈 메시 z 11.8~13.4 → +z)                                            |
| 루트 변환  | Sketchfab 루트 Z-up 회전 + FBX 노드 스케일 0.01                                                                               |
| 본         | Mixamo 형식 아님: `Hips_01`, `Spine_02`… **`RightHand_011`**, `Left_Hand_019`, `Head_06`, `RightFoot_026` 등                  |
| In Place   | 확인 불가 (Walk 클립 없음)                                                                                                    |

### 변경사항

- `lib/game/worldConfig.ts`: 배경 배치(π 회전)·바닥 메시 이름·범위, 이동 범위, 충돌 영역 18개, 테이블·모닥불 위치, 플레이어·캐릭터·카메라·안개 값
- 순수 함수 + 테스트: `lib/game/terrain.ts`(높이 격자), `lib/game/collision.ts`(원·사각형 충돌, 축별 이동), `lib/game/movement.ts`(키 → 방향, 각도, 감쇠 보간)
- `components/world/ForestBackground.tsx`: 배경 GLB, 높이 격자 생성(광선 39 × 39), 바닥 연장 평면 + 가장자리 띠 4개
- `components/world/ColliderDebug.tsx`: 개발 모드 전용 충돌 영역 와이어프레임 (` 키)
- `components/player/PlayerController.tsx`, `CharacterModel.tsx`, `CameraRig.tsx`
- `components/game/GameEntry.tsx`(데스크톱 판별 + 동적 로드), `GameCanvas.tsx`, `DesktopOnlyNotice.tsx`, `app/page.tsx`(create-next-app 기본 화면 교체)
- `constants/animation.ts`(클립 이름 `Idle`·`Walk`, crossFade 0.2초), `types/game.ts`(`PlayerState`)
- `/lab/lantern`과 1단계 파일은 바꾸지 않았다.

### 결정 / 이유

- **배경을 Y축 π 회전:** 카메라는 +z에서 -z를 본다(SPEC §4 유지). 오프라인 측정(이동 가능한 0.5 격자 1129칸에서 카메라 → 캐릭터 광선)에서 원본 방향은 477칸, π 회전은 308칸이 가려졌다. 회전하면 큰 바위(`Icosphere.027`, 높이 6.3)와 숲이 화면 안쪽 배경이 된다.
- **카메라 오프셋 (0, 6, 8) → (0, 4.2, 6.5):** 나무 캐노피 최저점이 y 5.7~6.2다. 카메라가 그보다 높으면 잎 메시 안으로 들어가 화면이 덮인다.
- **이동 범위 x [-5, 9], z [-4.5, 9]:** 남은 가림은 대부분 울창한 숲(GLB x > 5.5)과 바위 지대(GLB z > 5)에서 생겼다. 이 구역과 가장자리 0.7을 뺀 빈터만 걷게 했다. 가리는 메시를 숨기는 처리보다 단순하다.
- **바닥 판정 = 높이 격자 + 이동 범위:** 사용자 요청대로 실제 바닥 메시(`Cube_0`)만 바닥으로 본다. 광선은 로드할 때 한 번만 쏘고, 판정은 순수 함수가 격자로 한다. 바닥 최대 경사 0.10, 단차 상한 0.3·경사 상한 0.9라 현재 지형에서는 막히는 곳이 없지만 규칙은 테스트로 확인했다.
- **충돌 영역은 단면 측정:** 메시를 y 0.95·1.3·1.7·2.1·2.5에서 잘라 XZ 단면을 얻고 원·사각형으로 감쌌다. 바운딩 박스는 비스듬한 줄기·뿌리 때문에 너무 크다 (예: `Cylinder.010` 바운딩 1.6 × 23.4 높이, 단면 반지름 0.69). 꽃·풀·작은 버섯·흙더미는 통과 가능.
- **경계 숨김:** 연장 평면(y 0.57)만으로는 섬 옆면이 얇은 선으로 보여서(가장자리 높이 0.60~0.76) 바깥 띠 4개(y 0.77)를 더했다. 둘 다 GLB의 `Ground` 재질 객체를 그대로 써서 색이 같다. R3F는 prop으로 받은 재질을 해제하지 않는다 (`removeChild`는 인스턴스 객체만 `dispose`, `<primitive>`는 제외 — R3F 9.8.2 소스 확인).
- **캐릭터 스케일 4, 충돌 반지름 0.4:** 높이 약 1.9, 테이블 상판이 가슴 높이. 몸통·머리 폭(약 0.2 × 4)에 맞췄다.
- **클립이 없을 때:** `CharacterModel`은 `Idle`·`Walk`가 있으면 재생하고, 없으면 정지 자세 + 개발 경고. 코드에서 본을 돌려 걷는 흉내를 내는 우회는 하지 않았다 (사용자 지시: 구조상 불가능한 부분은 우회하지 말고 보고).
- **데스크톱 판별을 `useSyncExternalStore`로:** effect 안 setState 없이 matchMedia를 읽고 변경도 구독한다. 서버 스냅샷은 `null`(로딩 화면)이다.
- **축별 이동 해석 유지:** SPEC [결정]대로 X·Z를 따로 해석한다. 한 축 키만 누른 채 모서리·곡면에 정면으로 부딪히면 멈춘다 (아래 문제 참고).

### 자동 검증

- [x] `npm run typecheck` 통과
- [x] `npm run lint` 통과 (`src` 전체 `--max-warnings=0`)
- [x] `npm test` 6파일 64개 통과 (기존 27 + `terrain` 13 + `collision` 14 + `movement` 10)
- [x] `npm run build` 통과 (`/`, `/lab/lantern` static)
- [x] Prettier: 이번에 만들거나 고친 파일 통과

#### headless Chrome 사전 점검 (CDP 스크립트, 사람 확인을 대체하지 않음)

| 항목                                      | 결과                                                                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 첫 화면                                   | 캐릭터 뒤에서 모닥불·테이블이 보인다. 콘솔: R3F 내부 `THREE.Clock` deprecated 경고, 클립 없음 경고                                                          |
| W·A·S·D 이동                              | 이동 방향으로 회전, 모닥불 원·테이블 사각형 앞에서 멈춤                                                                                                     |
| 이동 범위 네 모서리                       | 범위 밖으로 나가지 않음. 절벽·허공 안 보임. 가장자리 띠 추가 후 옆 가장자리에 아주 가는 선만 남음                                                           |
| 충돌 영역 표시 (개발 서버, ` 키)          | 나무줄기·모닥불 돌 링·테이블(뿌리 포함)·바위와 와이어프레임이 맞음                                                                                          |
| 테이블 모서리 정면 충돌                   | W만 누르면 테이블 상자 모서리(z 3.65) 근처에서 멈춤. 같은 입력을 실제 격자로 재현한 시뮬레이션은 z 3.60에서 출발해 통과 → 출발 위치 차이로 모서리에 걸린 것 |
| 모바일 에뮬레이션 (`any-pointer: coarse`) | 안내 화면, canvas 없음, JS 6개만 로드. 데스크톱은 2개 더(244 KB three 청크 포함)                                                                            |
| 개발 서버 클립 경고                       | 2회 출력 (effect 재실행: StrictMode 또는 Suspense 재마운트). mixer는 effect마다 만들고 정리하므로 안전                                                      |

### 브라우저 확인 (직접) — 아직 하지 않음

- [ ] 테이블·모닥불·나무·바위에서 충돌하고 위로 올라가지 않는다
- [ ] `키 충돌 영역이 에셋과 맞는다 (특히 테이블 뿌리, 비스듬한 나무`Cylinder.001`, 큰 바위 `Icosphere.006`)
- [ ] 이동 범위 어디서도 섬 절벽·허공이 보이지 않는다. 옆 가장자리의 가는 선이 거슬리는지
- [ ] 카메라가 잎 속에 들어가거나 바위·나무에 캐릭터가 가려지는 위치가 없다. 풀 덤불 속에서 캐릭터가 가려지는 정도
- [ ] 다른 탭에 다녀온 직후에도 장애물을 관통하지 않는다
- [ ] 캐릭터가 지면에 떠 있거나 파묻히지 않고, 크기가 충돌 범위와 맞는다
- [ ] 모서리·둥근 바위에 한 축으로 부딪혀 멈추는 것이 거슬리는지 (거슬리면 법선 밀어내기 검토)
- [ ] 프레임레이트 (배경 메시 약 250개, 투과 재질 1개)
- [ ] DevTools 모바일 에뮬레이션에서 안내 화면, 네트워크 탭에 three 청크 없음
- [ ] `/lab/lantern` 1단계 동작 그대로
- [ ] (클립 확보 후) Idle ↔ Walk 전환, In Place 확인

### 문제 / 다음 할 일

- **[결정 필요] 캐릭터 애니메이션 클립이 없다.** 2단계 완료 조건의 Idle·Walk 항목을 확인할 수 없다. 선택지:
  1. 같은 캐릭터로 Idle·Walk(In Place) 클립을 만든 GLB를 사용자가 다시 제공 (예: 원본 FBX를 Mixamo에 올려 자동 리깅 → 두 클립 받기 → Blender에서 GLB 하나로 통합). 본 이름이 바뀌므로 손 본 이름을 다시 기록한다.
  2. 클립 없이 진행 (정지 자세로 미끄러지듯 이동)
  3. 코드로 본을 회전시키는 간단한 걷기 동작 (SPEC의 클립 방식과 달라서 기획 변경 필요)
- 캐릭터 제작자 표기 확인: GLB는 DuNguyn Studio, 기존 문서는 PolyOne Studio. README에는 GLB 메타데이터 기준으로 적었다. 원본 페이지에서 확인 필요.
- 배경 라이선스가 **CC BY-NC-SA 4.0**이다. 비상업 포트폴리오에는 문제없지만, 상업적 사용이나 수정본 배포 계획이 있으면 다시 검토해야 한다.
- 3단계: 테이블·모닥불 상호작용 범위(`reach`)를 정한다. 두 충돌 영역 사이 통로가 1.35라 범위가 겹친다 (SPEC §8).

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
