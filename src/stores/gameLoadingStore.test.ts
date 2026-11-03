import { beforeEach, describe, expect, it } from "vitest";

import { isGameReady, useGameLoadingStore } from "./gameLoadingStore";
import { isGameInputBlocked, useMenuStore } from "./menuStore";

const loading = () => useGameLoadingStore.getState();

beforeEach(() => {
  useGameLoadingStore.setState({ status: "loading" });
  useMenuStore.setState({ openMenuId: null });
});

describe("최초 로딩 상태", () => {
  it("처음에는 loading이고, 준비 완료는 한 번만 바뀐다", () => {
    expect(isGameReady()).toBe(false);
    expect(loading().markReady()).toBe(true);
    expect(loading().status).toBe("ready");
    expect(loading().markReady()).toBe(false);
  });

  it("실패 뒤에 준비 완료가 늦게 와도 실패 화면을 덮지 않는다", () => {
    expect(loading().markFailed()).toBe(true);
    expect(loading().markReady()).toBe(false);
    expect(loading().status).toBe("failed");
    expect(loading().markFailed()).toBe(false);
  });

  it("준비 뒤 런타임 오류(오류 경계)는 실패로 바꾼다", () => {
    loading().markReady();
    expect(loading().markFailed()).toBe(true);
    expect(isGameReady()).toBe(false);
  });
});

describe("게임 입력 잠금 (isGameInputBlocked)", () => {
  it("로딩 중·실패 시에는 막고, 준비 완료 뒤에만 연다", () => {
    expect(isGameInputBlocked()).toBe(true);
    loading().markReady();
    expect(isGameInputBlocked()).toBe(false);
    loading().markFailed();
    expect(isGameInputBlocked()).toBe(true);
  });

  it("준비 완료 뒤에도 창이 열려 있으면 막는다 (기존 동작 유지)", () => {
    loading().markReady();
    useMenuStore.getState().openMenu("guide");
    expect(isGameInputBlocked()).toBe(true);
    useMenuStore.getState().closeMenu();
    expect(isGameInputBlocked()).toBe(false);
  });

  it("로딩 중에는 창이 닫혀 있어도 막는다", () => {
    useMenuStore.getState().closeMenu();
    expect(isGameInputBlocked()).toBe(true);
  });
});
