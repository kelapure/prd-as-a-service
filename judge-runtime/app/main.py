from __future__ import annotations

import asyncio
import json
import logging
import os
from collections.abc import AsyncIterator
from contextlib import suppress

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from .bundle import BUNDLE, RUBRIC_SHA256
from .extraction import (
    MAX_PAGES,
    MAX_TOTAL_BYTES,
    ExtractedDocument,
    InputError,
    extract_document,
    extract_pasted_text,
    validate_filename,
)
from .judge import EvaluationError, PrdJudge, RUBRIC_VERSION, RuntimeConfig, SCORE_VERSION


logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger("evalgpt.prd_judge")
app = FastAPI(title="EvalGPT PRD Judge Runtime", version="1.0.0", docs_url=None, redoc_url=None)


def _sse(event: str, payload: dict[str, object]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, separators=(',', ':'))}\n\n"


def _check_internal_token(value: str | None) -> None:
    expected = os.environ.get("INTERNAL_SERVICE_TOKEN", "").strip()
    if expected and value != expected:
        raise HTTPException(status_code=403, detail="Forbidden")


async def _read_file(upload: UploadFile) -> tuple[str, bytes]:
    name = upload.filename or "upload"
    validate_filename(name)
    data = await upload.read(MAX_TOTAL_BYTES + 1)
    if len(data) > MAX_TOTAL_BYTES:
        raise InputError(f"{name} exceeds the 25 MB evaluation limit")
    return name, data


@app.get("/health")
async def health(x_internal_service_token: str | None = Header(default=None)) -> dict[str, object]:
    _check_internal_token(x_internal_service_token)
    try:
        config = RuntimeConfig.from_environment()
        configured = True
        model = config.model
    except EvaluationError:
        configured = False
        model = "unconfigured"
    return {
        "status": "ok" if configured else "degraded",
        "configured": configured,
        "judge_version": BUNDLE.judge_version,
        "source_commit": BUNDLE.source_commit,
        "manifest_sha256": BUNDLE.manifest_sha256,
        "rubric_version": RUBRIC_VERSION,
        "rubric_sha256": RUBRIC_SHA256,
        "score_version": SCORE_VERSION,
        "model": model,
    }


@app.post("/evaluate")
async def evaluate(
    prd: UploadFile | None = File(default=None),
    prd_text: str | None = Form(default=None),
    supporting_files: list[UploadFile] = File(default=[]),
    x_internal_service_token: str | None = Header(default=None),
) -> StreamingResponse:
    _check_internal_token(x_internal_service_token)
    if bool(prd) == bool(prd_text and prd_text.strip()):
        raise HTTPException(status_code=400, detail="Provide exactly one PRD file or pasted PRD text")
    if len(supporting_files) > 5:
        raise HTTPException(status_code=400, detail="At most five supporting files are allowed")

    try:
        primary_file: tuple[str, bytes] | None = None
        if prd:
            primary_file = await _read_file(prd)
        supporting_raw: list[tuple[str, bytes]] = []
        for upload in supporting_files:
            supporting_raw.append(await _read_file(upload))
        pasted_bytes = len((prd_text or "").encode("utf-8"))
        upload_bytes = sum(len(data) for _, data in supporting_raw)
        if primary_file:
            upload_bytes += len(primary_file[1])
        if upload_bytes + pasted_bytes > MAX_TOTAL_BYTES:
            raise InputError("Combined uploads exceed the 25 MB evaluation limit")
    except InputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    async def stream() -> AsyncIterator[str]:
        queue: asyncio.Queue[tuple[str, str] | None] = asyncio.Queue()

        def progress(phase: str, message: str) -> None:
            queue.put_nowait((phase, message))

        def extract_all() -> list[ExtractedDocument]:
            documents: list[ExtractedDocument] = []
            if prd_text and prd_text.strip():
                documents.append(extract_pasted_text(prd_text))
            elif primary_file:
                documents.append(extract_document(*primary_file))
            for name, data in supporting_raw:
                documents.append(extract_document(name, data))
            known_pages = sum(document.page_count or 0 for document in documents)
            if known_pages > MAX_PAGES:
                raise InputError(
                    f"The supplied documents have {known_pages} known pages; the combined limit is {MAX_PAGES}"
                )
            return documents

        async def run() -> None:
            try:
                progress("extracting_evidence", "Extracting evidence and source locations")
                documents = await asyncio.to_thread(extract_all)
                judge = PrdJudge()
                try:
                    envelope = await judge.evaluate(documents, progress)
                finally:
                    await judge.close()
                queue.put_nowait(("__complete__", envelope.model_dump_json()))
            except (EvaluationError, InputError, ValueError) as exc:
                logger.warning("Evaluation failed safely: %s", type(exc).__name__)
                queue.put_nowait(("__error__", str(exc)))
            except Exception:
                logger.exception("Evaluation failed without document content")
                queue.put_nowait(("__error__", "The evaluation could not be completed. Retry later."))
            finally:
                queue.put_nowait(None)

        task = asyncio.create_task(run())
        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                phase, message = item
                if phase == "__complete__":
                    yield _sse("complete", json.loads(message))
                elif phase == "__error__":
                    yield _sse("error", {"code": "evaluation_failed", "message": message, "retryable": True})
                else:
                    yield _sse("progress", {"phase": phase, "message": message})
        finally:
            if not task.done():
                task.cancel()
                with suppress(asyncio.CancelledError):
                    await task

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
            "X-Content-Type-Options": "nosniff",
        },
    )
