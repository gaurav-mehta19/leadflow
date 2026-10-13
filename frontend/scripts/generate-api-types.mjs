import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import openapiTS, { astToString } from "openapi-typescript";
import { format, resolveConfig } from "prettier";
import ts from "typescript";

const outputPath = fileURLToPath(new URL("../src/lib/api/schema.ts", import.meta.url));
const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

function stripComments(source) {
  const sourceFile = ts.createSourceFile("schema.ts", source, ts.ScriptTarget.Latest, true);
  return ts.createPrinter({ removeComments: true }).printFile(sourceFile);
}

const ast = await openapiTS(new URL("/openapi.json", apiUrl), { exportType: false });
const source = stripComments(astToString(ast));
const prettierConfig = await resolveConfig(outputPath);
const formatted = await format(source, { ...prettierConfig, filepath: outputPath });

await writeFile(outputPath, formatted);
process.stdout.write(`Wrote ${outputPath} from ${apiUrl}/openapi.json\n`);
