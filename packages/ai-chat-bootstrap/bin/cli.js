#!/usr/bin/env node
/* ai-chat-bootstrap CLI entry */
const { scaffold } = require("./core/scaffold");
const { error } = require("./core/log");

const args = process.argv.slice(2);
const cmd = args[0];

function printHelp() {
  console.log(
    `ai-chat-bootstrap CLI\n\nUsage:\n  npx ai-chat-bootstrap init [project-name] [--tailwind-native]\n\nCommands:\n  init   Scaffold a Next.js project with chat + suggestions + API routes\n\nOptions:\n  --tailwind-native  Use Tailwind preset instead of precompiled ai-chat.css\n  -h, --help         Show help\n`
  );
}

async function main() {
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    printHelp();
    return;
  }
  if (cmd !== "init") {
    error(`Unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
  }
  const projectName = args[1] || "ai-chat-app";
  const tailwindNative = args.includes("--tailwind-native");
  await scaffold({ projectName, tailwindNative });
}

main().catch((e) => {
  error(e.stack || e.message);
  process.exit(1);
});
