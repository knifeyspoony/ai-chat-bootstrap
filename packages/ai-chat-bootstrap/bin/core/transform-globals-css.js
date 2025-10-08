const postcss = require("postcss");

const COMMENT_TEXT = "ai-chat-bootstrap (scaffold injected)";

const REQUIRED_IMPORTS = [
  { name: "import", params: '"tw-animate-css"' },
  { name: "import", params: '"ai-chat-bootstrap/tokens.css"' },
];

const REQUIRED_ZERO_CONFIG_IMPORT = {
  name: "import",
  params: '"ai-chat-bootstrap/ai-chat.css"',
};

const REQUIRED_SOURCES = [
  {
    name: "source",
    params: '"../../node_modules/streamdown/dist/index.js"',
  },
  {
    name: "source",
    params: '"../../node_modules/ai-chat-bootstrap/dist/index.js"',
  },
];

const CORE_TOKEN_PROPS = [
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

const DEFAULT_TOKENS = {
  ":root": {
    "--radius": "1.25rem",
    "--background": "hsl(20 5.8824% 90%)",
    "--foreground": "hsl(217.2414 32.5843% 17.451%)",
    "--card": "hsl(60 4.7619% 95.8824%)",
    "--card-foreground": "hsl(217.2414 32.5843% 17.451%)",
    "--popover": "hsl(60 4.7619% 95.8824%)",
    "--popover-foreground": "hsl(217.2414 32.5843% 17.451%)",
    "--primary": "hsl(238.7324 83.5294% 66.6667%)",
    "--primary-foreground": "hsl(0 0% 100%)",
    "--secondary": "hsl(24 5.7471% 82.9412%)",
    "--secondary-foreground": "hsl(215 13.7931% 34.1176%)",
    "--muted": "hsl(20 5.8824% 90%)",
    "--muted-foreground": "hsl(220 8.9362% 46.0784%)",
    "--accent": "hsl(292.5 44.4444% 92.9412%)",
    "--accent-foreground": "hsl(216.9231 19.1176% 26.6667%)",
    "--destructive": "hsl(0 84.2365% 60.1961%)",
    "--destructive-foreground": "hsl(0 0% 100%)",
    "--border": "hsl(24 5.7471% 82.9412%)",
    "--input": "hsl(24 5.7471% 82.9412%)",
    "--ring": "hsl(238.7324 83.5294% 66.6667%)",
    "--chart-1": "hsl(238.7324 83.5294% 66.6667%)",
    "--chart-2": "hsl(243.3962 75.3555% 58.6275%)",
    "--chart-3": "hsl(244.5205 57.9365% 50.5882%)",
    "--chart-4": "hsl(243.6522 54.5024% 41.3725%)",
    "--chart-5": "hsl(242.1687 47.4286% 34.3137%)",
    "--sidebar": "hsl(24 5.7471% 82.9412%)",
    "--sidebar-foreground": "hsl(217.2414 32.5843% 17.451%)",
    "--sidebar-primary": "hsl(238.7324 83.5294% 66.6667%)",
    "--sidebar-primary-foreground": "hsl(0 0% 100%)",
    "--sidebar-accent": "hsl(292.5 44.4444% 92.9412%)",
    "--sidebar-accent-foreground": "hsl(216.9231 19.1176% 26.6667%)",
    "--sidebar-border": "hsl(24 5.7471% 82.9412%)",
    "--sidebar-ring": "hsl(238.7324 83.5294% 66.6667%)",
  },
  ".dark": {
    "--background": "hsl(30 11.1111% 10.5882%)",
    "--foreground": "hsl(214.2857 31.8182% 91.3725%)",
    "--card": "hsl(25.7143 8.642% 15.8824%)",
    "--card-foreground": "hsl(214.2857 31.8182% 91.3725%)",
    "--popover": "hsl(25.7143 8.642% 15.8824%)",
    "--popover-foreground": "hsl(214.2857 31.8182% 91.3725%)",
    "--primary": "hsl(234.4538 89.4737% 73.9216%)",
    "--primary-foreground": "hsl(30 11.1111% 10.5882%)",
    "--secondary": "hsl(25.7143 6.422% 21.3725%)",
    "--secondary-foreground": "hsl(216 12.1951% 83.9216%)",
    "--muted": "hsl(25.7143 8.642% 15.8824%)",
    "--muted-foreground": "hsl(217.8947 10.6145% 64.902%)",
    "--accent": "hsl(25.7143 5.1095% 26.8627%)",
    "--accent-foreground": "hsl(216 12.1951% 83.9216%)",
    "--destructive": "hsl(0 84.2365% 60.1961%)",
    "--destructive-foreground": "hsl(30 11.1111% 10.5882%)",
    "--border": "hsl(25.7143 6.422% 21.3725%)",
    "--input": "hsl(25.7143 6.422% 21.3725%)",
    "--ring": "hsl(234.4538 89.4737% 73.9216%)",
    "--chart-1": "hsl(234.4538 89.4737% 73.9216%)",
    "--chart-2": "hsl(238.7324 83.5294% 66.6667%)",
    "--chart-3": "hsl(243.3962 75.3555% 58.6275%)",
    "--chart-4": "hsl(244.5205 57.9365% 50.5882%)",
    "--chart-5": "hsl(243.6522 54.5024% 41.3725%)",
    "--sidebar": "hsl(25.7143 6.422% 21.3725%)",
    "--sidebar-foreground": "hsl(214.2857 31.8182% 91.3725%)",
    "--sidebar-primary": "hsl(234.4538 89.4737% 73.9216%)",
    "--sidebar-primary-foreground": "hsl(30 11.1111% 10.5882%)",
    "--sidebar-accent": "hsl(25.7143 5.1095% 26.8627%)",
    "--sidebar-accent-foreground": "hsl(216 12.1951% 83.9216%)",
    "--sidebar-border": "hsl(25.7143 6.422% 21.3725%)",
    "--sidebar-ring": "hsl(234.4538 89.4737% 73.9216%)",
  },
};

function normalizeParams(params) {
  return params.replace(/^['"]|['"]$/g, "").trim();
}

function findLastIndex(nodes, predicate) {
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    if (predicate(nodes[i])) return i;
  }
  return -1;
}

function ensureAtRules(root, specs, { tailwindNative }) {
  const nodes = root.nodes || [];
  const toInsert = [];

  const normalizedExisting = new Set(
    nodes
      .filter((node) => node.type === "atrule")
      .map((node) => `${node.name}::${normalizeParams(node.params)}`)
  );

  for (const spec of specs) {
    const key = `${spec.name}::${normalizeParams(spec.params)}`;
    if (!normalizedExisting.has(key)) {
      toInsert.push(spec);
    }
  }

  if (!tailwindNative) {
    const zeroConfigKey = `${REQUIRED_ZERO_CONFIG_IMPORT.name}::${normalizeParams(REQUIRED_ZERO_CONFIG_IMPORT.params)}`;
    if (!normalizedExisting.has(zeroConfigKey)) {
      toInsert.push(REQUIRED_ZERO_CONFIG_IMPORT);
    }
  }

  for (const source of REQUIRED_SOURCES) {
    const key = `${source.name}::${normalizeParams(source.params)}`;
    if (!normalizedExisting.has(key)) {
      toInsert.push(source);
    }
  }

  if (!toInsert.length) return;

  let insertionIndex = findLastIndex(
    nodes,
    (node) =>
      node.type === "atrule" &&
      (node.name === "import" || node.name === "source")
  );
  let referenceNode = insertionIndex >= 0 ? nodes[insertionIndex] : null;

  let commentNode =
    nodes.find(
      (node) => node.type === "comment" && node.text === COMMENT_TEXT
    ) ?? null;

  if (!commentNode) {
    commentNode = postcss.comment({ text: COMMENT_TEXT });
    commentNode.raws.before = referenceNode ? "\n" : "";
    commentNode.raws.after = "\n";
    if (referenceNode) {
      root.insertAfter(referenceNode, commentNode);
    } else if (nodes.length) {
      root.insertBefore(nodes[0], commentNode);
    } else {
      root.append(commentNode);
    }
    referenceNode = commentNode;
  } else if (!referenceNode) {
    referenceNode = commentNode;
  }

  for (const spec of toInsert) {
    const atRule = postcss.atRule({ name: spec.name, params: spec.params });
    atRule.raws.before = "\n";
    atRule.raws.after = "\n";
    if (referenceNode) {
      root.insertAfter(referenceNode, atRule);
    } else if (nodes.length) {
      root.insertBefore(nodes[0], atRule);
    } else {
      root.append(atRule);
    }
    referenceNode = atRule;
  }
}

function hasCoreTokens(root) {
  const seen = new Set();
  root.walkDecls((decl) => {
    if (CORE_TOKEN_PROPS.includes(decl.prop)) {
      seen.add(decl.prop);
    }
  });
  return CORE_TOKEN_PROPS.every((prop) => seen.has(prop));
}

function injectDefaultTokens(root) {
  for (const [selector, vars] of Object.entries(DEFAULT_TOKENS)) {
    let rule =
      root.nodes?.find(
        (node) => node.type === "rule" && node.selector === selector
      ) ?? null;
    const created = !rule;
    if (!rule) {
      rule = postcss.rule({ selector });
      rule.raws.before = root.nodes?.length ? "\n\n" : "\n";
      rule.raws.between = " ";
      rule.raws.after = "\n";
      rule.raws.semicolon = true;
    }

    let appended = false;
    for (const [prop, value] of Object.entries(vars)) {
      const existing = rule.nodes?.find(
        (node) => node.type === "decl" && node.prop === prop
      );
      if (!existing) {
        const decl = postcss.decl({ prop, value });
        decl.raws.before = rule.nodes?.length ? "\n  " : "\n  ";
        decl.raws.between = ": ";
        decl.raws.semicolon = true;
        rule.append(decl);
        appended = true;
      }
    }

    if (created) {
      if (appended) {
        root.append(rule);
      }
    } else if (appended) {
      rule.raws.semicolon = true;
    }
  }
}

function transformGlobalsCss(input, { tailwindNative = false } = {}) {
  const root = postcss.parse(input);

  ensureAtRules(root, REQUIRED_IMPORTS, { tailwindNative });

  if (!hasCoreTokens(root)) {
    injectDefaultTokens(root);
  }

  const result = root.toResult({ map: false }).css;
  return result.endsWith("\n") ? result : `${result}\n`;
}

module.exports = { transformGlobalsCss };
