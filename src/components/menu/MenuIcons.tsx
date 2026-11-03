// 메뉴 UI 아이콘·일러스트. 이미지 에셋 없이 인라인 SVG로 그린다 (장식이라 모두 aria-hidden).
// 아이콘은 currentColor를 따르고, 일러스트는 정해진 색을 쓴다. 천등 색은 lanternColors 단일 원본에서 읽는다.

import { LANTERN_COLORS } from "@/constants/lanternColors";

interface IconProps {
  className?: string;
}

export function QuestionIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M8.6 8.6a3.5 3.5 0 1 1 5.1 3.1c-1 .5-1.7 1.4-1.7 2.5v.6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="19" r="1.6" fill="currentColor" />
    </svg>
  );
}

interface SpeakerIconProps extends IconProps {
  muted?: boolean;
}

export function SpeakerIcon({ className, muted = false }: SpeakerIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M4 9.5v5a1 1 0 0 0 1 1h3l4.4 3.6a.6.6 0 0 0 1-.5V5.4a.6.6 0 0 0-1-.5L8 8.5H5a1 1 0 0 0-1 1Z"
        fill="currentColor"
      />
      {muted ? (
        <path
          d="m16.5 9.5 5 5m0-5-5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path
            d="M16.2 9.2a4 4 0 0 1 0 5.6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M18.8 6.6a7.6 7.6 0 0 1 0 10.8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="m6.5 6.5 11 11m0-11-11 11"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ExternalLinkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MusicNoteIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M9 17.5V6.2l10-2v11.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <ellipse cx="6.6" cy="17.6" rx="2.6" ry="2.1" fill="currentColor" />
      <ellipse cx="16.6" cy="15.6" rx="2.6" ry="2.1" fill="currentColor" />
    </svg>
  );
}

export function WaveformIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M3 12h1.5M7 9v6M10.5 5v14M14 8v8M17.5 10.5v3M21 12h-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 천등 하나 (위가 넓은 종이 + 아래 불빛). 일러스트 여러 곳에서 크기·색만 바꿔 쓴다 */
function LanternShape({
  x,
  y,
  scale = 1,
  color,
  glow = false,
}: {
  x: number;
  y: number;
  scale?: number;
  color: string;
  glow?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {glow && <circle cx="0" cy="2" r="11" fill="#ffd27a" opacity="0.35" />}
      <path
        d="M-6.5 -8 H6.5 L4.6 7 H-4.6 Z"
        fill={color}
        stroke="#7a4b22"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path d="M-5.8 -3 H5.8" stroke="#7a4b22" strokeWidth="0.5" opacity="0.5" />
      <rect x="-3.4" y="7" width="6.8" height="1.6" rx="0.6" fill="#7a4b22" />
      {glow && <ellipse cx="0" cy="5" rx="2" ry="1.4" fill="#fff3b0" />}
    </g>
  );
}

const ILLUSTRATION_CLASS = "h-full w-full";

/** STEP 1. 탁자 위의 여러 색 천등 */
export function ReceiveIllustration() {
  const [pink, yellow, , sky] = LANTERN_COLORS;
  return (
    <svg viewBox="0 0 72 56" aria-hidden className={ILLUSTRATION_CLASS}>
      <rect width="72" height="56" fill="#f3dfb8" />
      <path d="M0 40 H72 V56 H0 Z" fill="#b98a55" />
      <path d="M0 40 H72" stroke="#8a5e33" strokeWidth="1.5" />
      <LanternShape x={20} y={30} scale={1.05} color={pink.hex} />
      <LanternShape x={36} y={27} scale={1.25} color={yellow.hex} />
      <LanternShape x={52} y={30} scale={1.05} color={sky.hex} />
    </svg>
  );
}

/** STEP 2. 소원 종이와 붓 */
export function WriteIllustration() {
  return (
    <svg viewBox="0 0 72 56" aria-hidden className={ILLUSTRATION_CLASS}>
      <rect width="72" height="56" fill="#efe2c7" />
      <path
        d="M22 8 H48 L45 48 H25 Z"
        fill="#fff6dc"
        stroke="#c79a5b"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M35 33 C29 28.5 28 24.5 31 22.5 C33 21.2 34.6 22.4 35 23.8 C35.4 22.4 37 21.2 39 22.5 C42 24.5 41 28.5 35 33 Z"
        fill="none"
        stroke="#e0607e"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M58 9 L44 35" stroke="#7a4b22" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M44.6 33.8 L42.6 38.4 L46.4 35.2 Z" fill="#3b2414" />
    </svg>
  );
}

/** STEP 3. 장작 위 모닥불 */
export function IgniteIllustration() {
  return (
    <svg viewBox="0 0 72 56" aria-hidden className={ILLUSTRATION_CLASS}>
      <defs>
        <radialGradient id="ignite-glow" cx="50%" cy="70%" r="60%">
          <stop offset="0" stopColor="#ffb54d" stopOpacity="0.55" />
          <stop offset="1" stopColor="#4a2f1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="72" height="56" fill="#5b3a24" />
      <rect width="72" height="56" fill="url(#ignite-glow)" />
      <path
        d="M36 9 C42 18 48 23 45 33 C43.5 39 39 42 36 42 C31 42 27 38.5 27 33 C27 27 31 25 32 19 C34 22 35 24 36 25 C37 20 37 15 36 9 Z"
        fill="#f2560f"
      />
      <path
        d="M36 21 C40 27 42 30 40.5 35 C39.5 38.5 37.5 40 36 40 C33.5 40 31.5 38 31.5 35 C31.5 31.5 34 29.5 34.5 26 C35.5 28 36 29 36.3 29.5 C37 27 37 24 36 21 Z"
        fill="#ffb02e"
      />
      <ellipse cx="36" cy="37" rx="3" ry="3.4" fill="#fff3b0" />
      <path
        d="M20 47 L52 40 M20 40 L52 47"
        stroke="#8a5e33"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** STEP 4. 밤하늘로 날아가는 천등 */
export function LaunchIllustration() {
  const [, yellow, , sky] = LANTERN_COLORS;
  return (
    <svg viewBox="0 0 72 56" aria-hidden className={ILLUSTRATION_CLASS}>
      <defs>
        <linearGradient id="launch-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f2350" />
          <stop offset="1" stopColor="#4b3f78" />
        </linearGradient>
      </defs>
      <rect width="72" height="56" fill="url(#launch-sky)" />
      <circle cx="12" cy="10" r="0.9" fill="#fff6dc" />
      <circle cx="58" cy="8" r="0.8" fill="#fff6dc" />
      <circle cx="63" cy="24" r="0.7" fill="#fff6dc" />
      <circle cx="9" cy="30" r="0.7" fill="#fff6dc" />
      <path
        d="M36 50 C36 44 35 40 36 36"
        stroke="#ffd27a"
        strokeWidth="0.8"
        strokeDasharray="1.6 2"
        opacity="0.7"
      />
      <LanternShape x={36} y={24} scale={1.35} color={yellow.hex} glow />
      <LanternShape x={56} y={40} scale={0.6} color={sky.hex} glow />
    </svg>
  );
}

/** 모달 위쪽 원형 장식 안의 천등 */
export function MedallionLantern({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      <circle cx="20" cy="21" r="14" fill="#ffd27a" opacity="0.45" />
      <path
        d="M11 9 H29 L26 29 H14 Z"
        fill="#ffb54d"
        stroke="#a8692d"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M12 9 C15 13 25 13 28 9" fill="#ffd27a" opacity="0.8" />
      <rect x="15" y="29" width="10" height="2.4" rx="1" fill="#a8692d" />
      <ellipse cx="20" cy="26" rx="2.6" ry="1.8" fill="#fff3b0" />
    </svg>
  );
}

/** 소리 설정 모달 아래쪽 장식: 언덕과 떠오르는 천등 */
export function SoundFooterScene({ className }: IconProps) {
  const [pink, yellow, , sky] = LANTERN_COLORS;
  return (
    <svg
      viewBox="0 0 320 56"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className={className}
    >
      <path
        d="M0 56 V40 C40 30 80 34 120 42 C160 50 200 30 250 34 C285 37 305 42 320 40 V56 Z"
        fill="#ecd3a6"
      />
      <path d="M0 56 V48 C50 42 100 46 160 50 C220 54 270 44 320 48 V56 Z" fill="#e2c28c" />
      <LanternShape x={160} y={22} scale={1.3} color={yellow.hex} glow />
      <LanternShape x={128} y={34} scale={0.55} color={pink.hex} glow />
      <LanternShape x={194} y={31} scale={0.6} color={sky.hex} glow />
    </svg>
  );
}

/** 모달 네 모서리의 작은 금색 장식 */
export function CornerFlourish({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M2 14 C2 7 7 2 14 2 M6 14 C6 9.5 9.5 6 14 6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="17" cy="2.5" r="1.1" fill="currentColor" />
      <circle cx="2.5" cy="17" r="1.1" fill="currentColor" />
    </svg>
  );
}
