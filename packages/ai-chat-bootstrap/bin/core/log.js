const cyan = "\x1b[36m";
const red = "\x1b[31m";
const reset = "\x1b[0m";

function log(msg) {
  console.log(`${cyan}[ai-chat-bootstrap]${reset} ${msg}`);
}
function warn(msg) {
  console.warn(`${cyan}[ai-chat-bootstrap][warn]${reset} ${msg}`);
}
function error(msg) {
  console.error(`${red}Error:${reset} ${msg}`);
}
module.exports = { log, warn, error };
