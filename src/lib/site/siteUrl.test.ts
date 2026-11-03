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

  it("실제 배포 주소: 끝 슬래시 유무와 관계없이 같은 기준 주소, 상대 경로가 절대 URL로 풀린다", () => {
    const PRODUCTION = "https://sowondeung-wish.vercel.app";
    for (const value of [PRODUCTION, `${PRODUCTION}/`]) {
      const url = resolveSiteUrl({ SITE_URL: value, NODE_ENV: "production" });
      expect(url?.origin).toBe(PRODUCTION);
      // layout.tsx의 canonical·og:url("/")과 og·twitter 이미지 경로가 metadataBase 기준으로 풀린 결과
      expect(new URL("/", url ?? undefined).href).toBe(`${PRODUCTION}/`);
      expect(new URL("/images/sowondeung_og.png", url ?? undefined).href).toBe(
        `${PRODUCTION}/images/sowondeung_og.png`,
      );
    }
  });

  it("Vercel Preview 빌드도 프로덕션 도메인을 쓴다 (미리보기 배포 주소를 공유 태그에 싣지 않는다)", () => {
    // Preview에서도 VERCEL_PROJECT_PRODUCTION_URL은 프로덕션 도메인이다. 배포별 주소(VERCEL_URL)는 읽지 않는다
    const url = resolveSiteUrl({
      VERCEL_PROJECT_PRODUCTION_URL: "sowondeung-wish.vercel.app",
      NODE_ENV: "production",
    });
    expect(url?.href).toBe("https://sowondeung-wish.vercel.app/");
  });

  it("개발 서버라도 SITE_URL을 지정하면 그 주소를 쓴다", () => {
    expect(
      resolveSiteUrl({ SITE_URL: "https://sowondeung-wish.vercel.app", NODE_ENV: "development" })
        ?.href,
    ).toBe("https://sowondeung-wish.vercel.app/");
  });

  it("배포 주소를 모르는 프로덕션 빌드는 null (localhost를 쓰지 않는다)", () => {
    expect(resolveSiteUrl({ NODE_ENV: "production" })).toBeNull();
    expect(resolveSiteUrl({ SITE_URL: "  ", NODE_ENV: "production" })).toBeNull();
  });
});
