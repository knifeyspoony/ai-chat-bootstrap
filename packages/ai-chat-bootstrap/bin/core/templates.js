// Central export that loads individual template modules.
const chatApiRoute = require("./templates/chatApiRoute");
const suggestionsApiRoute = require("./templates/suggestionsApiRoute");
const chatPage = require("./templates/chatPage");

function apiRouteTemplate() {
  return chatApiRoute;
}
function suggestionsRouteTemplate() {
  return suggestionsApiRoute;
}
function chatPageTemplate(twNative) {
  return chatPage(twNative);
}

module.exports = {
  apiRouteTemplate,
  suggestionsRouteTemplate,
  chatPageTemplate,
};
