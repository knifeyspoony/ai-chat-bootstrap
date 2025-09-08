const preset = require("./dist/tailwind.preset.mjs").default;

module.exports = {
  presets: [preset],
  corePlugins: { preflight: false },
  content: ["./lib/**/*.{ts,tsx,js,jsx}"],
  safelist: [],
  theme: { extend: {} },
  plugins: [],
};
