import { NextResponse } from "next/server";

const mockScan = async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return { success: true, doublons: 3 } as const;
};

export async function POST() {
  try {
    const result = await mockScan();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur mock scan:", error);
    return NextResponse.json(
      { success: false, doublons: 0, error: "SCAN_ERROR" },
      { status: 500 }
    );
  }
}
