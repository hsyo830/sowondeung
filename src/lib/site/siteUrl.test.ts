import { describe, expect, it } from "vitest";

import { resolveSiteUrl } from "./siteUrl";

describe("resolveSiteUrl", () => {
  it("SITE_URL을 가장 먼저 쓴다", () => {
    const url = resolveSiteUrl({
      SITE_URL: "https://wish.example.com",
      VERCEL_PROJECT_PRODUCTION_URL: "other.vercel.app",
      NODE_ENV: "production",
    });
    expect(url?.href).toBe("https://wish.example.com/");
  });

  it("SITE_URL 앞뒤 공백은 무시한다", () => {
    expect(resolveSiteUrl({ SITE_URL: "  https://wish.example.com  " })?.origin).toBe(
      "https://wish.example.com",
    );
  });

  it("SITE_URL이 절대 URL이 아니면 오류를 던진다", () => {
    expect(() => resolveSiteUrl({ SITE_URL: "wish.example.com" })).toThrow();
    expect(() => resolveSiteUrl({ SITE_URL: "ftp://wish.example.com" })).toThrow();
  });

  it("SITE_URL이 없으면 Vercel 프로덕션 도메인을 https로 쓴다", () => {
    const url = resolveSiteUrl({
      VERCEL_PROJECT_PRODUCTION_URL: "sowondeung.vercel.app",
      NODE_ENV: "production",
    });
    expect(url?.href).toBe("https://sowondeung.vercel.app/");
  });

  it("개발 서버에서는 localhost를 쓴다", () => {
    expect(resolveSiteUrl({ NODE_ENV: "development" })?.href).toBe("http://localhost:3000/");
  });

  it("배포 주소를 모르는 프로덕션 빌드는 null (localhost를 쓰지 않는다)", () => {
    expect(resolveSiteUrl({ NODE_ENV: "production" })).toBeNull();
    expect(resolveSiteUrl({ SITE_URL: "  ", NODE_ENV: "production" })).toBeNull();
  });
});
