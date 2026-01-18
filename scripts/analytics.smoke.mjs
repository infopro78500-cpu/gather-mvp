import fs from "fs";
import path from "path";

const outputDir = path.join(process.cwd(), "analytics_output");
const requiredFiles = [
  "analysis_table.csv",
  "daily_timeseries.csv",
  "report.md",
];

let hasError = false;

for (const file of requiredFiles) {
  const filePath = path.join(outputDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`[analytics-smoke] Missing output file: ${filePath}`);
    hasError = true;
    continue;
  }
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    console.error(`[analytics-smoke] Output file is empty: ${filePath}`);
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
}

console.log("[analytics-smoke] Output files are present and non-empty.");
