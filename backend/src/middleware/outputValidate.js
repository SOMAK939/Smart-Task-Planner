const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { planResponseSchema } = require("../utils/schemas");

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(planResponseSchema);

function validateOutput(data) {
  const valid = validate(data);
  if (!valid) {
    console.error("⚠️ Response validation failed:", validate.errors);
    throw new Error("Response does not match schema");
  }
  return true;
}

module.exports = validateOutput;
