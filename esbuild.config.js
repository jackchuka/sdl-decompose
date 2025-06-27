import esbuild from "esbuild";

const build = async () => {
  await esbuild.build({
    entryPoints: ["src/cli.ts"],
    bundle: true,
    outfile: "bin/cli.js",
    platform: "node",
    target: "node18",
    format: "esm",
    minify: true,
    sourcemap: false,
    banner: {
      js: "#!/usr/bin/env node",
    },
    external: ["graphql", "commander"],
  });

  console.log("✅ CLI bundled successfully");
};

build().catch((error) => {
  console.error("❌ Build failed:", error);
  process.exit(1);
});
