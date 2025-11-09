# API Contracts

This directory is reserved for API contract tests that validate the shape and structure of responses from the EvalPRD API endpoints.

## Purpose

Contract tests ensure that:
- Response schemas match expected structures
- Required fields are always present
- Field types are correct
- Backward compatibility is maintained

## Structure

Place OpenAPI/JSON Schema definitions or contract test files here:

```
contracts/
├── binary_score.contract.json
├── fix_plan.contract.json
└── agent_tasks.contract.json
```

## Golden Tests vs Contracts

- **contracts/** - Schema validation and structure tests
- **golden/** - Expected output values for specific PRD inputs
- **fixtures/** - Sample input PRDs for testing

## Future Work

Implement contract testing using:
- JSON Schema validation
- OpenAPI spec generation
- Pact or similar contract testing framework

