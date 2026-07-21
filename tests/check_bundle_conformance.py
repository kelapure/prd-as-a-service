#!/usr/bin/env python3
"""Prove the hosted bundle is byte- and behavior-equivalent to a canonical judge commit."""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "judge-runtime"))

from app.bundle import BUNDLE, TOOLS  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--canonical-root", required=True, type=Path)
    args = parser.parse_args()
    canonical = args.canonical_root.resolve()
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=canonical, text=True).strip()
    if commit != BUNDLE.source_commit:
        raise SystemExit(f"source commit mismatch: bundle={BUNDLE.source_commit} canonical={commit}")

    for relative, bundled in BUNDLE.files.items():
        source = (canonical / relative).read_text(encoding="utf-8")
        if source != bundled:
            source_hash = hashlib.sha256(source.encode()).hexdigest()
            bundle_hash = hashlib.sha256(bundled.encode()).hexdigest()
            raise SystemExit(f"content mismatch {relative}: bundle={bundle_hash} canonical={source_hash}")

    fixture = """# Product requirements document

## Problem
Claims reviewers need a measured handling-time baseline and a controlled exception path.

## Requirement
Record each manual override with an owner and decision timestamp.
"""
    preflight = TOOLS.preflight(fixture, "conformance.md")
    if not isinstance(preflight.get("artifact_type"), str):
        raise SystemExit("canonical preflight did not return an artifact type")
    report = {
        "artifact_type": "full-prd",
        "classification_override": "",
        "summary": "The workflow is credible but has one unowned execution gap.",
        "findings": [{
            "severity": "P1",
            "title": "The outcome threshold is not defined",
            "acknowledged": False,
            "gate": "customer_value_or_roi_gap",
            "impact": "The team cannot make a scale or stop decision.",
            "required_fix": "Add a baseline, target, time window, and scale or stop threshold.",
            "evidence": [{"source": "conformance.md", "status": "missing", "quote": "No outcome threshold was found.", "locator": "Whole artifact"}],
        }],
        "evidence_ledger": [{"source": "conformance.md", "status": "used", "notes": "Primary artifact"}],
        "gates_fired": ["customer_value_or_roi_gap"],
        "style_flags": [],
        "required_next_actions": ["Define the outcome threshold."],
        "confidence": "high",
        "verdict": "REVISE",
    }
    validation = TOOLS.validate(report, fixture)
    if not validation.get("ok"):
        raise SystemExit("canonical validator rejected the fixed conformance fixture: " + json.dumps(validation))
    score = TOOLS.score(report)
    if score.get("score") != 6 or score.get("band") != "REVISE":
        raise SystemExit("canonical score projection changed for the fixed conformance fixture")
    print(f"Bundle conforms to canonical commit {commit} ({len(BUNDLE.files)} files).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
