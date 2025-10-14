const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const ajv = new Ajv({ allErrors: true, removeAdditional: "all" });
addFormats(ajv);

function validateSchema(schema) {
  const validate = ajv.compile(schema);
  return (req, res, next) => {
    const valid = validate(req.body);
    if (!valid) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: validate.errors.map(e => ({
            field: e.instancePath || e.params.missingProperty,
            message: e.message
          }))
        }
      });
    }
    next();
  };
}

module.exports = validateSchema;
