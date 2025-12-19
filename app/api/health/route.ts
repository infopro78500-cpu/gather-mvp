import { NextResponse } from "next/server";

export const GET = async () => {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.npm_package_version ?? "unknown";

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    env: process.env.VERCEL_ENV ?? "local",
    version,
  });
};
