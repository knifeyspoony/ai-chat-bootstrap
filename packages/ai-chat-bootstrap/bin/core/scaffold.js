const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { log, error, warn } = require("./log");
const {
  apiRouteTemplate,
  suggestionsRouteTemplate,
  chatPageTemplate,
} = require("./templates");

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
  ];
  execSync(`npm install ${deps.join(" ")}`, { stdio: "inherit" });

  // API routes
  log("Creating API routes");
  const apiChatDir = path.join("src", "app", "api", "chat");
  const apiSugDir = path.join("src", "app", "api", "suggestions");
  fs.mkdirSync(apiChatDir, { recursive: true });
  fs.mkdirSync(apiSugDir, { recursive: true });
  fs.writeFileSync(path.join(apiChatDir, "route.ts"), apiRouteTemplate());
  fs.writeFileSync(
    path.join(apiSugDir, "route.ts"),
    suggestionsRouteTemplate()
  );

  // Page
  log("Adding chat page");
  const chatPageDir = path.join("src", "app", "chat");
  fs.mkdirSync(chatPageDir, { recursive: true });
  fs.writeFileSync(
    path.join(chatPageDir, "page.tsx"),
    chatPageTemplate(tailwindNative)
  );

  // Styles
  log("Injecting style imports");
  const globalCssPath = path.join("src", "app", "globals.css");
  try {
    const existing = fs.readFileSync(globalCssPath, "utf8");
    if (!existing.includes("ai-chat-bootstrap/tokens.css")) {
      const extra = `\n/* ai-chat-bootstrap */\n@import "ai-chat-bootstrap/tokens.css";\n${
        tailwindNative ? "" : '@import "ai-chat-bootstrap/ai-chat.css";\n'
      }`;
      fs.writeFileSync(globalCssPath, existing + extra);
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

  log("Scaffold complete. Next steps:");
  console.log(
    `\n  cd ${projectName}\n  npm run dev\n\n  Open http://localhost:3000/chat\n`
  );
}

module.exports = { scaffold };
