const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { log, error, warn } = require("./log");
// Using raw template source files (.ts / .tsx / .md) copied directly.

async function scaffold({ projectName, tailwindNative }) {
  const dir = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(dir)) {
    const existing = fs.readdirSync(dir).filter((f) => !f.startsWith("."));
    if (existing.length) {
      error(`Directory '${projectName}' already exists and is not empty.`);
      process.exit(1);
    }
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }

  log(`Scaffolding Next.js project in ${projectName} ...`);
  execSync(
    `npx --yes create-next-app@latest ${projectName} --turbopack --typescript --eslint --app --tailwind --src-dir --import-alias @/* --no-git`,
    { stdio: "inherit" }
  );

  process.chdir(dir);

  log("Installing dependencies...");
  const deps = [
    "ai-chat-bootstrap",
    "ai",
    "@ai-sdk/react",
    "@ai-sdk/openai",
    "zod",
    // Animation utilities used in scaffolded globals.css
    "tw-animate-css",
  ];
  execSync(`npm install ${deps.join(" ")}`, { stdio: "inherit" });

  // API + home page templates
  log("Copying templates (API routes + home page)");
  const tmplDir = path.join(__dirname, "templates");
  const apiChatDir = path.join("src", "app", "api", "chat");
  const apiSugDir = path.join("src", "app", "api", "suggestions");
  fs.mkdirSync(apiChatDir, { recursive: true });
  fs.mkdirSync(apiSugDir, { recursive: true });
  fs.writeFileSync(
    path.join(apiChatDir, "route.ts"),
    fs.readFileSync(path.join(tmplDir, "api-chat-route.ts"), "utf8")
  );
  fs.writeFileSync(
    path.join(apiSugDir, "route.ts"),
    fs.readFileSync(path.join(tmplDir, "api-suggestions-route.ts"), "utf8")
  );
  const homePagePath = path.join("src", "app", "page.tsx");
  fs.writeFileSync(
    homePagePath,
    fs.readFileSync(path.join(tmplDir, "home-page.tsx"), "utf8")
  );

  // Assets (logo / icon)
  try {
    const assetsDir = path.join(tmplDir, "assets");
    if (fs.existsSync(assetsDir)) {
      const publicDir = path.join("public");
      fs.mkdirSync(publicDir, { recursive: true });
      const files = fs.readdirSync(assetsDir);
      files.forEach((f) => {
        const src = path.join(assetsDir, f);
        const dest = path.join(publicDir, f);
        if (fs.statSync(src).isFile()) {
          fs.copyFileSync(src, dest);
        }
      });
      log(`Copied ${files.length} asset(s) to public/`);
    }
  } catch (e) {
    warn("Could not copy assets: " + e.message);
  }

  // Inject favicon (metadata icons) into layout.tsx
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
      fs.writeFileSync(layoutPath, layout);
      log("Injected favicon metadata (acb.png)");
    }
  } catch (e) {
    warn("Could not inject favicon metadata: " + e.message);
  }

  // Styles
  log("Injecting style imports");
  const globalCssPath = path.join("src", "app", "globals.css");
  try {
    const existing = fs.readFileSync(globalCssPath, "utf8");
    const hasTokens = existing.includes("ai-chat-bootstrap/tokens.css");
    const hasSlice = existing.includes("ai-chat-bootstrap/ai-chat.css");
    const hasStreamdownSource = existing.includes("streamdown/dist/index.js");
    const hasLibSource = existing.includes("ai-chat-bootstrap/dist/index.js");

    if (
      hasTokens &&
      (tailwindNative || hasSlice) &&
      hasStreamdownSource &&
      hasLibSource
    ) {
      // Already satisfied; do nothing.
    } else {
      // Build the ordered block we want to enforce.
      // Desired order inside globals.css:
      // 1. Existing tailwindcss / other imports (left intact)
      // 2. tw-animate (if present already)
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
        fs.writeFileSync(globalCssPath, lines.join("\n"));
        log("Injected ai-chat-bootstrap imports + sources into globals.css");
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
        fs.writeFileSync(twConfigPath, tw);
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
      fs.writeFileSync(readmePath, base);
    }
  } catch {
    warn("Could not update README");
  }

  log("Scaffold complete. Next steps:");
  console.log(
    `\n  cd ${projectName}\n  npm run dev\n\n  Open http://localhost:3000/\n`
  );
}

module.exports = { scaffold };
