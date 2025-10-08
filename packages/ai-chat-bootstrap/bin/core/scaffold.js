const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const { log, error, warn } = require("./log");
// Using raw template source files (.ts / .tsx / .md) copied directly.

let rl;
let warnedNonInteractive = false;
let requireOverwriteConfirmation = true;

function getReadlineInterface() {
  if (!rl) {
    rl = readline.createInterface({ input: stdin, output: stdout });
  }
  return rl;
}

function cleanupReadline() {
  if (rl) {
    rl.close();
    rl = undefined;
  }
}

process.on("exit", cleanupReadline);
process.on("SIGINT", () => {
  cleanupReadline();
  process.exit(1);
});

async function confirmOverwritePrompt(relativePath) {
  if (!stdin.isTTY) {
    if (!warnedNonInteractive) {
      warn(
        "Terminal is non-interactive; skipping overwrites that require confirmation."
      );
      warnedNonInteractive = true;
    }
    return false;
  }
  const answer = (
    await getReadlineInterface().question(
      `File ${relativePath} already exists. Overwrite? [y/N] `
    )
  )
    .trim()
    .toLowerCase();
  return answer === "y" || answer === "yes";
}

async function writeFileWithConfirmation(filePath, content) {
  const relativePath = path.relative(process.cwd(), filePath) || filePath;
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf8");
    if (existing === content) {
      log(`Skipped ${relativePath} (already up to date)`);
      return false;
    }
    if (requireOverwriteConfirmation) {
      const shouldOverwrite = await confirmOverwritePrompt(relativePath);
      if (!shouldOverwrite) {
        warn(`Skipped ${relativePath} (user declined overwrite)`);
        return false;
      }
    }
  } else {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  fs.writeFileSync(filePath, content);
  log(`Wrote ${relativePath}`);
  return true;
}

async function copyFileWithConfirmation(src, dest) {
  const relativePath = path.relative(process.cwd(), dest) || dest;
  if (fs.existsSync(dest)) {
    const existing = fs.readFileSync(dest);
    const incoming = fs.readFileSync(src);
    if (existing.equals(incoming)) {
      log(`Skipped ${relativePath} (already up to date)`);
      return false;
    }
    if (requireOverwriteConfirmation) {
      const shouldOverwrite = await confirmOverwritePrompt(relativePath);
      if (!shouldOverwrite) {
        warn(`Skipped ${relativePath} (user declined overwrite)`);
        return false;
      }
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
  }
  fs.copyFileSync(src, dest);
  log(`Copied ${relativePath}`);
  return true;
}

async function scaffold({ projectName, tailwindNative, localPath }) {
  // Capture directory where the CLI was invoked (before we chdir into scaffolded project)
  const invocationCwd = process.cwd();
  const dir = path.resolve(invocationCwd, projectName);
  let installingIntoExistingProject = false;
  try {
    if (fs.existsSync(dir)) {
      const existingEntries = fs
        .readdirSync(dir)
        .filter((f) => !f.startsWith("."));
      if (existingEntries.length) {
        installingIntoExistingProject = true;
      }
    } else {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (installingIntoExistingProject) {
      log(`Installing ai-chat-bootstrap into existing project at ${projectName} ...`);
      const pkgPath = path.join(dir, "package.json");
      if (!fs.existsSync(pkgPath)) {
        error(
          `Cannot install into '${projectName}' because package.json was not found. Run the CLI in a Next.js project root.`
        );
        process.exit(1);
      }
    } else {
      log(`Scaffolding Next.js project in ${projectName} ...`);
      execSync(
        `npx --yes create-next-app@latest ${projectName} --turbopack --typescript --eslint --app --tailwind --src-dir --import-alias @/* --no-git`,
        { stdio: "inherit" }
      );
    }

    process.chdir(dir);
    requireOverwriteConfirmation = installingIntoExistingProject;

    // -------------------- Dependency Installation --------------------
    log("Installing dependencies...");
    let aiChatSpec = "ai-chat-bootstrap";
    if (localPath) {
      // Resolve relative to where the user invoked the CLI (not the new project dir)
      const resolved = path.isAbsolute(localPath)
        ? localPath
        : path.resolve(invocationCwd, localPath);
      const pkgJson = path.join(resolved, "package.json");
      if (!fs.existsSync(pkgJson)) {
        error(
          `--local path does not contain package.json: ${resolved}\nPass an absolute path or one relative to the directory you ran the CLI from.`
        );
        process.exit(1);
      }
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJson, "utf8"));
        if (pkg.name !== "ai-chat-bootstrap") {
          warn(
            `Local package name mismatch (expected ai-chat-bootstrap, got ${pkg.name}). Proceeding.`
          );
        }
        const distDir = path.join(resolved, "dist");
        if (!fs.existsSync(distDir)) {
          warn(
            "Local package has no dist/ build. Run 'pnpm --filter ai-chat-bootstrap build' before scaffolding."
          );
        }
      } catch {
        warn("Could not inspect local package.json");
      }
      // Create a packed tarball so npm copies instead of symlinking (avoids Turbopack leaving project root)
      log("Packing local ai-chat-bootstrap (npm pack)...");
      let tarballPath;
      try {
        const out = execSync("npm pack --silent", { cwd: resolved });
        const fileName = out.toString().trim().split(/\n/).pop().trim();
        tarballPath = path.join(resolved, fileName);
        if (!fs.existsSync(tarballPath)) {
          error(`npm pack did not produce expected tarball: ${tarballPath}`);
          process.exit(1);
        }
        aiChatSpec = tarballPath; // install via absolute path to tgz
        log(`Using packed tarball: ${aiChatSpec}`);
      } catch (e) {
        error(`Failed to pack local package: ${e.message}`);
        process.exit(1);
      }
      // Clean up tarball after install later
      process.on("exit", () => {
        try {
          if (tarballPath && fs.existsSync(tarballPath))
            fs.unlinkSync(tarballPath);
        } catch {}
      });
    }
    const deps = [
      aiChatSpec,
      "ai",
      "@ai-sdk/react",
      "@ai-sdk/openai",
      "zod",
      "tw-animate-css",
    ];
  try {
    execSync(`npm install ${deps.join(" ")}`, { stdio: "inherit" });
    // Sanity check: ensure the package is now resolvable in node_modules
    if (
      !fs.existsSync(
        path.join("node_modules", "ai-chat-bootstrap", "package.json")
      )
    ) {
      warn(
        "ai-chat-bootstrap not found in node_modules after install. If using --local, npm may have failed silently; check the above output."
      );
      // Ensure no symlink remains (defensive): some package managers could still link; replace with physical copy.
      const pkgDir = path.join("node_modules", "ai-chat-bootstrap");
      try {
        const stat = fs.lstatSync(pkgDir);
        if (stat.isSymbolicLink()) {
          const real = fs.realpathSync(pkgDir);
          log(
            "Replacing symlinked ai-chat-bootstrap with physical copy (local install)"
          );
          const tmp = pkgDir + "__tmp_copy";
          fs.mkdirSync(tmp, { recursive: true });
          // Recursive copy excluding node_modules
          const copyRecursive = (src, dest) => {
            const entries = fs.readdirSync(src);
            for (const entry of entries) {
              if (entry === "node_modules") continue;
              const s = path.join(src, entry);
              const d = path.join(dest, entry);
              const st = fs.statSync(s);
              if (st.isDirectory()) {
                fs.mkdirSync(d, { recursive: true });
                copyRecursive(s, d);
              } else if (st.isFile()) {
                fs.copyFileSync(s, d);
              }
            }
          };
          copyRecursive(real, tmp);
          fs.rmSync(pkgDir, { recursive: true, force: true });
          fs.renameSync(tmp, pkgDir);
        }
      } catch (e) {
        warn("Could not verify/replace local package symlink: " + e.message);
      }
    }
  } catch (e) {
    error(
      "Dependency install failed. If using --local ensure the path is correct and the package is built (pnpm build)."
    );
    throw e;
  }

  // API + home page templates
  log("Copying templates (API routes + home page)");
  const tmplDir = path.join(__dirname, "templates");
  const apiChatDir = path.join("src", "app", "api", "chat");
  const apiSugDir = path.join("src", "app", "api", "suggestions");
  const apiMcpDir = path.join("src", "app", "api", "mcp");
  const apiThreadTitleDir = path.join("src", "app", "api", "thread-title");
  const apiCompressionDir = path.join("src", "app", "api", "compression");
  fs.mkdirSync(apiChatDir, { recursive: true });
  fs.mkdirSync(apiSugDir, { recursive: true });
  fs.mkdirSync(apiMcpDir, { recursive: true });
  fs.mkdirSync(apiThreadTitleDir, { recursive: true });
  fs.mkdirSync(apiCompressionDir, { recursive: true });
  const chatRoutePath = path.join(apiChatDir, "route.ts");
  const chatRouteTemplate = fs.readFileSync(
    path.join(tmplDir, "api-chat-route.ts"),
    "utf8"
  );
  await writeFileWithConfirmation(chatRoutePath, chatRouteTemplate);

  const suggestionsRoutePath = path.join(apiSugDir, "route.ts");
  const suggestionsTemplate = fs.readFileSync(
    path.join(tmplDir, "api-suggestions-route.ts"),
    "utf8"
  );
  await writeFileWithConfirmation(
    suggestionsRoutePath,
    suggestionsTemplate
  );

  const compressionRoutePath = path.join(apiCompressionDir, "route.ts");
  const compressionTemplate = fs.readFileSync(
    path.join(tmplDir, "api-compression-route.ts"),
    "utf8"
  );
  await writeFileWithConfirmation(
    compressionRoutePath,
    compressionTemplate
  );

  const mcpRoutePath = path.join(apiMcpDir, "route.ts");
  const mcpTemplate = fs.readFileSync(
    path.join(tmplDir, "api-mcp-route.ts"),
    "utf8"
  );
  await writeFileWithConfirmation(mcpRoutePath, mcpTemplate);

  const threadTitleRoutePath = path.join(apiThreadTitleDir, "route.ts");
  const threadTitleTemplate = fs.readFileSync(
    path.join(tmplDir, "api-thread-title-route.ts"),
    "utf8"
  );
  await writeFileWithConfirmation(
    threadTitleRoutePath,
    threadTitleTemplate
  );

  const homePagePath = path.join("src", "app", "page.tsx");
  if (installingIntoExistingProject) {
    log("Skipped src/app/page.tsx (existing project)");
  } else {
    const homePageTemplate = fs.readFileSync(
      path.join(tmplDir, "home-page.tsx"),
      "utf8"
    );
    await writeFileWithConfirmation(homePagePath, homePageTemplate);
  }

  // Assets (logo / icon)
  try {
    const assetsDir = path.join(tmplDir, "assets");
    const publicDir = path.join("public");
    fs.mkdirSync(publicDir, { recursive: true });
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir);
      for (const f of files) {
        const src = path.join(assetsDir, f);
        const dest = path.join(publicDir, f);
        try {
          if (fs.statSync(src).isFile()) {
            await copyFileWithConfirmation(src, dest);
          }
        } catch {}
      }
      log("Copied scaffold assets to public/");
    } else {
      warn("Assets directory missing in templates (no logo copied)");
    }
    const logoPath = path.join(publicDir, "acb.png");
    if (!fs.existsSync(logoPath)) {
      warn("acb.png not found in scaffold assets (will 404 until added)");
    }
  } catch (e) {
    warn("Could not copy assets: " + e.message);
  }

  // Inject favicon (metadata icons) into layout.tsx
  if (installingIntoExistingProject) {
    log("Skipped src/app/layout.tsx updates (existing project)");
  } else {
    try {
      const layoutPath = path.join("src", "app", "layout.tsx");
      if (fs.existsSync(layoutPath)) {
        let layout = fs.readFileSync(layoutPath, "utf8");
        // Ensure dark class + data-theme applied server-side to avoid light-mode flash
        if (
          !/className=\"[^\"]*dark/.test(layout) &&
          /<html[^>]*>/.test(layout)
        ) {
          layout = layout.replace(/<html(.*?)>/, (m, attrs) => {
            if (/data-theme=/.test(m))
              return m.includes("className=")
                ? m
                : m.replace("<html", '<html className="dark"');
            if (/className=/.test(m)) {
              return m.replace(
                /className=\"(.*?)\"/,
                (mm, cls) => `className="${cls} dark" data-theme=\"dark\"`
              );
            }
            return `<html${attrs} className="dark" data-theme="dark">`;
          });
        }
        const hasIcons = /icons\s*:/m.test(layout);
        const hasMetadata = /export const metadata/.test(layout);
        if (hasMetadata && !hasIcons) {
          // Attempt to augment existing metadata object
          layout = layout.replace(/export const metadata([^=]*)=\s*\{/, (m) => {
            return (
              m +
              "\n  icons: { icon: '/acb.png', shortcut: '/acb.png', apple: '/acb.png' },"
            );
          });
        } else if (!hasMetadata) {
          if (!/import type { Metadata } from 'next'/.test(layout)) {
            layout = "import type { Metadata } from 'next';\n" + layout;
          }
          layout +=
            "\nexport const metadata: Metadata = { icons: { icon: '/acb.png', shortcut: '/acb.png', apple: '/acb.png' } };\n";
        }
        const layoutUpdated = await writeFileWithConfirmation(layoutPath, layout);
        if (layoutUpdated) {
          log("Injected favicon metadata (acb.png)");
        }
      }
    } catch (e) {
      warn("Could not inject favicon metadata: " + e.message);
    }
  }

  // Styles
  log("Injecting style imports");
  const globalCssPath = path.join("src", "app", "globals.css");
  try {
    const existing = fs.readFileSync(globalCssPath, "utf8");
    let cssContent = existing;
    const hasTokens = existing.includes("ai-chat-bootstrap/tokens.css");
    const hasTwAnimate = existing.includes("tw-animate-css");
    const hasSlice = existing.includes("ai-chat-bootstrap/ai-chat.css");
    const hasStreamdownSource = existing.includes("streamdown/dist/index.js");
    const hasLibSource = existing.includes("ai-chat-bootstrap/dist/index.js");

    if (
      hasTokens &&
      hasTwAnimate &&
      (tailwindNative || hasSlice) &&
      hasStreamdownSource &&
      hasLibSource
    ) {
      // Already satisfied; do nothing.
    } else {
      // Build the ordered block we want to enforce.
      // Desired order inside globals.css:
      // 1. Existing tailwindcss / other imports (left intact)
      // 2. tw-animate-css shim
      // 3. ai-chat-bootstrap tokens
      // 4. optional ai-chat.css slice (non tailwindNative)
      // 5. @source directives
      const lines = existing.split(/\n/);
      // Find insertion index: after the last contiguous top import line ("@import \"") cluster.
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        if (l.startsWith("@import")) {
          insertIdx = i + 1;
          continue;
        }
        // stop at first non-import (blank lines are allowed inside cluster)
        if (l.length && !l.startsWith("@import")) break;
      }
      const blockParts = [];
      if (!hasTwAnimate) blockParts.push('@import "tw-animate-css";');
      if (!hasTokens)
        blockParts.push('@import "ai-chat-bootstrap/tokens.css";');
      if (!tailwindNative && !hasSlice)
        blockParts.push('@import "ai-chat-bootstrap/ai-chat.css";');
      if (!hasStreamdownSource)
        blockParts.push(
          '@source "../../node_modules/streamdown/dist/index.js";'
        );
      if (!hasLibSource)
        blockParts.push(
          '@source "../../node_modules/ai-chat-bootstrap/dist/index.js";'
        );
      if (blockParts.length) {
        // Avoid duplicate blank lines.
        const insertion = [
          "/* ai-chat-bootstrap (scaffold injected) */",
          ...blockParts,
          "",
        ].join("\n");
        lines.splice(insertIdx, 0, insertion);
        const globalsUpdated = await writeFileWithConfirmation(
          globalCssPath,
          lines.join("\n")
        );
        if (globalsUpdated) {
          log("Injected ai-chat-bootstrap imports + sources into globals.css");
          cssContent = lines.join("\n");
        } else {
          cssContent = fs.readFileSync(globalCssPath, "utf8");
        }
      }
    }

    const hasSentinel = cssContent.includes(
      "/* ai-chat-bootstrap shadcn tokens (required) */"
    );
    const coreVars = [
      "--radius",
      "--background",
      "--foreground",
      "--primary",
      "--secondary",
      "--muted",
      "--accent",
      "--border",
      "--input",
      "--ring",
    ];
    const hasCoreTokens = coreVars.every((token) =>
      new RegExp(`${token}\\s*:`).test(cssContent)
    );
    if (!hasSentinel && !hasCoreTokens) {
      const tokenBlock = [
        "/* ai-chat-bootstrap shadcn tokens (required) */",
        ":root {",
        "  --radius: 0.625rem;",
        "  --background: oklch(1 0 0);",
        "  --foreground: oklch(0.145 0 0);",
        "  --card: oklch(1 0 0);",
        "  --card-foreground: oklch(0.145 0 0);",
        "  --popover: oklch(1 0 0);",
        "  --popover-foreground: oklch(0.145 0 0);",
        "  --primary: oklch(0.205 0 0);",
        "  --primary-foreground: oklch(0.985 0 0);",
        "  --secondary: oklch(0.97 0 0);",
        "  --secondary-foreground: oklch(0.205 0 0);",
        "  --muted: oklch(0.97 0 0);",
        "  --muted-foreground: oklch(0.556 0 0);",
        "  --accent: oklch(0.97 0 0);",
        "  --accent-foreground: oklch(0.205 0 0);",
        "  --destructive: oklch(0.577 0.245 27.325);",
        "  --border: oklch(0.922 0 0);",
        "  --input: oklch(0.922 0 0);",
        "  --ring: oklch(0.708 0 0);",
        "  --chart-1: oklch(0.646 0.222 41.116);",
        "  --chart-2: oklch(0.6 0.118 184.704);",
        "  --chart-3: oklch(0.398 0.07 227.392);",
        "  --chart-4: oklch(0.828 0.189 84.429);",
        "  --chart-5: oklch(0.769 0.188 70.08);",
        "  --sidebar: oklch(0.985 0 0);",
        "  --sidebar-foreground: oklch(0.145 0 0);",
        "  --sidebar-primary: oklch(0.205 0 0);",
        "  --sidebar-primary-foreground: oklch(0.985 0 0);",
        "  --sidebar-accent: oklch(0.97 0 0);",
        "  --sidebar-accent-foreground: oklch(0.205 0 0);",
        "  --sidebar-border: oklch(0.922 0 0);",
        "  --sidebar-ring: oklch(0.708 0 0);",
        "}",
        "",
        ".dark {",
        "  --background: oklch(0.145 0 0);",
        "  --foreground: oklch(0.985 0 0);",
        "  --card: oklch(0.205 0 0);",
        "  --card-foreground: oklch(0.985 0 0);",
        "  --popover: oklch(0.205 0 0);",
        "  --popover-foreground: oklch(0.985 0 0);",
        "  --primary: oklch(0.922 0 0);",
        "  --primary-foreground: oklch(0.205 0 0);",
        "  --secondary: oklch(0.269 0 0);",
        "  --secondary-foreground: oklch(0.985 0 0);",
        "  --muted: oklch(0.269 0 0);",
        "  --muted-foreground: oklch(0.708 0 0);",
        "  --accent: oklch(0.269 0 0);",
        "  --accent-foreground: oklch(0.985 0 0);",
        "  --destructive: oklch(0.704 0.191 22.216);",
        "  --border: oklch(1 0 0 / 10%);",
        "  --input: oklch(1 0 0 / 15%);",
        "  --ring: oklch(0.556 0 0);",
        "  --chart-1: oklch(0.488 0.243 264.376);",
        "  --chart-2: oklch(0.696 0.17 162.48);",
        "  --chart-3: oklch(0.769 0.188 70.08);",
        "  --chart-4: oklch(0.627 0.265 303.9);",
        "  --chart-5: oklch(0.645 0.246 16.439);",
        "  --sidebar: oklch(0.205 0 0);",
        "  --sidebar-foreground: oklch(0.985 0 0);",
        "  --sidebar-primary: oklch(0.488 0.243 264.376);",
        "  --sidebar-primary-foreground: oklch(0.985 0 0);",
        "  --sidebar-accent: oklch(0.269 0 0);",
        "  --sidebar-accent-foreground: oklch(0.985 0 0);",
        "  --sidebar-border: oklch(1 0 0 / 10%);",
        "  --sidebar-ring: oklch(0.556 0 0);",
        "}",
      ].join("\n");
      const trimmed = cssContent.trimEnd();
      const nextContent =
        (trimmed.length ? trimmed + "\n\n" : "") + tokenBlock + "\n";
      const tokensWritten = await writeFileWithConfirmation(
        globalCssPath,
        nextContent
      );
      if (tokensWritten) {
        log("Injected shadcn token palette into globals.css");
        cssContent = nextContent;
      }
    }
  } catch {
    warn("Could not modify globals.css (file not found)");
  }

  // Tailwind native preset
  if (tailwindNative) {
    log("Configuring Tailwind preset");
    const twConfigPath = "tailwind.config.ts";
    if (fs.existsSync(twConfigPath)) {
      let tw = fs.readFileSync(twConfigPath, "utf8");
      if (!tw.includes("ai-chat-bootstrap/tailwind.preset")) {
        tw = tw.replace(
          /export default \{/,
          `import preset from 'ai-chat-bootstrap/tailwind.preset';\n\nexport default {\n  presets: [preset],`
        );
        await writeFileWithConfirmation(twConfigPath, tw);
      }
    } else {
      warn("Tailwind config not found to inject preset");
    }
  }

  // Env
  const envPath = ".env.local";
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, "OPENAI_API_KEY=your-key-here\n");
  }

  // README augmentation
  log("Updating README");
  const readmePath = "README.md";
  try {
    const addition = fs.readFileSync(
      path.join(__dirname, "templates", "readme-addition.md"),
      "utf8"
    );
    let base = fs.existsSync(readmePath)
      ? fs.readFileSync(readmePath, "utf8")
      : `# ${projectName}\n`;
    if (!base.includes("AI Chat Bootstrap Enhancements")) {
      base += "\n" + addition + "\n";
      await writeFileWithConfirmation(readmePath, base);
    }
  } catch {
    warn("Could not update README");
  }

    log("Scaffold complete. Next steps:");
    const instructions = [];
    const shouldSkipCdInstruction = dir === invocationCwd;
    if (!shouldSkipCdInstruction) {
      instructions.push(`  cd ${projectName}`);
    }
    instructions.push("  npm run dev", "", "  Open http://localhost:3000/");
    console.log(`\n${instructions.join("\n")}\n`);
  } finally {
    cleanupReadline();
  }
}

module.exports = { scaffold };
