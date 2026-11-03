# 코드 작성 규칙

> 기준 문서: [PROJECT_SPEC.md](./PROJECT_SPEC.md) · [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) · 개념 설명: [CORE_CONCEPTS.md](./CORE_CONCEPTS.md)
>
> - 이 문서는 **코드를 어떻게 쓰는가**를 정한다. **무엇을 만드는가**는 PROJECT_SPEC이 정한다. 둘이 다르면 PROJECT_SPEC의 **[결정]**을 따르고, 이 문서를 고친다.
> - 각 규칙의 표시: **[자동]** = 도구가 검사한다 · **[검토]** = 사람이 코드 리뷰에서 확인한다.
> - 파일 줄 수나 함수 길이 제한은 두지 않는다. 추상화는 실제로 필요해진 시점에 만든다 (SPEC §9).

---

## 0. 자동 검사와 직접 검토의 구분

| 구분       | 도구 / 시점                                              | 다루는 범위                                                                                                                          |
| ---------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [자동]     | Prettier (`npm run format:check`, 커밋 시 lint-staged)   | 따옴표·세미콜론·들여쓰기·줄바꿈·후행 쉼표·LF 줄끝, **Tailwind 클래스 순서**                                                          |
| [자동]     | ESLint (`npm run lint`, 커밋 시 lint-staged)             | React Hooks 규칙(렌더 순수성, ref·불변성, effect 안 setState 등), `any`·`@ts-ignore` 금지, 미사용 변수, `var`·`let` 오용, `key` 누락 |
| [자동]     | TypeScript (`npm run typecheck`)                         | strict 타입 검사, `readonly` 위반                                                                                                    |
| [자동]     | Vitest (`npm test`, 1단계에서 추가)                      | `lib/game`, `lib/writing` 순수 함수의 동작                                                                                           |
| [검토]     | 코드 리뷰 · PR                                           | 네이밍, import 순서, 파일 위치, 상태 배치, 함수 책임, Three.js 리소스 소유권                                                         |
| [브라우저] | `npm run dev` 직접 확인 (IMPLEMENTATION_PLAN 체크리스트) | 텍스처 반전·색상, 메모리 누수(`renderer.info.memory`), 입력·카메라 동작                                                              |

- `npm run lint`는 warning이 있어도 통과하지만, **커밋 훅은 `--max-warnings=0`이라 warning도 커밋을 막는다.** 커밋 전에 warning까지 정리한다.
- `npm run check` = typecheck → lint → format:check. 기존 파일 일부는 아직 Prettier 포맷 전이므로 format:check가 실패할 수 있다. 수정한 파일은 커밋 시 자동으로 포맷된다.
- 규칙을 끄는 주석(`eslint-disable`)은 원칙적으로 쓰지 않는다. 꼭 필요하면 해당 줄에만 쓰고 이유를 함께 적는다. [검토]

---

## 1. 파일 위치와 네이밍

### 디렉터리 (SPEC §9 기준, 모두 `src/` 아래)

| 위치                        | 들어가는 것                                | 예                                           |
| --------------------------- | ------------------------------------------ | -------------------------------------------- |
| `app/`                      | 라우트 (`page.tsx`, `layout.tsx`)          | `app/lab/lantern/page.tsx`                   |
| `components/<도메인>/`      | React 컴포넌트                             | `components/lantern/LanternModel.tsx`        |
| `lib/game/`, `lib/writing/` | **순수 함수** (Vitest 대상)                | `lib/writing/strokes.ts`                     |
| `lib/lantern/`              | 그리기 유틸, 리소스 소유 훅, 공유 Geometry | `drawLanternFace.ts`, `useLanternTexture.ts` |
| `stores/`                   | Zustand store (3단계부터)                  | `stores/gameStore.ts`                        |
| `constants/`                | 앱 전체가 공유하는 고정 값                 | `constants/lanternColors.ts`                 |
| `types/`                    | 여러 모듈이 공유하는 도메인 타입           | `types/game.ts`                              |

- 훅은 별도 `hooks/` 폴더를 만들지 않고 **관련 도메인 폴더**에 둔다 (예: `lib/lantern/useLanternTexture.ts`). [검토]
- 테스트 파일은 대상 옆에 `*.test.ts`로 둔다 (예: `lib/writing/strokes.test.ts`). [검토]

### 이름 [검토]

| 대상                 | 규칙                                                                                       | 예                                                          |
| -------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| 컴포넌트 (파일·이름) | PascalCase, 파일명 = 컴포넌트명                                                            | `WritingCanvas.tsx` → `WritingCanvas`                       |
| 훅                   | `use` + camelCase, 파일명 = 훅 이름                                                        | `useLanternTexture.ts`                                      |
| 그 밖의 모듈 파일    | camelCase                                                                                  | `worldConfig.ts`, `lanternTransitions.ts`                   |
| 함수                 | camelCase, **동사로 시작**                                                                 | `toLogicalPoint`, `resolveInteraction`, `drawLanternFace`   |
| 모듈 수준 고정 상수  | UPPER_SNAKE_CASE                                                                           | `LANTERN_COLORS`, `LANTERN_GEOMETRY`, `MAX_FLYING_LANTERNS` |
| 타입·인터페이스      | PascalCase, `I` 접두사 없음                                                                | `HeldLantern`, `GameState`, `WritingCanvasProps`            |
| 상태·모드 리터럴 값  | UPPER_SNAKE_CASE (SPEC §7)                                                                 | `'NONE' \| 'BLANK'`, `'EXPLORE'`                            |
| 식별자 리터럴 값     | 소문자                                                                                     | `'table' \| 'campfire'`                                     |
| boolean              | `is` / `has` / `can` 접두사 (단, 문서에 정한 이름이 우선. 예: `LanternModel`의 `lit` prop) | `isMoving`, `hasInk`, `canLaunch`                           |
| ref                  | `~Ref` 접미사                                                                              | `materialRef`, `positionRef`                                |
| 이벤트 prop / 핸들러 | prop은 `on~`, 내부 핸들러는 `handle~`                                                      | `onComplete` / `handlePointerDown`                          |
| store 액션           | 동사로 시작, **SPEC §7에 정한 이름 그대로**                                                | `receiveLantern`, `openWriting`, `closeOverlay`             |

- SPEC·IMPLEMENTATION_PLAN에 이미 이름이 정해진 파일·함수·컴포넌트는 **그 이름을 그대로 쓴다.** 바꿔야 하면 문서를 먼저 고친다.
- 단위가 헷갈리는 숫자는 이름에 단위를 붙인다 (`HOLD_DURATION_MS`, `MAX_DELTA_SEC`).

---

## 2. Import

### 순서 [검토]

그룹 사이에 빈 줄을 하나 둔다.

```tsx
"use client"; // 0. 지시어 (필요할 때만, 파일 첫 줄)

import { useLayoutEffect, useRef } from "react"; // 1. React · Next
import dynamic from "next/dynamic";

import { CanvasTexture, SRGBColorSpace } from "three"; // 2. 외부 패키지
import { useFrame } from "@react-three/fiber";

import { LANTERN_COLORS } from "@/constants/lanternColors"; // 3. 프로젝트 내부 (@/ 별칭)
import { drawLanternFace } from "@/lib/lantern/drawLanternFace";
import type { Stroke } from "@/types/game";

import { toLogicalPoint } from "./coords"; // 4. 같은 폴더 (상대 경로)

import "./globals.css"; // 5. 스타일 (부수 효과 import)
```

- 다른 폴더의 파일은 `@/` 별칭으로 가져온다. `../`는 쓰지 않고, 상대 경로는 같은 폴더(`./`)에서만 쓴다.
- 타입만 가져올 때는 `import type`을 쓴다. 클라이언트 번들에 불필요한 모듈이 끌려오지 않게 한다.
- three는 필요한 것만 이름으로 가져온다 (`import * as THREE`는 쓰지 않는다). 로더는 SPEC대로 `three/examples/jsm/...`에서 가져온다.
- `@react-three/drei` 등 SPEC에 없는 패키지는 import하지 않는다. 설치 여부는 PROJECT_SPEC §2와 IMPLEMENTATION_PLAN의 설치 규칙을 따른다.

---

## 3. TypeScript

| 규칙                                                                                                | 구분                          |
| --------------------------------------------------------------------------------------------------- | ----------------------------- |
| `strict`를 끄지 않는다                                                                              | [자동] tsc                    |
| `any` 금지. 모르는 값은 `unknown`으로 받고 좁힌다                                                   | [자동] `no-explicit-any`      |
| `@ts-ignore`·`@ts-nocheck` 금지. 불가피하면 `@ts-expect-error: 이유`                                | [자동] `ban-ts-comment`       |
| 사용하지 않는 변수·import를 남기지 않는다                                                           | [자동] `no-unused-vars`       |
| `enum` 대신 문자열 리터럴 유니온을 쓴다 (SPEC §7의 `LanternStatus`, `GameMode`)                     | [검토]                        |
| 고정 테이블은 `as const`로 선언하고, 관련 타입은 값에서 끌어낸다                                    | [검토]                        |
| `as` 타입 단언은 외부 경계(DOM, GLTF 로드 결과)에서만 쓴다. `!` 단언 대신 null 확인 후 early return | [검토]                        |
| 순수 함수의 배열·객체 인자는 `readonly`로 받아 수정을 컴파일 단계에서 막는다                        | [검토] 선언 → 이후 [자동] tsc |
| export하는 순수 함수는 반환 타입을 명시한다                                                         | [검토]                        |
| 여러 모듈이 쓰는 도메인 타입은 `types/game.ts`, 한 모듈에서만 쓰는 타입은 그 파일 안에 둔다         | [검토]                        |
| 객체 형태는 `interface`, 유니온·튜플·별칭은 `type`                                                  | [검토]                        |

```ts
// constants/lanternColors.ts — 값이 단일 원본이고 타입은 값에서 끌어낸다
export const LANTERN_COLORS = [
  { id: "pink", name: "분홍", hex: "#..." },
  // ...
] as const;
export type LanternColorId = (typeof LANTERN_COLORS)[number]["id"];

// lib/writing/strokes.ts — readonly 인자 + 새 배열 반환
export function undoStroke(strokes: readonly Stroke[]): Stroke[] {
  return strokes.slice(0, -1);
}
```

- store와 직렬화되는 데이터의 좌표는 Three 객체가 아니라 튜플·숫자로 둔다 (`spawn: [number, number, number]`, SPEC §7).

---

## 4. React 컴포넌트

| 규칙                                                                                                                                            | 구분                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Hooks는 최상위에서만 호출한다                                                                                                                   | [자동] `rules-of-hooks`                            |
| 렌더 중에 ref를 읽거나 쓰지 않고, props·state·전역을 변경하지 않는다                                                                            | [자동] `refs`, `immutability`, `globals`, `purity` |
| effect 안에서 동기적으로 `setState`하지 않는다 (SPEC §5)                                                                                        | [자동] `set-state-in-effect` (error)               |
| 컴포넌트 안에서 다른 컴포넌트를 정의하지 않는다                                                                                                 | [자동] `static-components`                         |
| effect 의존성 배열을 빠뜨리지 않는다                                                                                                            | [자동] `exhaustive-deps` (커밋 시 차단)            |
| 리스트 `key`는 필수이며 **안정적인 id**(`lantern.id`)를 쓴다. 배열 index는 쓰지 않는다                                                          | 누락은 [자동] `jsx-key`, index 사용은 [검토]       |
| 기본은 Server Component. state·effect·이벤트·브라우저 API·R3F가 필요할 때만 `"use client"`                                                      | [검토]                                             |
| 3D 영역은 Client Component 안에서 `next/dynamic(..., { ssr: false })`로 불러온다 (SPEC §2)                                                      | [검토]                                             |
| 컴포넌트는 named export. default export는 Next가 요구하는 라우트 파일(`page.tsx`, `layout.tsx` 등)에만 쓴다                                     | [검토]                                             |
| props 타입은 컴포넌트 바로 위에 `~Props` 이름으로 선언하고, 매개변수에서 구조 분해한다                                                          | [검토]                                             |
| 스타일은 Tailwind 클래스로 작성한다. 클래스 순서는 Prettier가 정렬한다                                                                          | 순서는 [자동], 나머지 [검토]                       |
| 조건부 클래스는 **완전한 클래스 문자열**로 고른다 (`` `bg-${color}` `` 처럼 조립하면 Tailwind가 감지하지 못한다). 런타임 HEX는 `style`로 넘긴다 | [검토]                                             |
| HUD 버튼은 `<button type="button">`을 쓰고, 클릭 후 포커스가 남아 재실행되지 않게 처리한다 (SPEC §8)                                            | [검토]                                             |

```tsx
// components/lantern/LanternModel.tsx — named export + Props 타입
interface LanternModelProps {
  colorHex: string;
  lit: boolean; // IMPLEMENTATION_PLAN 1단계에 정한 이름
}

export function LanternModel({ colorHex, lit }: LanternModelProps) {
  /* ... */
}

// app/page.tsx 아래의 Client Component — named export를 dynamic으로 불러오기
const GameCanvas = dynamic(() => import("@/components/game/GameCanvas").then((m) => m.GameCanvas), {
  ssr: false,
});
```

- 주석은 코드가 **무엇을** 하는지가 아니라 **왜** 그렇게 하는지를 적는다 (SPEC의 [결정] 근거, 우회 이유 등). 한국어로 써도 된다. [검토]

---

## 5. 상태 관리

값이 **얼마나 자주 바뀌는가**와 **누가 읽는가**로 위치를 정한다 (SPEC §7). [검토]

| 위치                        | 넣는 값                                     | 예                                                           |
| --------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| Zustand store (3단계부터)   | 이벤트로 바뀌고 여러 컴포넌트가 읽는 값     | `held`, `mode`, `flying`, `toast`, `nearbyInteractionId`     |
| `useRef` · Three 객체       | **매 프레임** 바뀌는 값                     | 플레이어 위치·회전, 카메라 위치, 발사 천등 위치, 홀드 진행률 |
| 컴포넌트 로컬 `useState`    | 확정 전 임시 UI 상태, 한 컴포넌트만 쓰는 값 | `WritingOverlay`의 초안 획                                   |
| `constants/`, `WorldConfig` | 변하지 않는 값                              | 색상, 배치·충돌 박스, 상호작용 반경                          |

- 같은 정보를 두 곳에 두지 않는다. 다른 값에서 계산되는 값은 state로 만들지 않고 렌더 중에 계산한다.
- store 상태는 **액션으로만** 바꾼다. 액션은 `lib/game/lanternTransitions.ts`의 전이 함수를 호출하고, 허용되지 않은 전이는 상태를 바꾸지 않고 `false`를 반환한다 (예외를 던지지 않는다).
- 컴포넌트에서는 셀렉터로 필요한 값만 구독한다: `useGameStore((s) => s.mode)`. store 전체를 구독하지 않는다.
- `useFrame`·이벤트 핸들러 안에서는 구독 대신 `useGameStore.getState()`로 읽는다.
- 매 프레임 계산한 값을 store에 쓸 때는 **값이 바뀔 때만** 쓴다 (`nearbyInteractionId`).
- store에는 직렬화할 수 있는 데이터만 넣는다. Texture·Geometry·Material·DOM 요소·ref는 넣지 않는다.
- 1·2단계에는 store가 없다. 공유 상태가 필요해 보여도 3단계 전에는 props·ref로 해결한다 (SPEC §2).

---

## 6. 함수 책임

| 종류               | 위치                               | 지켜야 할 것                                                                                                                                   | 검증                         |
| ------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 순수 함수          | `lib/game/`, `lib/writing/`        | 같은 입력 → 같은 출력. 인자를 바꾸지 않고 새 값을 반환. DOM·Three·store·`Date.now()`·`Math.random()`을 쓰지 않는다 (시간·난수는 인자로 받는다) | [자동] Vitest                |
| 결정적 그리기 유틸 | `lib/lantern/drawLanternFace.ts`   | 전달받은 `ctx`만 변경. 외부 상태를 읽지 않는다                                                                                                 | [브라우저] 시각 검증         |
| 리소스 소유 훅     | `lib/lantern/useLanternTexture.ts` | 생성과 해제를 한 effect 안에서 짝짓는다 (§7)                                                                                                   | [브라우저] `renderer.info`   |
| 컴포넌트           | `components/`                      | 입력·렌더링·연결만 담당. 충돌·전이·좌표 계산은 순수 함수를 **호출만** 한다                                                                     | [검토]                       |
| store 액션         | `stores/gameStore.ts`              | 전이 함수 호출 + 결과 반영                                                                                                                     | 전이 함수 테스트로 간접 검증 |

- **하나의 값은 하나의 주체만 바꾼다.** 캐릭터 위치는 `PlayerController`만 바꾸고, `CharacterModel`은 읽기만 한다 (SPEC §4). [검토]
- **표시와 실행은 같은 판정 함수를 쓴다.** 버튼 표시와 클릭·E키 실행 모두 `resolveInteraction`을 각 시점에 다시 호출한다 (SPEC §8). [검토]
- 위치·크기·충돌 값은 `WorldConfig` 한 곳에서 읽는다. 컴포넌트 안에 같은 숫자를 다시 적지 않는다. [검토]
- 함수·파일을 미리 쪼개지 않는다. **두 번째 사용처가 생기거나 테스트가 필요해질 때** 분리한다. 한 번만 쓰는 래퍼·팩토리·제네릭 유틸은 만들지 않는다. [검토]

---

## 7. Three.js · R3F 리소스 관리

세부 근거는 SPEC §5 "텍스처 소유권과 생명주기"와 CORE_CONCEPTS §7을 따른다. 모두 [검토] 항목이고, 렌더 중 객체 변경 일부는 ESLint가 잡는다.

### 생성과 해제

| 자원                                   | 만드는 곳                                  | 해제                                        |
| -------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| JSX로 선언한 Geometry·Material         | `<meshStandardMaterial />` 등              | R3F가 언마운트 시 자동 해제                 |
| `new`로 만든 객체 (`CanvasTexture` 등) | `useLayoutEffect` 안                       | **같은 effect의 정리 함수**에서 `dispose()` |
| 공유 Geometry                          | `lib/lantern/lanternGeometry.ts` 모듈 상수 | 해제하지 않음 (개수 고정)                   |

- Three 객체를 **렌더 중에 만들지 않는다** (`useMemo`, `useState` 초기화 포함). StrictMode 재마운트에서 해제된 객체를 다시 쓰게 된다.
- 텍스처는 인스턴스마다 소유하고 **공유하지 않는다.** 다른 컴포넌트에 넘기거나 store에 넣지 않는다. 공유하는 것은 획 데이터뿐이다.
- `map`은 ref로 명령형 연결한다. JSX prop으로 넘기지 않는다.
- 공유 Geometry는 `<mesh geometry={LANTERN_GEOMETRY.front}>`처럼 **prop으로만** 넘긴다. JSX 자식, `<primitive attach>`, `useMemo`로 만들지 않는다.
- `dispose={null}`은 쓰지 않는다 (하위 Material 누수).
- 개발 모드에서 공유 Geometry에 `dispose` 경고 리스너를 달고, `renderer.info.memory`로 누수를 확인한다. [브라우저]

### 프레임 루프

- 매 프레임 변경은 `useFrame`에서 ref에 직접 한다. **`useFrame` 안에서 `setState`하지 않는다.**
  - **예외: 1회성 수명 이벤트 콜백.** `useFrame` 안에서 조건을 판정한 결과로, 부모 콜백이나 store 액션(예: `FlyingLantern`의 `onExpire`, 4단계 `removeFlyingLantern`)을 호출할 수 있다. 이 콜백 안에서 상태가 바뀌어도 된다. 단 아래를 모두 지킨다.
    1. 조건 판정은 순수 함수로 한다 (예: `shouldRemoveFlyingLantern`).
    2. ref 가드(예: `hasExpiredRef`)를 호출 **전에** `true`로 바꿔서, 조건을 만족한 뒤 **정확히 한 번만** 호출한다. 가드가 켜진 뒤에는 그 프레임 콜백이 아무 일도 하지 않는다.
    3. 매 프레임 바뀌는 값(위치·진행률 등)을 상태로 전달하는 용도로는 쓰지 않는다. 매 프레임 React 상태를 바꾸는 것은 계속 금지다.
- 이동량은 항상 `delta`를 곱하고, 이동·충돌 계산에 쓰는 `delta`는 0.1초로 상한을 둔다.
- `useFrame` 안에서 매 프레임 `new Vector3()` 등을 만들지 않는다. 임시 객체는 모듈 상수나 ref로 한 번 만들어 재사용한다.
- 애니메이션 클립은 상태가 **바뀔 때만** 전환한다. 매 프레임 `play()`하지 않는다.

### 렌더링 설정

- 천등 각 면은 `side = FrontSide` (DoubleSide 금지, 글씨 반전 방지).
- 텍스처는 `colorSpace = SRGBColorSpace`, `flipY`는 기본값(true) 유지.
- 라이트는 미리 마운트하고 `intensity`만 바꾼다. 라이트 수를 런타임에 바꾸지 않는다 (셰이더 재컴파일).
- 투명 재질과 커스텀 셰이더는 쓰지 않는다 (SPEC §1 범위 밖).

---

## 8. 커밋 전 확인

**[자동]** — 명령 출력으로 확인하고 DEV_LOG의 "자동 검증"에 기록한다.

```bash
npm run typecheck
npm run lint
npm test          # 1단계에서 추가
npm run build
```

커밋하면 pre-commit 훅이 스테이징된 파일에만 ESLint(`--fix`, warning 0개)와 Prettier를 실행한다. 훅이 실패하면 `--no-verify`로 우회하지 않고 원인을 고친다.

**[검토]** — PR 설명이나 셀프 리뷰에서 확인한다.

- [ ] 파일 위치와 이름이 §1, SPEC §9와 맞는가
- [ ] import 순서와 `@/` 별칭, `import type`
- [ ] 상태가 올바른 위치(store / ref / 로컬)에 있고 중복되지 않는가
- [ ] 계산 로직이 컴포넌트가 아니라 순수 함수에 있고, 테스트가 있는가
- [ ] `new`로 만든 Three 객체마다 같은 effect 안에 `dispose()`가 있는가
- [ ] `useFrame` 안에 `setState`나 매 프레임 객체 생성이 없는가
- [ ] SPEC에 없는 패키지를 추가하지 않았는가

**[브라우저]** — IMPLEMENTATION_PLAN 단계별 완료 조건. DEV_LOG에 자동 검증과 **나누어** 기록한다.
