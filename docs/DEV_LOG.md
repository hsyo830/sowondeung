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

## 2026-11-03 · 배포 준비 · 파비콘·SEO·SNS 공유 메타데이터

- 브랜치: `chore/seo-assets`
- 목표: 준비된 OG 이미지·파비콘을 적용하고, Metadata API로 title·description·Open Graph·Twitter 카드를 만든다. 게임 코드는 바꾸지 않는다.

### 사전 확인

- **OG 이미지 원본** `public/images/sowondeung_og.png`: PNG 1672×941 (16:9, 1.78:1), 1.62MB → 권장 1200×630(1.91:1)과 다름.
- **파비콘:** 요청의 `src/app/icon.png`는 **없음**. `src/app/favicon.ico`(직전 커밋 `296345f`에서 소원등 아이콘으로 교체, 16·32·48px 3장)만 있다. Next 기본 아이콘(삼각형)은 남아 있지 않다. 새 이미지는 만들지 않았다 → `icon.png`·`apple-icon.png`는 추가하지 않음.
- **배포 도메인:** 코드·문서·`.env*` 어디에도 없음. 아직 정해지지 않은 것으로 판단.
- **기존 메타데이터:** 루트 `layout.tsx`의 title·description만 있었다. `lab/lantern/page.tsx`의 title은 개발 모드에서만 설정되므로 충돌 없음. `public/`의 `next.svg`·`vercel.svg` 등은 메타데이터로 쓰이지 않는다.

### 변경사항

- `public/images/sowondeung_og.png`: sharp(Next에 이미 설치됨, 새 패키지 없음)로 1200×630 **가운데 기준 cover**(가로 1200으로 줄인 뒤 위아래 22·23px만 잘림) + 무손실 PNG 재압축 → **224KB**. 제목·부제·캐릭터·모닥불이 모두 남는 것을 눈으로 확인. 원본은 `assets-source/images/sowondeung_og.original.png`에 보관(Git 제외).
- `src/app/layout.tsx`: title `소원등 | 마음을 담아, 하늘로 날려요`, description, `applicationName`, `openGraph`(website·소원등·ko_KR·url·image 1200×630), `twitter`(summary_large_image), `metadataBase`·canonical, `<html lang="ko-KR">`.
- `src/lib/site/siteUrl.ts` + 테스트 6개: 기준 주소 결정 순수 함수.

### 결정 / 이유

- **기준 주소 순서:** `SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL`(Vercel 시스템 변수) → 개발 서버 localhost → 없으면 `null`. 임의 도메인은 넣지 않았다.
- **`null`이면 og:image·twitter:image·og:url·canonical을 아예 만들지 않는다.** Next는 `metadataBase` 없이 상대 이미지 경로를 받으면 `http://localhost:3000`으로 채우고 경고만 낸다(`resolve-url.js` 확인) → 프로덕션에 localhost가 실리는 것을 막기 위해서.
- 변수명은 `NEXT_PUBLIC_`이 없는 `SITE_URL`: 서버(빌드)에서만 읽으므로 클라이언트 번들에 넣을 필요가 없다.
- 존재하지 않는 Twitter 계정(`twitter:site`·`creator`)은 넣지 않았다.

### 자동 검증

- [x] tsc - [x] lint(프로젝트 파일, warning 0) - [x] prettier - [x] test 275개 - [x] build
- `npm run lint` 자체는 `.claude/worktrees/cursor-pointer/.next/types/*`(다른 작업 트리의 빌드 산출물) 때문에 오류 37개로 실패. 이번 변경과 무관해 ESLint 설정은 고치지 않았다.
- 빌드 결과 HTML: `SITE_URL` 없음 → title·description·og(title·description·site_name·locale·type)·twitter(card·title·description)만, localhost 0건. `SITE_URL=https://sowondeung.example`(검증용 임시 값) → canonical·og:url·og:image(절대 URL, 1200×630, image/png)·twitter:image 생성.
- `next start`: `/images/sowondeung_og.png` 200 `image/png` 224157B, `/favicon.ico` 200.

### 브라우저 확인 (직접)

- [ ] Chrome 탭 파비콘 표시 (강력 새로고침 후에도)
- [ ] 게임 진입·이동·작성·점화·발사 정상 (게임 코드는 변경 없음)

### 문제 / 다음 할 일

- `apple-icon.png`(180×180)·고해상도 `icon.png`가 필요하면 원본 아이콘 이미지를 받아 `src/app/`에 둔다 (지금은 iOS 홈 화면에서 페이지 스크린샷이 쓰일 수 있음).
- 배포 후: Vercel이 아니거나 자체 도메인이면 `SITE_URL` 설정 → 공유 디버거(Facebook·카카오·X)로 미리보기 확인.

---

## 2026-11-03 · 5단계 · 플레이 방법·소리 설정 모달, BGM·효과음

- 브랜치: `feature/game-guide-audio`
- 목표: 우측 상단에 플레이 방법·소리 설정 버튼과 모달을 추가하고, 실제 오디오(BGM·모닥불·발소리·UI·종이)를 연결한다. 기존 게임 로직은 바꾸지 않는다. 디자인 기준은 사용자 제공 `조작UI.png`.

### 사전 확인

- **오디오 파일 (`public/audio/`, 사용자 제공):** headless Chrome `decodeAudioData`로 측정.

  | 파일           | 길이   | 측정 결과                                                                                        | 처리                                                  |
  | -------------- | ------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
  | `bgm.mp3`      | 141.8s | 시작 즉시 소리, 끝 약 4초 페이드아웃(139.7s 이후 무음). 최대 RMS 0.30                            | `<audio loop>` 스트리밍 (디코딩하면 약 50MB)          |
  | `campfire.mp3` | 79.5s  | **앞 0.35s·뒤 0.56s 무음** → 통째로 반복하면 0.9초씩 끊김                                        | AudioBuffer `loopStart 0.35`·`loopEnd 78.98`          |
  | `footstep.mp3` | 11.3s  | **걸음 14개가 0.73~1.0초 간격으로** 녹음된 파일. 최대 RMS 0.015(매우 작음), 걸음별 세기 0.37~1.0 | 걸음 구간 14개로 잘라 1회씩 재생, 세기 보정, gain 2.2 |
  | `paper.mp3`    | 1.44s  | 소리 0.46~1.18s                                                                                  | 0.42s부터 재생 (앞 무음 때문에 늦게 들리지 않게)      |
  | `ui-click.mp3` | 1.06s  | 소리 0.14~0.28s                                                                                  | 0.12s부터 재생                                        |

  **없는 파일: 점화(`ignite`), 발사(`launch`), (선택) 필기.** 임의로 구하지 않았다 → `AUDIO_FILES`에 `null`, 요청·재생하지 않는다 (404·콘솔 오류 없음).

- **Walk 발 디딤 시점:** `character.glb`의 Walk(1.033s)를 Node에서 `AnimationMixer.setTime`으로 103프레임 샘플링. 발 본이 가장 앞으로 나간 뒤(왼발 0.23s·오른발 0.74s) 바닥 높이(≈0.020)에 닿는 순간 = **왼발 0.33s · 오른발 0.85s** (간격 0.52s = 반 주기) → `WALK_FOOTSTEP_CONTACT_SEC`.
- **에셋 출처 불일치:** 요청한 캐릭터 제작자는 'PolyOne Studio', README와 원본 GLB 메타데이터(`assets-source/character/character.original.glb`)는 'DuNguyn Studio (sketchfab.com/dunguyn)'였다. Sketchfab 모델 페이지(같은 URL)의 현재 표기는 **PolyOne Studio (@polyone), CC BY 4.0** → 계정 이름이 바뀐 것으로 보고 현재 표기를 쓰되, README에 다운로드 당시 표기도 남겼다. 숲 배경은 GLB 메타데이터·요청 내용이 같다. README의 '원본 그대로 사용'은 실제(냄비·지지대 숨김, 불꽃·조명 추가)와 달라 고쳤다.
- **키 매핑 확인:** 이동 = `movement.ts`(WASD·방향키), E = `INTERACT_KEY_CODE`(탁자·모닥불은 **바라보고** 있어야 함), F 3초 = `LAUNCH_KEY_CODE`·`LAUNCH_HOLD_DURATION_MS`(어디서든), ESC = `CLOSE_OVERLAY_KEY`(색상 선택·작성 닫기). 안내 문구를 여기에 맞췄다.

### 변경사항

- **UI** (`components/menu/`): `GameMenuBar`(버튼 2개 + 열린 창), `GameDialog`(공용 틀: 크림·금색 패널, 원형 천등 장식, 모서리 장식, 고정 머리말 + 안쪽 스크롤 + 아래 장식 자리), `PlayGuideDialog`(4단계 + 조작 + 출처 카드), `SoundSettingsDialog`(채널 카드 2개 + 아래 언덕 장식), `MenuIcons`(인라인 SVG 아이콘·일러스트). `globals.css`에 슬라이더·스크롤바 스타일.
- **상태:** `stores/menuStore.ts`(열린 창, `isGameInputBlocked`), `stores/audioSettingsStore.ts`(볼륨·음소거, localStorage `sowondeung:audio-settings:v1`).
- **오디오:** `lib/audio/audioEngine.ts`(Web Audio 싱글턴), `lib/audio/audioSettings.ts`·`soundRules.ts`(순수 함수 + 테스트 28개), `constants/audio.ts`(경로·무음 구간·걸음 구간·세기), `components/audio/GameAudio.tsx`·`CampfireAudio.tsx`, `CAMPFIRE_AUDIO_CONFIG`(거리 2.6 이하 1, 11 이상 0, 사이는 제곱 감소).
- **기존 파일 (추가만):** 입력 처리 5곳에 `isGameInputBlocked()` 확인 (PlayerController는 창을 열고 닫을 때 눌린 키도 비움, LaunchHoldButton은 창이 열리면 홀드 취소, 홀드 버튼 `data-sfx="off"`), `CharacterModel`에 `onFootstep`(Walk 시간이 발 디딤 시점을 지날 때), `GameCanvas`에 연결 컴포넌트, 개발 메모리 표시 `top-4` → `top-[4.25rem]`, HUD 상태 표시줄 너비 제한. 상태 전이·store 액션은 바꾸지 않았다.

### 결정 / 이유

- **Web Audio + `<audio>` 혼합, 라이브러리 없음:** 효과음은 지연·겹침·구간 재생이 필요해 AudioBuffer, BGM은 길어서 스트리밍. 하나의 그래프(채널 gain 2개)로 묶어 볼륨을 독립 제어한다.
- **엔진은 모듈 싱글턴:** 모달·HUD 렌더링과 오디오 수명을 분리한다 (모달을 열고 닫아도 BGM이 다시 시작하지 않음). 무엇을 언제 재생할지는 순수 함수가 정한다.
- **효과음은 store 전이 구독으로 연결:** 게임 로직이 오디오를 모른다. 발사 소리는 홀드 완료가 아니라 발사 목록에 새 id가 생긴 순간(Throw에서 실제 분리) → 한 번만.
- **발소리는 Walk 클립 시간 기준:** keydown 기준이면 벽에 막혀도·꾹 눌러도 틀린다. 실제로 걸을 때(Walk 재생)만 발 디딤 시점에 울린다.
- **모달 상태는 게임 모드와 분리 (`menuStore`):** 모달은 COLOR_SELECT·WRITING·LAUNCHING 어디서든 열 수 있고, 닫으면 그 모드 그대로여야 한다. `GameMode`에 넣으면 이전 모드를 따로 기억해야 한다.
- **네이티브 `<dialog>.showModal()`:** 바깥 inert, 포커스 가두기, ESC, 최상위 레이어를 브라우저가 처리한다. 열린 상태의 원본은 store이고 마운트 = 열기. ESC의 닫기(cancel)는 keydown 전파가 끝난 뒤 일어나므로, 작성·색상 선택의 ESC 처리부는 그 시점에 아직 열린 창을 보고 무시한다 (창만 닫힘).
- **AudioContext는 첫 입력 안에서 생성:** 입력 전에 만들면 경고가 남는다. 디코딩은 `OfflineAudioContext`로 미리 해 첫 클릭 소리부터 들린다.
- **음소거 = 플래그:** 볼륨 값이 남아 해제 시 복원. 볼륨 0에서 해제하면 기본 볼륨. 슬라이더를 움직이면 음소거 해제.

### 문제와 해결

| 문제                                                          | 원인                                                                                                                                      | 해결                                                                                   |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 개발 모드에서 모달이 열리자마자 닫힘 (headless 점검에서 발견) | StrictMode가 effect를 실행 → 정리(`close()`) → 다시 실행(`showModal()`). `close` 이벤트는 비동기라 **다시 열린 뒤** 도착해 `onClose` 실행 | `close` 이벤트가 왔을 때 창이 열려 있으면 무시 (ESC로 실제로 닫힌 경우 `open`이 false) |
| 소리 설정 아래 언덕 장식이 패널의 둥근 모서리 밖으로 나옴     | 스크롤 영역 안에서 음수 margin으로 넓힘                                                                                                   | `GameDialog`에 `footer` 자리(스크롤 밖, `rounded-b` + `overflow-hidden`)               |
| 한국어 안내가 단어 중간에서 줄바꿈 ("적어 / 요.")             | 기본 `word-break`                                                                                                                         | 본문에 `break-keep`                                                                    |
| footstep.mp3를 그대로 반복하면 걸음 간격이 Walk와 안 맞음     | 걸음 14개가 0.73~1.0초 불규칙 간격 녹음                                                                                                   | 걸음 구간 표로 잘라 발 디딤 시점마다 1개 재생, 직전과 다른 구간 선택                   |

### 자동 검증

- [x] `npm run typecheck` · `npm run lint` · `npm run format:check` 통과
- [x] `npm test` 17파일 **269개** 통과 (241 + `audioSettings` 11 + `soundRules` 17)
- [x] `npm run build` 통과

#### headless Chrome (CDP, 이미 실행 중이던 개발 서버 :3123, 사람 확인을 대체하지 않음)

`AudioContext`·`Audio`·`AudioBufferSourceNode.start`를 페이지 로드 전에 감싸 기록했다. 실제 소리를 귀로 확인한 것은 아니다.

- 입력 전: AudioContext 0개, `<audio>` 0개. 받은 파일 = ui-click·paper·footstep·campfire (**ignite·launch 요청 없음, BGM은 입력 전 요청 없음**).
- 첫 클릭 후: AudioContext `running`, BGM `paused=false`, 모닥불 반복 소스 1개.
- 걷기(A 1.2초 → D 1.2초): 발소리 4회, 간격 **520ms** 안팎 (Walk 반 주기 0.52초). 멈춘 뒤 1초 동안 0회.
- 모닥불 근접도 목표값: 0.35 → 0.14(멀어짐) → 0.35(돌아옴).
- 플레이 방법: `:modal`, 제목으로 `aria-labelledby`, 열면 포커스가 창 안(닫기 버튼). 링크 4개 `target=_blank`·`rel=noopener noreferrer`, URL 일치. 1440×900·900×560에서 패널이 화면 안, 안쪽 스크롤. 560 폭에서 출처 카드 1열.
- **모달이 열린 동안 A를 1.2초 눌러도 발소리 0회**(= 이동 없음). A를 누른 채 ESC로 닫고 1.2초 더 눌러도 0회(눌린 키 초기화). 다시 누르면 정상 이동(2회).
- 소리 설정: BGM 슬라이더 ←×5 → 55, 효과음 음소거 → 저장 `{"bgm":{"volume":55,"muted":false},"sfx":{"volume":80,"muted":true}}`, 새로고침 후 55·80·효과음 음소거 그대로. 클릭 효과음 시작 위치 0.12s.
- 콘솔: 기존 `THREE.Clock` 경고뿐. 오디오·자동 재생 관련 경고·처리되지 않은 오류 없음.
- 확인하지 않은 것: 점화·발사(파일 없음), 받기·작성 흐름의 종이 소리(단위 테스트만), 실제 음색·음량 균형, 작성·색상 선택 중 모달 열기, 발사 전체 흐름 회귀.

### 브라우저 확인 (직접) — 아직 하지 않음

- IMPLEMENTATION_PLAN '5단계 작업 — 플레이 방법·사운드' 완료 조건 전체. 특히 음량 균형(gain 값은 녹음 크기로 맞춘 초기값), 발소리가 걸음과 맞는지, 모닥불 거리감.

### 문제 / 다음 할 일

- 점화(`ignite.mp3`)·발사(`launch.mp3`) 파일을 받으면 `AUDIO_FILES` 경로와 `ONE_SHOT_CONFIG`(gain·앞 무음 offset)를 측정해 채운다. 필기 소리는 선택.
- 오디오 파일 출처·라이선스를 README에 추가한다 (사용자 제공 정보 필요).

---

## 2026-11-03 · 비주얼 개선 · develop 병합 (캐릭터 애니메이션), 조명 문서 정리

- 브랜치: `feature/visual-polish`
- 목표: visual-polish에서 Idle·Walk 개선과 Throw·Praying이 보이지 않던 문제를 해결하고, 남은 문서·주석을 실제 값과 맞춘다.

### 원인

- **브랜치 병합 누락.** `feature/character-animations`(d6972bc)는 커밋·푸시만 되고 develop에 병합되지 않은 상태에서 visual-polish가 develop(9c72b45)에서 분기했다 (reflog: 18:42 커밋 → 18:43 develop 이동 → 18:44 visual-polish 생성).
- 파일 교체·런타임 문제가 아니었다: `character.glb`를 바꾼 커밋은 world-setup(2클립)과 d6972bc(4클립) 둘뿐이고 덮어쓴 커밋은 없었다. visual-polish의 GLB·`CharacterModel`은 병합 전 버전(Idle·Walk만) 그대로였다.

### 진행

1. 미커밋 작업 보존: 천등 색상·`/lab` 차단을 `5d122c6`으로 커밋, 백업 브랜치 `backup/visual-polish-before-anim` 생성.
2. 사용자가 GitHub에서 PR #8(`feature/character-animations` → develop, `d4c220d`) 병합. PR 내용 = d6972bc (추가 변경 없음).
3. `git merge --no-ff develop` → merge commit `754bacd`. 충돌 2개:
   - `DEV_LOG.md`: 양쪽이 맨 위에 기록을 추가함 → 둘 다 보존 (최신 순: 비주얼 개선 2개 → 애니메이션).
   - `gameStore.test.ts` 2곳: develop의 LAUNCHING 구조(`beginLaunch` → Throw에서 `launchLantern` → `finishLaunch`) 테스트를 채택하고 옛 색 id `prepareWritten("red")`를 `"lime"`으로. visual-polish의 '탐색 모드가 아니면 발사하지 않는다'는 develop에서 'LAUNCHING이 아니면 분리하지 않는다'(WRITING 포함)로 대체되어 뺐다.
   - 자동 병합: `worldConfig.ts`(develop의 `fallbackPosition` + 조명 값 유지), `lanternTransitions.ts`·테스트, SPEC, PLAN.
4. 병합 후 확인: 한쪽만 바꾼 파일이 각 원본과 같음 (visual-polish 10개 = 백업 브랜치, 애니메이션 14개 = develop). `character.glb` 4클립 (Idle 6.77s · Walk 1.03s · Throw 5.77s · Praying 3.43s). 옛 색 id 없음.

### 문서·주석 정리 (이번 커밋)

- `worldConfig.ts` `HELD_LANTERN_CONFIG` 주석: 모닥불 빛 distance 14 → **13** (실제 값). 조명 작업 때 남은 오기.
- `PROJECT_SPEC.md` 조명 절을 코드 값과 맞춤: 모닥불 pointLight `decay 2, distance 11` → `#ff9a4d, 30cd, decay 1.5, distance 13`, 반구광·노을빛 값 명시, 불꽃 '`Fire` 재질 emissiveIntensity' → 정점 색 `MeshBasicMaterial` [결정], 손 천등 설명의 모닥불 distance 11 → 13. 나머지(라이트 4개, 노을빛 위치, 안개 16~46, 배경막 반지름 80, 손 천등 빛, 천등 발광 0.65/0.8·±8%·1.9배)는 코드와 일치함을 확인.

### 자동 검증

- [x] `npm run typecheck` · `npm run lint` · `npm run format:check` 통과
- [x] `npm test` 15파일 **241개** 통과 (visual-polish 228 + 애니메이션 쪽 테스트)
- [x] `npm run build` 통과. `next start`에서 `/lab/lantern`·`/lab` 404, `next dev`에서 200
- [x] headless Chrome: 병합 후 게임 로드 시 콘솔 오류 없음 (R3F `THREE.Clock` 경고뿐), 조명·불꽃 색 그대로. 발사 전체 흐름은 자동 확인하지 않음

### 브라우저 확인 (직접) — 아직 하지 않음

- [ ] 새 Idle·Walk(팔 간격 개선)와 전환
- [ ] F 3초 홀드 → Throw → 손을 놓는 순간 천등 분리·카메라 연출 시작 → Praying → Idle, 발사 동작 중 이동·상호작용 잠금
- [ ] 발사 후 재수령·반복, textures·geometries 증가 없음
- [ ] 조명·불꽃, 새 4색(받기 → 작성 → 점화 → Throw 중 손 천등 → 발사), 개발 모드 `/lab/lantern`

---

## 2026-11-03 · 비주얼 개선 · 천등 색상 교체, `/lab` 개발 전용

- 브랜치: `feature/visual-polish`
- 목표: ① 천등 4색을 분홍·노랑·연두·하늘로 교체하고 UI·상태·텍스처·손 천등·점화·발사까지 일관되게 반영 ② `/lab/lantern`은 삭제하지 않고 개발 환경에서만 접근, 프로덕션은 404.

### 변경사항

- **색상** `constants/lanternColors.ts` (단일 원본):

| id       | 이름 | HEX       | 이전                   |
| -------- | ---- | --------- | ---------------------- |
| `pink`   | 분홍 | `#ff7598` | `pink` `#f290b2`       |
| `yellow` | 노랑 | `#ffd875` | `yellow` `#f2c94c`     |
| `lime`   | 연두 | `#7beb67` | (새 id, `red` 삭제)    |
| `sky`    | 하늘 | `#7dbbf5` | (새 id, `orange` 삭제) |

- 순서도 요청대로 분홍 → 노랑 → 연두 → 하늘. `LanternColorId`가 값에서 나오는 타입이라 `red`·`orange`를 쓰는 코드는 타입 오류가 된다 → 전부 정리.
- 색 선택 UI(`ColorSelectPanel`)·HUD 색 표시·작성 종이(`WritingOverlay`·`WritingPaper`)·손 천등(`HeldLantern`)·발사 천등(`FlyingLanterns`)·CanvasTexture(`useLanternTexture`, colorHex 인자)는 모두 `LANTERN_COLORS`/`getLanternColorHex`만 읽어서 코드 변경 없이 반영된다. 점화 발광은 종이색 × `LANTERN_INNER_GLOW_HEX`라 함께 바뀐다.
- 기본값 `red` → `pink`: `EMPTY_HELD_LANTERN.colorId`(NONE 상태의 의미 없는 고정값), `LanternLab` 초기 색.
- 테스트: `red`→`lime`, `orange`→`sky`. 기본값이 `pink`가 되어 '선택한 색이 반영된다'를 확인하는 테스트 3곳(`lanternTransitions` receive, `gameStore` 작성·발사 후 재수령)은 기본값과 다른 `yellow`·`sky`로 바꿨다 (기본값과 같은 색이면 반영 여부를 구분할 수 없음). `lanternGlow` 흰색 곱 테스트의 예시 HEX도 새 분홍으로.
- 문서: PROJECT_SPEC 색상 절, CODING_CONVENTIONS 예시 id.
- 남긴 것: `LaunchHoldButton` 진행률 그라데이션의 `#f08a3c`는 옛 주황과 같은 값이지만 천등 색이 아니라 불꽃 느낌의 UI 강조색이라 유지.
- **`/lab` 개발 전용**
  - 새 `app/lab/layout.tsx`: `process.env.NODE_ENV === "production"`이면 `notFound()` (Next 16 `next/navigation`, 문서 `04-functions/not-found.md`). 세그먼트 레이아웃이라 `/lab`과 `/lab/*` 전체가 막히고, `lab/lantern/page.tsx`와 `LanternLab`의 개발 기능은 그대로다.
  - `lab/lantern/page.tsx`의 `metadata`는 프로덕션에서 `{}`. 첫 빌드에서 404 응답 안에 '천등 기술 검증' 제목·설명이 그대로 실렸다 (메타데이터는 렌더링과 따로 결정됨) → 비워서 루트 제목만 남게 했다.
  - `LayoutProps<"/lab">` 타입은 Next가 만드는 라우트 타입이 필요해서 `next typegen`을 한 번 실행했다 (`build`·`dev`도 같은 타입을 만든다).
  - IMPLEMENTATION_PLAN 5단계 '`/lab/lantern` 유지 여부'에 결정 기록, PROJECT_SPEC 폴더 구조에 `lab/layout.tsx` 추가.

### 자동 검증

- [x] `npm run typecheck` · `npm run lint` · `npm run format:check` 통과
- [x] `npm test` 14파일 **228개** 통과 (`lanternGlow` '4색 모두 채널 크기 순서 유지'가 새 4색으로 통과 — 점화해도 하늘이 회색·연두가 노랑으로 바뀌지 않음)
- [x] `npm run build` 통과 (`/`, `/_not-found`, `/lab/lantern`. lab은 404 페이지로 미리 렌더링됨)
- [x] **`next start` (프로덕션):** `/` 200, `/lab/lantern` **404**, `/lab` **404**, 응답 본문은 Next 기본 404 UI + `noindex`, '천등 기술 검증' 문자열 0개
- [x] **`next dev`:** `/lab/lantern` 200, 제목 '천등 기술 검증 | 소원등'

#### headless Chrome (개발 서버, 사람 확인을 대체하지 않음)

- 게임 색상 선택 패널에 분홍·노랑·연두·하늘 4칸, 하늘 선택 후 HUD 색 표시가 하늘색, '소원 작성하기 / 색상 다시 고르기' 표시.
- `/lab/lantern`: 버튼 '분홍 | 노랑 | 연두 | 하늘', 연두 선택 시 2D Canvas 배경과 3D 천등 종이가 연두. textures 2 · geometries 6 (1단계와 같음).

### 브라우저 확인 (직접) — 아직 하지 않음

- [ ] 4색 모두 받기 → 손 천등 → 작성 종이 → 점화 → 발사까지 색이 같은 계열로 보인다 (특히 하늘·연두가 점화 후 회색·노랑으로 바래지 않는다)
- [ ] 밝은 4색 위에서 검정 손글씨가 잘 읽힌다
- [ ] 초저녁 조명·모닥불 빛 아래에서 하늘·연두 천등이 어색하지 않다
- [ ] 개발 모드 `/lab/lantern`의 필기·점화·상승 테스트가 그대로다

---

## 2026-11-03 · 비주얼 개선 · 초저녁 라이팅, 모닥불 불꽃 색

- 브랜치: `feature/visual-polish`
- 목표: 전체가 어둡고 칙칙한 화면을 '해가 진 초저녁 + 모닥불 때문에 가운데가 따뜻하게 밝은' 분위기로. 불꽃을 노란 덩어리가 아니라 불처럼. 로직(이동·충돌·상호작용·작성·점화·발사)은 건드리지 않는다.

### 변경사항

- `worldConfig`
  - `ATMOSPHERE_CONFIG.hemisphere`: `#c3bcdd`/`#4f4b62`/0.58π → `#d0c3dc`/`#5e4d5e`/0.64π (회색 기를 빼고 조금 따뜻하게, 세기는 조금만)
  - `CAMPFIRE_CONFIG.light`: 위치 y 1.53 → 1.9, 색 `#ff9447` → `#ff9a4d`, 26cd·decay 2·distance 11 → **30cd·decay 1.5·distance 13**
  - `CAMPFIRE_CONFIG.emissiveIntensity` 삭제 → `flameColors`(core `#fff3b0` · mid `#ffb02e` · edge `#f2560f`, facingWeight 1.25, heightCooling 0.7)
- `lib/game/campfire.ts`: `getFlameHeat`, `writeFlameColors` 추가 (+ 테스트 4개)
- `world/CampfireFire`: 복제 Geometry에 정점 색 속성 추가, 재질을 `MeshBasicMaterial({ vertexColors, toneMapped: false })`로 교체 (정리 함수에서 원래 재질·Geometry로 되돌리고 둘 다 dispose). 매 프레임 기존 정점 루프 뒤에 색을 쓴다

### 결정 / 이유

- **불꽃 색은 emissive만으로 안 된다:** 원본 `Fire` 재질은 단색 emissive(1, 0.30, 0.002) + 금속성 0.36·거칠기 0이라 메시 전체가 한 색이다. emissive·세기를 바꿔도 안팎을 나눌 수 없다. 그래서 Geometry는 그대로 두고 정점 색만 칠했다 (셰이더·에셋 추가 없음).
  - 뜨거운 정도 = 정면도(법선 · 카메라 방향) × 1.25 − 높이 비율 × 0.7. 화면에서 불꽃 가운데·아래는 연노랑, 실루엣 가장자리·끝은 주황. 일렁임 밝기(glow)를 함께 곱한다. 법선은 원래 모양 기준(일렁임이 작아 재계산하지 않음).
  - 조명을 받지 않는 재질이라 모닥불 pointLight가 불꽃 자신을 비추거나 반사로 하얗게 뜨는 일이 없다.
- **가운데만 따뜻하게:** 반구광(화면 전체)은 조금만 올리고, 가운데 밝기는 모닥불 빛의 감쇠를 완만하게(decay 1.5) 해서 만든다. 빛 위치를 올려 불 바로 옆 바닥은 이전과 같은 밝기(15.9 → 15.7)이고, 테이블·시작 위치(약 4.4)는 1.3 → 3.1, 12 거리 이상은 거의 0이라 화면 가장자리 숲은 어둡게 남는다. 라이트 수(4)는 그대로.
  - 첫 시도(22cd·decay 1.6·distance 14)는 캡처에서 차이가 거의 보이지 않아 한 번 더 올렸다.

### 자동 검증

- [x] `npm run typecheck` · `npm run lint` · `npm run format:check` 통과
- [x] `npm test` 14파일 **228개** 통과 (기존 222 + 새 6: `getFlameHeat` 2, `writeFlameColors` 4)
- [x] `npm run build` 통과 (`/`, `/lab/lantern` static)

#### headless Chrome 캡처 (CDP, GPU d3d11, 사람 확인을 대체하지 않음)

- 같은 이동 경로(시작 → 오른쪽 → 테이블 앞)로 변경 전·후 캡처 비교: 불꽃 가운데 연노랑·바깥 주황, 모닥불 둘레 바닥에 따뜻한 빛 웅덩이, 테이블 상판에 따뜻한 빛. 캐릭터 분홍은 유지, 하늘 띠·먼 숲은 그대로.
- renderer.info: textures 3 · geometries 245 (변경 전과 같은 경로에서 같음). 콘솔은 R3F `THREE.Clock` 경고뿐.

### 브라우저 확인 (직접) — 아직 하지 않음

- [ ] 가운데 빈터가 이전보다 따뜻하고 밝고, 화면 가장자리 숲·하늘은 초저녁 그대로다
- [ ] 불꽃 가운데 연노랑·바깥 주황, 여러 각도에서 색이 튀거나 깜빡이지 않는다
- [ ] 둘레 돌·바닥이 하얗게 타지 않고, 캐릭터 분홍·천등 색이 주황으로 물들지 않는다
- [ ] 작성 시점(테이블 위)에서 종이·손글씨 색이 그대로다
- [ ] 이동·충돌·상호작용·작성·점화·발사 흐름, 반복 후 textures·geometries 변화 없음

---

## 2026-11-03 · 4단계 추가 개선 · 캐릭터 애니메이션 교체, Throw·Praying 연동

- 브랜치: `feature/character-animations`
- 목표: 팔이 몸통에 붙어 있던 Idle·Walk를 팔 간격을 넓힌 버전으로 바꾸고, 발사에 Throw(던지기) → Praying(기도) 동작을 붙인다. 천등은 Throw에서 **손을 놓는 순간** 떨어지고, 카메라 연출도 그 순간부터 시작한다. 효과음은 다음 브랜치.

### 사전 검증 (`assets-source/character/mixamo/updated/`)

| 항목                              | Idle        | Walking                                                    | Throw                               | Praying   |
| --------------------------------- | ----------- | ---------------------------------------------------------- | ----------------------------------- | --------- |
| 본 / 트랙                         | 32 / 26     | 같음                                                       | 같음                                | 같음      |
| 스킨 본 순서·바인드 역행렬·정점   | 기존과 같음 | 같음                                                       | 같음                                | 같음      |
| 길이                              | 6.767초     | 1.033초                                                    | 5.767초                             | 3.433초   |
| 루트 위치 트랙 (`BaseMesh_Chibi`) | 처음 = 끝   | **처음 받은 파일: z −0.30 → 22.73** → 다시 받음: 처음 = 끝 | 처음 z −0.47 → 끝 15.81, 최대 23.75 | 처음 = 끝 |

- rest pose 차이는 `Head` 하나(위치 1.58, 회전 0.12rad)이고 매 프레임 애니메이션이 덮는 본이라 영향 없음. `RightHand` 이름·계층 그대로.
- **Walking 문제:** 처음 받은 Walking은 2단계의 첫 Walking과 같은 루트 모션(루프마다 22.7cm 전진)이었다. 스크립트에서 잘라 낼지 다시 받을지 물었고, 사용자가 **In Place로 다시 받았다** (z 범위 −0.96~0.10, 걸음 흔들림). SPEC §4 '코드에서 트랙을 잘라 내는 우회는 하지 않는다' 원칙과 맞다.
- **Throw 동작 구간** (오른손, 엉덩이 기준): 0~0.6초 거의 정지 → 0.7~2.5초 와인드업(앞으로 디딤, 손이 뒤로) → 2.9~3.4초 머리 위로 던짐 (손 속도 최고·최고점 3.27초) → 3.5~5.77초 팔로스루 후 Idle 비슷한 자세. Throw는 Mixamo In Place 대상이 아니라 스크립트에서 루트 XZ를 고정했다 (아래).
- **Praying:** 손을 가슴 앞에 모은 정적인 자세(호흡 정도). 처음·끝 자세가 같다.

### 변경사항

- `scripts/merge-character.mjs`: 모델은 2단계 `mixamo/Idle.fbx` 그대로(외형·바인드 포즈 유지), 클립 4개는 `updated/`에서. 클립별 검사 추가(스켈레톤 같음, 트랙 대상 존재, In Place). Throw만 `lock-xz`(루트 XZ = 첫 프레임 값, Y 유지). 기존 원본 FBX는 그대로 둔다.
- `public/models/character.glb` 교체 (319 KB → 407 KB, SHA-256 `971ca274…`). 백업: `assets-source/character/backups/character.before-character-animations.glb`(수동) + 스크립트 백업 `character.2026-11-03T09-23-50-320Z.glb` (둘 다 이전 해시 `46d4243c…`).
- `GameMode`에 **`LAUNCHING`** 추가. store `beginLaunch()`(EXPLORE + LIT → LAUNCHING), `launchLantern(pose)`는 LAUNCHING + LIT에서만, `finishLaunch()`(LAUNCHING → EXPLORE). `closeOverlay`는 COLOR_SELECT·WRITING만 닫는다.
- `lib/game/launchAnimation.ts`(신규): 단계 전이 `getNextLaunchPhase`(NONE → THROW → PRAY → NONE), 놓는 시점 `shouldReleaseLantern`. 테스트 8개.
- `CharacterModel`: Throw·Praying action(LoopOnce·clampWhenFinished, Throw 1.3배속), `finished` 리스너 1개(mixer effect에서 달고 정리), LAUNCHING이 되면 Throw 시작(클립 0.6초부터), 클립 3.33초에 `onThrowRelease`, Praying 끝에 `onLaunchAnimationEnd`. Idle/Walk 전환은 발사 동작이 아닐 때만. 클립이 없으면 그 단계를 건너뛰어 반드시 탐색으로 돌아간다.
- `launchHeldLantern`을 `LaunchHoldButton`에서 `components/lantern/launchHeldLantern.ts`로 옮김 (계산 그대로, 호출 시점만 변경). `LaunchHoldButton`은 홀드 완료 시 `beginLaunch()`만 부른다 → `GameHUD`·`LaunchHoldButton`의 `heldAnchorRef` prop 제거.
- `GameCanvas`: `onThrowRelease` → `launchHeldLantern(손 천등 실제 위치)`, `onLaunchAnimationEnd` → `finishLaunch()`.
- `HELD_LANTERN_CONFIG.fallbackPosition`(손 본이 없을 때만 사용)을 새 Idle 기준 `[-0.5, 0.49, 0.08]`로. `handOffset`은 그대로.
- `CameraRig`·`FlyingLantern`·발사 궤적·홀드 입력 규칙은 바꾸지 않았다.

### 결정 / 이유

- **천등 분리 시점 = Throw 클립 3.33초** (홀드 완료 약 2.1초 뒤). 손 속도 최고점(3.27초)에는 천등 중심이 몸 축에서 수평 0.28이라 `getLaunchPose`가 0.4까지 밀어내 12cm 튄다. 3.33초는 손이 머리 위를 지나 몸 앞으로 뻗은 순간이고 수평 0.40~0.45라 보정 없이 손에 든 위치에서 그대로 출발한다.
- **Throw 0.6초부터 1.3배속** (사용자 선택). 3초 홀드 뒤 다시 3.3초를 기다리지 않게 정지 구간을 건너뛰고 조금 빠르게. 대안(처음부터 1배속 3.3초, 0.6초부터 1배속 2.7초)은 `LAUNCH_ANIMATION` 값만 바꾸면 된다.
- **이동 잠금 = 모드 `LAUNCHING`** (사용자 선택). 이동 무시·키 비우기(모드 변경 시)·상호작용 숨김·홀드 버튼 숨김·다른 액션 거부가 모두 기존 `mode !== "EXPLORE"` 규칙으로 따라온다. 별도 플래그는 판정마다 조건을 하나씩 더해야 한다. 대가: ESC가 LAUNCHING을 풀지 않도록 `closeOverlay` 수정, SPEC §7 모드 표 변경.
- **카메라 코드는 그대로.** 이미 `flying` 목록 끝이 바뀔 때 연출을 시작하므로, 분리 시점을 옮기면 연출도 자동으로 분리 순간부터다.
- **finished 이벤트로 단계 전환**, 놓는 시점은 매 프레임 `time >= 3.33` 판정. 큰 delta로 놓는 시점과 끝을 한 번에 지나면 `throwFinished`에서 놓는다(가드로 한 번만). 콜백이 두 번 와도 store가 LAUNCHING + LIT일 때만 분리한다 (이중 방어).
- 애니메이션 단계(THROW·PRAY)는 store에 두지 않았다. 다른 컴포넌트가 읽지 않고 mixer와 수명이 같아서 `CharacterModel`의 mixer 객체 옆에 둔다. store는 '발사 동작 중인가'(모드)만 안다.
- Throw 루트 XZ 고정의 대가: 앞으로 디디는 발은 제자리에서 앞뒤로 움직인다 (몸은 그대로). 루트 모션을 플레이어 위치에 반영하는 방식은 PlayerController(유일한 위치 주체)·충돌을 건드리는 큰 변경이라 하지 않았다.

### 자동 검증

- [x] `npm run typecheck` · `npm run lint`(warning 0) · `npm run format:check` 통과
- [x] `npm test` 15파일 **235개** 통과 (222 → 235: `launchAnimation.test` 8, store 발사 동작 4 추가, `canBeginLaunch` 1, 기존 발사 테스트는 LAUNCHING 흐름으로 수정)
- [x] `npm run build` 통과 (`/`, `/lab/lantern` static)
- [x] `node scripts/merge-character.mjs --replace`: 입력 12 + 결과 12 검사 통과 (정점 1233·110, 재질, bbox min −0.211,0,−0.131 max 0.211,0.475,0.139 원본과 같음, 클립 4개 트랙 대상 모두 존재, `RightHand`)

#### 오프라인 측정 (실제 GLB + three `AnimationMixer`, 사람 확인 대체 아님)

- 오른손·손 천등 위치 (캐릭터 로컬, 스케일 4): Idle 손 x −0.29~−0.36 → **−0.36~−0.38**, 천등 중심 ↔ 몸 축 최소 수평 거리 Idle **0.43 → 0.50**, Walk **0.39 → 0.45**.
- 60fps 시뮬레이션(컴포넌트와 같은 설정, 걷는 중 홀드 완료, 2회 반복): 놓기 **2.12초**(클립 3.35초, 천등 수평 0.45) · Throw 끝 3.97초 · Praying 끝 → `finishLaunch` **7.42초**. 회차마다 Throw·Praying `finished` 각 1회, 리스너 1개. 끝나고 1초 뒤 Idle 가중치 1.00, Throw·Praying 비활성.
- 카메라 연출은 분리(2.1초) + 1 + 3 + 1 → 약 7.1초에 끝나고, 이동 잠금은 7.4초에 풀린다.
- 실제 브라우저 흐름(탁자 → 작성 → 점화 → 홀드)의 headless 자동 점검은 이번에 하지 않았다.

### 브라우저 확인 (직접) — 아직 하지 않음

- [ ] 새 Idle·Walk: 팔이 몸통과 덜 겹친다. 정지 ↔ 이동 전환이 부드럽고, 걷는 동안 미끄러지거나 루프마다 튀지 않는다
- [ ] 빈손·천등 소지 모두 자연스럽다. 천등이 몸·다리를 뚫지 않는다 (Walk에서 손이 앞뒤로 흔들릴 때 포함)
- [ ] 홀드 완료 → Throw 1회. 손을 앞으로 뻗는 순간 천등이 떨어진다 (먼저 떨어지거나 늦게 떨어지면 `throwReleaseSec` ±0.05 조정)
- [ ] Throw 와인드업에서 손 천등이 머리 뒤로 갈 때 많이 뚫어 보이지 않는지 (손 천등은 손목 회전을 따르지 않고 위치만 따라간다)
- [ ] 디디는 발이 제자리에서 미끄러져 보이는 정도가 괜찮은지 (루트 XZ 고정의 대가)
- [ ] Throw → Praying → Idle 전환이 튀지 않고, 각각 한 번만 재생된다
- [ ] 동작 중 WASD·E·F·ESC가 먹지 않고, 기도가 끝나면 바로 움직일 수 있다. 걷는 중에 홀드를 끝내도 멈춰서 던진다
- [ ] 카메라가 천등이 떨어진 순간부터 1초 대기 → 3초 추적 → 1초 복귀
- [ ] 5회 이상 반복 발사: 천등 1개씩, 애니메이션 겹침·가속 없음, 개발 모드 `renderer.info.memory`가 이전처럼 기준값으로 돌아온다
- [ ] 탁자 받기·색상·작성·모닥불 점화·4색 발광·손글씨 유지

### 문제 / 다음 할 일

- (해결) 처음 받은 Walking이 루트 모션 → In Place로 다시 받음.
- (해결) 홀드 완료와 Throw 타이밍: 분리를 store 액션 2개(`beginLaunch` → `launchLantern`)로 나누고 그 사이를 애니메이션이 채운다.
- 발사 후 이동 잠금이 약 7.4초다. 길게 느껴지면 Praying `timeScale` 또는 Throw 끝 전에 Praying으로 넘어가는 방식을 검토.
- 효과음(던지기·기도) → 다음 브랜치.

---

## 2026-11-03 · 4단계 마무리 · 최종 검증, 발사 카메라 연출 확정

- 브랜치: `feature/lantern-ignition-launch`
- 목표: 4단계 구현 전체를 최종 검증하고, 코드만 수정했던 발사 카메라 연출(대기 1초 → 추적 3초 → 복귀 1초)을 확인·문서화한다. 애니메이션 교체·효과음·UI 리디자인은 범위 밖 (별도 브랜치).

### 4단계에서 구현한 기능 (요약)

| 기능                                               | 구현 위치 (자세한 내용은 아래 기록)                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 모닥불 거리·방향 판정, 돌 링 외곽선, 'E 불 붙이기' | `interaction.ts` campfire 대상, `InteractionHighlight`, `InteractionSensor`               |
| WRITTEN에서만 점화, 중복 점화·점화 후 수정 차단    | `applyLanternAction` light, `gameStore.lightLantern`                                      |
| 점화 발광 (색·손글씨 유지, 점화 연출·흔들림)       | `LanternModel` glowRef, `lanternGlow.ts`, `HeldLanternLight`                              |
| F·버튼 3초 홀드, 중도 취소                         | `launchHold.ts`, `LaunchHoldButton`                                                       |
| 손 위치에서 분리·상승                              | `getLaunchPose`, `FlyingLantern`, `getFlyingLanternPosition`                              |
| 발사 후 NONE·반복 수령                             | `gameStore.launchLantern` (한 번의 갱신)                                                  |
| 최대 5개·만료·GPU 정리                             | `appendFlyingLantern`, `removeFlyingLantern`, 인스턴스별 텍스처                           |
| 발사 카메라 연출                                   | `CameraRig`, `camera.ts`(`smoothDamp`·`getLaunchFocusHeight`), `CAMERA_CONFIG.launchLook` |

### 발사 카메라 연출 — 최종 변경 사항

변경 이력: ① 12° 고정 각도 0.5초 올림 → ② 실제 천등 2초 추적 → ③ 3·4초 추적 + 각도 조정 (코드만) → ④ 대기 + 속도 제한 추적 (코드만) → ⑤ 이번: 복귀 시간 수정 후 확정. ①·②는 시선이 너무 빨리 올랐다 내려온다는 피드백으로 교체했다.

- 최종 설정 (`CAMERA_CONFIG.launchLook`): `delaySec 1`, `followSec 3`(그 안에서 `easeInSec 1.5`로 목표가 커짐), `returnSec 1`, 목표 높이 `lookLift 0.35` + `extraPitchDeg 6` / `lanternAboveCenter 0.45` / `maxLanternOffsetDeg 17`, 추적 스프링 `0.8초 · 최대 5°/초`, 복귀 스프링 `0.28초 · 최대 24°/초`.
- 구조: 목표 시선(천등의 실제 위치 기준)과 실제 시선(평소 시선에서의 pitch·yaw 오프셋 + `smoothDamp`)을 나눴다. 목표로 바로 섞지 않으므로 추적 시작에 시선이 꺾이지 않고, 각속도가 상한을 넘지 않는다. 복귀도 지금 각도·속도에서 이어진다. 오프셋이 약 0.006° 아래가 되면 정확히 0으로 → 기존 계산.
- **이번에 고친 문제:** 확인 측정에서 복귀가 1초가 아니라 **약 1.9초**(발사 후 5.92초에 기준 시선 ±0.05°) 걸렸다. 원인 2가지: ① 복귀 시작 때 추적 중 위로 돌던 속도가 남아 0.3초 더 올라감, ② 복귀 목표를 1초에 걸쳐 줄이는 것과 스프링 지연이 겹침(두 번 부드럽게 함). → 복귀 구간에서는 목표를 바로 0으로 두고 스프링 하나만 남김 + 복귀 스프링 0.35초·16°/초 → 0.28초·24°/초. 결과 발사 후 **5.03초**에 복귀(±0.05°).

### 자동 검증

- [x] `npm run typecheck` · `npm run lint`(warning 0) · `npm run format:check` 통과
- [x] `npm test` 14파일 **222개** 통과 (4단계 첫 기록 208 + 카메라 연출 관련 14: `getFlyingLanternPosition` 2, 연출 시간·초점 높이·`smoothDamp` 등 `camera.test` 12)
- [x] `npm run build` 통과 (`/`, `/lab/lantern` static)

#### headless Chrome 회귀 (CDP, GPU d3d11, 사람 확인을 대체하지 않음)

- **4단계 + 1~3단계 흐름 43항목:** 모닥불 표시(NONE·BLANK 없음, WRITTEN 바라볼 때만, 돌아섬·멀어짐 시 사라짐), 실행 재검증, 점화·중복 점화·LIT 탁자 차단, 홀드(50% 표시, 3초 전 취소, 반복 keydown, blur, 반복 클릭, pointerleave, 이동 중 유지), 포인터 + F 동시 홀드 1회 발사, 발사 후 NONE·즉시 이동·재수령, **20회 반복 후 renderer textures 5→5 · geometries 257→257 · WebGL 텍스처 9→9 · 버퍼 990→990**, 최대 개수, `/lab/lantern`(textures 2 · geometries 6 시작, 라운드 후 원래 값) 모두 통과.
  - 셰이더 프로그램은 반복 중 18~20을 오르내리고 만료 후 16(기준값)으로 돌아온다. 이전 기록의 'FAIL'은 '항상 일정'이라는 판정 기준이 너무 엄격했던 것이라 기준을 '상한 안 + 끝 = 기준값'으로 고쳤다 (점검 스크립트만 수정).
  - 1~3단계: 받기(색상 선택)·작성·완료·탁자 버튼·실행 재검증·이동이 이 흐름 안에서 함께 확인됐다. 콘솔은 R3F `THREE.Clock` 경고뿐.
- **발사 카메라 연출 (매 프레임 카메라 행렬 + 실제 FlyingLantern 위치를 화면에 투영):**

| 발사 후 | 0~1초          | 2초     | 3초     | 4초     | 4.3초   | 5초     | 5.03초~        |
| ------- | -------------- | ------- | ------- | ------- | ------- | ------- | -------------- |
| pitch   | −26.21° 그대로 | −24.39° | −19.49° | −17.23° | −22.82° | −26.15° | −26.21° (기준) |

- 추적 구간 최대 회전 0.10°/프레임, 복귀 포함 최대 0.26°/프레임. 제자리에서 카메라 위치 변화 0.
- 추적 중(1~4초) 천등 화면 위치 NDC y −0.03 → +0.23 (중앙 근처에서 점점 위로). 좌우는 천등 쪽으로 최대 약 7.4°.
- 발사 직후 A로 이동: 플레이어 x 5.41, 카메라 x 4.84 (평소 감쇠 추적), 끝 시선 = 기준값.

### 브라우저 확인 (직접) — 아직 하지 않음

- [ ] 발사 후 1초 기다렸다가 고개를 천천히 드는 느낌이 자연스럽다 (너무 느리면 `followMaxTurnDegPerSec` ↑, 크게 보이면 `extraPitchDeg` ↓)
- [ ] 복귀(1초)가 급하게 느껴지지 않는다 (복귀는 최대 약 24°/초로 추적보다 빠르다)
- [ ] 연출 중·후 이동·충돌·홀드·재수령이 평소와 같다
- [ ] 아래 '모닥불 점화와 3초 홀드 발사' 기록의 브라우저 확인 항목 전체 (점화 연출·4색 발광·발사 출발·누수·캐노피 등)

### 남은 개선 사항 / 다음 브랜치

- Idle·Walk 교체, Throw·Praying 애니메이션, 효과음, UI 리디자인 (요청대로 이번 브랜치에서 제외)
- 장작 강조, 연출 중 연속 발사의 실제 UI 확인 (현재 순환 약 7초 > 연출 5초라 겹치기 어려움, 단위 테스트로만 확인)

---

## 2026-11-03 · 4단계 · 발사 카메라 연출 교체 (오르는 천등 따라 보기) — 이후 다시 교체됨: '4단계 마무리' 기록

- 브랜치: `feature/lantern-ignition-launch`
- 목표: 바로 아래 기록의 '12° 고정 각도' 연출이 너무 빨리 올랐다 내려와 부자연스럽다는 피드백. 시선이 **실제 천등의 월드 위치**를 따라 약 2초 오르고 1초 동안 돌아오게 교체한다.

### 변경사항

- `lib/game/flight.ts`: `getFlyingLanternPosition(spawn, drift, elapsed, profile, out)` 추가. `FlyingLantern`의 위치 계산을 이 함수로 옮겼다 (결과 동일, 테스트로 기존 식과 비교). 카메라도 같은 함수를 쓴다.
- `lib/game/camera.ts`: 연출 시간 구조를 `{ easeInSec, followSec, returnSec }`로 바꾸고 `getLaunchLookDuration` 추가. **고정 각도 함수 `raiseLookDirection`과 `pitchDeg` 설정·테스트는 삭제** (중복 로직 제거).
- `CAMERA_CONFIG.launchLook = { easeInSec: 0.6, followSec: 2, returnSec: 1, focusWeight: 0.7, focusDampRate: 5 }`
- `CameraRig`: 새 발사를 감지하면 그 천등의 store 데이터(출발 정보)를 ref에 잡고, 같은 `clampDelta` 누적 시간으로 위치를 계산한다. 초점(감쇠 추적)으로 시선점을 옮긴다.

### 결정 / 이유

- **천등 위치 참조 = 같은 순수 함수:** FlyingLantern의 Object3D를 카메라에 넘기려면 id → ref 등록부가 필요하고 마운트·해제 순서를 신경 써야 한다. 궤적은 출발 정보와 경과 시간만으로 정해지는 순수 함수라, 같은 입력으로 다시 계산하면 할당 없이 같은 위치를 얻는다 (경과 시간 차이는 많아야 한 프레임, 초점 감쇠가 흡수).
- **높이는 '오른 만큼':** 첫 시도는 천등 위치를 그대로 겨냥했다. headless 기록에서 시선이 **먼저 −28°로 내려갔다가** −24°까지만 올랐다. 천등이 손 높이(시선점보다 약 0.6 낮음)에서 출발하기 때문이다. 높이는 시선점 높이 + 천등이 실제로 오른 높이로 바꿔, 시선이 천등의 상승 속도에 맞춰 위로만 움직이게 했다. 수평은 천등의 실제 위치 쪽으로 돈다 (약 6°).
- **초점 감쇠:** 연출 중 새 천등이 발사되면 초점이 감쇠로 새 천등까지 옮겨 가고 세기는 그대로 이어진다 (`getLaunchLookRestartSec`).

### 자동 검증

- [x] `npm run check` · `npm test` 14파일 214개 · `npm run build` 통과

#### headless Chrome (CDP, 실제 장면의 FlyingLantern 그룹 위치를 화면 좌표로 투영해 함께 기록)

| 발사 후 | 시선 pitch / yaw | 천등 월드 y | 천등 화면 위치 (NDC y, 위 +1) |
| ------- | ---------------- | ----------- | ----------------------------- |
| 0       | −26.21° / 0°     | 1.21        | −0.12                         |
| 0.6초   | −25.39° / 4.3°   | 1.36        | −0.10                         |
| 1.0초   | −24.43° / 5.9°   | 1.55        | −0.08                         |
| 2.0초   | −21.42° / 5.4°   | 2.18        | −0.03                         |
| 2.6초   | −24.18° / 1.5°   | 2.61        | +0.19                         |
| 3.0초   | −26.21° / 0°     | 2.91        | +0.35                         |

- 연출 중 프레임당 최대 시선 회전 0.16° (최대 22°/초), 제자리에서 카메라 위치 변화 0, 끝 각도 = 기준값.
- 발사 직후 A로 1.5초 이동: 플레이어 x 5.53, 카메라 x 4.96 (평소 추적), 끝 각도 = 기준값.
- **요청과 다른 점:** 따라 보는 2초 동안 천등은 화면 **중앙보다 약간 아래**(NDC −0.10 ~ −0.03)에 있다. 천등 상승 속도(0.75/초, 가속 0.8초)로는 2초에 약 1만 오르고, 출발이 시선점보다 낮기 때문이다. 화면 위쪽에 두려면 시선이 천등보다 덜 올라가야 하는데, 그러면 시선 움직임이 거의 없어진다. 복귀 후(3초~) 천등은 화면 위쪽으로 올라간다.
- 연출 중 재발사는 실제 UI로 만들 수 없어(순환 약 7초 > 연출 3초) 단위 테스트로만 확인.

### 브라우저 확인 (직접) — 아직 하지 않음

- [ ] 시선이 천등을 따라 오르는 속도가 자연스럽다 (focusWeight 0.7, 초점 감쇠 5/초)
- [ ] 천등이 화면 중앙 근처에 보이는 것이 괜찮은지 (위쪽에 두려면 focusWeight를 낮추거나 상승 속도 조정이 필요)
- [ ] 연출이 끝난 뒤 시점이 원래와 똑같고, 연출 중 이동·충돌이 평소와 같다

---

## 2026-11-03 · 4단계 · 발사 카메라 연출 (교체됨: 위 기록)

- 브랜치: `feature/lantern-ignition-launch`
- 목표: 3초 홀드로 발사하면 3인칭 카메라 시선이 잠깐 상승하는 천등 쪽(위)을 바라봤다가 원래 시점으로 돌아온다. 최소 변경.

### 변경사항

- `lib/game/camera.ts` (+ 테스트 5개): `getLaunchLookWeight`(0 → 1 → 유지 → 0, smoothstep), `getLaunchLookRestartSec`(연출 중 재발사 시 같은 세기에서 다시 올림, smoothstep 역함수), `raiseLookDirection`(수평 방향·길이 유지, 위아래 각도만 변경, out에 써서 할당 없음)
- `CAMERA_CONFIG.launchLook = { pitchDeg: 12, riseSec: 0.5, holdSec: 1, returnSec: 1 }`
- `CameraRig`: 매 프레임 store `flying`의 마지막 id를 **읽기만** 해서 새 발사를 감지하고(첫 프레임은 기준만), 연출 세기가 0보다 클 때만 '카메라 → 시선' 방향을 위로 돌린다. 세기가 0이면 기존 계산 그대로.

### 결정 / 이유

- **위치가 아니라 시선만:** 요청대로 카메라 위치(추적)는 그대로다. 기본 시선(약 26° 아래)에서 12° 올리면 약 14° 아래가 되어 캐릭터 위 공간과 노을 하늘이 보인다.
- **천등을 정확히 겨냥하지 않음:** 천등은 손 옆(캐릭터 근처)에서 0.75/초로 오르므로, 3인칭 시선을 위로 기울이는 것만으로 연출 동안 화면 안에 머문다. 천등 위치를 겨냥하면 좌우로도 돌아 '자유 시점 회전 없음' 규칙과 어긋나고, 여러 천등 중 무엇을 볼지 정해야 한다.
- **발사 감지 = 목록 마지막 id:** 발사는 목록 끝에 추가하고, 만료·개수 초과 제거는 앞에서 빠지므로 끝이 바뀌지 않는다. store 구독이나 새 상태를 추가하지 않았다.
- **재발사:** 경과 시간을 0으로 되돌리면 세기가 0으로 뚝 떨어진다. 지금 세기와 같은 시점(올리는 구간)으로 옮겨 이어서 올린다.

### 자동 검증

- [x] `npm run check` · `npm test` 14파일 213개 · `npm run build` 통과

#### headless Chrome (CDP, GPU d3d11, 사람 확인을 대체하지 않음)

카메라 객체(`__r3f.root.getState().camera`)의 월드 행렬에서 매 프레임 시선 각도·위치를 기록했다.

| 항목                             | 결과                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 제자리 발사: 시선 각도 (발사 후) | +0 −26.21° · +0.25 −20.21° · +0.5 −14.21° · +1.0 −14.21° · +1.5 −14.21° · +2.0 −20.21° · +2.5/+3.0 −26.21° |
| 올린 각도 / 끝 각도              | 12.00° / 기존과 같은 −26.21°                                                                               |
| 제자리 연출 중 카메라 위치 변화  | 0.0000 (위치는 움직이지 않음)                                                                              |
| 프레임당 최대 각도 변화          | 0.48° (캡처 중 프레임 저하 포함), 이동 중 0.25°                                                            |
| 발사 직후 A로 1.5초 이동         | 플레이어 x 5.53 이동, 카메라 x 4.96 따라감 (평소 감쇠 추적). 올린 각도 12.27° → 끝 −26.21°                 |
| 캡처                             | +1.0초: 노을 하늘과 오르는 천등이 보임. +3.4초: 기존 시점, 멀리 오르는 천등                                |
| 콘솔                             | R3F `THREE.Clock` 경고 외 없음                                                                             |

- 점검 스크립트의 순간 이동이 x·z만 바꿔서, 이전 위치의 y가 남아 다음 이동이 급경사로 판정돼 캐릭터가 멈추는 문제가 있었다 (스크립트 문제, 게임은 순간 이동하지 않음). 바닥 격자 높이도 함께 맞추도록 스크립트를 고쳤다.
- 연출 중 재발사는 실제 UI로 만들 수 없어(한 번 순환 약 7초 > 연출 2.5초) 단위 테스트로만 확인했다 (모든 시점에서 재시작 전후 세기 같음).

### 브라우저 확인 (직접) — 아직 하지 않음

- [ ] 시선이 올라가는 양(12°)·시간(0.5 / 1 / 1)이 자연스럽고 멀미 나지 않는다
- [ ] 연출 중 이동·충돌이 평소와 같고, 연출이 끝난 뒤 시점이 원래와 똑같다
- [ ] 캐릭터가 카메라 쪽을 볼 때 등 여러 방향에서 발사해도 천등이 연출 동안 화면 안에 보인다

---

## 2026-11-03 · 4단계 · 모닥불 점화와 3초 홀드 발사

- 브랜치: `feature/lantern-ignition-launch` (계획서의 이름은 `feature/light-and-launch`. 사용자가 만든 브랜치를 그대로 씀)
- 목표: WRITTEN 천등을 모닥불에서 점화(LIT) → 어디서든 F/버튼 3초 홀드로 발사 → NONE으로 돌아와 다시 받기. 효과음·천등 소지 전용 애니메이션은 범위 밖(다음 브랜치).

### 사전 확인 (구현 전 측정·코드 확인, 추측 아님)

- **재사용 가능 확인:** 전이 함수 `applyLanternAction`에 light·launch와 16칸 테스트가 이미 있음. `resolveInteraction`·`executeInteraction`은 대상과 무관. `FlyingLantern`은 ref 가드로 `onExpire`를 한 번만 호출. SPEC §5 정책: 최대 5개 / 높이 40 또는 20초 / 발사 천등은 emissive만 / 손 천등 pointLight는 미리 마운트.
- **모닥불 노드 (배경 GLB 노드 행렬 + 접근자 min/max, π 회전 후 월드):** 불꽃 `Mball.018_0`, 장작 `NurbsPath.008~014_0`, 돌 `Icosphere*` 19개가 충돌 원(중심 (1.05, 1.1), 반지름 2.2) 안. 그중 `Icosphere.003_0`은 y 0.13~0.39로 바닥(0.6~0.8) 아래에 묻혀 있음 → 강조 대상은 나머지 18개.
- **장작을 강조에서 뺀 이유:** 장작은 x·z로 1.4~1.7, y로 2 정도 퍼진 가늘고 비스듬한 메시다. 현재 hull은 '경계 상자 중심 기준 축별 확대'라서 가운데 두께는 거의 늘지 않고(반지름 0.08 × 2t/크기) 양 끝만 밀려 테두리가 아니라 어긋난 잔상이 된다. 법선 방향 밀어내기는 셰이더 또는 Geometry 가공이 필요해 이번 범위에서 하지 않았다.
- **카메라에서 하늘이 보이는 시간:** 화면 맨 위가 지평선 아래 1.2°라, 캐릭터 옆에서 오르는 천등은 지면 위 약 4.8에서 화면 위로 벗어난다. → 상승을 느리게(0.75/초) 해서 몇 초간 보이게 하고, 20초 제거는 화면 밖에서 일어난다.

### 변경사항

- 순수 함수 (+ 테스트 60개):
  - `lib/game/launchHold.ts`: `startHold`(누르는 중이면 무시), `releaseHold`(시작한 장치만), `getHoldProgress`, `isHoldComplete`
  - `lib/game/lanternGlow.ts`: `getLanternGlow`(흔들림 + 점화 연출), `multiplyHex`(종이색 × 불빛 색)
  - `lib/game/flight.ts`: `FlightProfile`(기본 = 1단계 랩 값), `getEasedTime`(가속), `getDriftProgress`, `getLaunchPose`(출발 위치 보정 + drift), `getRightHandDirection`, `appendFlyingLantern`·`removeFlyingLanternById`, `MAX_FLYING_LANTERNS = 5`
  - `lib/game/interaction.ts`: `getCampfireActionIds`(WRITTEN만), `INTERACTION_TARGETS`에 campfire
- `stores/gameStore.ts`: `flying`, `lightLantern`, `launchLantern(pose)`(한 번의 `set`), `removeFlyingLantern`, `runInteractionAction('lightLantern')`
- 컴포넌트:
  - 새 `game/LaunchHoldButton`(LIT + EXPLORE에서만 마운트, 입력·rAF·발사), `game/MemoryProbe`(랩에서 분리), `lantern/FlyingLanterns`(store 목록 → FlyingLantern)
  - `world/TableHighlight` → `world/InteractionHighlight`(대상 id·메시 이름을 받음, 탁자·모닥불 공용)
  - `lantern/HeldLantern`: 손 따라가는 그룹을 항상 마운트(발사 출발점), 모델만 NONE에서 언마운트. 새 `HeldLanternLight`(씬 루트 pointLight + 발광 세기 계산)
  - `lantern/LanternModel`: 선택 `glowRef`(매 프레임 종이 5면 emissive 세기), emissive 색 = 안쪽 불빛 색
  - `lantern/FlyingLantern`: 선택 prop `yaw`·`drift`·`scale`·`profile`·`glow`, id를 string으로 (랩도 `lab-N`)
  - `interactions/InteractionSensor`: 대상별 버튼 위치(탁자 상판 / 불꽃 위)
  - `game/GameHUD`·`GameCanvas`: 상태별 안내 문구, 발사 버튼, 손 천등 ref 2개, 개발 모드 renderer.info·비행 수
- `worldConfig`: `CAMPFIRE_COLLIDER`(COLLIDERS와 같은 객체), `LANDMARKS.campfire.meshNames`, `TABLE_HIGHLIGHT_CONFIG` → `INTERACTION_HIGHLIGHT_CONFIG`, `HELD_LANTERN_CONFIG.light`, `LANTERN_GLOW_CONFIG`, `FLYING_LANTERN_CONFIG`
- `constants`: `INTERACTION_ACTION_LABELS.lightLantern`, `LAUNCH_KEY_CODE = 'KeyF'`, `LAUNCH_HOLD_DURATION_MS = 3000`, `LANTERN_INNER_GLOW_HEX`

### 결정 / 이유

- **발사 키 F (기획 E에서 변경):** 사용자 요청. 근접 상호작용(E, 대상 위에 뜨는 크림색 버튼)과 발사(F, 화면 아래 가운데 어두운 버튼)를 키와 위치로 구분한다. Ctrl/Cmd/Alt+F는 가로채지 않는다.
- **BLANK 모닥불 안내 없음 (기획 변경):** 요청의 상태표(BLANK: 버튼·강조 없음)를 따랐다. 상태 표시줄이 항상 "빈 천등 · 탁자에서 소원을 적어 주세요"를 보여 줘서 기획의 의도(왜 안 되는지 알림)는 유지된다. 표시·실행 조건도 하나(`getCampfireActionIds`)로 단순하다.
- **홀드 = 시작 시각 하나:** 진행률을 쌓지 않고 '시작 장치 + 시작 시각'만 기억한다. 반복 keydown·다른 장치 시작은 무시, 시작 장치를 떼면 0%. 그래서 반복 클릭·반복 keydown으로 우회할 수 없다. 버튼은 포인터 캡처를 하지 않아 누른 채 벗어나면(pointerleave) 취소된다.
- **홀드 로직을 effect 지역 변수에:** 입력 핸들러·rAF·store 구독이 같은 가변 값을 쓰므로 한 effect 안의 클로저로 묶고, JSX 핸들러 대신 네이티브 리스너를 단다. React 상태가 없어 홀드 중 리렌더가 0이다.
- **발광 = emissive만:** 종이 5면의 emissive 세기를 매 프레임 바꾼다. 앞면은 emissiveMap(손글씨) × 불빛 색이라 글씨가 빛나지 않고, 옆면은 같은 결과가 되도록 `종이색 × 불빛 색`. 불빛 색 `#ffe2bd`는 4색의 채널 순서(색상 계열)를 바꾸지 않는 값이다. 더 주황으로 가면 분홍이 살구색이 된다 (테스트로 고정).
  - `glowRef`가 있으면 JSX emissiveIntensity는 0으로 둔다. 점화 순간 JSX 기본값(0.6)이 한 프레임 보였다가 0부터 올라오는 깜빡임을 막는다.
- **손 천등 pointLight는 캐릭터 그룹 밖:** 처음엔 손 천등 그룹 안에 두려 했는데, 작성 모드에서 캐릭터 그룹이 `visible=false`가 되면 three가 그 안의 라이트를 렌더 목록에서 빼서 라이트 수가 바뀐다 → 작성 모드 진입마다 셰이더 재컴파일. 씬 루트에 두고 매 프레임 손 천등의 월드 위치만 복사한다.
- **발사 출발 정보:** 발사 순간 손 천등 그룹의 월드 위치·Y 회전(월드 행렬 z축 열)을 읽는다. 크기는 손 천등과 같은 0.26 (SPEC: 원근에 맡기고 scale 조절 없음). 바닥 + 0.3 / 중심 0.4 보정은 평소 손 위치(지면 위 0.39~0.49, 중심 0.37~0.5)에서는 걸리지 않게 값을 잡았다.
  - 머리(반지름 0.70, 지면 위 1.0~1.4)를 뚫지 않도록 순간 이동 대신 첫 1초 동안 중심 거리 0.95까지 흘러가게(drift) 했다. 가속 0.8초와 합치면 천등 윗면이 머리 높이에 닿는 약 0.8초 시점에 이미 0.9 이상 떨어져 있다.
  - 상승·회전은 `t − τ(1 − e^(−t/τ))`로 속도가 0에서 올라오고, 흔들림 진폭도 같은 시간 동안 커진다 → 출발 순간 위치·속도가 모두 연속이다.
- **1단계 FlyingLantern 재사용:** 새 prop은 모두 선택이고 기본값이 1단계 값이라 `/lab/lantern`은 같은 궤적·고정 발광이다 (테스트: 기본 프로필 = 기존 함수 결과).

### 문제와 해결

| 문제                                                                    | 원인                                                                                                                      | 해결                                                                  |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 3단계 테스트 '대상 목록에는 테이블만' 실패                              | 4단계에서 모닥불을 추가해 기대값이 바뀜 (의도된 변경)                                                                     | 테스트를 '테이블 + 모닥불, 모닥불 영역 = 이동 충돌 객체'로 교체       |
| headless 누수 검사에서 textures 3 → 5, geometries 235 → 257 (처음 실행) | 기준값을 페이지 로드 직후로 잡음. 천등 없이 걷기만 해도 3 → 5 (등불 Glass 투과 렌더 타깃이 처음 화면에 들어올 때 생성 등) | 1회 순환·만료 후를 기준값으로. 그 뒤 20회 반복 → 기준값과 정확히 같음 |
| 점화한 분홍 천등이 거의 흰 분홍으로 바램                                | emissive 0.85(손)·1.05(발사)가 ACES 톤 매핑에서 포화                                                                      | 0.65 / 0.8로 낮춤. 면 음영이 조금 남고 분홍이 유지됨 (캡처)           |
| `multiplyHex` 테스트 기대값 오류                                        | 테스트 작성 실수 (00 × 40 = 00)                                                                                           | 입력값을 고쳐 세 채널 모두 검증                                       |
| `useFrame`에서 재질 ref 배열 리터럴을 매 프레임 생성                    | 할당 금지 규칙 위반 (작성 중 발견)                                                                                        | ref 하나씩 처리하는 함수 5번 호출로 바꿈                              |
| 셸 heredoc 따옴표 오류로 편집 스크립트가 실행되지 않음                  | 백틱이 들어간 문자열                                                                                                      | 편집 스크립트를 파일로 저장해 실행 (변경 없음 확인 후)                |

### 자동 검증

- [x] `npm run typecheck` · `npm run lint`(warning 0) · `npm run format:check` 통과 (`npm run check`)
- [x] `npm test` 14파일 208개 통과 (기존 148 + 60: `launchHold` 8, `lanternGlow` 9, `flight` +17, `interaction` +13, `gameStore` +13. `interaction`의 3단계 '대상은 테이블만' 테스트 1개는 4단계 대상 목록 테스트로 교체)
- [x] `npm run build` 통과 (`/`, `/lab/lantern` static)

#### headless Chrome 사전 점검 (CDP 스크립트, GPU d3d11 144fps, 사람 확인을 대체하지 않음)

WebGL `createTexture/deleteTexture`·`createBuffer/deleteBuffer`·`createProgram/deleteProgram`을 감싸 살아 있는 개수를 세고, 개발 모드 renderer.info 표시를 함께 읽었다. 위치는 React fiber에서 `playerRef`를 찾아 옮긴 뒤 키를 짧게 눌러 방향을 정했다. 43개 항목 중 42개 통과, 1개는 기준을 잘못 잡은 항목(아래 셰이더 프로그램).

| 항목                                                    | 결과                                                                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| NONE·BLANK에서 모닥불을 바라봄                          | 버튼·강조 없음. BLANK 상태 표시줄 "탁자에서 소원을 적어 주세요". BLANK에서 F → 변화 없음                                             |
| WRITTEN에서 모닥불 동쪽에서 서쪽을 봄                   | 'E 불 붙이기'가 불꽃 위, 돌 링 테두리. D로 돌아섬 → 사라짐, A → 다시 나타남, 멀어짐 → 사라짐                                         |
| 실행 재검증                                             | 버튼이 보이는 상태에서 범위 밖으로 옮긴 직후 E → 점화 안 됨                                                                          |
| 점화                                                    | LIT, 모닥불 버튼 사라짐, 발사 버튼 0%. 다시 E → 변화 없음. 점화 전후 최대 프레임 간격 13.9ms(144fps 기준 2프레임), 새 프로그램 1개   |
| LIT에서 탁자                                            | 버튼 없음, E → 작성 모드 열리지 않음                                                                                                 |
| LIT에서 빈터 남쪽                                       | 발사 버튼 표시                                                                                                                       |
| F 1.5초 → 뗌                                            | 50% 표시 → 0%, LIT 유지                                                                                                              |
| F + 반복 keydown 20번(1초)                              | 41% (다시 시작하거나 튀지 않음)                                                                                                      |
| F 누른 채 window blur                                   | 0%, 홀드 해제                                                                                                                        |
| 버튼 0.5초 × 8번 클릭                                   | 발사 안 됨, 0%                                                                                                                       |
| 버튼 누른 채 밖으로                                     | 0% (pointerleave)                                                                                                                    |
| 홀드 중 D로 이동                                        | 진행 유지 (40%)                                                                                                                      |
| 포인터 + F 동시 3초                                     | 발사 1번, NONE, 발사 버튼 사라짐, 바로 이동 가능. textures 6 → 6 (손 텍스처 해제 + 발사 텍스처 생성)                                 |
| 발사 후 다시 받기                                       | BLANK, 발사 천등 계속 비행                                                                                                           |
| 손글씨 (앞면이 카메라를 보도록 캡처)                    | 좌상단 'ㄱ' 마커·가운데 원이 손 천등(LIT)과 발사 천등에 반전 없이 보임                                                               |
| **누수: 1회 순환·만료 후 기준 → 20회 반복 → 모두 만료** | renderer textures 5 → 5, geometries 257 → 257, WebGL textures 9 → 9, buffers 990 → 990. 반복 중 `textures − 비행 수` = 5 (20회 모두) |
| 셰이더 프로그램                                         | 기준 16 → 반복 중 18~20 (측정 시점에 살아 있는 작성·점화 재질에 따라) → 만료 후 16. 계속 늘지 않음                                   |
| 최대 개수                                               | 반복 중 비행 수 최대 3 (한 번 순환이 약 7초라 20초 수명 안에 3개). 5개 초과 제거는 store 테스트로 확인 (아래 브라우저 항목)          |
| `/lab/lantern` 회귀                                     | 시작 textures 2 · geometries 6 (1단계와 같음). 상승 테스트 3개 → 5 · 8 → 만료 후 2 · 8, 두 번째 라운드 후 2 · 8                      |
| 콘솔                                                    | R3F 내부 `THREE.Clock` deprecated 경고만                                                                                             |

- `/lab/lantern`의 geometries 6 → 8: 미리보기 천등은 꺼져 있어 불꽃·연료 메시가 숨겨져 있고, 상승 테스트 천등(lit)이 처음 그려질 때 이 공유 Geometry 2개가 한 번 올라간다. 공유 Geometry는 해제하지 않는 설계라 그대로 남고, 두 번째 라운드에서는 늘지 않는다 (1단계부터 같은 동작).

### 브라우저 확인 (직접) — 아직 하지 않음

- [ ] 모닥불 돌 링 테두리(두께 0.035)가 은은하고 탁자와 같은 느낌이다. 큰 돌 2개(`Icosphere.022·023`)의 테두리가 과하지 않다
- [ ] 모닥불 둘레 여러 방향(동·남·서, 탁자 쪽 통로)에서 바라볼 때만 버튼이 뜨고, 통로에서 탁자·모닥불 버튼이 번갈아 깜빡이지 않는다
- [ ] 점화 직후 0.2초 밝아졌다 가라앉는 연출이 자연스럽고, 흔들림(±8%)이 너무 약하거나 강하지 않다
- [ ] 4색(빨강·주황·노랑·분홍) 모두 점화 후 색이 유지되고 손글씨가 읽힌다. 천등 안쪽에서 빛나는 느낌이 드는지 (부족하면 `LANTERN_GLOW_CONFIG`·`LANTERN_INNER_GLOW_HEX` 조정)
- [ ] 손 천등 빛(intensity 2.2, 범위 3)이 캐릭터·발밑만 은은하게 비추고 모닥불 빛과 겹쳐 과하지 않다
- [ ] 점화 순간·작성 모드 진입 순간 프레임 끊김이 없다
- [ ] 발사 순간 천등이 손 위치에서 같은 크기·방향으로 출발하고 튀지 않는다. 오르면서 머리를 뚫지 않는다 (캐릭터가 카메라 쪽을 볼 때는 천등이 얼굴 앞을 지나 가릴 수 있다: 실제 위치는 머리 바깥)
- [ ] 상승 속도(0.75/초)·흔들림·회전이 '천천히' 느껴지고, 화면 위로 벗어날 때까지 충분히 보인다
- [ ] 발사 천등이 나무 캐노피에 가려져도 상승·제거가 정상이다
- [ ] 6개 이상 빠르게 연속 발사(20초 안)했을 때 가장 오래된 천등이 사라지고 개발 표시 textures가 함께 줄어든다
- [ ] F를 누른 채 Alt+Tab → 돌아와서 0%. 버튼을 누른 채 마우스를 밖으로 → 0%
- [ ] 발사 홀드 UI가 초저녁 분위기와 어울리고, E 상호작용 버튼과 헷갈리지 않는다
- [ ] 기존: 이동·충돌·Idle/Walk·카메라·탁자 강조·받기·색상 선택·작성·수정·취소·작성 시점 전환·`/lab/lantern`

### 문제 / 다음 할 일

- 효과음, 천등 소지 전용 캐릭터 애니메이션은 별도 브랜치.
- 3인칭 카메라가 지평선 위를 보지 않아 발사 천등은 몇 초 뒤 화면 위로 벗어난다. 하늘로 날아가는 장면을 더 오래 보여 주려면 발사 후 잠깐 카메라를 들어 올리는 연출을 검토할 수 있다 (카메라 규칙 변경이라 이번에는 하지 않음).
- 장작까지 강조하려면 법선 방향으로 밀어낸 Geometry 복제본(로드 시 1회 생성·언마운트 시 해제)이 필요하다.

---

## 2026-11-03 · 4단계 전 · 숲 배경·모닥불 연출 (초저녁)

- 브랜치: `feature/forest-atmosphere`
- 목표: 원본 에셋(Sketchfab 'Low Poly Forest Campfire') 미리보기처럼 모닥불이 주변을 비추되, 밤이 아니라 **보랏빛 노을이 남은 초저녁**. `background.glb`는 그대로 두고 Blender·새 에셋 없이 R3F로만 한다. 점화·발사는 4단계.

### 사전 확인 (구현 전 측정, 추측 아님)

- **GLB 구조:** 노드 449 · 메시 244 · 재질 19 · 애니메이션 0. **GLB 안에 라이트 없음** (`KHR_lights_punctual` 미사용). 확장은 `KHR_materials_transmission`(등불 Glass)뿐.
- **모닥불 주변 메시 (월드 좌표, π 회전 후):** 노드 행렬 + 접근자 min/max로 경계 상자를 계산했다.

| 런타임 이름                | 재질      | 월드 y     | 판단                                                                                   |
| -------------------------- | --------- | ---------- | -------------------------------------------------------------------------------------- |
| `Circle_0` (원본 `Circle`) | Metal     | 2.20~2.76  | **냄비** → 숨김                                                                        |
| `NurbsPath004_0`           | LightWood | 2.44~2.68  | **가로 가지** (z -1.02~3.58) → 숨김                                                    |
| `NurbsPath005_0`           | LightWood | 2.04~2.86  | **가로 가지** (z -1.16~3.98) → 숨김. 바닥에 닿지 않고 큰 돌 2개 위에 걸쳐 있다         |
| `Mball018_0`               | Fire      | -0.54~2.01 | **불꽃** (정점 620, 하나의 메시). 절반은 바닥 아래에 묻혀 있고 보이는 부분은 0.73~2.01 |
| `NurbsPath008_0`~`014_0`   | LightWood | 0.06~2.29  | **장작** (원뿔형으로 세움). 바닥 아래에서 시작 → 유지                                  |
| `Icosphere022_0`·`023_0`   | Rock      | 0.45~2.71  | 가로 가지를 받치던 **큰 돌**. 요청의 '모닥불을 둘러싼 돌'이라 유지 (아래 '문제' 참고)  |

- 셋 다 부모 노드 하나에 자식 메시 하나인 **독립 노드**다. 불꽃·장작과 같은 메시로 합쳐져 있지 않다. `Fire` 재질은 불꽃 메시만 쓴다.
- **모닥불 자리 바닥 높이:** `Cube_0`에 광선 12개 → 중심 0.73, 둘레 0.65~0.77.
- **충돌:** 숨긴 메시에는 별도 충돌 영역이 없었다. 모닥불 원(반지름 2.2)과 큰 돌 원(`Icosphere.022·023`)은 돌 기준이라 그대로 둔다.
- **하늘이 보이는가:** 배경색만 마젠타로 바꿔 캡처 → **화면에 전혀 보이지 않았다.** 카메라 오프셋 (0, 4.2, 6.5)이 플레이어 + 1을 보므로 약 26° 아래를 보고, 세로 화각 50°라 화면 맨 위가 지평선 아래 1.2°다. 지금까지 '하늘'처럼 보이던 띠는 안개에 덮인 먼 바닥이었다. → 하늘 돔이나 배경색 그라데이션은 보이지 않는다.
- **three 안개 색:** `fog_fragment`는 톤 매핑·색공간 변환 **뒤에** 섞이고, `fogColor`는 출력 색공간으로 변환된 값이다 (`WebGLMaterials.refreshFogUniforms`). 그래서 `toneMapped={false}`인 MeshBasicMaterial의 정점 색과 안개색이 같은 HEX면 화면에서 같은 색이다.

### 변경사항

- 순수 함수 (+ 테스트 16개):
  - `lib/game/campfire.ts`: `wobble`(주기가 나누어떨어지지 않는 사인 3개의 합), `getFlameMotion`(세로 늘어남·좌우 흔들림·밝기), `deformFlamePositions`(정점 이동. 바닥 아래 고정, 높이 비율²로 휨, 늘어날 때 조금 가늘어짐, 갈래마다 다른 위상의 떨림)
  - `lib/game/sky.ts`: `getSkyBackdropColor`(높이 + 노을 방향별 색), `mixRgb`
- 컴포넌트:
  - `world/ForestBackground`: `BACKGROUND_CONFIG.hiddenMeshNames` 3개를 `visible = false` (정리 함수에서 되돌림, 못 찾으면 콘솔 오류)
  - 새 `world/CampfireFire`: 불꽃 Geometry 복제 → 메시에 연결 → `useFrame`에서 정점 갱신(월드에서 계산 → 로컬로 변환) + `emissiveIntensity`·pointLight 세기 변경. 정리 함수에서 원래 Geometry·세기로 되돌리고 복제본 `dispose()`
  - 새 `world/SkyBackdrop`: 원통(반지름 80, 높이 40, 안쪽 면) + 정점 색. Geometry는 JSX(R3F가 해제), 정점 색 속성만 `useLayoutEffect`에서 채움
  - `game/GameCanvas`: 배경색·안개를 `fogColor`로, 반구광·방향광 값을 WorldConfig에서 읽음, `SkyBackdrop`·`CampfireFire` 추가
- `worldConfig`: `BACKGROUND_CONFIG.hiddenMeshNames`, `ATMOSPHERE_CONFIG`(fogColor·skyBackdrop·hemisphere·sunset로 확장, `skyColor` 제거), 새 `CAMPFIRE_CONFIG`(불꽃 메시 이름·모양·일렁임 세기·emissive·pointLight)

### 결정 / 이유

- **숨김 방식:** 독립 메시라서 `visible = false`만 한다. GLB 파일·Geometry를 수정하지 않는다. `useLoader` 캐시 객체라 언마운트 때 되돌린다. SPEC §3의 "노드를 숨기지 않는다"는 이번 요청에 맞춰 [결정]으로 바꿨다 (이 3개만 예외).
- **불꽃 = 정점 변형:** 불꽃은 본·모프 없는 메시 하나다. 메시 전체를 늘리거나 돌리면 밑동이 장작에서 뜨거나 통째로 기운다. 정점별로 '바닥 위 높이 비율²'만큼 옮겨서 밑동은 고정, 끝만 흔들린다. 사인 3개 합 + 갈래별 위상으로 짧은 주기 반복을 피한다. 정점 620개라 CPU 비용이 작다. 커스텀 셰이더는 SPEC 범위 밖이라 쓰지 않았다.
  - 원본 Geometry는 캐시 공유 객체라 직접 바꾸지 않고 **복제본**을 바꾼다. 경계 구는 1.3배로 키워 프레임 단위 재계산 없이 절두체 판정이 맞게 했다.
  - 매 프레임 할당 금지 규칙 때문에 `deformFlamePositions`는 새 배열 대신 호출한 쪽의 `out` 버퍼에 쓴다 (`base`는 바꾸지 않음. 테스트로 확인).
- **조명:** 라이트 3개 고정 (반구광 + 노을 방향광 + 모닥불 pointLight). pointLight는 decay 2(물리 감쇠) + distance 11로 가까운 돌·바닥은 밝고 테이블 쪽은 은은하다. 불꽃 밝기와 같은 흔들림 값을 곱해 빛도 같이 일렁인다.
  - 처음 값(반구광 연보라 0.42π, 노을빛 -z 쪽)은 카메라 쪽 면이 너무 어둡고 캐릭터 분홍색이 보라색으로 변했다 → 반구광을 덜 진한 연보라 0.68π로, 노을빛을 서쪽 옆(-12, 5, -7)으로 옮겼다.
  - **사용자 요청으로 한 단계 어둡게 (같은 날):** 하늘·안개를 더 어두운 보라로 (안개·배경막 아래 `#b49ac2` → `#8a73a3`, 띠 `#9f7fae`, 노을 `#d4948f`, 위 `#685c9c`, 맨 위 `#2e2c60`). 반구광 0.68π → 0.58π(하늘색 `#c3bcdd`, 바닥 `#4f4b62`), 노을빛 0.36π → 0.3π. 캐릭터·탁자 테두리는 계속 잘 보이고, 모닥불 빛이 상대적으로 더 두드러진다 (headless 캡처).
  - **하늘만 다시 중간 밝기로 (같은 날, 사용자 요청: 처음보다 어둡고 직전보다 살짝 밝게):** 하늘·안개 색을 처음 값과 어두운 값의 중간으로 (안개·아래 `#9f86b2`, 띠 `#b48fb9`, 노을 `#e2a395`, 위 `#7b71b1`, 맨 위 `#393b76`). 조명 세기는 어두운 값(반구광 0.58π, 노을빛 0.3π)을 그대로 둔다.
  - 그림자·Bloom은 넣지 않았다. 그림자는 pointLight 하나에 6면 렌더가 더 들고 메시가 약 250개다. Bloom은 후처리 패스(EffectComposer)가 더 필요하다. emissive + ACES 톤 매핑만으로 불꽃이 충분히 밝아 보였다. 브라우저 확인 후 부족하면 다시 검토한다.
- **하늘 = 원통 배경막:** 진짜 하늘은 화면에 없으므로, 안개 끝(46)보다 먼 원통 안쪽 면에 노을을 칠했다. 원통 아래쪽 색 = 안개색이라 완전히 안개에 덮인 바닥과 이어지고, 그 위로 분홍·복숭아빛 띠 → 연보라 → 푸른 보라가 보인다. 노을 띠는 카메라가 보는 -z 쪽이 가장 따뜻하다.
  - 이음새 조건: 카메라가 원점에서 가장 멀 때(약 17.9) 화면 옆 끝 깊이 (80 − 17.9) × cos 36° ≈ 50 > fogFar 46 → 바닥은 원통에 닿기 전에 완전히 안개색이다.

### 문제와 해결

| 문제                                             | 원인                                                               | 해결                                         |
| ------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------- |
| 하늘 그라데이션을 배경색·돔으로 하면 보이지 않음 | 3인칭 카메라에 지평선 위가 들어오지 않음 (마젠타 배경 캡처로 확인) | 안개 끝보다 먼 원통 배경막에 정점 색         |
| `react-hooks/immutability` 오류 2개              | `useMemo`로 찾은 메시의 `geometry`를 effect에서 바꿈               | 메시를 effect 안에서 찾음 (규칙은 끄지 않음) |
| 테스트 `toEqual({ swayX: 0 })` 실패              | 세기 0 × 음수 = `-0`                                               | 값 비교로 바꿈 (`Math.abs(x) === 0`)         |
| 문서 2개가 CRLF로 저장됨                         | Windows Python 텍스트 모드 쓰기                                    | LF로 되돌림 (`.gitattributes eol=lf`)        |

### 자동 검증

- [x] `npm run typecheck` · `npm run lint`(warning 0) · `npm run format:check` 통과
- [x] `npm test` 12파일 148개 통과 (기존 132 + 새 16: `campfire` 11, `sky` 5)
- [x] `npm run build` 통과 (`/`, `/lab/lantern` static)

#### headless Chrome 사전 점검 (CDP 스크립트, GPU d3d11, 사람 확인을 대체하지 않음)

WebGL `createTexture/deleteTexture`·`createBuffer/deleteBuffer`·`createProgram`을 감싸 살아 있는 개수를 셌다.

| 항목                                                   | 결과                                                                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 냄비·가로 가지                                         | 사라짐. 불꽃·원뿔형 장작·돌 링·큰 돌 2개는 그대로. '숨길 메시를 찾지 못했다' 콘솔 오류 없음           |
| 불꽃 연속 프레임 (250ms 간격 6장, 같은 위치 잘라 비교) | 끝의 높이·폭·기울기가 프레임마다 다르고, 밑동은 장작 사이에 그대로                                    |
| 모닥불 조명                                            | 둘레 돌의 불 쪽 면·바닥이 주황, 테이블 쪽으로 갈수록 어두워짐. 먼 나무·바위는 원래 색 + 저녁 톤       |
| 하늘·안개                                              | 화면 위쪽에 분홍·복숭아 띠 → 연보라. 이동 범위 북동·북서·동쪽 끝에서도 안개 바닥과 배경막 이음새 없음 |
| 성능                                                   | 시작 위치 144fps (모니터 상한). 3초 동안 textures 7 · buffers 884 · programs 5 변화 없음              |
| 천등 흐름                                              | 탁자 앞 '천등 받기' + 테두리 → 주황 → 작성 시점·획 → 완료 → '소원 수정하기', 손 천등 표시             |
| 누수: 작성·완료 + 수정·취소 10회                       | textures 8 → 8, buffers 914 → 914, programs 7 → 7                                                     |
| `/lab/lantern` 회귀                                    | textures 2 · geometries 6 (1단계와 같음)                                                              |
| 콘솔                                                   | R3F 내부 `THREE.Clock` deprecated 경고만                                                              |

### 브라우저 확인 (직접) — 아직 하지 않음

- [ ] 냄비·가로 가지만 사라지고 불꽃·장작·돌 링이 그대로다 (여러 각도에서)
- [ ] 가로 가지가 사라진 뒤 양쪽 큰 돌 2개(`Icosphere.022·023`)가 어색하지 않다
- [ ] 불꽃 일렁임이 자연스럽고, 몇십 초 지켜봐도 같은 동작이 반복되는 느낌이 없다. 밑동이 장작에서 떨어지지 않는다
- [ ] 일렁임 세기(늘어남 9%, 흔들림 0.11)가 너무 약하거나 강하지 않다
- [ ] 모닥불 빛이 주변 돌·바닥·풀에 퍼지고, 불꽃만 하얗게 타 보이거나 주변이 모두 주황으로 물들지 않는다
- [ ] 초저녁 색감 (연보라·분홍 노을 띠, 푸른 보랏빛 먼 숲). 캐릭터·이동 경로·탁자 강조 테두리가 충분히 보인다
- [ ] 다양한 창 비율에서 화면 위쪽 노을 띠와 안개 바닥 사이에 선이 보이지 않는다
- [ ] 이동·충돌(모닥불 둘레 포함)·Idle/Walk·카메라가 그대로다
- [ ] 천등 받기·색상 선택·소지·작성·수정·취소·작성 시점 전환이 그대로다
- [ ] 개발 모드 `renderer.info.memory`로 반복 후 textures·geometries가 늘지 않는다 (WebGL 카운터로는 확인함)
- [ ] 저사양 환경에서 프레임 (불꽃 정점 갱신 + pointLight 1개 추가)

### 문제 / 다음 할 일

- 큰 돌 `Icosphere.022·023`(높이 약 2)은 원래 가로 가지를 받치던 돌이다. 요청의 '받침 구조물'에 이 돌까지 포함되는지 불분명해서 **유지**했다. 숨기려면 `hiddenMeshNames`에 `Icosphere022_0`·`Icosphere023_0`을 더하고, `COLLIDERS`의 같은 이름 원 2개를 함께 빼야 한다 (돌만 따로 있는 노드다).
- 4단계: 손 천등 pointLight가 더해지면 라이트 4개. 점화 연출 색을 모닥불 빛과 맞춘다.

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
