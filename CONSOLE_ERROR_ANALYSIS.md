# Console Error Analysis

## Error Message
```
Fix plan generation failed: TypeError: Failed to fetch
    at index-OnhBjJ7b.js:297:503
    at new Promise (<anonymous>)
    at Zb (index-OnhBjJ7b.js:297:404)
    at A (index-OnhBjJ7b.js:316:2886)
    at k (index-OnhBjJ7b.js:312:1702)
```

## Root Cause Investigation

### API Status: ✅ Working
- Both `/api/evalprd/fix_plan` and `/api/evalprd/agent_tasks` return HTTP 200
- APIs stream data correctly
- Validation issue is fixed (increased maxLength limits)

### Issue: Request Timing
The APIs take 1-2 minutes to complete because Claude needs time to generate detailed responses:
- `fix_plan`: ~1.5 minutes
- `agent_tasks`: ~1.5-2 minutes

### Possible Causes

#### 1. App Engine Request Timeout
**Problem**: App Engine Standard has a 60-second request timeout by default.

**Solution**: The timeout is NOT configurable in App Engine Standard for HTTP requests. Only automatic scaling instances support longer request timeouts up to 24 hours for background tasks.

**Workaround Options**:
a) **Client-side retry with exponential backoff** (best for UX)
b) **Split into async job + polling** (requires backend changes)
c) **Increase keep-alive heartbeat** (send periodic SSE pings)

#### 2. Browser/Network Timeout
**Problem**: Browser or network proxy might timeout before response completes.

**Evidence**: Frontend timeout is set to 180 seconds (3 minutes), which should be enough.

#### 3. SSE Connection Drop
**Problem**: Long-idle SSE connections might be dropped by proxies or load balancers.

**Solution**: Send periodic heartbeat comments to keep connection alive.

### Recommended Fix: SSE Heartbeat

Add heartbeat to keep connection alive during long processing:

```typescript
// In api-gateway/src/server.ts
const heartbeatInterval = setInterval(() => {
  reply.raw.write(`: heartbeat\n\n`);
}, 15000); // Every 15 seconds

try {
  const result = await evaluateAgentTasks({ prd_text }, (delta, accumulated) => {
    reply.raw.write(`data: ${JSON.stringify({ type: "delta", delta, accumulated: accumulated.length })}\n\n`);
  });
  
  clearInterval(heartbeatInterval);
  reply.raw.write(`data: ${JSON.stringify({ type: "done", result })}\n\n`);
  reply.raw.end();
} catch (error) {
  clearInterval(heartbeatInterval);
  // error handling
}
```

### Alternative Fix: Better Error Handling + Retry

Update frontend to handle timeouts gracefully and auto-retry:

```typescript
async function generateWithRetry(apiCall, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      if (error.message.includes("timeout") || error.message.includes("fetch")) {
        console.log(`Retry attempt ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      throw error;
    }
  }
}
```

### Current User Impact

**Symptom**: After uploading PRD:
- ✅ Binary score works (completes in 30-60s)
- ❌ Fix plan fails with "Failed to fetch"
- ❌ Agent tasks fails with "Failed to fetch" (or doesn't even try due to fix_plan failure)

**Why**: The requests are taking too long and hitting some timeout limit.

## Immediate Action Items

1. **Add SSE heartbeat** to keep connections alive
2. **Add retry logic** in frontend for transient failures
3. **Add user feedback** showing that request is still processing
4. **Consider async processing** for very long requests

## Testing After Fix

```bash
# Test with long PRD
curl -X POST https://evalgpt.com/api/evalprd/fix_plan \
  -H "Content-Type: application/json" \
  -d @data/SpotifyPRD.json \
  --max-time 180

# Should complete without timeout
# Should see data: messages every few seconds
# Should end with data: {"type":"done",...}
```

