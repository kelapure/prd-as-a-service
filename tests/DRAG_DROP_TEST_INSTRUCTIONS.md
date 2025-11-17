# Drag-and-Drop Test Instructions

## Test Setup

1. **Ensure services are running:**
   - Frontend dev server: `cd frontend && npm run dev` (port 3000)
   - API Gateway: `cd api-gateway && node dist/server.js` (port 8080)

2. **Test files available:**
   - `data/sample_prd.md` - Text PRD file
   - `data/SpotifyPRD.pdf` - PDF PRD file

## Test 1: Standalone Drag-and-Drop Test

**Purpose:** Verify drag-and-drop mechanics work in isolation

1. Open: http://localhost:3000/test-drag-drop.html
2. **Test clicking:**
   - Click anywhere in the dashed box
   - File picker should open
   - Select any file
   - File info should display below
3. **Test dragging:**
   - Open Finder and navigate to `data/sample_prd.md`
   - Drag the file over the dashed box
   - Box should turn blue with text "border-color: #0055d4"
   - Drop the file
   - File info should display below
4. **Check logs:**
   - Black log box at bottom should show all events
   - Look for: "Drag detected", "Drop event triggered", "File dropped"

**Expected Results:**
- ✅ Click opens file picker
- ✅ Drag changes border to blue
- ✅ Drop displays file info
- ✅ Logs show all events

---

## Test 2: Real Application Upload Dialog

**Purpose:** Verify drag-and-drop works in actual upload dialog

1. Open: http://localhost:3000
2. Click "Evaluate Your PRD" button
3. Upload dialog should open

### Test 2A: Click Upload

1. Click anywhere in the "Drop your PRD here" area
2. File picker should open
3. Select `data/sample_prd.md` or `data/SpotifyPRD.pdf`
4. File name should appear in the dialog
5. "Evaluate PRD" button should become enabled
6. Click "Evaluate PRD"
7. Dialog should close and evaluation should start

**Expected Results:**
- ✅ File picker opens on click
- ✅ Selected file displays in dialog
- ✅ "Evaluate PRD" button enabled
- ✅ Evaluation starts successfully

### Test 2B: Drag-and-Drop Upload

1. Open: http://localhost:3000
2. Click "Evaluate Your PRD" button
3. Open Finder and navigate to `data/sample_prd.md`
4. Drag file over the upload dialog drop zone
5. **VERIFY:** Border should change color (blue)
6. **VERIFY:** Background should lighten
7. Drop the file
8. **VERIFY:** File name appears
9. **VERIFY:** "Evaluate PRD" button enabled
10. Click "Evaluate PRD"
11. **VERIFY:** Evaluation starts

**Expected Results:**
- ✅ Drag over changes visual feedback
- ✅ Drop sets file
- ✅ Button becomes enabled
- ✅ Evaluation proceeds normally

---

## Debugging Steps if Drag-and-Drop Fails

### 1. Check Browser Console

Open DevTools (Cmd+Option+I) and look for:
- React errors
- Event handler errors
- "Uncaught" exceptions

### 2. Verify Event Handlers

In browser console, run:
```javascript
const dropZone = document.querySelector('[class*="border-2 border-dashed"]');
console.log('Drop zone found:', !!dropZone);
console.log('Has ondragenter:', dropZone?.hasAttribute('ondragenter'));
console.log('Has ondrop:', dropZone?.hasAttribute('ondrop'));
```

### 3. Check Input Element

In browser console, run:
```javascript
const input = document.querySelector('input[type="file"]');
console.log('Input found:', !!input);
console.log('Input classes:', input?.className);
console.log('Input pointer-events:', window.getComputedStyle(input).pointerEvents);
```

### 4. Manual Event Simulation

In browser console, run:
```javascript
const dropZone = document.querySelector('[class*="border-2 border-dashed"]');
const dragEvent = new DragEvent('dragenter', { bubbles: true, cancelable: true });
dropZone.dispatchEvent(dragEvent);
console.log('Dispatched dragenter event');
```

Then check if border color changed.

---

## Common Issues and Fixes

### Issue: Visual feedback doesn't appear on drag

**Symptoms:**
- Border doesn't change color when dragging over
- No background color change

**Possible Causes:**
1. React state not updating
2. CSS classes not applying
3. Drag handlers not attached

**Debug:**
```javascript
// Check if dragActive state updates
const dropZone = document.querySelector('[class*="border-2 border-dashed"]');
dropZone.addEventListener('dragenter', (e) => {
  console.log('Dragenter event fired!', e);
});
```

### Issue: File not set on drop

**Symptoms:**
- Drop completes but file name doesn't appear
- "Evaluate PRD" button stays disabled

**Possible Causes:**
1. `e.dataTransfer.files` is empty
2. Drop handler not calling `setFile`
3. File type not accepted

**Debug:**
```javascript
const dropZone = document.querySelector('[class*="border-2 border-dashed"]');
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  console.log('Drop event!', e.dataTransfer.files);
  console.log('File count:', e.dataTransfer.files.length);
  if (e.dataTransfer.files[0]) {
    console.log('File:', e.dataTransfer.files[0].name, e.dataTransfer.files[0].type);
  }
});
```

### Issue: Click doesn't open file picker

**Symptoms:**
- Clicking on drop zone does nothing
- No file picker appears

**Possible Causes:**
1. Input element has `pointer-events: none`
2. Input not covering drop zone
3. Input hidden or display:none

**Debug:**
```javascript
const input = document.querySelector('input[type="file"]');
const styles = window.getComputedStyle(input);
console.log({
  pointerEvents: styles.pointerEvents,
  opacity: styles.opacity,
  position: styles.position,
  display: styles.display,
  visibility: styles.visibility,
  width: styles.width,
  height: styles.height
});
```

Expected values:
- `pointerEvents: "auto"`
- `opacity: "0"`
- `position: "absolute"`
- `width`: should match drop zone width

---

## Implementation Details

### Current Architecture

**Component:** `frontend/src/components/UploadDialog.tsx`

**Structure:**
```
<div (drop zone container, handles drag events)
  onDragEnter={handleDrag}
  onDragLeave={handleDrag}
  onDragOver={handleDrag}
  onDrop={handleDrop}
  className="relative border-2 border-dashed..."
>
  <div (content wrapper, pointer-events-none)>
    <Upload icon />
    <p>Drop your PRD here</p>
    <p>or click to browse</p>
    <input 
      type="file"
      onChange={handleChange}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-auto"
    />
  </div>
</div>
```

**Key CSS Classes:**
- Parent: `relative` (establishes positioning context)
- Inner content: `pointer-events-none` (lets drag events pass through)
- Input: `absolute inset-0` (covers entire drop zone)
- Input: `pointer-events-auto` (receives clicks)
- Input: `opacity-0` (invisible but functional)

**Event Flow:**
1. **Drag over** → Parent's `onDragEnter` → `setDragActive(true)` → Blue border
2. **Drop** → Parent's `onDrop` → `setFile(files[0])` → File displays
3. **Click** → Input receives click → File picker opens

---

## Success Criteria

All of the following should work:

- [x] Standalone test page drag-and-drop works
- [x] Standalone test page click works
- [ ] Upload dialog drag-and-drop works
- [ ] Upload dialog click works
- [ ] Visual feedback appears on drag over
- [ ] File info displays after selection
- [ ] "Evaluate PRD" button enables
- [ ] Evaluation starts successfully

If any fail, follow debugging steps above and report findings.

