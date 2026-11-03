@AGENTS.md

# 소원등 (sowondeung)

3인칭 캐릭터로 3D 공간을 이동하며 천등을 받고, 손글씨 소원을 쓰고, 불을 붙여 날리는 웹서비스. 프론트엔드 포트폴리오 프로젝트이며 **작은 MVP부터 단계별로 검증**한다.

Next.js 16.4.4 (App Router, `src/`) · React 19.3.0 · TypeScript strict · Tailwind CSS 4 · (1단계~) three 0.187.0 · @react-three/fiber 9.8.2 · Vitest · (3단계~) Zustand 5

## 문서 (작업 전에 관련 부분을 읽는다)

| 문서                                                       | 내용                                                            |
| ---------------------------------------------------------- | --------------------------------------------------------------- |
| [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md)               | 확정 기획. **[결정]** 항목이 모든 규칙보다 우선한다             |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | 단계별 작업 범위·완료 조건·패키지 설치 규칙                     |
| [docs/CODING_CONVENTIONS.md](docs/CODING_CONVENTIONS.md)   | 네이밍·import·타입·컴포넌트·상태·함수 책임·Three.js 리소스 규칙 |
| [docs/CORE_CONCEPTS.md](docs/CORE_CONCEPTS.md)             | 사용자가 직접 이해해야 할 핵심 개념                             |
| [docs/DEV_LOG.md](docs/DEV_LOG.md)                         | 작업 기록 (최신이 위, 자동 검증과 브라우저 확인을 나눠 기록)    |
| `node_modules/next/dist/docs/`                             | Next 16 공식 문서. Next API를 쓰기 전에 확인한다                |

## 작업 원칙

- **현재 단계 범위만 구현한다.** 앞 단계 검증이 끝나기 전에 다음 단계를 시작하지 않는다 (IMPLEMENTATION_PLAN).
- 작업 시작 전에 현재 브랜치를 확인하고, 새 기능이면 `feature/*` 브랜치명을 제안한다. `main`에서 직접 작업하지 않는다.
- **커밋·푸시·PR 생성·병합은 사용자의 요청이나 승인 없이 하지 않는다.**
- 요청 범위 밖의 기존 파일을 일괄 수정·포맷하지 않는다.

## 패키지

- 정확한 버전 + `--save-exact`로만 설치한다. `react`·`react-dom`은 19.4 이상으로 올리지 않는다 (R3F peer `<19.4`).
- `npm update`, `--force`, `--legacy-peer-deps` 금지. peer 충돌이나 `npm ls`의 `invalid`는 **멈추고 보고한다.**
- SPEC에 없는 패키지(`@react-three/drei` 포함)는 추가하지 않는다. 필요하면 먼저 제안한다.

## 코드 핵심 규칙 (자세한 내용은 CODING_CONVENTIONS)

- 계산 로직(좌표·획·상태 전이·충돌·상호작용 판정)은 `lib/game`, `lib/writing`의 **순수 함수**로 두고 Vitest로 테스트한다. 컴포넌트는 호출만 한다.
- 매 프레임 바뀌는 값은 ref + `useFrame`, 이벤트로 바뀌는 공유 값은 store, 확정 전 임시 UI 값은 로컬 state. **`useFrame`과 effect 안에서 `setState`하지 않는다.** (예외: ref 가드로 정확히 한 번만 호출하는 수명 종료 콜백. CODING_CONVENTIONS §7)
- `new`로 만든 Three 객체(CanvasTexture 등)는 `useLayoutEffect`에서 만들고 **같은 effect의 정리 함수에서 `dispose()`** 한다. 렌더 중·`useMemo`에서 만들지 않는다. 텍스처는 공유하지 않는다.
- 공유 Geometry는 `geometry={...}` prop으로만 넘긴다. `dispose={null}` 금지.
- 3D 영역은 Client Component 안에서 `next/dynamic(..., { ssr: false })`로 불러온다.
- 위치·크기·충돌 값은 `WorldConfig`, 색상은 `constants/lanternColors.ts` 한 곳에서만 정의한다.
- 줄 수 제한이나 미리 만드는 추상화는 없다. 필요해진 시점에 분리한다.

## 검증

| 명령                                      | 용도                                                   |
| ----------------------------------------- | ------------------------------------------------------ |
| `npm run typecheck`                       | `tsc --noEmit`                                         |
| `npm run lint` / `npm run lint:fix`       | ESLint (eslint-config-next + prettier 호환)            |
| `npm run format:check` / `npm run format` | Prettier (`format`은 전체 파일을 고치므로 요청 시에만) |
| `npm run check`                           | typecheck → lint → format:check                        |
| `npm test`                                | Vitest (1단계에서 추가)                                |
| `npm run build`                           | 프로덕션 빌드                                          |

- 커밋 시 Husky + lint-staged가 스테이징된 파일에 ESLint(`--fix`, warning 0개)와 Prettier를 실행한다. 실패하면 `--no-verify`로 우회하지 않고 원인을 고친다.
- 검사가 실패하면 규칙을 끄거나 우회하지 않고 원인을 분석해 보고한다.
- 브라우저에서 확인해야 하는 항목(텍스처 반전·색상, 메모리 누수, 입력·카메라)은 **사람이 직접 확인**한다. 자동 검사 결과와 섞어서 "완료"로 보고하지 않는다.
