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

## 스크립트

| 파일                                                      | 하는 일                                                                                                        |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `perf-launch.mjs <출력 폴더> <포트> <이름>`               | 받기 → 작성 → 점화 → 발사를 두 번 자동 진행, `<이름>.json`과 발사 중 캡처 저장                                 |
| `load-measure.mjs <출력.json> <포트> <cold\|warm> <회수>` | 로딩 화면 페이드 시작·제거 시각, GLB 완료, 준비 전 셰이더·Long Task (계측 코드는 `perf-launch.mjs`에서 읽는다) |
| `baseline.mjs <run.json...>`                              | 발사별 최대·p95 프레임, Long Task, 새 셰이더 수, 렌더 타깃 할당                                                |
| `analyze.mjs <run.json>`                                  | 구간별 상세 (느린 그리기, 텍스처 업로드 포함)                                                                  |
| `diff.mjs <run.json>`                                     | 첫 발사 때 새로 만든 셰이더와 기존 셰이더의 `#define` 차이 (예: `-[TONE_MAPPING]`, `Glass`)                    |

- 빈 캐시 로딩은 프로필을 바꿔 가며 `load-measure.mjs ... cold 1`을 5회, 새로고침은 한 프로필에서 `warm 6`(첫 결과 제외).
- 자동 이동은 시간 기반이라 프레임이 너무 낮으면(1280×720 SwiftShader ≈ 3fps) 위치가 어긋난다 → 640×360을 쓴다.

## 기준 데이터 (`baseline/2026-11-04/`)

- `run4.json`: 이전 계측 버전(셰이더 `#define` 미기록), `run6.json`: 현재 계측 버전
- `load-cold-1~5.json`, `load-warm.json`(첫 결과는 첫 로드라 통계에서 제외)
- `run6-launch1-hold+4000ms.png` / `+5500ms.png`: Glass 등불이 화면에 들어오기 전·후
