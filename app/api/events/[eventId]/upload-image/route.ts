import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const EVENT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DuplicateCheckResult = {
  strict: boolean;
  soft: boolean;
};

type UploadResponse = {
  ok: boolean;
  success: boolean;
  strictMatch: boolean;
  fuzzyMatch: boolean;
  message: string;
  error?: string;
};

type PythonRunResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

const isDev = process.env.NODE_ENV !== "production";

function logUploadError(context: string, error: unknown, details?: Record<string, unknown>) {
  if (!isDev) return;
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  console.error(`[upload-image] ${context}`, {
    ...details,
    message: normalizedError.message,
    stack: normalizedError.stack,
  });
}

function buildErrorResponse(error: string, message: string) {
  return {
    ok: false,
    success: false,
    error,
    message,
  };
}

function sanitizeFileName(originalName: string): string {
  const baseName = path.basename(originalName);
  if (!baseName) {
    return `upload-${Date.now()}`;
  }
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureDirectoryExists(directoryPath: string): Promise<void> {
  await fs.promises.mkdir(directoryPath, { recursive: true });
}

async function saveUploadedFile(file: File, destinationDir: string): Promise<string> {
  const safeName = sanitizeFileName(file.name || "uploaded-image");
  const parsedName = path.parse(safeName);
  let destinationPath = path.resolve(destinationDir, safeName);
  let suffix = 1;

  while (fs.existsSync(destinationPath)) {
    const candidateName = `${parsedName.name}-${suffix}${parsedName.ext}`;
    destinationPath = path.resolve(destinationDir, candidateName);
    suffix += 1;
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await fs.promises.writeFile(destinationPath, fileBuffer);
  return destinationPath;
}

async function runPythonScript(args: string[], cwd: string): Promise<PythonRunResult> {
  return new Promise((resolve) => {
    const pythonProcess = spawn("python", args, { cwd });

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });

    pythonProcess.on("error", (error) => {
      resolve({ code: 1, stdout, stderr: error.message });
    });
  });
}

async function parseDuplicateCsv(csvPath: string, targetImagePath: string): Promise<boolean> {
  try {
    await fs.promises.access(csvPath, fs.constants.F_OK);
  } catch {
    return false;
  }

  const normalizedTarget = path.normalize(path.resolve(targetImagePath));
  const csvContent = await fs.promises.readFile(csvPath, "utf-8");
  const rows = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (rows.length <= 1) {
    return false;
  }

  for (const row of rows.slice(1)) {
    const [image1 = "", image2 = ""] = row.split(",");
    const normalizedImage1 = path.normalize(path.resolve(image1.trim()));
    const normalizedImage2 = path.normalize(path.resolve(image2.trim()));

    if (normalizedImage1 === normalizedTarget || normalizedImage2 === normalizedTarget) {
      return true;
    }
  }

  return false;
}

async function checkDuplicates(
  csvPath: string,
  hashCsvPath: string,
  targetImagePath: string,
): Promise<DuplicateCheckResult> {
  const [soft, strict] = await Promise.all([
    parseDuplicateCsv(csvPath, targetImagePath),
    parseDuplicateCsv(hashCsvPath, targetImagePath),
  ]);

  return { soft, strict };
}

function buildPaths(eventId: string) {
  const projectRoot = path.resolve(process.cwd(), "ia_local");
  const imagesDir = path.resolve(projectRoot, "data", "images", `${eventId}`);
  const embeddingsDir = path.resolve(projectRoot, "data", "embeddings");
  const csvDir = path.resolve(projectRoot, "data", "csv");

  const fileBase = `event_${eventId}`;

  const embeddingsPath = path.join(embeddingsDir, `${fileBase}.pkl`);
  const csvOutputPath = path.join(csvDir, `${fileBase}.csv`);
  const hashCsvPath = path.join(csvDir, `${fileBase}_strict.csv`);
  const scriptPath = path.resolve(projectRoot, "main.py");

  return {
    projectRoot,
    scriptPath,
    imagesDir,
    embeddingsDir,
    csvDir,
    embeddingsPath,
    csvOutputPath,
    hashCsvPath,
  };
}

function buildResponseMessage(result: DuplicateCheckResult): string {
  if (result.strict) {
    return "Image déjà présente (identique)";
  }
  if (result.soft) {
    return "Image déjà présente (similaire)";
  }
  return "Image enregistrée";
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = (await context.params) as { eventId: string };

  if (!EVENT_ID_PATTERN.test(eventId)) {
    logUploadError("invalid_event_id", new Error("Invalid eventId"), { eventId });
    return NextResponse.json(
      buildErrorResponse("INVALID_EVENT_ID", "Identifiant d’événement invalide"),
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    logUploadError("formdata_parse_failed", error);
    return NextResponse.json(
      buildErrorResponse("INVALID_FORM_DATA", (error as Error).message),
      { status: 400 }
    );
  }

  const imageEntry = formData.get("image") ?? formData.get("file");

  if (!(imageEntry instanceof File)) {
    logUploadError("missing_image", new Error("No image file in form data"));
    return NextResponse.json(
      buildErrorResponse(
        "MISSING_IMAGE",
        "Aucun fichier image fourni dans la requête (champ 'image')."
      ),
      { status: 400 }
    );
  }

  const paths = buildPaths(eventId);

  try {
    await Promise.all([
      ensureDirectoryExists(paths.imagesDir),
      ensureDirectoryExists(paths.embeddingsDir),
      ensureDirectoryExists(paths.csvDir),
    ]);
  } catch (error) {
    logUploadError("directory_prepare_failed", error, { paths });
    return NextResponse.json(
      buildErrorResponse(
        "DIRECTORY_ERROR",
        `Impossible de préparer les dossiers locaux: ${(error as Error).message}`
      ),
      { status: 500 }
    );
  }

  let storedImagePath = "";
  try {
    storedImagePath = await saveUploadedFile(imageEntry, paths.imagesDir);
  } catch (error) {
    logUploadError("save_failed", error, { destination: paths.imagesDir });
    return NextResponse.json(
      buildErrorResponse(
        "SAVE_ERROR",
        `Impossible d'enregistrer l'image: ${(error as Error).message}`
      ),
      { status: 500 }
    );
  }

  const pythonArgs = [
    paths.scriptPath,
    "--hash-check",
    "--encode",
    "--search",
    "--csv-export",
    paths.csvOutputPath,
    "--images",
    paths.imagesDir,
    "--output",
    paths.embeddingsPath,
    "--hash-output",
    paths.hashCsvPath,
    "--hash-images",
    paths.imagesDir,
  ];

  const { code, stderr } = await runPythonScript(pythonArgs, paths.projectRoot);

  if (code !== 0) {
    const message = stderr || "Échec de l'exécution du script Python.";
    logUploadError("python_failed", new Error(message), { code });
    return NextResponse.json(
      buildErrorResponse("PYTHON_ERROR", message),
      { status: 500 }
    );
  }

  try {
    const duplicates = await checkDuplicates(
      paths.csvOutputPath,
      paths.hashCsvPath,
      storedImagePath
    );
    const message = buildResponseMessage(duplicates);

    const payload: UploadResponse & {
      isStrictDuplicate: boolean;
      isSoftDuplicate: boolean;
    } = {
      ok: true,
      success: true,
      strictMatch: duplicates.strict,
      fuzzyMatch: duplicates.soft,
      message,
      isStrictDuplicate: duplicates.strict,
      isSoftDuplicate: duplicates.soft,
    };

    return NextResponse.json(payload);
  } catch (error) {
    logUploadError("csv_parse_failed", error, { storedImagePath });
    return NextResponse.json(
      buildErrorResponse(
        "CSV_PARSE_ERROR",
        `Impossible d'analyser les résultats: ${(error as Error).message}`
      ),
      { status: 500 }
    );
  }
}
