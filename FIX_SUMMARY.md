# Agent Tasks Rendering Fix - November 16, 2025

## Problem
The "AI Agent-Executable Task Graph" section was not rendering on evalgpt.com production site after users uploaded PRDs.

## Root Cause
The API's JSON schema validation was **rejecting Claude's responses** because task descriptions and conditions exceeded character length limits:

- Task `description` fields: exceeding 1000 chars
- Task `entry`/`exit` fields: exceeding 800 chars  
- Task `test` fields: exceeding 1000 chars

When validation failed, the API returned an error and the frontend received no data to render.

## Fix
Updated `/api-gateway/src/lib/schemas.ts` (AgentTasksOutput schema):

```typescript
// BEFORE
description: { type: "string", maxLength: 1000 }
entry: { type: "string", maxLength: 800 }
exit: { type: "string", maxLength: 800 }
test: { type: "string", maxLength: 1000 }

// AFTER  
description: { type: "string", maxLength: 2000 }
entry: { type: "string", maxLength: 1500 }
exit: { type: "string", maxLength: 1500 }
test: { type: "string", maxLength: 2000 }
```

## Testing
✅ Local API test: Returns 17 tasks with all required fields
✅ Schema validation: All fields present and properly typed
✅ Frontend compatibility: Data structure matches component expectations

## Files Changed
1. `api-gateway/src/lib/schemas.ts` - Increased maxLength limits
2. `frontend/src/components/AgentTasksExample.tsx` - Added debug logging

## Deployment Steps
1. ✅ Build API: `cd api-gateway && npm run build`
2. ✅ Test locally: API returns valid task data
3. ⏳ Build frontend: `cd frontend && npm run build`
4. ⏳ Deploy API: `gcloud app deploy api-gateway/app.yaml`
5. ⏳ Deploy frontend: `gcloud app deploy frontend/app.yaml`

## Verification
After deployment, verify on https://evalgpt.com:
1. Upload a PRD (use `data/SpotifyPRD.pdf` or any PRD)
2. Wait for binary score to complete
3. Scroll to "AI Agent-Executable Task Graph" section
4. Verify task cards are rendering (not empty state)
5. Check browser console for debug logs: `[AgentTasksExample] Rendered with:`
6. Verify task count and details are displayed

## Debug Logging Added
The component now logs its state on every render:
```javascript
console.log('[AgentTasksExample] Rendered with:', {
  isLoading,
  hasData: !!data,
  tasksCount: tasks.length,
  data: data
});
```

This will help diagnose any future rendering issues.

## Notes
- The issue was NOT with the frontend code or component logic
- The issue was NOT with the UI receiving data
- The issue WAS with the API silently failing validation
- Claude generates detailed, comprehensive task descriptions that require higher limits
- This fix allows Claude to provide the level of detail needed for AI-executable tasks

