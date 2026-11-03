/** SPEC §4 [결정] MVP는 데스크톱 전용. 모바일에서는 3D 대신 이 안내만 보여 준다 */
export function DesktopOnlyNotice() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center text-zinc-100">
      <h1 className="text-xl font-semibold">소원등</h1>
      <p className="text-sm leading-6 text-zinc-400">
        키보드와 마우스로 즐기는 3D 체험이에요.
        <br />
        데스크톱에서 이용해 주세요.
      </p>
    </div>
  );
}
