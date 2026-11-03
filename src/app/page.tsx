import { GameEntry } from "@/components/game/GameEntry";

// 데스크톱 판별과 3D 동적 로드(ssr: false)는 Client Component인 GameEntry가 맡는다 (Server Component에서는 ssr: false 불가)
export default function Home() {
  return <GameEntry />;
}
