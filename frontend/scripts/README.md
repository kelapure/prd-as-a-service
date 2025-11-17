# Generate Spotify Results Script

This script fetches the Spotify PRD PDF, extracts text, calls all 3 evaluation APIs, and saves the results to `src/data/spotifyResults.ts` for use in the hero section.

## Prerequisites

1. API Gateway must be running on `http://localhost:8080`
2. Spotify PRD PDF must exist at `data/SpotifyPRD.pdf`

## Usage

```bash
# From the frontend directory
npm run generate-spotify-results

# Or directly with node
node scripts/generate-spotify-results.mjs

# With custom API URL
API_URL=http://localhost:8080 node scripts/generate-spotify-results.mjs
```

## What it does

1. **Extracts text** from `data/SpotifyPRD.pdf` using pdfjs-dist
2. **Calls 3 APIs** in parallel:
   - `/api/evalprd/binary_score`
   - `/api/evalprd/fix_plan`
   - `/api/evalprd/agent_tasks`
3. **Saves results** to `src/data/spotifyResults.ts` as TypeScript constants

## Output

The script generates a TypeScript file with:
- `spotifyBinaryScore`: Binary score evaluation results
- `spotifyFixPlan`: Prioritized fix plan items
- `spotifyAgentTasks`: Agent-executable task breakdown

These are used by `src/lib/spotifyData.ts` to display example results in the hero section cards.

## Notes

- The script handles streaming responses from the APIs
- Results are formatted as TypeScript constants with proper types
- The generated file includes a timestamp and regeneration instructions
- If any API call fails, the script will exit with an error

