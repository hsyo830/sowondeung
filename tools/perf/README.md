# 성능 측정 (첫 발사 멈칫 분석용)

게임 코드를 바꾸지 않고, Chrome DevTools Protocol로 페이지 밖에서 WebGL 호출·프레임·Long Task를 기록한다.
수정 전 기준값은 `baseline/2026-11-04/`, 분석 결과는 `docs/DEV_LOG.md` '첫 발사 멈칫 원인 분석 + 수정 전 기준 수치'.

## 조건 (수정 전후 같게)

- 프로덕션: `npm run build` → `npx next start -p 3100`
- Chrome headless + SwiftShader(CPU 렌더링), 화면 640×360. ms 값은 실제 GPU보다 크므로 **같은 환경끼리만** 비교한다.
- Chrome은 매번 새 프로필 폴더로 띄우고, 끝나면 그 프로필의 Chrome 프로세스만 종료한다 (폴더가 잠기면 빈 캐시가 보장되지 않는다).

```bash
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
  --remote-debugging-port=9338 --user-data-dir="<임시 폴더>/chrome-perf-1" about:blank &
```

- 실제 GPU 비교: 위에서 `--use-angle=swiftshader --enable-unsafe-swiftshader`만 뺀다 (`--headless=new`는 그대로).
  이 PC에서는 WebGL renderer가 `ANGLE (AMD Radeon(TM) Graphics, D3D11)`로 잡힌다. SwiftShader 결과와 섞지 않는다.

## 스크립트

| 파일                                                           | 하는 일                                                                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `perf-launch.mjs <출력 폴더> <포트> <이름>`                    | 받기 → 작성 → 점화 → 발사를 두 번 자동 진행, `<이름>.json`과 발사 중 캡처 저장                                 |
| `load-measure.mjs <출력.json> <포트> <cold\|warm> <회수>`      | 로딩 화면 페이드 시작·제거 시각, GLB 완료, 준비 전 셰이더·Long Task (계측 코드는 `perf-launch.mjs`에서 읽는다) |
| `baseline.mjs <run.json...>`                                   | 발사별 최대·p95 프레임, Long Task, 새 셰이더 수, 렌더 타깃 할당                                                |
| `analyze.mjs <run.json>`                                       | 구간별 상세 (느린 그리기, 텍스처 업로드 포함)                                                                  |
| `aggregate.mjs <run.json...>`                                  | 여러 회차를 모아 발사별 중간값(최소~최대)·회차별 값, 첫 발사 전 Glass 셰이더·렌더 타깃 수                      |
| `first-paint.mjs <출력.json> <포트> <url> <회수> [cold\|warm]` | 최초 접속: HTML 첫 바이트, 로딩 화면 DOM 등장, FCP, Glass 사전 준비 실행 시각, 준비·제거 (같은 페이지 시각)    |
| `load-stats.mjs <load-*.json...>`                              | 로딩 결과 중간값(최소~최대). warm 파일은 첫 결과 제외                                                          |
| `diff.mjs <run.json>`                                          | 첫 발사 때 새로 만든 셰이더와 기존 셰이더의 `#define` 차이 (예: `-[TONE_MAPPING]`, `Glass`)                    |

- 빈 캐시 로딩은 프로필을 바꿔 가며 `load-measure.mjs ... cold 1`을 5회, 새로고침은 한 프로필에서 `warm 6`(첫 결과 제외).
- 자동 이동은 시간 기반이라 프레임이 너무 낮으면(1280×720 SwiftShader ≈ 3fps) 위치가 어긋난다 → 640×360을 쓴다.

## 기준 데이터 (`baseline/2026-11-04/`)

- `run4.json`: 이전 계측 버전(셰이더 `#define` 미기록), `run6.json`: 현재 계측 버전
- `load-cold-1~5.json`, `load-warm.json`(첫 결과는 첫 로드라 통계에서 제외)
- `run6-launch1-hold+4000ms.png` / `+5500ms.png`: Glass 등불이 화면에 들어오기 전·후

## 수정 전후 비교 (`results/2026-11-04-glass-warmup/`)

- Glass 투과 사전 준비 수정 전후를 **같은 날 같은 세션**에서 잰 원자료. `swiftshader/`와 `gpu/` 각각 `pre/`·`post/`
  (발사 5회 `pre1~5`·`post1~5` 또는 `gpu-*-1~5`, 빈 캐시 `load-cold-1~5`, 새로고침 `load-warm`). 결과는 `docs/DEV_LOG.md`.
- 수정 전 GPU 빌드는 HEAD를 임시 worktree로 빌드했다 (작업 브랜치는 그대로).
- `load-measure.mjs`는 `perf-launch.mjs`의 계측 코드를 정규식으로 읽는다. 저장소로 옮길 때 Prettier가 그 호출을 여러 줄로 바꿔
  읽지 못하던 문제를 고쳤다 (공백·끝 쉼표 허용, 못 찾으면 명확한 오류).
- `first-paint.mjs`로 개발 서버(`next dev`)를 잴 때는 `http://localhost:<포트>/`를 쓴다. `127.0.0.1`은 Next 16 개발 모드가 `/_next/hmr` 등 개발 리소스를 막아(allowedDevOrigins) 앱이 시작되지 않는다.
- `first-paint.mjs`의 cold는 HTTP 캐시만 비운다. 같은 프로필이라 Chrome GPU 셰이더 캐시는 첫 회 뒤 남는다 → 첫 회가 실제 첫 방문에 가깝다.
