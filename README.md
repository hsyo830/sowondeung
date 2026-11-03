# 🏮 소원등

**소원을 직접 적고 하늘로 날려 보내는 3D 인터랙티브 웹 체험**

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://sowondeung-wish.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.187-black?logo=threedotjs)](https://threejs.org/)

<img width="1448" height="1086" alt="image" src="https://github.com/user-attachments/assets/54136fde-b646-452b-9687-435b05e72846" />

🔗 **Demo** | https://sowondeung-wish.vercel.app/

🔗 **GitHub** | https://github.com/hsyo830/sowondeung

---

## 🏮 프로젝트 개요

- 숲속을 탐험하며 소원등을 받고, 직접 소원을 작성해 하늘로 날려 보내는 3D 인터랙티브 웹 서비스
- React Three Fiber와 Three.js를 활용해 3D 공간·캐릭터 이동·소원등 점화 및 비행 애니메이션 구현
- HTML Canvas에 작성한 손글씨를 CanvasTexture로 변환하여 3D 소원등 표면에 실시간 반영
- Zustand 기반 상태 관리로 소원등 수령·작성·점화·발사의 단계별 상호작용 제어

---

## 🏮 기술 스택

| 구분              | 사용 기술                                  |
| ----------------- | ------------------------------------------ |
| **개발 환경**     | VS Code · ESLint · Prettier · Git & GitHub |
| **프레임워크**    | Next.js 16 · React 19 · TypeScript 5       |
| **스타일링**      | Tailwind CSS 4                             |
| **3D 렌더링**     | Three.js · React Three Fiber               |
| **상태 관리**     | Zustand                                    |
| **3D 애니메이션** | Three.js AnimationMixer · Mixamo           |
| **텍스처 처리**   | HTML Canvas · CanvasTexture                |
| **테스트**        | Vitest                                     |
| **코드 품질**     | Husky · lint-staged                        |
| **빌드/배포**     | Next.js Build · Vercel                     |

---

## 🏮 프로젝트 실행 방법

Node.js 24 환경을 권장합니다.

```bash
# 패키지 설치
npm install

# 로컬 개발 서버
npm run dev

# TypeScript 타입 검사
npm run typecheck

# ESLint 규칙 검사
npm run lint

# Prettier 포맷 검사
npm run format:check

# 전체 코드 검사
npm run check

# Vitest 테스트
npm run test

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start
```

---

## 🏮 주요 기능

| 기능                  | 설명                                                           |
| --------------------- | -------------------------------------------------------------- |
| **3D 숲 탐험**        | 키보드 이동 및 3인칭 카메라를 활용한 숲속 공간 탐험            |
| **소원등 수령**       | 탁자 접근 및 방향 판정을 통한 상호작용, 4가지 소원등 색상 선택 |
| **소원 작성**         | Canvas 기반 손글씨 입력 및 3D 소원등 표면에 텍스처 적용        |
| **소원등 점화**       | 모닥불 상호작용을 통한 점화 및 발광·조명 효과 적용             |
| **소원등 발사**       | 3초 홀드 후 발사 애니메이션과 연계한 상승·회전·흔들림 구현     |
| **캐릭터 애니메이션** | Idle·Walk·Throw·Praying 동작 및 상태별 애니메이션 전환         |
| **충돌 처리**         | 지형 높이 판정과 원형·AABB 기반 충돌 계산으로 이동 영역 제어   |
| **게임 상태 관리**    | Zustand 기반 상태 전이 및 게임 진행 단계별 입력 제어           |
| **사운드 시스템**     | 배경음악·환경음·효과음 재생, 개별 볼륨 조절 및 음소거          |
| **플레이 가이드**     | 게임 조작 방법 안내 및 3D 에셋 출처·라이선스 제공              |
| **로딩 화면**         | 3D 에셋 및 게임 초기화 상태와 연동한 최초 접속 로딩 UI         |

### 1. 숲 탐험 및 상호작용

**[이미지 넣을 부분 — 숲 탐험 및 소원등 수령]**

- WASD·방향키를 활용한 캐릭터 이동
- 지형 높이 및 장애물 충돌을 고려한 이동 제어
- 상호작용 대상과의 거리·방향에 따른 안내 UI 및 강조 효과

### 2. 손글씨 작성 및 3D 텍스처

**[이미지 넣을 부분 — 소원 작성 및 3D 반영]**

- Pointer Events 기반 손글씨 입력 및 획 단위 데이터 관리
- 손글씨를 CanvasTexture로 변환해 소원등 표면에 적용
- 작성한 획 데이터를 유지하여 발사 후에도 동일한 소원이 표시되도록 구현

### 3. 점화 및 발사 애니메이션

**[이미지 넣을 부분 — 소원등 점화 및 발사]**

- 소원등 상태에 따라 점화·발사 가능 여부 제어
- 발사 홀드와 Throw 애니메이션의 실제 손을 놓는 시점을 연결
- 소원등 상승·흔들림·회전 및 카메라 추적 연출

---

## 🏮 GitHub 브랜치 전략

| 브랜치        | 용도                 | 비고                   |
| ------------- | -------------------- | ---------------------- |
| **main**      | 최종 배포용          | Vercel 운영 환경       |
| **develop**   | 기능 통합용          | 테스트 / 통합          |
| **feature/*** | 신규 기능 개발용     | 기능 단위 작업         |
| **fix/***     | 버그 수정용          | 오류 해결              |
| **chore/***   | 환경 설정·유지보수용 | 배포 준비 및 설정 작업 |

---

## 🏮 Commit 컨벤션

| 타입         | 설명                  | 예시                                                      |
| ------------ | --------------------- | --------------------------------------------------------- |
| **feat**     | 새로운 기능 추가      | `feat: 소원등 점화 및 발사 효과음 추가`                   |
| **fix**      | 버그 수정             | `fix: 게임 UI 내 천등 명칭을 소원등으로 통일`             |
| **style**    | UI·시각적 스타일 개선 | `style: 모닥불 불꽃 그라데이션 및 일렁임 효과 개선`       |
| **refactor** | 구조 개선 및 리팩토링 | `refactor: 하늘 렌더링 구조 개선 및 노을 그라데이션 적용` |
| **docs**     | 문서 수정             | `docs: README 및 개발 문서 업데이트`                      |
| **chore**    | 빌드·설정 관련 변경   | `chore: Node.js 버전 관리를 위한 .nvmrc 추가`             |

---

## 🗂️ 프로젝트 구조

```text
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 공통 레이아웃 및 SEO 메타데이터
│   ├── page.tsx            # 게임 진입 페이지
│   └── lab/                # 개발용 3D 소원등 테스트
├── components/
│   ├── game/               # 게임 진입·HUD·상태별 UI
│   ├── world/              # 숲 배경·하늘·모닥불
│   ├── player/             # 캐릭터 이동·카메라·애니메이션
│   ├── lantern/            # 소원등 모델·점화·비행
│   ├── writing/            # 손글씨 작성 UI
│   └── interactions/       # 상호작용 판정 및 안내
├── constants/              # 공통 상수 및 애니메이션 설정
├── lib/
│   ├── game/               # 충돌·이동·상태 전이·비행 로직
│   ├── lantern/            # 소원등 Geometry·CanvasTexture
│   ├── writing/            # 손글씨 좌표 및 획 처리
│   └── site/               # 배포 URL 처리
└── stores/                 # Zustand 게임 상태 관리

public/
├── audio/                  # BGM 및 효과음
├── images/                 # OG 이미지
└── models/                 # 숲·캐릭터 3D 모델

docs/                        # 기획·구현 계획·개발 기록
scripts/                     # 캐릭터 애니메이션 병합 스크립트
```

---

## 🏮 3D 에셋 및 라이선스

본 프로젝트의 소원등은 Three.js의 기본 Geometry로 직접 구성했으며, 숲 배경과 캐릭터에 외부 3D 에셋을 사용했습니다.

| 용도                  | 에셋                                                                                                                                      | 제작자         | 라이선스                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------- |
| **숲 배경**           | [Low Poly Forest Campfire [Updated]](https://sketchfab.com/3d-models/low-poly-forest-campfire-updated-af086b62a4c84ea89eda895b23d64813)   | Minzkraut      | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| **캐릭터**            | [Free Pack - Chibi Base Mesh (Rigged)](https://sketchfab.com/3d-models/free-pack-chibi-base-mesh-rigged-fed4fb329f224f1594f631eae8d2626b) | PolyOne Studio | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)             |
| **캐릭터 애니메이션** | [Mixamo](https://www.mixamo.com/)                                                                                                         | Adobe Mixamo   | Adobe Mixamo 이용 조건                                                |

- **숲 배경:** 원본 GLB를 유지하고, 런타임에서 일부 오브젝트 숨김, 불꽃 애니메이션·색상, 조명 및 노을 배경을 적용했습니다.
- **캐릭터:** 원본 메시와 재질을 유지하고 Mixamo 애니메이션을 통합했습니다. 캐릭터 모델의 현재 제작자 표기는 PolyOne Studio이며, 다운로드 당시 파일 메타데이터에는 DuNguyn Studio로 기록되어 있었습니다.
- **사용 범위:** 숲 배경은 비상업적 이용 조건(NC)이 포함된 에셋이므로 본 프로젝트는 비상업 포트폴리오 용도로 사용합니다. 에셋을 재배포하거나 변경물을 공유할 경우 해당 라이선스 조건을 준수해야 합니다.
