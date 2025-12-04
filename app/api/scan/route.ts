import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScanResponse = {
  success: boolean;
  doublons?: number;
  error?: string;
};

export async function POST() {
  const projectRoot = path.resolve(process.cwd(), "ia_local");
  const scriptPath = path.join(projectRoot, "main.py");
  const csvPath = path.join(projectRoot, "data", "doublons.csv");

  return new Promise<NextResponse>((resolve) => {
    const pythonProcess = spawn(
      "python",
      [scriptPath, "--encode", "--search", "--csv-export"],
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

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        resolve(
          NextResponse.json<ScanResponse>(
            {
              success: false,
              error: stderr || `Le script s'est terminé avec le code ${code}.`,
            },
            { status: 500 }
          )
        );
        return;
      }

      try {
        let doublons = 0;

        if (fs.existsSync(csvPath)) {
          const csvContent = fs.readFileSync(csvPath, "utf8").trim();

          if (csvContent.length > 0) {
            const lines = csvContent.split("\n");
            doublons = Math.max(lines.length - 1, 0);
          }
        }

        resolve(NextResponse.json<ScanResponse>({ success: true, doublons }));
      } catch (error) {
        resolve(
          NextResponse.json<ScanResponse>(
            { success: false, error: (error as Error).message },
            { status: 500 }
          )
        );
      }
    });
  });
}
