// Objectif : exécuter le script Python `main.py` avec les bons arguments, et retourner un JSON contenant le nombre de doublons ou une erreur.

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

type ScanResponse = {
  success: boolean;
  doublons?: number;
  error?: string;
};

export async function POST() {
  const projectRoot = path.resolve(process.cwd(), "ia_local");
  const scriptPath = path.join(projectRoot, "main.py");
  const csvOutput = path.join(projectRoot, "data", "doublons.csv");

  return new Promise<NextResponse>((resolve) => {
    const pythonProcess = spawn(
      "python",
      [scriptPath, "--encode", "--search", "--csv-export", csvOutput],
      {
        cwd: projectRoot,
      }
    );

    let stderr = "";

    pythonProcess.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    pythonProcess.on("error", (error) => {
      resolve(
        NextResponse.json<ScanResponse>(
          { success: false, error: error.message },
          { status: 500 }
        )
      );
    });

    pythonProcess.on("close", () => {
      try {
        let doublons = 0;

        if (fs.existsSync(csvOutput)) {
          const csvContent = fs.readFileSync(csvOutput, "utf-8").trim();
          const lines = csvContent.split("\n");
          doublons = Math.max(lines.length - 1, 0);
        }

        resolve(NextResponse.json<ScanResponse>({ success: true, doublons }));
      } catch (err) {
        resolve(
          NextResponse.json<ScanResponse>(
            { success: false, error: (err as Error).message },
            { status: 500 }
          )
        );
      }
    });
  });
}
