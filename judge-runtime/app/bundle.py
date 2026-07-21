from __future__ import annotations

import hashlib
import json
import types
from dataclasses import dataclass
from pathlib import Path
from typing import Any


BUNDLE_PATH = Path(__file__).resolve().parents[1] / "bundle" / "prd-judge-runtime.json"
RUBRIC_PATH = Path(__file__).resolve().parents[1] / "bundle" / "prd-eval-rubric-v2.md"


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


@dataclass(frozen=True)
class RuntimeBundle:
    schema_version: str
    judge_version: str
    source_commit: str
    manifest_sha256: str
    files: dict[str, str]

    def text(self, path: str) -> str:
        try:
            return self.files[path]
        except KeyError as exc:
            raise RuntimeError(f"runtime bundle is missing required file {path}") from exc


def load_bundle(path: Path = BUNDLE_PATH) -> RuntimeBundle:
    raw = json.loads(path.read_text(encoding="utf-8"))
    entries = raw.get("files")
    if raw.get("schema_version") != "prd-judge-runtime-bundle/v1" or not isinstance(entries, list):
        raise RuntimeError("unsupported or malformed PRD Judge runtime bundle")

    files: dict[str, str] = {}
    manifest_rows: list[dict[str, str]] = []
    for entry in entries:
        relative = entry["path"]
        content = entry["content"]
        digest = _sha256(content.encode("utf-8"))
        if digest != entry["sha256"]:
            raise RuntimeError(f"runtime bundle integrity check failed for {relative}")
        files[relative] = content
        manifest_rows.append({"path": relative, "sha256": digest})

    material = json.dumps(
        manifest_rows, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    manifest_digest = _sha256(material)
    if manifest_digest != raw.get("manifest_sha256"):
        raise RuntimeError("runtime bundle manifest integrity check failed")

    return RuntimeBundle(
        schema_version=raw["schema_version"],
        judge_version=raw["judge_version"],
        source_commit=raw["source_commit"],
        manifest_sha256=manifest_digest,
        files=files,
    )


class CanonicalTools:
    """Execute only integrity-checked canonical deterministic modules in memory."""

    def __init__(self, bundle: RuntimeBundle) -> None:
        self._preflight = self._load_module(
            "bundled_prd_preflight", bundle.text("scripts/prd_preflight.py")
        )
        self._validator = self._load_module(
            "bundled_validate_report", bundle.text("scripts/validate_report.py")
        )
        self._scorer = self._load_module(
            "bundled_score_report", bundle.text("scripts/score_report.py")
        )

    @staticmethod
    def _load_module(name: str, source: str) -> types.ModuleType:
        module = types.ModuleType(name)
        module.__file__ = f"<{name}>"
        exec(compile(source, module.__file__, "exec"), module.__dict__)
        return module

    def preflight(self, text: str, source: str) -> dict[str, Any]:
        return self._preflight.analyze(text, source, intent=None)

    def validate(self, report: dict[str, Any], reference_text: str) -> dict[str, Any]:
        return self._validator.validate(report, reference_text=reference_text)

    def score(self, report: dict[str, Any]) -> dict[str, Any]:
        return self._scorer.score_report(report)


BUNDLE = load_bundle()
TOOLS = CanonicalTools(BUNDLE)
RUBRIC_V2 = RUBRIC_PATH.read_text(encoding="utf-8")
RUBRIC_SHA256 = _sha256(RUBRIC_V2.encode("utf-8"))
