import type { NextApiRequest, NextApiResponse } from "next";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

type ScanResponse = {
  success: boolean;
  doublons?: number;
  error?: string;
};

const PROJECT_ROOT = path.resolve(process.cwd(), "ia_local");
const SCRIPT_PATH = path.join(PROJECT_ROOT, "main.py");
const HASH_CSV_PATH = path.join(PROJECT_ROOT, "data", "doublons_stricts.csv");

export default function handler(req: NextApiRequest, res: NextApiResponse<ScanResponse>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
  }

  let stderr = "";
  let isHandled = false;

  const sendResponse = (status: number, payload: ScanResponse) => {
    if (isHandled) return;
    isHandled = true;
    res.status(status).json(payload);
  };

  const pythonProcess = spawn(
    "python",
    [SCRIPT_PATH, "--hash-check", "--hash-output", HASH_CSV_PATH],
    {
      cwd: PROJECT_ROOT,
    }
  );

  pythonProcess.stderr.on("data", (data: Buffer) => {
    stderr += data.toString();
  });

  pythonProcess.on("error", (error) => {
    sendResponse(500, { success: false, error: error.message });
  });

  pythonProcess.on("close", (code) => {
    if (code !== 0) {
      const error = stderr || `Le script Python s'est terminé avec le code ${code}.`;
      return sendResponse(500, { success: false, error });
    }

    try {
      let doublons = 0;

      if (fs.existsSync(HASH_CSV_PATH)) {
        const csvContent = fs.readFileSync(HASH_CSV_PATH, "utf8").trim();
        if (csvContent) {
          const lines = csvContent.split("\n");
          doublons = Math.max(lines.length - 1, 0);
        }
      }

      return sendResponse(200, { success: true, doublons });
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      return sendResponse(500, { success: false, error: message });
    }
  });
}
