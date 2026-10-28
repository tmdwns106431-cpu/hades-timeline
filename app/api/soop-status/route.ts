import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MEMBERS = [
  { name: "솜주먹", id: "ldrboo" },
  { name: "띵귤", id: "singgyul" },
  { name: "연초록", id: "whatcherry4" },
  { name: "챈나", id: "chaenna02" },
  { name: "키마", id: "kymakyma" },
] as const;

type StationResponse = { station?: { user_nick?: string }; broad?: unknown };

async function getStatus(member: (typeof MEMBERS)[number]) {
  for (const domain of ["chapi.sooplive.com", "chapi.sooplive.co.kr"]) {
    try {
      const response = await fetch(`https://${domain}/api/${encodeURIComponent(member.id)}/station`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Referer: `https://www.sooplive.com/station/${member.id}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) continue;
      const data = await response.json() as StationResponse;
      // 응답 형식이 예상과 다르면 오프라인으로 오인하지 않고 확인 불가 처리합니다.
      if (!data || typeof data !== "object" || !data.station) continue;
      return {
        id: member.id,
        name: member.name,
        live: Boolean(data.broad),
        title: data.broad && typeof data.broad === "object" && "broad_title" in data.broad
          ? String((data.broad as { broad_title?: unknown }).broad_title ?? "")
          : "",
      };
    } catch {
      // 첫 도메인이 실패하면 대체 도메인을 확인합니다.
    }
  }
  return { id: member.id, name: member.name, live: null, error: "SOOP 상태 조회 실패" };
}

export async function GET() {
  const statuses = await Promise.all(MEMBERS.map(getStatus));
  return NextResponse.json(
    { statuses, checkedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
