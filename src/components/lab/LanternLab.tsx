"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";

import type { LabFlyingLantern } from "@/components/lab/LanternLabScene";
import { WritingCanvas } from "@/components/writing/WritingCanvas";
import { LANTERN_COLORS } from "@/constants/lanternColors";
import type { LanternColorId } from "@/constants/lanternColors";
import type { Stroke } from "@/types/game";

// WebGL은 서버에서 렌더링할 수 없다. cacheComponents 환경이므로 Client Component에서 ssr: false로 불러온다.
const LanternLabScene = dynamic(
  () => import("@/components/lab/LanternLabScene").then((m) => m.LanternLabScene),
  { ssr: false, loading: () => <p className="p-4 text-sm text-zinc-400">3D 불러오는 중…</p> },
);

export function LanternLab() {
  const [colorId, setColorId] = useState<LanternColorId>("red");
  const [isLit, setIsLit] = useState(false);
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [manualAngleDeg, setManualAngleDeg] = useState(0);
  const [isToneMapped, setIsToneMapped] = useState(true);
  // 초안(작성 중)과 완료본을 나눈다. 게임에서도 완료할 때만 천등에 반영된다 (SPEC §5).
  const [draftStrokes, setDraftStrokes] = useState<readonly Stroke[]>([]);
  const [committedStrokes, setCommittedStrokes] = useState<readonly Stroke[]>([]);
  const [completeCount, setCompleteCount] = useState(0);
  const [flyingLanterns, setFlyingLanterns] = useState<readonly LabFlyingLantern[]>([]);
  const [launchCount, setLaunchCount] = useState(0);
  const nextFlyingIdRef = useRef(1);

  function handleComplete(strokes: readonly Stroke[]) {
    setCommittedStrokes(strokes);
    setCompleteCount((n) => n + 1);
  }

  const color = LANTERN_COLORS.find((c) => c.id === colorId) ?? LANTERN_COLORS[0];

  // 4단계 발사 생명주기 재현: 누를 때마다 새 인스턴스(새 텍스처)를 마운트한다.
  function handleLaunch() {
    const id = nextFlyingIdRef.current;
    nextFlyingIdRef.current += 1;
    setFlyingLanterns((prev) => [...prev, { id, colorHex: color.hex, strokes: committedStrokes }]);
    setLaunchCount((n) => n + 1);
  }

  function handleFlyingExpire(id: number) {
    setFlyingLanterns((prev) => prev.filter((lantern) => lantern.id !== id));
  }

  return (
    <main className="flex min-h-full flex-1 flex-col gap-4 bg-zinc-950 p-4 text-zinc-100 lg:flex-row">
      <section className="flex flex-col gap-3 lg:w-[360px]">
        <h1 className="text-lg font-semibold">천등 기술 검증</h1>

        <fieldset className="flex gap-2">
          <legend className="mb-1 text-sm text-zinc-400">색상</legend>
          {LANTERN_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColorId(c.id)}
              aria-pressed={c.id === colorId}
              className="h-9 rounded px-3 text-sm font-medium text-zinc-900 ring-offset-2 ring-offset-zinc-950 aria-pressed:ring-2 aria-pressed:ring-white"
              style={{ backgroundColor: c.hex }}
            >
              {c.name}
            </button>
          ))}
        </fieldset>

        <WritingCanvas
          colorHex={color.hex}
          strokes={draftStrokes}
          onStrokesChange={setDraftStrokes}
          onComplete={handleComplete}
        />
        <p className="text-xs text-zinc-400">
          초안 {draftStrokes.length}획 · 3D 반영 {committedStrokes.length}획 · 완료 {completeCount}
          회
        </p>
      </section>

      <section className="flex min-h-[420px] flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={isLit} onChange={(e) => setIsLit(e.target.checked)} />
            점화(lit)
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={isAutoRotate}
              onChange={(e) => setIsAutoRotate(e.target.checked)}
            />
            자동 회전
          </label>
          <label className="flex items-center gap-1">
            각도 {manualAngleDeg}°
            <input
              type="range"
              min={0}
              max={360}
              step={15}
              value={manualAngleDeg}
              disabled={isAutoRotate}
              onChange={(e) => setManualAngleDeg(Number(e.target.value))}
            />
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={isToneMapped}
              onChange={(e) => setIsToneMapped(e.target.checked)}
            />
            톤 매핑
          </label>
          <button
            type="button"
            onClick={handleLaunch}
            className="rounded bg-sky-600 px-3 py-1.5 font-medium"
          >
            상승 테스트
          </button>
          <span className="text-xs text-zinc-400">
            비행 중 {flyingLanterns.length} · 누적 발사 {launchCount}
          </span>
        </div>
        <div className="min-h-[420px] flex-1 overflow-hidden rounded-lg">
          <LanternLabScene
            colorHex={color.hex}
            strokes={committedStrokes}
            lit={isLit}
            isAutoRotate={isAutoRotate}
            manualAngleDeg={manualAngleDeg}
            isToneMapped={isToneMapped}
            flyingLanterns={flyingLanterns}
            onFlyingExpire={handleFlyingExpire}
          />
        </div>
      </section>
    </main>
  );
}
