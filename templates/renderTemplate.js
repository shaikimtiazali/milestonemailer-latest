const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");

function renderTemplate(templateName, data) {
  const filePath = path.join(__dirname, `${templateName}.hbs`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Template not found: ${filePath}`);
  }

  const source = fs.readFileSync(filePath, "utf-8");
  const template = handlebars.compile(source);

  return template(data);
}

module.exports = renderTemplate;
