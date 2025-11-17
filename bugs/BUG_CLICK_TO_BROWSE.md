# Bug Summary: Click-to-Browse Not Working in Upload Dialog

## Problem Statement
The file upload dialog's "click to browse" functionality is not working. Users cannot click anywhere in the drop zone to open the file picker. Drag-and-drop works, but clicking does not.

## Expected Behavior
- User clicks anywhere in the drop zone (the dashed border area with "Drop your PRD here" text)
- Browser's native file picker dialog should open
- User can then select a file

## Actual Behavior
- Clicking in the drop zone does nothing
- File picker does not open
- Only drag-and-drop works

## Technical Details

### Current Implementation
**File**: `frontend/src/components/UploadDialog.tsx`

```tsx
<div
  onDragEnter={handleDrag}
  onDragLeave={handleDrag}
  onDragOver={handleDrag}
  onDrop={handleDrop}
  style={{ position: 'relative' }}  // Added this
  className={`
    border-2 border-dashed rounded-[var(--radius-card)] p-12 text-center transition-colors
    ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}
    ${file ? 'border-chart-2 bg-chart-2/5' : ''}
  `}
>
  {!file ? (
    <div className="space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
        <Upload className="w-8 h-8 text-primary" />
      </div>
      <div className="space-y-2">
        <p className="text-foreground">Drop your PRD here</p>
        <p className="text-muted-foreground">or click to browse</p>
      </div>
      <input
        type="file"
        onChange={handleChange}
        accept=".pdf,.doc,.docx,.txt,.md"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  ) : (
    // ... file selected state
  )}
</div>
```

### Pattern Being Used
Standard "invisible overlay" pattern:
- Parent div has `position: relative` (via inline style)
- File input has `position: absolute; inset-0; opacity-0; cursor-pointer`
- Input should cover entire drop zone and be clickable

### Diagnostic Results
When inspecting with browser tools:

```javascript
{
  "dropZonePosition": "relative",        // ✓ Correct
  "inputPosition": "absolute",           // ✓ Correct
  "dropZoneSize": { width: 526, height: 246 },
  "inputSize": { width: 522, height: 242 },  // ✗ Not covering fully!
  "inputCoversDropZone": false,          // ✗ Problem
  "inputCursor": "pointer"               // ✓ Correct
}
```

**Key Issue**: Input is 4px smaller in each dimension (522x242 vs 526x246), meaning it doesn't fully cover the drop zone.

## What We've Tried

1. ✗ **Added `relative` class to drop zone** - Tailwind class wasn't applying
2. ✗ **Added inline `style={{ position: 'relative' }}`** - Applied but input still doesn't cover fully
3. ✗ **Removed intermediate wrapper div** - Input still undersized
4. ✗ **Added `pointer-events-none` to content, `pointer-events-auto` to input** - No effect
5. ✗ **Used `useRef` + manual click trigger on hidden input** - Didn't work
6. ✗ **Adjusted z-index** - No effect

## Root Cause Hypothesis

The `p-12` (48px padding) on the drop zone may be causing the `inset-0` absolute positioning to only cover the **content box**, not the **padding box**. This would explain why the input is smaller than expected.

The CSS `inset-0` on an absolutely positioned element positions it relative to the padding edge, but the file input might be respecting some boundary that prevents it from covering the full clickable area.

## Constraints
- Must work with Radix UI Dialog component
- Using Tailwind CSS v4
- React 18.3.1 with TypeScript
- File input must remain accessible (no `display: none` or `visibility: hidden`)

## Question for Higher Intelligence
How do we make an absolutely positioned file input (`position: absolute; inset: 0`) fully cover its relatively positioned parent INCLUDING the parent's padding, so that clicks anywhere in the visible drop zone area open the file picker?

Alternative: Is there a better pattern for making an entire styled div clickable to trigger a file input in React?

## Environment
- Frontend: React 18.3.1 + Vite 6.3.5 + Tailwind CSS v4
- Local dev server: http://localhost:3000
- API Gateway: http://localhost:8080
- Browser: Chrome (via MCP cursor-browser-extension)

## Reproduction Steps
1. Navigate to http://localhost:3000
2. Click "Evaluate Your PRD" button
3. Upload dialog opens
4. Try clicking anywhere in the dashed border drop zone area
5. Expected: File picker opens
6. Actual: Nothing happens

## Additional Context
- The test page at `frontend/public/test-upload.html` showed similar behavior
- Browser automation showed `[active]` state on the input when programmatically clicked, but user manual clicks don't work
- This suggests the input is positioned correctly but something is intercepting/blocking the click events

