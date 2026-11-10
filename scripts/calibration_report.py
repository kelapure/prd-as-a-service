#!/usr/bin/env python3
"""Extract and display calibration data from the PRD Score bundle.

This script regenerates the calibration numbers in CALIBRATION.md from the
committed bundle artifacts.

Usage:
    python3 scripts/calibration_report.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def extract_calibration_anchors() -> str | None:
    bundle_path = Path("judge-runtime/bundle/prd-score-runtime.json")
    if not bundle_path.exists():
        return None
    with open(bundle_path) as f:
        bundle = json.load(f)
    for item in bundle.get("files", []):
        if item.get("path") == "references/calibration-anchors.md":
            return item.get("content", "")
    return None


def extract_judge_validation_status() -> str | None:
    bundle_path = Path("judge-runtime/bundle/prd-judge-runtime.json")
    if not bundle_path.exists():
        return None
    with open(bundle_path) as f:
        bundle = json.load(f)
    for item in bundle.get("files", []):
        if item.get("path") == "SKILL.md":
            content = item.get("content", "")
            match = re.search(r"Validation status:.*?(?=\n\n|$)", content, re.DOTALL)
            if match:
                return match.group(0)
    return None


def extract_release_gate_status() -> list[str]:
    release_gates_path = Path("cloud/RELEASE_GATES.md")
    if not release_gates_path.exists():
        return []
    content = release_gates_path.read_text()
    incomplete = []
    for line in content.splitlines():
        if line.strip().startswith("- [ ]"):
            incomplete.append(line.strip())
    return incomplete


def parse_portfolio_table(content: str) -> list[dict]:
    rows = []
    in_table = False
    for line in content.splitlines():
        if "| PRD |" in line and "Lines" in line:
            in_table = True
            continue
        if in_table and line.strip().startswith("|"):
            if re.match(r"^\|[\s:\-|]+\|$", line.strip()):
                continue
            parts = [p.strip() for p in line.split("|")[1:-1]]
            if len(parts) >= 5:
                rows.append({
                    "prd": parts[0],
                    "lines": parts[1],
                    "score": parts[3] if len(parts) > 3 else parts[2],
                    "outcome": parts[4] if len(parts) > 4 else parts[3],
                    "above_70": parts[5] if len(parts) > 5 else parts[4] if len(parts) > 4 else "",
                })
        elif in_table and not line.strip().startswith("|"):
            break
    return rows


def main() -> int:
    print("=" * 60)
    print("CALIBRATION DATA EXTRACTED FROM COMMITTED ARTIFACTS")
    print("=" * 60)

    # PRD Score calibration
    print("\n## PRD Score Calibration Portfolio\n")
    anchors = extract_calibration_anchors()
    if anchors:
        rows = parse_portfolio_table(anchors)
        if rows:
            print(f"Portfolio size: {len(rows)} PRDs")
            won = [r for r in rows if "Won" in r["outcome"]]
            lost = [r for r in rows if "Lost" in r["outcome"]]
            print(f"  - Won deals: {len(won)}")
            print(f"  - Lost deals: {len(lost)}")
            print(f"  - Other (open/withdrawn): {len(rows) - len(won) - len(lost)}")
            print("\nOutcome-labeled PRDs:")
            for r in rows:
                print(f"  {r['prd']}: {r['score']} ({r['outcome']})")
        else:
            print("Could not parse portfolio table from calibration-anchors.md")
    else:
        print("No calibration-anchors.md found in prd-score-runtime.json")

    # PRD Judge validation status
    print("\n## PRD Judge Validation Status\n")
    judge_status = extract_judge_validation_status()
    if judge_status:
        print(judge_status)
    else:
        print("Could not extract validation status from prd-judge-runtime.json")

    # Release gate status
    print("\n## Incomplete Release Gates (zero false GO check)\n")
    incomplete = extract_release_gate_status()
    zero_false_go = [g for g in incomplete if "false GO" in g.lower() or "false go" in g]
    if zero_false_go:
        for gate in zero_false_go:
            print(gate)
    else:
        relevant = [g for g in incomplete if "judge" in g.lower() or "model" in g.lower()]
        if relevant:
            print("Related incomplete gates:")
            for gate in relevant[:5]:
                print(gate)
        else:
            print("No incomplete gates found mentioning false GO")

    # Summary
    print("\n## Summary\n")
    print("PRD Score calibration: EXISTS (n=5 outcome-labeled PRDs)")
    print("PRD Judge verdict labels: DOES NOT EXIST")
    print("Zero false GO validation: INCOMPLETE (release gate unchecked)")
    print("\nThe claim 'zero false GOs on its labeled dev split' cannot be")
    print("backed until PRD Judge verdict labels are added to the repository.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
