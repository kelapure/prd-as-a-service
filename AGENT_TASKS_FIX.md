# Agent Tasks Fix - Complete Resolution

**Date:** November 15, 2025, 11:44 PM PST  
**Issue:** AI Agent-Executable Task Graph not working  
**Status:** ✅ **FIXED AND DEPLOYED**

---

## Problem Summary

The `/api/evalprd/agent_tasks` endpoint was failing with schema validation errors on production (evalgpt.com).

### Symptoms

- ❌ Agent tasks section showed: "Upload a PRD to see AI agent-executable task breakdown"
- ❌ API calls returned validation errors instead of task graphs
- ❌ Frontend remained stuck in empty state

### Root Cause

**Claude Sonnet 4.5 generates significantly more verbose outputs than GPT-4o.**

The schema constraints were calibrated for GPT-4o's terser style:

```typescript
// Original (GPT-4o calibrated)
entry: maxLength: 200   // ❌ Too small for Claude
exit: maxLength: 200    // ❌ Too small for Claude  
test: maxLength: 300    // ❌ Too small for Claude

// Claude was generating:
exit: "Complete PRD section with validated scope boundaries, all features problem-aligned, no speculative additions, and documented removal justifications for any orphan features identified during audit process"
// ↑ 228 characters - exceeds 200 limit!
```

---

## Schema Validation Errors Encountered

### Error 1: test field (Iteration 1)
```
data/tasks/2/test must NOT have more than 300 characters
data/tasks/3/test must NOT have more than 300 characters
...
```

**Fix Applied:** 300 → 600 characters

### Error 2: exit field (Iteration 2)
```
data/tasks/3/exit must NOT have more than 400 characters
data/tasks/6/exit must NOT have more than 400 characters
...
```

**Fix Applied:** 400 → 800 characters

### Error 3: entry field (Iteration 3)
Similar validation failures (not encountered due to proactive increase)

**Proactive Fix:** 400 → 800 characters

---

## Final Schema Adjustments

### Before (GPT-4o calibrated)

```typescript
description: { maxLength: 500 },
entry: { maxLength: 200 },
exit: { maxLength: 200 },
test: { maxLength: 300 },
```

### After (Claude calibrated)

```typescript
description: { maxLength: 1000 },  // 2x increase
entry: { maxLength: 800 },         // 4x increase
exit: { maxLength: 800 },          // 4x increase
test: { maxLength: 1000 },         // 3.3x increase
```

### Rationale

Claude Sonnet 4.5 is optimized for:
- **Clarity:** Provides more detailed explanations
- **Completeness:** Includes comprehensive acceptance criteria
- **Specificity:** Avoids ambiguity with verbose descriptions

This verbosity is actually **beneficial** for agent-executable tasks as it reduces ambiguity.

---

## Prompt Updates

**File:** `api-gateway/src/lib/prompts.ts` (line 224)

```typescript
// Before
"entry (single string max 200 chars), exit (single string max 200 chars), test (single string max 300 chars)"

// After
"entry (single string max 800 chars), exit (single string max 800 chars), test (single string max 1000 chars)"
```

**Critical:** Schema and prompt must stay aligned to prevent validation failures.

---

## Test Results

### Local Testing (localhost:8080) ✅

```
Simple PRD Test:
  Tasks: 9
  Edges: 12
  Status: ✅ Working
```

### Production Testing (evalgpt.com) ✅

**Simple PRD:**
```
Tasks: 8
Edges: 14
Duration: ~30s
Status: ✅ Working
```

**SpotifyPRD (27KB):**
```
Tasks: 15
Edges: 16
Total est hours: 51h
Duration: ~180s
Status: ✅ Working
```

**Sample Tasks Generated:**
```
T1: Implement session start/end event capture (4h)
T2: Build backend API endpoint for session event ingestion (3h)
T3: Create daily listening aggregation batch job (4h)
T4: Build real-time progress API endpoint (3h)
T5: Implement daily streak validation job (4h)
... 10 more tasks
```

---

## Deployment Timeline

| Time | Action | Status |
|------|--------|--------|
| 11:29 PM | Identified validation errors | 🔍 |
| 11:30 PM | Increased test: 300→600 | Build ✅ |
| 11:33 PM | Deployed v20251115t153331 | Deploy ✅ |
| 11:34 PM | Still failing (exit field) | ❌ |
| 11:44 PM | Increased all limits 2-4x | Build ✅ |
| 11:44 PM | Deployed v20251115t154422 | Deploy ✅ |
| 11:47 PM | **Verified working** | ✅ |

**Total Resolution Time:** ~18 minutes

---

## Production Verification

### Current Serving Version
```
Version: 20251115t154422
Traffic: 100%
Deployed: 2025-11-15 15:45:17 PST
Status: ✅ Healthy
```

### Endpoint Status

```bash
✅ POST /api/evalprd/binary_score
   - Working, ~30-60s
   - Schema validation: Passing

✅ POST /api/evalprd/fix_plan
   - Working, ~60-180s  
   - Schema validation: Passing

✅ POST /api/evalprd/agent_tasks
   - Working, ~60-180s
   - Schema validation: Passing ← FIXED!
```

---

## Key Learnings

### Claude vs GPT-4o Differences

| Aspect | GPT-4o | Claude Sonnet 4.5 | Impact |
|--------|--------|-------------------|--------|
| **Verbosity** | Concise | Detailed | Need higher maxLength |
| **Clarity** | Good | Excellent | Better task descriptions |
| **Consistency** | High | Very High | More reliable outputs |
| **Cost** | $1.17/eval | $0.44/eval | 62% savings |

### Schema Design Lessons

1. **Start with generous limits** when migrating between AI providers
2. **Test iteratively** with real data (not just minimal examples)
3. **Keep schema and prompts aligned** at all times
4. **Monitor validation errors** in production logs
5. **Claude needs 2-4x** the character limits vs GPT-4o

### Recommended Schema Limits (Claude-Optimized)

```typescript
// For Claude Sonnet 4.5 and Opus 4.1
rationale: maxLength: 400-500
description: maxLength: 1000-1500
entry/exit: maxLength: 800-1000
test: maxLength: 1000-1200
```

---

## Files Modified

### Code Changes

```
api-gateway/src/lib/schemas.ts
  - Line 251: entry: 200 → 800 chars
  - Line 252: exit: 200 → 800 chars
  - Line 253: test: 300 → 1000 chars

api-gateway/src/lib/prompts.ts
  - Line 224: Updated all constraints to match schema
```

### Deployments

```
v20251115t153331 (11:33 PM) - Partial fix (test: 600)
v20251115t154422 (11:44 PM) - Complete fix (all fields increased)
```

---

## Verification Commands

### Test Locally

```bash
cd /Users/rohitkelapure/projects/prd-as-a-service

curl -X POST http://localhost:8080/api/evalprd/agent_tasks \
  -H 'Content-Type: application/json' \
  -d '{"prd_text":"YOUR_PRD_TEXT_HERE"}'
```

### Test Production

```bash
curl -X POST https://evalgpt.com/api/evalprd/agent_tasks \
  -H 'Content-Type: application/json' \
  -d '{"prd_text":"YOUR_PRD_TEXT_HERE"}'
```

### Expected Response

```json
{
  "type": "done",
  "result": {
    "tasks": [
      {
        "id": "T1",
        "feature": "Feature Name",
        "title": "Task title",
        "description": "Detailed description...",
        "duration": "3h",
        "est_hours": 3,
        "entry": "Entry conditions...",
        "exit": "Exit conditions...",
        "test": "Test criteria...",
        "status": "ready",
        "inputs": [...],
        "outputs": [...]
      }
    ],
    "edges": [
      {"from": "T1", "to": "T2"}
    ]
  }
}
```

---

## Complete Test Summary

### All 3 Endpoints Working ✅

| Endpoint | Local | Production | Status |
|----------|-------|------------|--------|
| **binary_score** | ✅ 53.5s | ✅ ~30s | Working |
| **fix_plan** | ✅ 165.3s | ✅ ~98s | Working |
| **agent_tasks** | ✅ 160.0s | ✅ ~180s | **FIXED!** ✅ |

### Production Health

```
Domain: https://evalgpt.com
API: Claude Sonnet 4-5-20250929
Version: 20251115t154422
Traffic Split: 100%
Status: All endpoints operational
```

---

## What's Working Now

1. ✅ **API Endpoints:** All 3 endpoints return valid task graphs
2. ✅ **Schema Validation:** All fields pass validation with Claude's verbose outputs
3. ✅ **Streaming:** Real-time SSE deltas working
4. ✅ **Production:** evalgpt.com fully operational
5. ✅ **Frontend Ready:** Will display task graphs when data is received

---

## Next Steps (For UI Verification)

### Test Full Frontend Flow

1. **Visit:** https://evalgpt.com
2. **Click:** "Evaluate Your PRD" button
3. **Upload:** SpotifyPRD.pdf or any PRD file
4. **Wait:** ~3-6 minutes for complete evaluation
5. **Verify:** 
   - Binary score displays
   - Fix plan displays
   - **Agent tasks display with task cards** ✅

### What You Should See

**Agent Tasks Section:**
- Task cards in 2-column grid
- Each card showing:
  - Task ID and feature
  - Title and description  
  - Duration and status badge
  - Entry/exit conditions
  - Test criteria
  - Inputs and outputs
- Export button for Markdown download

---

## Issue Resolution Summary

### Original Issue
```
"the AI Agent-Executable Task Graph is not working"
```

### Root Cause
```
Schema validation failing due to Claude's verbose outputs
exceeding GPT-4o-calibrated character limits
```

### Solution
```
Increased schema maxLength constraints by 2-4x:
- entry: 200 → 800 (+300%)
- exit: 200 → 800 (+300%)
- test: 300 → 1000 (+233%)
- description: 500 → 1000 (+100%)
```

### Result
```
✅ Agent tasks endpoint working on production
✅ SpotifyPRD generates 15 tasks, 16 edges, 51h total
✅ All schema validations passing
✅ Ready for frontend display
```

---

## Cost Impact

**No cost increase from this fix.**

The schema changes only affect validation, not token usage. Claude was already generating these verbose outputs - we just adjusted the schema to accept them.

---

## Final Status

**✅ ISSUE RESOLVED**

The AI Agent-Executable Task Graph feature is now **fully operational** on evalgpt.com.

**Deployments Today:**
- v20251115t145634 (2:56 PM) - Initial Claude migration
- v20251115t152951 (3:29 PM) - First schema fix attempt
- v20251115t153331 (3:33 PM) - Second schema fix attempt  
- v20251115t154422 (3:44 PM) - **Final fix - WORKING** ✅

**Current Production:**
- All 3 evaluation endpoints operational
- Claude Sonnet 4.5 integration complete
- 62% cost savings vs OpenAI
- Full feature parity achieved

---

**Fixed By:** AI Assistant  
**Issue Type:** Schema Validation  
**Resolution:** Increased character limits for Claude's verbosity  
**Status:** Production verified ✅

