// app/api/state/route.ts
// Proxies GET/PUT to JSONBin.io so the API key stays server-side only.
// Set these two env vars in Vercel dashboard:
//   JSONBIN_BIN_ID   – the bin ID created from jsonbin.io (looks like 6646a2...)
//   JSONBIN_API_KEY  – your JSONBin master key (starts with $2b$...)

import { NextResponse } from "next/server";

const BIN_ID  = process.env.JSONBIN_BIN_ID!;
const API_KEY = process.env.JSONBIN_API_KEY!;
const BASE    = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

export async function GET() {
  const res = await fetch(BASE + "/latest", {
    headers: { "X-Master-Key": API_KEY },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  const data = await res.json();
  return NextResponse.json(data.record);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const res  = await fetch(BASE, {
    method:  "PUT",
    headers: { "Content-Type": "application/json", "X-Master-Key": API_KEY },
    body:    JSON.stringify(body),
  });
  if (!res.ok) return NextResponse.json({ error: "save failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}