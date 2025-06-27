import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { decomposeGraphQL, OperationType } from "./index";

const program = new Command();

async function readSDL(sdlFile?: string): Promise<string> {
  if (sdlFile) {
    const sdlPath = resolve(sdlFile);
    if (!existsSync(sdlPath)) {
      throw new Error(`SDL file not found: ${sdlPath}`);
    }
    return readFileSync(sdlPath, "utf8");
  }

  // Read from stdin
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    process.stdin.on("data", (chunk) => {
      chunks.push(chunk);
    });

    process.stdin.on("end", () => {
      const data = Buffer.concat(chunks).toString("utf8");
      if (!data.trim()) {
        reject(new Error("No SDL content provided via stdin"));
      } else {
        resolve(data);
      }
    });

    process.stdin.on("error", reject);
  });
}

program
  .name("sdl-decompose")
  .description("Decompose GraphQL SDL by operation name to produce partial SDL")
  .version(require("../package.json").version)
  .option(
    "-s, --sdl <file>",
    "Path to SDL file (optional, reads from stdin if not provided)"
  )
  .requiredOption("-o, --operation <name>", "Operation name to decompose")
  .option(
    "-t, --type <type>",
    "Operation type: query, mutation, subscription",
    "query"
  )
  .option(
    "--output <file>",
    "Output file path (optional, prints to stdout if not provided)"
  )
  .option("--include-builtins", "Include builtin scalar types in output", false)
  .option(
    "--exclude-comments",
    "Remove comments and descriptions from output SDL",
    false
  )
  .option("--include-deprecated", "Include deprecated fields in output", false)
  .action(async (options) => {
    const {
      sdl: sdlFile,
      operation: operationName,
      type: operationType,
      output: outputFile,
      includeBuiltins,
      excludeComments,
      includeDeprecated,
    } = options;

    // Validate operation type
    if (!["query", "mutation", "subscription"].includes(operationType)) {
      console.error(
        "Error: --type must be one of: query, mutation, subscription"
      );
      process.exit(1);
    }

    try {
      const fullSDL = await readSDL(sdlFile);
      const result = decomposeGraphQL(
        fullSDL,
        operationName,
        operationType as OperationType,
        {
          includeBuiltinScalars: includeBuiltins,
          excludeComments: excludeComments,
          includeDeprecated: includeDeprecated,
        }
      );

      if (!result.operationFound) {
        console.error(
          `Error: Operation '${operationName}' not found in ${operationType} type`
        );
        process.exit(1);
      }

      if (outputFile) {
        writeFileSync(outputFile, result.sdl);
        console.log(`Decomposed SDL written to: ${outputFile}`);
        console.log(
          `Collected types: ${Array.from(result.collectedTypes).join(", ")}`
        );
      } else {
        console.log(result.sdl);
      }
    } catch (error) {
      console.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

program.parse();
