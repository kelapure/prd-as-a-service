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

export function validateOutput(schema: any, data: any, requestId?: string): void {
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    const errors = validate.errors || [];
    
    // Truncate data if too large for logging
    let dataPreview: any;
    try {
      const dataStr = JSON.stringify(data);
      if (dataStr.length > 10000) {
        dataPreview = JSON.parse(dataStr.substring(0, 10000) + `... (truncated, total length: ${dataStr.length})`);
      } else {
        dataPreview = data;
      }
    } catch {
      dataPreview = "[Unable to serialize data]";
    }

    logger.error({
      requestId,
      errors: errors.map((err: any) => ({
        instancePath: err.instancePath,
        schemaPath: err.schemaPath,
        keyword: err.keyword,
        params: err.params,
        message: err.message
      })),
      errorText: ajv.errorsText(errors),
      dataPreview,
      dataSize: JSON.stringify(data).length
    }, "Output validation failed");
    
    throw new Error(`Output validation failed: ${ajv.errorsText(errors)}`);
  }

  logger.debug({ requestId, schemaValid: true }, "Output validation passed");
}

export function validateInput(schema: any, data: any, requestId?: string): void {
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    const errors = validate.errors || [];
    
    // Truncate data if too large for logging
    let dataPreview: any;
    try {
      const dataStr = JSON.stringify(data);
      if (dataStr.length > 10000) {
        dataPreview = JSON.parse(dataStr.substring(0, 10000) + `... (truncated, total length: ${dataStr.length})`);
      } else {
        dataPreview = data;
      }
    } catch {
      dataPreview = "[Unable to serialize data]";
    }

    logger.warn({
      requestId,
      errors: errors.map((err: any) => ({
        instancePath: err.instancePath,
        schemaPath: err.schemaPath,
        keyword: err.keyword,
        params: err.params,
        message: err.message
      })),
      errorText: ajv.errorsText(errors),
      dataPreview,
      dataSize: JSON.stringify(data).length
    }, "Input validation failed");
    
    throw new Error(`Input validation failed: ${ajv.errorsText(errors)}`);
  }

  logger.debug({ requestId, schemaValid: true }, "Input validation passed");
}
