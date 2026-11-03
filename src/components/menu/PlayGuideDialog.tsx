"use client";

import type { ReactNode } from "react";

import { GameDialog } from "./GameDialog";
import {
  ExternalLinkIcon,
  IgniteIllustration,
  LaunchIllustration,
  MedallionLantern,
  ReceiveIllustration,
  WriteIllustration,
} from "./MenuIcons";

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid h-6 min-w-6 place-items-center rounded-md border border-[#c79a5b] bg-[#fffaf0] px-1.5 font-sans text-xs font-semibold text-[#4a2f1a] shadow-[0_1px_0_#c79a5b]">
      {children}
    </kbd>
  );
}

interface GuideStep {
  id: string;
  title: string;
  description: ReactNode;
  illustration: ReactNode;
}

// 문구는 실제 구현과 맞춘다: 탁자·모닥불은 '바라보고' E (resolveInteraction 방향 판정), 발사는 어디서든 F 또는 버튼 3초
const STEPS: readonly GuideStep[] = [
  {
    id: "receive",
    title: "소원등 받기",
    description: (
      <>
        탁자에 다가가 바라보고 <Kbd>E</Kbd> 키를 눌러 원하는 색상의 소원등을 선택해요.
      </>
    ),
    illustration: <ReceiveIllustration />,
  },
  {
    id: "write",
    title: "소원 적기",
    description: (
      <>
        탁자에서 다시 <Kbd>E</Kbd> 키를 누르고, 마우스로 소원등에 마음을 담아 소원을 적어요.
      </>
    ),
    illustration: <WriteIllustration />,
  },
  {
    id: "ignite",
    title: "불 붙이기",
    description: (
      <>
        소원을 작성한 뒤 모닥불 앞에서 <Kbd>E</Kbd> 키를 눌러 불을 붙여요.
      </>
    ),
    illustration: <IgniteIllustration />,
  },
  {
    id: "launch",
    title: "하늘로 날리기",
    description: (
      <>
        <Kbd>F</Kbd> 키 또는 발사 버튼을 3초 동안 눌러 소원등을 하늘로 날려 보내요.
      </>
    ),
    illustration: <LaunchIllustration />,
  },
];

interface ControlRow {
  id: string;
  keys: ReactNode;
  action: string;
}

// 키 매핑: movement.ts(WASD·방향키), constants/interaction.ts(E·F·Escape)
const CONTROLS: readonly ControlRow[] = [
  {
    id: "move",
    keys: (
      <>
        <Kbd>W</Kbd>
        <Kbd>A</Kbd>
        <Kbd>S</Kbd>
        <Kbd>D</Kbd>
        <span className="text-xs text-[#9a7a55]">/</span>
        <Kbd>방향키</Kbd>
      </>
    ),
    action: "이동",
  },
  { id: "interact", keys: <Kbd>E</Kbd>, action: "탁자·모닥불 상호작용" },
  {
    id: "launch",
    keys: (
      <>
        <Kbd>F</Kbd>
        <span className="text-xs text-[#9a7a55]">3초 길게 누르기</span>
      </>
    ),
    action: "소원등 날리기",
  },
  { id: "mouse", keys: <Kbd>마우스</Kbd>, action: "버튼 선택 · 손글씨 작성" },
  { id: "close", keys: <Kbd>ESC</Kbd>, action: "창 닫기 · 작성 취소" },
];

interface AssetCredit {
  id: string;
  category: string;
  name: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
  changes: string;
}

// README '3D 에셋 출처'와 같은 내용. 제작자 표기는 Sketchfab 모델 페이지 기준 (DEV_LOG 출처 확인 기록)
const ASSET_CREDITS: readonly AssetCredit[] = [
  {
    id: "character",
    category: "캐릭터",
    name: "Free Pack - Chibi Base Mesh (Rigged)",
    sourceUrl:
      "https://sketchfab.com/3d-models/free-pack-chibi-base-mesh-rigged-fed4fb329f224f1594f631eae8d2626b",
    author: "PolyOne Studio",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    changes: "Mixamo 애니메이션 추가 및 웹서비스에 맞게 조정",
  },
  {
    id: "forest",
    category: "숲 배경",
    name: "Low Poly Forest Campfire [Updated]",
    sourceUrl:
      "https://sketchfab.com/3d-models/low-poly-forest-campfire-updated-af086b62a4c84ea89eda895b23d64813",
    author: "Minzkraut",
    license: "CC BY-NC-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    changes: "냄비와 지지대 비표시, 불꽃 애니메이션 및 조명 연출 추가",
  },
];

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mb-3 flex items-center gap-3 text-sm font-bold text-[#7a4b22]">
      <span aria-hidden className="h-px flex-1 bg-[#e2c793]" />
      {children}
      <span aria-hidden className="h-px flex-1 bg-[#e2c793]" />
    </h3>
  );
}

const LINK_CLASS =
  "inline-flex items-center gap-1 rounded-sm underline decoration-[#d9b26f] underline-offset-2 hover:text-[#a8692d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9853f]";

interface PlayGuideDialogProps {
  onClose: () => void;
}

export function PlayGuideDialog({ onClose }: PlayGuideDialogProps) {
  return (
    <GameDialog
      title="플레이 방법"
      medallion={<MedallionLantern className="h-11 w-11" />}
      onClose={onClose}
      widthClassName="w-[min(40rem,calc(100vw-2rem))]"
    >
      <section aria-labelledby="guide-steps">
        <h3 id="guide-steps" className="sr-only">
          진행 순서
        </h3>
        <ol className="flex flex-col gap-2.5">
          {STEPS.map((step, index) => (
            <li
              key={step.id}
              className="flex items-center gap-4 rounded-2xl border border-[#ecd9b3] bg-[#fffdf7]/85 p-2.5 pr-4"
            >
              <div className="h-14 w-18 shrink-0 overflow-hidden rounded-xl border border-[#e2c793]">
                {step.illustration}
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-bold text-[#4a2f1a]">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#4a2f1a] text-xs text-[#fdf3dc]">
                    {index + 1}
                  </span>
                  <span>
                    <span className="sr-only">STEP {index + 1}. </span>
                    {step.title}
                  </span>
                </p>
                <p className="mt-1 text-sm leading-relaxed break-keep text-[#6b4a2c]">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="guide-controls" className="mt-6">
        <SectionTitle id="guide-controls">조작 방법</SectionTitle>
        <dl className="grid gap-x-6 gap-y-2 rounded-2xl border border-[#ecd9b3] bg-[#fffdf7]/70 p-4 text-sm sm:grid-cols-[auto_1fr]">
          {CONTROLS.map((control) => (
            <div key={control.id} className="contents">
              <dt className="flex flex-wrap items-center gap-1">{control.keys}</dt>
              <dd className="mb-1 text-[#6b4a2c] sm:mb-0 sm:self-center">{control.action}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="guide-credits" className="mt-6">
        <SectionTitle id="guide-credits">3D 에셋 출처</SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2">
          {ASSET_CREDITS.map((credit) => (
            <li
              key={credit.id}
              className="flex flex-col rounded-2xl border border-[#ecd9b3] bg-[#fffdf7]/85 p-4 text-sm"
            >
              <span className="mb-1.5 w-fit rounded-full bg-[#f3e2bf] px-2.5 py-0.5 text-xs font-semibold text-[#7a4b22]">
                {credit.category}
              </span>
              <a
                href={credit.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${LINK_CLASS} font-bold text-[#4a2f1a]`}
              >
                <span>{credit.name}</span>
                <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="sr-only"> (Sketchfab 원본, 새 창)</span>
              </a>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[#6b4a2c]">
                <dt className="text-[#9a7a55]">제작자</dt>
                <dd>{credit.author}</dd>
                <dt className="text-[#9a7a55]">라이선스</dt>
                <dd>
                  <a
                    href={credit.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINK_CLASS}
                  >
                    {credit.license}
                    <ExternalLinkIcon className="h-3 w-3 shrink-0" />
                    <span className="sr-only"> (라이선스 전문, 새 창)</span>
                  </a>
                </dd>
              </dl>
              <p className="mt-2 text-xs leading-relaxed break-keep text-[#8a6a48]">
                변경 사항: {credit.changes}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed break-keep text-[#8a6a48]">
          소원등은 Three.js로 직접 만들었어요. 숲 배경은 비상업(NC) 라이선스라 이 프로젝트는 비상업
          포트폴리오로만 사용해요.
        </p>
      </section>
    </GameDialog>
  );
}
