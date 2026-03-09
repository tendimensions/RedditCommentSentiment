const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const isDev = process.argv.includes("--dev");

const staticFiles = [
  ["manifest.json", "dist/manifest.json"],
  ["src/popup/popup.html", "dist/popup/popup.html"],
  ["src/popup/popup.css", "dist/popup/popup.css"],
  ["src/options/options.html", "dist/options/options.html"],
  ["src/options/options.css", "dist/options/options.css"],
];

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyStaticFiles() {
  for (const [src, dest] of staticFiles) {
    ensureDir(dest);
    fs.copyFileSync(src, dest);
  }
  // Copy icons directory if it exists
  const iconsDir = "icons";
  if (fs.existsSync(iconsDir)) {
    const destIconsDir = "dist/icons";
    if (!fs.existsSync(destIconsDir)) {
      fs.mkdirSync(destIconsDir, { recursive: true });
    }
    for (const file of fs.readdirSync(iconsDir)) {
      fs.copyFileSync(path.join(iconsDir, file), path.join(destIconsDir, file));
    }
  }
  console.log("Copied static files.");
}

const scripts = [
  { entryPoints: ["src/content/index.ts"], outfile: "dist/content.js" },
  { entryPoints: ["src/background/index.ts"], outfile: "dist/background.js" },
  { entryPoints: ["src/popup/popup.ts"], outfile: "dist/popup/popup.js" },
  { entryPoints: ["src/options/options.ts"], outfile: "dist/options/options.js" },
];

const commonOptions = {
  bundle: true,
  format: "iife",
  target: "chrome120",
  sourcemap: isDev,
};

async function build() {
  ensureDir("dist/popup/x");
  ensureDir("dist/options/x");
  copyStaticFiles();

  await Promise.all(
    scripts.map((s) => esbuild.build({ ...commonOptions, ...s }))
  );

  console.log(`Build complete${isDev ? " (dev/sourcemaps)" : ""}.`);
  console.log("Load the 'dist/' folder as an unpacked extension in Chrome.");
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
