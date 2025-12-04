// pages/api/scan.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const PROJECT_ROOT = path.resolve(process.cwd(), "ia_local");
const CSV_PATH = path.join(PROJECT_ROOT, "data", "doublons.csv");

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const process = spawn("python", [
    path.join(PROJECT_ROOT, "main.py"),
    "--encode",
    "--search",
    "--csv-export",
  ]);

  let errorLog = "";

  process.stderr.on("data", (data) => {
    errorLog += data.toString();
  });

  process.on("close", (code) => {
    if (code !== 0) {
    console.error("Erreur script Python:", errorLog);
return res.status(500).json({ success: false, error: errorLog });

    }

    try {
      const csvContent = fs.readFileSync(CSV_PATH, "utf8");
      const lines = csvContent.trim().split("\n");
      const doublonsCount = lines.length - 1; // -1 pour l'en-tête

      return res.status(200).json({ success: true, doublons: doublonsCount });
    } catch (err) {
      return res.status(200).json({ success: true, doublons: 0 });
    }
  });
}
