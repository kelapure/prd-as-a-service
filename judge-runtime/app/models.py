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


class ScoreEvidence(BaseModel):
    status: Literal["used", "missing"]
    source: str
    quote: str
    locator: str | None = None


class ScoreCriterion(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    score: int = Field(ge=0, le=5)
    adjusted_score: int | None = Field(default=None, ge=0, le=5)
    anchor: str
    evidence: list[ScoreEvidence] = Field(min_length=1)
    fix: str

    @model_validator(mode="after")
    def require_fix_below_four(self) -> "ScoreCriterion":
        if self.score < 4 and not self.fix.strip():
            raise ValueError("fix is required for every score below 4")
        if not self.anchor.strip().startswith(f"{self.score}:"):
            raise ValueError("anchor must quote the matched numeric anchor row")
        return self


class ScoreArtifactGate(BaseModel):
    passed: bool = Field(alias="pass")
    reason: str
    incumbent_replacement: bool
    ecosystem_diagrams_present: bool
    model_room_requested: bool
    model_room_present: bool
    commercial_value_over_1m: bool
    pricing_decomposition_present: bool

    model_config = ConfigDict(populate_by_name=True)


class ScoreLayer3(BaseModel):
    in_scope: bool
    scores: list[ScoreCriterion]


class RawPrdScoreReport(BaseModel):
    model_config = ConfigDict(extra="allow")
    instrument: Literal["prd-score"] = "prd-score"
    mode: Literal["absolute"] = "absolute"
    rubric_version: str
    validation_status: str
    artifact: str
    artifact_gate: ScoreArtifactGate
    layer1: list[ScoreCriterion]
    layer2: list[ScoreCriterion]
    layer3: ScoreLayer3
    integration_context: dict[str, bool]
    writing_layer: list[ScoreCriterion]
    anchor_placement: str

    @model_validator(mode="after")
    def validate_criterion_sets(self) -> "RawPrdScoreReport":
        if not self.artifact_gate.passed:
            if self.layer1 or self.layer2 or self.layer3.scores or self.writing_layer:
                raise ValueError("a failed artifact gate cannot emit partial scores")
            return self
        expected = {
            "layer1": [f"C{number}" for number in range(1, 12)],
            "layer2": [f"M{number}" for number in range(1, 10)],
            "writing_layer": [f"W{number}" for number in range(1, 5)],
        }
        for field, identifiers in expected.items():
            actual = [row.id for row in getattr(self, field)]
            if actual != identifiers:
                raise ValueError(f"{field} must contain {identifiers} in order")
        expected_layer3 = (
            [f"P{number}" for number in range(1, 4)]
            if self.layer3.in_scope
            else []
        )
        if [row.id for row in self.layer3.scores] != expected_layer3:
            raise ValueError("layer3 scores do not match layer3.in_scope")
        return self


class PrdScoreReport(RawPrdScoreReport):
    status: Literal["scored", "not_scored"]
    calculation_version: str
    length_normalization: dict[str, Any]
    hard_caps: list[dict[str, Any]]
    integration_subscore: dict[str, Any] | None
    totals: dict[str, Any] | None
    lowest_three: list[str]
    fix_plan_ranked: list[str]


class PrdScoreDiagnostic(BaseModel):
    status: Literal["complete", "not_scored", "unavailable"]
    report: PrdScoreReport | None
    validation: dict[str, Any]


class JudgeEnvelope(BaseModel):
    schema_version: Literal["evalgpt-prd-judge/v2"] = "evalgpt-prd-judge/v2"
    public_beta: Literal[True] = True
    run: dict[str, Any]
    versions: dict[str, str]
    input: dict[str, Any]
    artifact_profile: dict[str, Any]
    report: JudgeReport
    readiness_score: ReadinessScore
    rubric: RubricDiagnostic
    prd_score: PrdScoreDiagnostic
    validation: dict[str, Any]
