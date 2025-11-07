# Go‑Live Plan (App Engine + evalgpt.com)

## 1) Configure gcloud and App Engine
```bash
PROJECT_ID=dompe-dev-439304
REGION=us-central

gcloud config set project "$PROJECT_ID"
gcloud services enable appengine.googleapis.com cloudbuild.googleapis.com
gcloud app describe || gcloud app create --region="$REGION"
```

## 2) Switch dispatch.yaml to evalgpt.com rules
```bash
cat > dispatch.yaml << 'YAML'
dispatch:
  - url: "evalgpt.com/api/*"
    service: api
  - url: "www.evalgpt.com/api/*"
    service: api
  - url: "evalgpt.com/*"
    service: frontend
  - url: "www.evalgpt.com/*"
    service: frontend
YAML
```

## 3) Map evalgpt.com and set DNS
```bash
gcloud app domain-mappings create evalgpt.com --certificate-management=AUTOMATIC
gcloud app domain-mappings create www.evalgpt.com --certificate-management=AUTOMATIC

# View required DNS records to add at your registrar
gcloud app domain-mappings list --format="table(id, resourceRecords)"
```
Add the shown records at your DNS provider:
- Apex (evalgpt.com) A records → 216.239.32.21, 216.239.34.21, 216.239.36.21, 216.239.38.21
- CNAME for www → ghs.googlehosted.com

Wait until certificates provision (typically 15–30 minutes):
```bash
gcloud app domain-mappings list
```

## 4) Redeploy API with production CORS origin
```bash
# Safely read your key (no shell history)
read -s OPENAI_API_KEY && export OPENAI_API_KEY

# Deploy API (Flex, custom Docker) with prod origin
gcloud app deploy app.yaml \
  --quiet \
  --set-env-vars OPENAI_API_KEY="${OPENAI_API_KEY}",ALLOWED_ORIGIN="https://evalgpt.com"
```

## 5) Deploy host‑specific dispatch rules
```bash
gcloud app deploy dispatch.yaml --quiet
```

## 6) Verify
```bash
# Frontend
curl -I https://evalgpt.com

# API health (same-origin path)
curl -i https://evalgpt.com/api/health

# Binary score smoke test (from repo root)
curl -s -X POST "https://evalgpt.com/api/evalprd/binary_score" \
  -H "Content-Type: application/json" \
  --data @test-request.json | head

# Tail API logs (useful during first hits)
gcloud app logs tail -s api
```
