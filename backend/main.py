"""FastAPI backend for LLM Council."""

from __future__ import annotations

import os
import uuid
import json
import asyncio
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import storage
from .config import UPLOAD_DIR, COUNCIL_MODELS, CHAIRMAN_MODEL, MODEL_PRICING
from .council import run_full_council, generate_conversation_title, stage1_collect_responses, stage2_collect_rankings, stage3_synthesize_final, calculate_aggregate_rankings
from .pricing import estimate_council_cost, DEFAULT_ASSUMPTIONS

app = FastAPI(title="LLM Council API")

DEFAULT_STYLE_CARD = (
    "Write in a clear, confident narrative voice. Favor crisp verbs, short paragraphs, and vivid but unfussy detail. "
    "Use first-person plural when appropriate, keep jargon light, and land each section with a takeaway. "
    "Avoid hype. Keep sentences varied (mix of simple and complex) and aim for approachable business prose."
)

DEFAULT_SECTIONS = ["Context", "Challenge", "Actions", "Results", "Lessons"]
DEFAULT_LENGTH = "500-700 words unless overridden."

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

storage.ensure_upload_dir()
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation."""
    pass


class Attachment(BaseModel):
    """Attachment metadata."""
    name: str
    url: str
    mime_type: Optional[str] = None
    size: Optional[int] = None


class CaseStudySettings(BaseModel):
    """Optional structured inputs for case study generation."""
    case_context: Optional[str] = None
    key_facts: Optional[str] = None
    style_card: Optional[str] = None
    exemplar_snippets: Optional[str] = None
    length: Optional[str] = None
    sections: Optional[List[str]] = None
    sensitivities: Optional[str] = None
    mode: Optional[str] = None  # draft | edit | fact_check
    output_extras: Optional[List[str]] = None
    existing_text: Optional[str] = None


class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""
    content: str
    attachments: Optional[List[Attachment]] = None
    case_settings: Optional[CaseStudySettings] = None


class EstimateCostRequest(BaseModel):
    """Request payload for estimating council cost."""
    message_length_chars: int
    attachment_length_chars: Optional[int] = 0
    chars_per_token: Optional[float] = None
    stage1_output_multiplier: Optional[float] = None
    stage2_input_multiplier: Optional[float] = None
    stage2_output_multiplier: Optional[float] = None
    stage3_input_multiplier: Optional[float] = None
    stage3_output_multiplier: Optional[float] = None
    models: Optional[List[str]] = None
    chairman_model: Optional[str] = None


class ConversationMetadata(BaseModel):
    """Conversation metadata for list view."""
    id: str
    created_at: str
    title: str
    message_count: int


class Conversation(BaseModel):
    """Full conversation with all messages."""
    id: str
    created_at: str
    title: str
    messages: List[Dict[str, Any]]


def format_user_content(
    content: str,
    attachments: Optional[List[Attachment]],
    case_settings: Optional[CaseStudySettings],
) -> str:
    """Combine user content, case study settings, and attachment context for the models."""
    sections = (case_settings.sections or DEFAULT_SECTIONS) if case_settings else DEFAULT_SECTIONS
    extras = case_settings.output_extras if case_settings else None
    lines = [
        "CASE STUDY TASK",
        f"User request: {content}",
        "",
        "Case context:",
        (case_settings.case_context if case_settings and case_settings.case_context else "Not provided"),
        "",
        "Key facts / timeline / metrics:",
        (case_settings.key_facts if case_settings and case_settings.key_facts else "Not provided"),
        "",
        "Mode:",
        (case_settings.mode if case_settings and case_settings.mode else "draft (write new)"),
    ]

    if case_settings and case_settings.existing_text:
        lines.extend([
            "",
            "Existing draft to refine:",
            case_settings.existing_text,
        ])

    lines.extend([
        "",
        "Style card to obey:",
        (case_settings.style_card if case_settings and case_settings.style_card else DEFAULT_STYLE_CARD),
    ])

    if case_settings and case_settings.exemplar_snippets:
        lines.extend([
            "",
            "Exemplar snippets (match rhythm/voice):",
            case_settings.exemplar_snippets,
        ])

    lines.extend([
        "",
        "Section order to enforce:",
        "\n".join([f"- {sec}" for sec in sections]) or "Use default: Context, Challenge, Actions, Results, Lessons",
        "",
        "Length target:",
        (case_settings.length if case_settings and case_settings.length else DEFAULT_LENGTH),
        "",
        "Sensitivities / anonymization / legal notes:",
        (case_settings.sensitivities if case_settings and case_settings.sensitivities else "None provided"),
    ])

    if extras:
        lines.extend([
            "",
            "Output extras requested:",
            "\n".join([f"- {item}" for item in extras]),
        ])

    lines.extend([
        "",
        "Ground rules:",
        "- Do not invent facts; mark unknowns as [TODO].",
        "- Keep voice consistent with the style card.",
        "- Use the section order above; keep headers visible.",
    ])

    if attachments:
        lines.extend([
            "",
            "Attachment context:",
        ])
        for att in attachments:
            parts = [f"- {att.name}"]
            if att.mime_type:
                parts.append(f"({att.mime_type})")
            if att.size:
                parts.append(f"{att.size} bytes")
            parts.append(f"URL: {att.url}")
            lines.append(" ".join(parts))

    return "\n".join(lines)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "LLM Council API"}


@app.get("/api/conversations", response_model=List[ConversationMetadata])
async def list_conversations():
    """List all conversations (metadata only)."""
    return storage.list_conversations()


@app.post("/api/conversations", response_model=Conversation)
async def create_conversation(request: CreateConversationRequest):
    """Create a new conversation."""
    conversation_id = str(uuid.uuid4())
    conversation = storage.create_conversation(conversation_id)
    return conversation


@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str):
    """Get a specific conversation with all its messages."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


class UpdateConversationRequest(BaseModel):
    """Update conversation metadata."""
    title: Optional[str] = None
    work_mode: Optional[str] = None


@app.patch("/api/conversations/{conversation_id}", response_model=Conversation)
async def update_conversation(conversation_id: str, request: UpdateConversationRequest):
    """Update conversation metadata such as title and work mode."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if request.title is not None:
        storage.update_conversation_title(conversation_id, request.title)

    if request.work_mode is not None or hasattr(request, 'work_mode'):
        try:
            storage.update_conversation_work_mode(conversation_id, request.work_mode)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    conversation = storage.get_conversation(conversation_id)  # reload
    return conversation


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    storage.delete_conversation(conversation_id)
    return {"status": "deleted", "id": conversation_id}


@app.get("/api/library/files")
async def get_library_files():
    """Get all uploaded files across all conversations."""
    files = storage.get_all_uploaded_files()
    return {"files": files, "total": len(files)}


# ==================== Project Endpoints ====================

@app.get("/api/projects")
async def get_projects():
    """Get all projects."""
    projects = storage.get_all_projects()
    return {"projects": projects}


@app.post("/api/projects")
async def create_project(request: dict):
    """Create a new project."""
    name = request.get("name")
    color = request.get("color", "#10b981")
    
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")
    
    project_id = str(uuid.uuid4())
    project = storage.create_project(project_id, name, color)
    return project


@app.put("/api/projects/{project_id}")
async def update_project(project_id: str, request: dict):
    """Update a project."""
    name = request.get("name")
    color = request.get("color")
    
    project = storage.update_project(project_id, name=name, color=color)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project."""
    success = storage.delete_project(project_id)
    return {"status": "deleted", "id": project_id}


@app.put("/api/conversations/{conversation_id}/project")
async def assign_conversation_to_project(conversation_id: str, request: dict):
    """Assign a conversation to a project."""
    project_id = request.get("project_id")  # Can be None to unassign
    
    success = storage.assign_conversation_to_project(conversation_id, project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {"status": "updated", "conversation_id": conversation_id, "project_id": project_id}


@app.post("/api/estimate_cost")
async def estimate_cost(request: EstimateCostRequest):
    """Estimate cost for a council run based on character counts and pricing."""
    if request.message_length_chars < 0 or (request.attachment_length_chars or 0) < 0:
        raise HTTPException(status_code=400, detail="Character lengths must be non-negative")

    assumptions_override = {}
    for key in [
        "chars_per_token",
        "stage1_output_multiplier",
        "stage2_input_multiplier",
        "stage2_output_multiplier",
        "stage3_input_multiplier",
        "stage3_output_multiplier",
    ]:
        value = getattr(request, key)
        if value is not None:
            assumptions_override[key] = value

    total_chars = request.message_length_chars + (request.attachment_length_chars or 0)
    models = request.models or COUNCIL_MODELS
    chair_model = request.chairman_model or CHAIRMAN_MODEL

    estimate = estimate_council_cost(
        total_chars=total_chars,
        models=models,
        chairman_model=chair_model,
        pricing=MODEL_PRICING,
        assumptions={**DEFAULT_ASSUMPTIONS, **assumptions_override},
    )

    return estimate


@app.get("/api/conversations/{conversation_id}/export")
async def export_conversation(conversation_id: str):
    """Export a conversation as JSON."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    payload = json.dumps(conversation, indent=2)
    headers = {"Content-Disposition": f'attachment; filename="{conversation_id}.json"'}
    return Response(content=payload, media_type="application/json", headers=headers)


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file and return metadata."""
    storage.ensure_upload_dir()

    filename = f"{uuid.uuid4()}_{file.filename}"
    upload_path = os.path.join(UPLOAD_DIR, filename)

    contents = await file.read()
    with open(upload_path, "wb") as f:
        f.write(contents)

    file_size = len(contents)

    return {
        "name": file.filename,
        "stored_name": filename,
        "url": f"/uploads/{filename}",
        "mime_type": file.content_type,
        "size": file_size,
    }


@app.post("/api/conversations/{conversation_id}/message")
async def send_message(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and run the 3-stage council process.
    Returns the complete response with all stages.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    # Add user message
    storage.add_user_message(
        conversation_id,
        request.content,
        attachments=[att.dict() for att in (request.attachments or [])],
        case_settings=request.case_settings.dict() if request.case_settings else {}
    )

    # If this is the first message, generate a title
    if is_first_message:
        title = await generate_conversation_title(request.content)
        storage.update_conversation_title(conversation_id, title)

    # Run the 3-stage council process
    user_prompt = format_user_content(request.content, request.attachments, request.case_settings)
    stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        user_prompt
    )

    # Add assistant message with all stages
    storage.add_assistant_message(
        conversation_id,
        stage1_results,
        stage2_results,
        stage3_result,
        metadata
    )

    # Return the complete response with metadata
    return {
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "metadata": metadata
    }


@app.post("/api/conversations/{conversation_id}/message/stream")
async def send_message_stream(conversation_id: str, message_request: SendMessageRequest, request: Request):
    """
    Send a message and stream the 3-stage council process.
    Returns Server-Sent Events as each stage completes.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    async def event_generator():
        try:
            # Check if client disconnected before starting
            if await request.is_disconnected():
                print(f"Client disconnected before processing started for conversation {conversation_id}")
                return

            # Add user message
            storage.add_user_message(
                conversation_id,
                message_request.content,
                attachments=[att.dict() for att in (message_request.attachments or [])],
                case_settings=message_request.case_settings.dict() if message_request.case_settings else {}
            )

            # Start title generation in parallel (don't await yet)
            title_task = None
            if is_first_message:
                title_task = asyncio.create_task(generate_conversation_title(message_request.content))

            # Stage 1: Collect responses
            if await request.is_disconnected():
                print(f"Client disconnected before Stage 1 for conversation {conversation_id}")
                if title_task:
                    title_task.cancel()
                return

            user_prompt = format_user_content(message_request.content, message_request.attachments, message_request.case_settings)
            yield f"data: {json.dumps({'type': 'stage1_start'})}\n\n"
            stage1_results = await stage1_collect_responses(user_prompt, request=request)
            yield f"data: {json.dumps({'type': 'stage1_complete', 'data': stage1_results})}\n\n"

            # Stage 2: Collect rankings
            if await request.is_disconnected():
                print(f"Client disconnected before Stage 2 for conversation {conversation_id}")
                if title_task:
                    title_task.cancel()
                return

            yield f"data: {json.dumps({'type': 'stage2_start'})}\n\n"
            stage2_results, label_to_model = await stage2_collect_rankings(user_prompt, stage1_results, request=request)
            aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
            metadata = {'label_to_model': label_to_model, 'aggregate_rankings': aggregate_rankings}
            yield f"data: {json.dumps({'type': 'stage2_complete', 'data': stage2_results, 'metadata': metadata})}\n\n"

            # Stage 3: Synthesize final answer
            if await request.is_disconnected():
                print(f"Client disconnected before Stage 3 for conversation {conversation_id}")
                if title_task:
                    title_task.cancel()
                return

            yield f"data: {json.dumps({'type': 'stage3_start'})}\n\n"
            stage3_result = await stage3_synthesize_final(user_prompt, stage1_results, stage2_results, request=request)
            yield f"data: {json.dumps({'type': 'stage3_complete', 'data': stage3_result})}\n\n"

            # Wait for title generation if it was started
            if title_task:
                title = await title_task
                storage.update_conversation_title(conversation_id, title)
                yield f"data: {json.dumps({'type': 'title_complete', 'data': {'title': title}})}\n\n"

            # Save complete assistant message
            storage.add_assistant_message(
                conversation_id,
                stage1_results,
                stage2_results,
                stage3_result,
                metadata
            )

            # Send completion event
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except asyncio.CancelledError:
            print(f"Request cancelled for conversation {conversation_id}")
            return
        except Exception as e:
            # Send error event
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
