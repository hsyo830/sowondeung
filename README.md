## 3D 에셋 출처

이 프로젝트는 아래 외부 3D 모델을 사용합니다. 천등은 Three.js Geometry로 직접 만들었습니다.

| 용도    | 모델                                                                                                                                      | 제작자                                          | 라이선스                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| 숲 배경 | [Low Poly Forest Campfire [Updated]](https://sketchfab.com/3d-models/low-poly-forest-campfire-updated-af086b62a4c84ea89eda895b23d64813)   | [Minzkraut](https://sketchfab.com/Minzkraut)    | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| 캐릭터  | [Free Pack - Chibi Base Mesh (Rigged)](https://sketchfab.com/3d-models/free-pack-chibi-base-mesh-rigged-fed4fb329f224f1594f631eae8d2626b) | [PolyOne Studio](https://sketchfab.com/polyone) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)             |

- 제작자·라이선스는 각 GLB 파일의 메타데이터(`asset.extras`)와 Sketchfab 모델 페이지 기준입니다. 캐릭터는 다운로드 당시 GLB 메타데이터에 **DuNguyn Studio**(`sketchfab.com/dunguyn`)로 적혀 있었고, 같은 모델 페이지의 현재 제작자 표기는 **PolyOne Studio**(`@polyone`)입니다 (2026-11-03 확인).
- 같은 출처를 게임 안 '플레이 방법' 창 아래쪽에도 표시합니다.
- 숲 배경은 비상업(NC) 라이선스이므로 이 프로젝트는 비상업 포트폴리오로만 사용합니다.
- **숲 배경 변경 사항:** 원본 GLB 파일은 수정하지 않고, 런타임에서 모닥불 냄비와 지지대(가로 가지)를 숨기고, 불꽃 메시에 일렁임 애니메이션·정점 색을 입히고, 초저녁 조명·모닥불 빛을 더했습니다.
- **캐릭터 변경 사항:** 원본 캐릭터에 [Mixamo](https://www.mixamo.com)의 `Idle`·`Walking`(In Place) 애니메이션을 적용하고, 원본 재질을 유지한 채 하나의 GLB로 합쳤습니다. 메시 형태는 바꾸지 않았습니다.

### 캐릭터 GLB 변환 방법

`public/models/character.glb`는 `scripts/merge-character.mjs`로 만듭니다. Blender나 추가 패키지 없이 설치된 three의 `FBXLoader`·`GLTFExporter`를 Node에서 씁니다.

1. 원본 캐릭터를 Mixamo에 올려 `Idle`, `Walking`(**In Place** 체크)을 FBX로 받습니다.
2. 아래 로컬 폴더에 둡니다. `assets-source/`는 `.gitignore`에 있어 Git에 올라가지 않습니다.
   - `assets-source/character/mixamo/Idle.fbx`, `Walking.fbx`
   - `assets-source/character/character.original.glb` (Sketchfab 원본. 재질·크기 비교 기준)
3. `node scripts/merge-character.mjs` → 통합·검증 결과를 `assets-source/character/character.merged.glb`에만 씁니다.
4. 검증(In Place, 정점 수·재질·크기·방향이 원본과 같음, `Idle`·`Walk` 클립, 손 본)이 모두 통과하면 `--replace`로 교체합니다. 기존 파일은 `assets-source/character/backups/`에 먼저 백업되고, 내용이 같으면 교체하지 않습니다.

- 클립 이름: `Idle`, `Walk` (`src/constants/animation.ts`와 같아야 함)
- 오른손 본: **`RightHand`** (왼손 `Left_Hand`). 천등을 손에 들 때(3단계) 이 본의 월드 위치를 읽습니다. Sketchfab 원본 GLB에서는 `RightHand_011`이었습니다.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
