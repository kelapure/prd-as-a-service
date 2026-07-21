from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


Verdict = Literal[
    "GO",
    "REVISE",
    "HOLD",
    "WRONG_ARTIFACT",
    "DISQUALIFY_UNTIL_ARCHITECTURE_AUDIT",
]


class Evidence(BaseModel):
    model_config = ConfigDict(extra="allow")
    source: str
    status: Literal["used", "missing", "conflicting", "assumption", "summary"]
    quote: str
    locator: str | None = None


class Finding(BaseModel):
    model_config = ConfigDict(extra="allow")
    severity: Literal["P0", "P1", "P2"]
    title: str
    acknowledged: bool = False
    gate: str = ""
    impact: str
    required_fix: str
    evidence: list[Evidence] = Field(min_length=1)


class EvidenceLedgerRow(BaseModel):
    source: str
    status: Literal["used", "missing", "conflicting", "assumption"]
    notes: str


class JudgeReport(BaseModel):
    model_config = ConfigDict(extra="allow")
    artifact_type: Literal[
        "full-prd",
        "prd-lite",
        "mini-prd",
        "rfp-rfi-response",
        "sales-artifact",
        "architecture-audit",
        "unknown",
    ]
    classification_override: str = ""
    summary: str
    findings: list[Finding]
    evidence_ledger: list[EvidenceLedgerRow] = Field(min_length=1)
    gates_fired: list[str]
    style_flags: list[str]
    required_next_actions: list[str]
    confidence: Literal["high", "medium", "low"]
    verdict: Verdict


class RubricEvidence(BaseModel):
    status: Literal["used", "missing"]
    quote: str
    locator: str | None = None


class RubricCriterion(BaseModel):
    id: str
    name: str
    status: Literal["pass", "fail"]
    rationale: str
    structural_deferral: bool = False
    evidence: list[RubricEvidence] = Field(min_length=1)


class RubricDiagnostic(BaseModel):
    version: Literal["prd-eval-rubric-v2"] = "prd-eval-rubric-v2"
    criteria: list[RubricCriterion]
    pass_count: int = Field(ge=0, le=12)
    fail_count: int = Field(ge=0, le=12)

    @model_validator(mode="after")
    def validate_criteria(self) -> "RubricDiagnostic":
        ids = [row.id for row in self.criteria]
        expected = [f"C{number}" for number in range(1, 13)]
        if ids != expected:
            raise ValueError(f"criteria must appear exactly once in C1-C12 order; got {ids}")
        passed = sum(row.status == "pass" for row in self.criteria)
        if self.pass_count != passed or self.fail_count != 12 - passed:
            raise ValueError("rubric pass/fail counts do not match the criteria")
        return self


class ReadinessScore(BaseModel):
    value: int = Field(ge=0, le=10)
    out_of: Literal[10] = 10
    derivation_version: str
    band: Verdict
    inputs: dict[str, int]


class JudgeEnvelope(BaseModel):
    schema_version: Literal["evalgpt-prd-judge/v1"] = "evalgpt-prd-judge/v1"
    public_beta: Literal[True] = True
    run: dict[str, Any]
    versions: dict[str, str]
    input: dict[str, Any]
    artifact_profile: dict[str, Any]
    report: JudgeReport
    readiness_score: ReadinessScore
    rubric: RubricDiagnostic
    validation: dict[str, Any]
