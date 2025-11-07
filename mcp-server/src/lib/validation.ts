// Ajv validators for input/output schemas

import Ajv from "ajv";
import addFormats from "ajv-formats";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: true
});
addFormats(ajv);

export function validateOutput(schema: any, data: any): void {
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    const errors = validate.errors || [];
    logger.error({ errors, data }, "Output validation failed");
    throw new Error(`Output validation failed: ${ajv.errorsText(errors)}`);
  }

  logger.debug({ schemaValid: true }, "Output validation passed");
}

export function validateInput(schema: any, data: any): void {
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    const errors = validate.errors || [];
    logger.warn({ errors }, "Input validation failed");
    throw new Error(`Input validation failed: ${ajv.errorsText(errors)}`);
  }

  logger.debug({ schemaValid: true }, "Input validation passed");
}
