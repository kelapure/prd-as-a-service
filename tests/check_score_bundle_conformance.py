#!/usr/bin/env python3
"""Prove the hosted PRD Score bundle matches its canonical source commit."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "judge-runtime"))

from app.bundle import SCORE_BUNDLE, SCORE_TOOLS  # noqa: E402


SCORE_BUNDLE_PATH = ROOT / "judge-runtime" / "bundle" / "prd-score-runtime.json"


def _criterion(identifier: str, score: int) -> dict:
    return {
        "id": identifier,
        "score": score,
        "anchor": f"{score}: calibrated anchor",
        "evidence": [
            {
                "status": "used",
                "source": "conformance.md",
                "quote": "Claims reviewers need a measured handling-time baseline.",
                "locator": "Problem",
            }
        ],
        "fix": "" if score >= 4 else f"Raise {identifier} one level.",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--canonical-root", required=True, type=Path)
    args = parser.parse_args()
    canonical = args.canonical_root.resolve()
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=canonical, text=True
    ).strip()
    if commit != SCORE_BUNDLE.source_commit:
        raise SystemExit(
            f"source commit mismatch: bundle={SCORE_BUNDLE.source_commit} canonical={commit}"
        )
    exporter = canonical / "scripts" / "export_runtime_bundle.py"
    if not exporter.is_file():
        raise SystemExit(f"canonical exporter not found: {exporter}")
    with tempfile.TemporaryDirectory() as temporary:
        expected_path = Path(temporary) / "prd-score-runtime.json"
        subprocess.check_call(
            [sys.executable, str(exporter), "--output", str(expected_path)],
            cwd=canonical,
        )
        expected = json.loads(expected_path.read_text(encoding="utf-8"))
    bundled = json.loads(SCORE_BUNDLE_PATH.read_text(encoding="utf-8"))
    if expected != bundled:
        raise SystemExit(
            "bundled PRD Score runtime differs from the canonical exporter output"
        )
    fixture = (
        "# Product requirements document\n\n"
        "Claims reviewers need a measured handling-time baseline.\n"
    )
    raw = {
        "instrument": "prd-score",
        "mode": "absolute",
        "rubric_version": "v2.1-core + writing-layer-2026-07-06",
        "validation_status": (
            "rubric core calibrated n=5 (2026-05); writing layer UNVALIDATED"
        ),
        "artifact": "conformance.md",
        "artifact_gate": {
            "pass": True,
            "reason": "Complete fixture.",
            "incumbent_replacement": False,
            "ecosystem_diagrams_present": False,
            "model_room_requested": False,
            "model_room_present": False,
            "commercial_value_over_1m": False,
            "pricing_decomposition_present": False,
        },
        "layer1": [_criterion(f"C{number}", 3) for number in range(1, 12)],
        "layer2": [_criterion(f"M{number}", 3) for number in range(1, 10)],
        "layer3": {"in_scope": False, "scores": []},
        "integration_context": {"customer_named_missing_system": False},
        "writing_layer": [
            _criterion(f"W{number}", 3) for number in range(1, 5)
        ],
        "anchor_placement": "Between the portfolio anchors.",
    }
    finalized = SCORE_TOOLS.finalize(raw, fixture)
    validation = SCORE_TOOLS.validate(finalized, fixture, fixture)
    if not validation.get("ok"):
        raise SystemExit(
            "canonical PRD Score validator rejected the fixed fixture: "
            + str(validation)
        )
    if finalized["totals"]["final"] != 65:
        raise SystemExit("canonical PRD Score calculation changed for the fixture")
    print(
        f"PRD Score bundle conforms to canonical commit {commit} "
        f"({len(SCORE_BUNDLE.files)} files)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
