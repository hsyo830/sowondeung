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

/**
 * 점화한 천등 안쪽 불빛의 색 (SPEC §5 조명·발광). 종이 emissive에 곱하는 따뜻한 빛이다.
 * 흰색에 가까운 연한 주황이라 곱해도 빨강·주황·노랑·분홍의 색상(hue)이 유지되고, 조금 따뜻해진다.
 */
export const LANTERN_INNER_GLOW_HEX = "#ffe2bd";
