// Central export that loads individual template modules.
const chatApiRoute = require("./templates/chatApiRoute");
const suggestionsApiRoute = require("./templates/suggestionsApiRoute");
const chatPage = require("./templates/chatPage");
const homePage = require("./templates/homePage");
const readme = require("./templates/readme");

function apiRouteTemplate() {
  return chatApiRoute;
}
function suggestionsRouteTemplate() {
  return suggestionsApiRoute;
}
function chatPageTemplate(twNative) {
  return chatPage(twNative);
}
function homePageTemplate(twNative) {
  return homePage(twNative);
}
function readmeTemplate(twNative) {
  return readme(twNative);
}

module.exports = {
  apiRouteTemplate,
  suggestionsRouteTemplate,
  chatPageTemplate,
  homePageTemplate,
  readmeTemplate,
};
