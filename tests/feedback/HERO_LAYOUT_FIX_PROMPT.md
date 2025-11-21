# Hero Section Layout Fix - Detailed Instructions for LLM

## Problem Statement

The Hero section (`frontend/src/components/Hero.tsx`) has three example cards that should display **ONLY placeholder images** in a 2-column asymmetric grid layout. However, they are currently showing full evaluation content instead of the images.

## Visual Improvements Already Completed

The following design improvements have been successfully implemented based on designer feedback:

### 1. Hero Section Typography & Spacing
**File:** `frontend/src/components/Hero.tsx`
- DONE: **Left-aligned heading** - Changed from `text-center md:text-left` to `text-left`
- DONE: **Reduced spacing** between h1 and h4 from `space-y-4 md:space-y-6` to `space-y-2 md:space-y-3`
- Designer feedback: "Too much spacing between the first two lines"

### 2. CTA Button Order
**File:** `frontend/src/components/Hero.tsx` (lines 37-59)
- DONE: **Swapped button order** - "Watch Demo" now appears before "Evaluate Your PRD"
- Visual hierarchy maintained with button styling
- Designer feedback: "Primary CTA should be on the right, and the secondary should be on the left"

### 3. Hero Card Grid Layout (Structural Changes Complete)
**File:** `frontend/src/components/Hero.tsx` (lines 72-83)
- DONE: **Converted from 3-column to 2-column asymmetric grid**
- DONE: Layout structure implemented: `grid-cols-1 md:grid-cols-2 md:grid-rows-[1fr_1fr]`
- DONE: Left card spans 2 rows with `md:row-span-2`
- NOT DONE: **Images not displaying yet** - This is what you need to fix!

### 4. Attribution Spacing
**File:** `frontend/src/components/CTASection.tsx` (line 9)
- DONE: **Increased bottom padding** from `pb-20` to `pb-32`
- Designer feedback: "More space below this" (referring to attribution text)

## Required Layout

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ┌──────────────────┐  ┌────────────────────┐  │
│  │                  │  │                    │  │
│  │                  │  │    Fix Plan        │  │
│  │  PRD Readiness   │  │    (image only)    │  │
│  │  Gate            │  │                    │  │
│  │  (image only)    │  └────────────────────┘  │
│  │                  │                          │
│  │  Spans 2 rows    │  ┌────────────────────┐  │
│  │                  │  │                    │  │
│  │                  │  │  AI Agent Graph    │  │
│  │                  │  │  (image only)      │  │
│  └──────────────────┘  └────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Layout Requirements:**
- Desktop: 2-column grid with explicit rows `grid-cols-2 grid-rows-[1fr_1fr]`
- Left column: Binary Score image spans both rows (`row-span-2`)
- Right column top: Fix Plan image
- Right column bottom: Agent Tasks image
- Mobile: Stack vertically in single column
- Minimum height: ~600px on desktop
- Images should use `object-cover` to fill their containers without stretching

## Current File Structure

```
frontend/src/components/
├── Hero.tsx                    # Main hero component (NEEDS FIXING)
├── HeroBinaryScoreCard.tsx     # Has conditional logic for image/content
├── HeroFixPlanCard.tsx         # Has conditional logic for image/content
├── HeroAgentTasksCard.tsx      # Has conditional logic for image/content
└── HeroImageCards.tsx          # NEW simple image-only components (CREATED)

frontend/src/assets/
├── binary-score.png            # Beige/tan colored image
├── fix-plan.png                # Pink colored image
└── task-graph.png              # Yellow colored image
```

## Current Code State

### Hero.tsx (lines 72-83)
```tsx
{/* Two Column Asymmetric Evaluation Cards */}
<div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-[1fr_1fr] gap-6 md:gap-8 mt-16 md:mt-24 lg:mt-32 md:min-h-[600px]">
  <div className="md:row-span-2 h-full min-h-[300px]">
    <HeroBinaryImage />
  </div>
  <div className="h-full min-h-[280px]">
    <HeroFixPlanImage />
  </div>
  <div className="h-full min-h-[280px]">
    <HeroAgentTasksImage />
  </div>
</div>
```

### HeroImageCards.tsx (NEW FILE - CREATED)
```tsx
// Simple image-only cards for Hero section
import binaryScoreImg from "../assets/binary-score.png";
import fixPlanImg from "../assets/fix-plan.png";
import taskGraphImg from "../assets/task-graph.png";

export function HeroBinaryImage() {
  return (
    <div className="h-full w-full overflow-hidden rounded-[var(--radius-card)] shadow-[var(--elevation-sm)]">
      <img 
        src={binaryScoreImg} 
        alt="Binary Score Example" 
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export function HeroFixPlanImage() {
  return (
    <div className="h-full w-full overflow-hidden rounded-[var(--radius-card)] shadow-[var(--elevation-sm)]">
      <img 
        src={fixPlanImg} 
        alt="Fix Plan Example" 
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export function HeroAgentTasksImage() {
  return (
    <div className="h-full w-full overflow-hidden rounded-[var(--elevation-sm)]">
      <img 
        src={taskGraphImg} 
        alt="Agent Tasks Example" 
        className="w-full h-full object-cover"
      />
    </div>
  );
}
```

## The Issue

Despite creating new simple image-only components and using them in Hero.tsx, the browser is **STILL showing full evaluation content** (with "PRD Readiness Gate" header, criteria list, scores, etc.) instead of just the images.

### Possible Causes:
1. **Browser caching** - Vite dev server may be heavily caching the old components
2. **Multiple component instances** - There might be duplicate rendering happening
3. **Import/export issues** - The new components might not be properly imported
4. **Build artifacts** - Old built files might be interfering

## Your Task

**CRITICAL: Use a completely fresh approach to ensure the images display correctly**

### Step 1: Verify Current State
1. Read `frontend/src/components/Hero.tsx` to confirm imports
2. Read `frontend/src/components/HeroImageCards.tsx` to verify component exports
3. Check if there are any other files importing/using the old card components

### Step 2: Nuclear Cache Clear
```bash
cd frontend
lsof -ti:3000 | xargs kill -9 2>/dev/null
rm -rf node_modules/.vite
rm -rf dist build .vite
npm run build
npm run dev
```

### Step 3: Verify Images Exist
```bash
ls -la frontend/src/assets/*.png
```
Confirm these three files exist:
- `binary-score.png`
- `fix-plan.png`
- `task-graph.png`

### Step 4: Test with Browser
1. Navigate to `http://localhost:3000`
2. Take a screenshot of the hero section
3. Verify you see ONLY three placeholder images in the 2-column layout
4. The left image should be taller (spanning 2 rows)
5. NO text content like "PRD Readiness Gate", "4/12", criteria lists, etc.

### Step 5: Fix Image Sizing (If Needed)
If images appear stretched or distorted:

**Option A: Use object-fit contain**
```tsx
className="w-full h-full object-contain"
```

**Option B: Set explicit aspect ratios**
```tsx
className="w-full aspect-[4/3] object-cover"
```

**Option C: Crop images to specific regions**
- binary-score.png: Crop to show just the scorecard header
- fix-plan.png: Crop to show just the top 2-3 items
- task-graph.png: Crop to show just the graph diagram

### Step 6: Responsive Testing
Test at these breakpoints:
- Mobile: 375px width (should stack vertically)
- Tablet: 768px width (should show 2-column grid)
- Desktop: 1400px width (should show 2-column grid)

## Success Criteria

- Three images display in 2-column asymmetric grid
- Left image (binary-score.png) spans 2 rows  
- Right top image (fix-plan.png) in single row
- Right bottom image (task-graph.png) in single row
- NO text content visible (no "PRD Readiness Gate", no criteria lists)
- Images are not stretched or distorted
- Layout is responsive (stacks on mobile)
- Images have proper shadows and rounded corners

## Design Tokens to Use

```css
--radius-card: /* Card border radius */
--elevation-sm: /* Small shadow */
```

## Additional Context

- This is a React + Vite + TypeScript + Tailwind v4 project
- The site uses shadcn/ui components and Radix primitives
- There are SEPARATE components for showing full evaluation results (`ExampleOutput`, `FixPlanExample`, `AgentTasksExample`) that appear BELOW the hero when a user uploads a PRD
- The Hero cards should be purely presentational/marketing - showing example screenshots only

## Debugging Tips

If images still don't show:

1. **Check browser console** for image loading errors
2. **Inspect element** to see which component is actually rendering
3. **Add visible markers** temporarily:
   ```tsx
   <div style={{border: '5px solid red', padding: '10px'}}>
     <h1 style={{color: 'lime'}}>IMAGE COMPONENT HERE</h1>
     <img src={...} />
   </div>
   ```
4. **Check network tab** to see if images are being requested
5. **Verify import paths** - images should be imported from `../assets/*.png`
6. **Hard refresh** - Use Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

## Files to Review/Modify

**Primary:**
- `frontend/src/components/Hero.tsx`
- `frontend/src/components/HeroImageCards.tsx`

**Secondary (if needed):**
- `frontend/src/components/HeroBinaryScoreCard.tsx`
- `frontend/src/components/HeroFixPlanCard.tsx`  
- `frontend/src/components/HeroAgentTasksCard.tsx`

**Do NOT modify:**
- `frontend/src/components/ExampleOutput.tsx`
- `frontend/src/components/FixPlanExample.tsx`
- `frontend/src/components/AgentTasksExample.tsx`
- `frontend/src/App.tsx`

## Expected Timeline

This should take 10-15 minutes if approached systematically:
- 2 min: Verify current code state
- 3 min: Nuclear cache clear and rebuild
- 5 min: Test and verify images display
- 5 min: Adjust image sizing/cropping if needed

## Summary: What's Done vs What You Need to Do

### Already Completed (Don't Need to Touch)
1. Hero heading left-aligned with reduced spacing
2. CTA buttons swapped (Watch Demo first, Evaluate PRD second)
3. 2-column asymmetric grid layout structure
4. Attribution spacing increased
5. New `HeroImageCards.tsx` component created
6. Hero.tsx updated to use new components

### Your Task (What's Broken)
1. **Images not displaying in hero cards** - They show full evaluation content instead
2. Likely a caching or component rendering issue
3. Need nuclear cache clear and verification

### Your Success = Three Simple Images Display
When you're done, the hero section should show:
- Left: Tall beige/tan binary-score.png image
- Right top: Pink fix-plan.png image  
- Right bottom: Yellow task-graph.png image
- **NO TEXT CONTENT** - Just the images!

Good luck! The key is ensuring a completely clean build with no cached artifacts.

