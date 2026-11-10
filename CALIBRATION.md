# EvalGPT PRD Judge Calibration Report

## Status: Calibration Data Incomplete

**The claim "zero false GOs on its labeled dev split" cannot currently be
backed.** No labeled dev split exists for PRD Judge verdicts (GO/HOLD/REVISE).
The calibration data that does exist covers PRD Score (a separate /100
draft-strength instrument), not PRD Judge verdicts.

## What Exists

### PRD Score Calibration (draft-strength instrument)

Source: `judge-runtime/bundle/prd-score-runtime.json`, key
`references/calibration-anchors.md`.

| PRD | Lines | v2.1 normalized | Outcome | Above 70 gate? |
| :-- | ----: | --------------: | :------ | :------------: |
| Won deal A | 394 | 75 | Won | Yes |
| Won deal B (pre-sale PRD-Lite) | 76 | 63 | Won | No |
| Won deal C | 158 | 76 | Won | Yes |
| Won deal D | 937 | 73 | Won | Yes |
| Open deal E | 295 | 81 | (no outcome) | Yes |
| Lost deal F | 254 | 57 | Lost | No |
| Withdrawn draft G (pre-reset) | 151 | 35 | Withdrawn | No |

**Dev split size:** 5 outcome-labeled PRDs (4 wins, 1 loss). Open deal E and
withdrawn draft G excluded from TPR/TNR.

**How labels were made:** Outcome labels (won/lost) come from commercial deal
outcomes. The calibration-anchors file states: "Outcome-labeled PRD scores from
the 8090 engagement portfolio, de-identified for runtime distribution."

**Gate threshold behavior at 70/100:**

- TPR = 4/4 (all won deals pass at the human-scored lineage)
- TNR = 1/1 (the lost deal fails)
- Won deal B at 63 is an accepted false negative (fails the automated 70 gate
  but won commercially)

**Validation status:** "rubric core calibrated n=5 (2026-05); writing layer
UNVALIDATED" (from `prd-score-runtime.json`).

### PRD Judge Validation Status

Source: `judge-runtime/bundle/prd-judge-runtime.json`, SKILL.md content.

> "Validation status: this judge is expert doctrine, not yet a validated
> benchmark. Say so when a consumer treats the verdict as measured truth."

The release gates in `cloud/RELEASE_GATES.md` show the zero-false-GO check as
incomplete:

```
- [ ] The production Judge model won the adjudicated bakeoff: zero false GO,
      then gate/verdict accuracy, evidence precision, latency, and cost.
```

### Citation Verification

PRD Score validates evidence quotations against source documents. From
`judge-runtime/bundle/prd-score-runtime.json`, `scripts/validate_report.py`:

- Every `status: used` quote is checked verbatim against supplied sources
- Invalid quotes fail validation

The fixture test suite (`judge-runtime/tests/test_runtime.py`) includes quote
verification tests.

## What Does Not Exist

1. **Labeled dev split for PRD Judge verdicts.** There is no corpus of PRDs
   with gold-standard GO/HOLD/REVISE labels to measure false-GO or false-HOLD
   rates.

2. **Confusion matrix for PRD Judge.** Without verdict labels, TPR/TNR/FPR/FNR
   cannot be computed for GO/HOLD classification.

3. **Eval harness for PRD Judge verdicts.** The calibration data measures
   whether PRD Score correlates with deal outcomes (above/below 70 vs won/lost),
   not whether PRD Judge's GO/HOLD verdict is correct.

4. **Adjudicated release set.** The release gates reference an "adjudicated
   release set" for finding precision and defect recall, but the checkboxes are
   incomplete and no such set is committed to this repository.

## Confusion Matrix

**PRD Score gate (70/100) vs deal outcome:**

|                      | Won (n=4) | Lost (n=1) |
| :------------------- | --------: | ---------: |
| Above 70 gate        |         3 |          0 |
| Below 70 gate        |         1 |          1 |

- False negative rate (won but failed gate): 1/4 = 25%
- False positive rate (lost but passed gate): 0/1 = 0%

**PRD Judge verdict (GO/HOLD/REVISE):** No data. There are no labeled PRD Judge
verdicts in this repository.

## Known Weaknesses and Limits

1. **Sample size.** n=5 outcome-labeled PRDs is too small for robust confidence
   intervals. The calibration-anchors file states: "Confidence intervals are
   wide at n=5; add the next 3–5 customer outcomes before claiming robust
   calibration."

2. **PRD Score is not PRD Judge.** The 70-gate calibration measures draft
   strength, not shipping readiness. PRD Judge emits GO/HOLD/REVISE verdicts
   based on P0/P1 findings, not the /100 score.

3. **Won deal B false negative.** A commercial win scored 63/100 (below the 70
   gate). The gap is attributed to "dedicated-section vs distributed-prose
   pattern" per calibration-anchors.

4. **Writing layer unvalidated.** W1-W4 criteria have no calibration data.

5. **No adversarial or edge-case coverage.** The calibration set contains only
   real engagement PRDs, not synthetic adversarial examples designed to probe
   failure modes.

## Failure Cases

### Case 1: Won Deal B (False Negative)

- **Input:** 76-line pre-sale PRD-Lite for an incumbent-replacement deal
- **PRD Score verdict:** 63/100, below 70 gate (FAIL)
- **Actual outcome:** Won
- **Why wrong:** Length normalization raised raw 58 to 63, but the remaining
  gap is the "dedicated-section vs distributed-prose pattern" where core
  requirements are addressed in prose rather than dedicated sections.

### Case 2: PRD Judge Verdict Unknown

No labeled PRD Judge verdicts exist. The claim "zero false GOs" cannot be
tested.

### Case 3: Writing Layer Unvalidated

The writing layer (W1-W4) was added from a customer engagement's author edit
rounds but has no calibration against outcomes.

## Reproduction Command

There is no command to reproduce PRD Judge calibration because no labeled PRD
Judge verdicts exist.

For PRD Score, the deterministic calculation can be verified with:

```bash
# Extract the calibration anchors from the bundle
python3 -c "
import json
with open('judge-runtime/bundle/prd-score-runtime.json') as f:
    bundle = json.load(f)
for item in bundle['items']:
    if item['path'] == 'references/calibration-anchors.md':
        print(item['content'])
"
```

## What Must Be Done

To back the claim "zero false GOs on its labeled dev split," the repository
needs:

1. A labeled dev split of PRDs with gold-standard GO/HOLD/REVISE verdicts
2. An eval harness that runs PRD Judge against the dev split
3. A confusion matrix showing TPR/TNR/FPR/FNR for verdict classification
4. The adjudicated release set referenced in `cloud/RELEASE_GATES.md`
5. Evidence that the exact deployed model passes the release gates

Until these exist, claims of validation accuracy should not be published.

---

*Generated from repository state. All numbers derived from committed artifacts.*
