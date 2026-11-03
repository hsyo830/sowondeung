// SPEC §5: 2D Canvas 배경, 3D 종이, 색상 선택 UI가 모두 이 HEX 하나를 공유한다.
export const LANTERN_COLORS = [
  { id: "red", name: "빨강", hex: "#e2503f" },
  { id: "orange", name: "주황", hex: "#f08a3c" },
  { id: "yellow", name: "노랑", hex: "#f2c94c" },
  { id: "pink", name: "분홍", hex: "#f290b2" },
] as const;

export type LanternColor = (typeof LANTERN_COLORS)[number];
export type LanternColorId = LanternColor["id"];

/** id → HEX. 게임 안의 색상 선택 UI, 손에 든 천등, 작성 종이가 모두 이 값을 쓴다 */
export function getLanternColorHex(id: LanternColorId): string {
  return (LANTERN_COLORS.find((color) => color.id === id) ?? LANTERN_COLORS[0]).hex;
}
