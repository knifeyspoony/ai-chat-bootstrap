#!/usr/bin/env node
/* ai-chat-bootstrap CLI entry */
const { scaffold } = require("./core/scaffold");
const { error } = require("./core/log");

const args = process.argv.slice(2);
const cmd = args[0];

// Simple flag parsing (very small surface; avoid extra deps)
function getFlagValue(flagNames) {
  for (let i = 0; i < args.length; i++) {
    if (flagNames.includes(args[i])) {
      // support --flag=value syntax
      const eq = args[i].indexOf("=");
      if (eq !== -1) return args[i].slice(eq + 1) || undefined;
      return args[i + 1] && !args[i + 1].startsWith("-") ? args[i + 1] : true;
    }
  }
  return undefined;
}


const localFlagValue = getFlagValue(["--local", "--local-path"]);
let localPath;
let localPathError;

if (typeof localFlagValue === "string") {
  localPath = localFlagValue;
} else if (localFlagValue === true) {
  if (process.env.AI_CHAT_BOOTSTRAP_LOCAL) {
    localPath = process.env.AI_CHAT_BOOTSTRAP_LOCAL;
  } else {
    localPathError =
      "--local flag requires a path (or set AI_CHAT_BOOTSTRAP_LOCAL).";
  }
} else if (process.env.AI_CHAT_BOOTSTRAP_LOCAL) {
  localPath = process.env.AI_CHAT_BOOTSTRAP_LOCAL;
}

function printHelp() {
  console.log(
    `ai-chat-bootstrap CLI\n\nUsage:\n  npx ai-chat-bootstrap init [project-name] [--tailwind-native] [--local [/abs/path]]\n\nCommands:\n  init   Scaffold a Next.js project with chat + suggestions + API routes\n\nOptions:\n  --tailwind-native   Use Tailwind preset instead of precompiled ai-chat.css\n  --local [path]      Install from a local ai-chat-bootstrap package directory (dev testing). If no path provided, uses AI_CHAT_BOOTSTRAP_LOCAL env var.\n  -h, --help          Show help\n`
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
  if (localPathError) {
    error(localPathError);
    process.exit(1);
  }
  await scaffold({ projectName, tailwindNative, localPath });
}

main().catch((e) => {
  error(e.stack || e.message);
  process.exit(1);
});
