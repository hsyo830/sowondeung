import { notFound } from "next/navigation";

/**
 * `/lab/*`은 개발용 기술 검증 페이지다. 프로덕션 빌드에서는 404를 돌려준다.
 * 세그먼트 레이아웃에서 막아서, 아래 페이지(`lab/lantern` 등)는 고치지 않고 개발 기능을 그대로 쓴다.
 * NODE_ENV는 빌드 때 인라인되는 값이라 프로덕션에서는 이 라우트가 404 페이지로 미리 렌더링된다.
 */
export default function LabLayout({ children }: LayoutProps<"/lab">) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
