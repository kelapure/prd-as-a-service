# Manual Test: Agent Tasks Rendering

## Prerequisites
- API Gateway running on `localhost:8080` ✅
- Frontend running on `localhost:3000` ✅
- Sample PRD ready for upload

## Test Steps

### 1. Navigate to Frontend
Open browser: http://localhost:3000

**Expected**: Landing page loads with "Evaluate Your PRD" button

### 2. Open Upload Dialog
Click "Evaluate Your PRD" button

**Expected**: Upload dialog opens with drag-and-drop area

### 3. Upload PRD
Option A: Drag and drop `data/SpotifyPRD.pdf`
Option B: Click to browse and select PDF
Option C: Use text input area with sample PRD

**Expected**: Upload starts, progress bar shows

### 4. Wait for Binary Score
Progress message: "Evaluating PRD against 11 criteria..."

**Expected**: 
- Progress bar completes
- Dialog closes
- Page scrolls to results section

### 5. Verify Binary Score Section
Look for "11-Criterion Binary Score" section

**Expected**:
- All 11 criteria displayed
- Each shows PASS/FAIL status
- Evidence quotes visible
- Readiness gate displayed (GO/REVISE/HOLD)

### 6. Verify Fix Plan Section
Look for "Prioritized Fix Plan" section

**Expected**:
- Loading spinner initially ("Generating prioritized fix plan...")
- Then displays P0/P1/P2 fix items
- Each item shows: title, description, owner, effort, impact
- Summary shows total items

### 7. Verify Agent Tasks Section ⭐ **THIS IS THE CRITICAL TEST**
Look for "AI Agent-Executable Task Graph" section

**Expected**:
- Loading spinner initially ("Generating task graph...")
- **Should display task cards** (NOT empty)
- Each task card should show:
  - Task ID (e.g., T1.1)
  - Feature name
  - Task title
  - Description
  - Duration (e.g., "3h (3h)")
  - Owner role
  - Status badge (Ready/Blocked)
  - Inputs list with → arrows
  - Outputs list with ← arrows
  - Entry condition
  - Exit condition
  - Acceptance test
- Summary at bottom: "X tasks totaling Y hours of estimated effort"
- Export button at bottom

### 8. Check Browser Console
Open DevTools (F12 or Cmd+Option+I)

**Look for**:
- Console log: "Agent Tasks Data Received: {tasks: [...], edges: [...]}"
- Console log: "Number of tasks: X" (should be > 0, typically 10-20)
- **NO errors** related to AgentTasksExample or rendering

### 9. Verify Data Structure
In console, type: `window.lastAgentTasksData`

**Expected** (if we add this to code):
```javascript
{
  tasks: [
    {
      id: "T1.1",
      feature: "...",
      title: "...",
      description: "...",
      duration: "3h",
      est_hours: 3,
      owner_role: "...",
      entry: "...",
      exit: "...",
      test: "...",
      entry_conditions: [...],
      exit_conditions: [...],
      tests: [...],
      inputs: [...],
      outputs: [...],
      status: "ready" | "blocked" | "in_progress" | "completed"
    }
  ],
  edges: [...],
  mermaid: "..."
}
```

## Common Issues

### Issue 1: Agent Tasks Section Shows "Upload a PRD to see AI agent-executable task breakdown"
**Problem**: `agentTasksData` is null or `agentTasksData.tasks.length === 0`
**Debugging**:
- Check console logs for API errors
- Verify `generateAgentTasks` was called
- Check if API returned data
- Verify state update: `setAgentTasksData(data)` was called

### Issue 2: Loading Spinner Never Stops
**Problem**: API call failed or never completed
**Debugging**:
- Check network tab for `/api/evalprd/agent_tasks` request
- Look for errors in console
- Verify API is running (curl test)
- Check if `setIsLoadingAgentTasks(false)` was called

### Issue 3: Task Cards Display But Look Wrong
**Problem**: CSS or data mapping issue
**Debugging**:
- Check if all fields are present in data
- Verify CSS classes are defined
- Check for hydration mismatches
- Inspect element in DevTools

### Issue 4: "Number of tasks: undefined"
**Problem**: API returned data but without `tasks` array
**Debugging**:
- Check API response structure
- Verify schema matches `AgentTasksOutput` interface
- Check if streaming completed successfully

## Success Criteria

✅ All sections render with data
✅ Agent Tasks section shows 10-20 task cards
✅ Each task card displays all required fields
✅ No console errors
✅ Export button works
✅ Summary shows correct task count and hours

## If Test Fails

1. **Check API**: Run `node tests/debug-agent-tasks.js` to verify API works
2. **Check Console**: Look for JavaScript errors or failed requests
3. **Check Network**: Verify `/api/evalprd/agent_tasks` returns 200 with data
4. **Check State**: Add `console.log(agentTasksData)` in AgentTasksExample component
5. **Check Build**: Ensure latest code is built (`npm run build`)

## Production Test

After local test passes, repeat on https://evalgpt.com

**If production fails but local works**:
- Frontend build may not be deployed
- Check deployed version: view page source, check JS bundle hash
- Redeploy frontend: `gcloud app deploy frontend/app.yaml`
- Verify CORS settings in API
- Check API base URL in production build

