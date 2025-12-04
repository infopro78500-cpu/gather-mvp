import { NextResponse } from "next/server";

const PYTHON_SCAN_URL = "http://127.0.0.1:8000/scan";
const REQUEST_TIMEOUT_MS = 5000;

type ScanResult = {
  success: boolean;
  doublons: number;
  error?: string;
};

export async function POST() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(PYTHON_SCAN_URL, {
      method: "POST",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error("Erreur API Python:", response.status, response.statusText);
      return NextResponse.json<ScanResult>(
        { success: false, doublons: 0, error: "PYTHON_BACKEND_ERROR" },
        { status: 502 }
      );
    }

    const data = (await response.json()) as Partial<ScanResult>;

    if (typeof data.success !== "boolean" || typeof data.doublons !== "number") {
      console.error("Réponse Python invalide:", data);
      return NextResponse.json<ScanResult>(
        { success: false, doublons: 0, error: "INVALID_RESPONSE" },
        { status: 502 }
      );
    }

    return NextResponse.json<ScanResult>({
      success: data.success,
      doublons: data.doublons,
      error: data.error,
    });
  } catch (error) {
    clearTimeout(timeout);
    const isAbortError = (error as Error).name === "AbortError";
    console.error("Erreur scan API/timeout:", error);

    return NextResponse.json<ScanResult>(
      {
        success: false,
        doublons: 0,
        error: isAbortError ? "SCAN_TIMEOUT" : "SCAN_ERROR",
      },
      { status: isAbortError ? 504 : 500 }
    );
  }
}
