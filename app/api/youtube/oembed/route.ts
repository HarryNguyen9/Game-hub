import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("videoId")?.trim();
  if (!videoId) {
    return NextResponse.json({ error: "Missing videoId parameter" }, { status: 400 });
  }

  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`;

  const res = await fetch(oembedUrl);
  if (!res.ok) {
    return NextResponse.json({ error: "Video not found or private" }, { status: 404 });
  }

  const data = await res.json();

  return NextResponse.json({
    title: data.title ?? "",
    thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
  });
}
