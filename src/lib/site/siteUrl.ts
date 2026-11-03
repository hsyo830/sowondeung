/** 사이트 절대 URL을 정하는 데 쓰는 환경변수 (빌드 시점 값) */
export type SiteUrlEnv = {
  /** 직접 지정한 배포 주소. 예: `https://sowondeung.example` */
  SITE_URL?: string;
  /** Vercel 시스템 변수. 프로젝트의 프로덕션 도메인 (프로토콜 없음) */
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  NODE_ENV?: string;
};

const DEV_SITE_URL = "http://localhost:3000";

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * OG 이미지·og:url·canonical의 기준 주소(metadataBase)를 정한다.
 *
 * 1. `SITE_URL`이 있으면 그 주소 (값이 잘못되면 빌드를 멈춘다)
 * 2. Vercel 빌드면 `VERCEL_PROJECT_PRODUCTION_URL` (https)
 * 3. 개발 서버면 `http://localhost:3000`
 * 4. 그 밖(배포 주소를 모르는 프로덕션 빌드)은 `null` → 절대 URL이 필요한 태그를 만들지 않는다.
 *    localhost 주소가 공유 미리보기에 실리는 것을 막기 위해서다.
 */
export function resolveSiteUrl(env: SiteUrlEnv): URL | null {
  const explicit = env.SITE_URL?.trim();
  if (explicit) {
    const url = parseHttpUrl(explicit);
    if (!url) throw new Error(`SITE_URL은 http(s) 절대 URL이어야 합니다: "${explicit}"`);
    return url;
  }

  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelHost) return parseHttpUrl(`https://${vercelHost}`);

  if (env.NODE_ENV === "development") return new URL(DEV_SITE_URL);

  return null;
}
