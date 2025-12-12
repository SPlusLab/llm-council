"""JSON-based storage for conversations."""

import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from .config import DATA_DIR, UPLOAD_DIR


def ensure_data_dir():
    """Ensure the data directory exists."""
    Path(DATA_DIR).mkdir(parents=True, exist_ok=True)


def ensure_upload_dir():
    """Ensure the upload directory exists."""
    Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


def get_conversation_path(conversation_id: str) -> str:
    """Get the file path for a conversation."""
    return os.path.join(DATA_DIR, f"{conversation_id}.json")


def create_conversation(conversation_id: str) -> Dict[str, Any]:
    """
    Create a new conversation.

    Args:
        conversation_id: Unique identifier for the conversation

    Returns:
        New conversation dict
    """
    ensure_data_dir()

    conversation = {
        "id": conversation_id,
        "created_at": datetime.utcnow().isoformat(),
        "title": "New Conversation",
        "messages": [],
        "project_id": None,
        "work_mode": None
    }

    # Save to file
    path = get_conversation_path(conversation_id)
    with open(path, 'w') as f:
        json.dump(conversation, f, indent=2)

    return conversation


def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a conversation from storage.

    Args:
        conversation_id: Unique identifier for the conversation

    Returns:
        Conversation dict or None if not found
    """
    path = get_conversation_path(conversation_id)

    if not os.path.exists(path):
        return None

    with open(path, 'r') as f:
        return json.load(f)


def save_conversation(conversation: Dict[str, Any]):
    """
    Save a conversation to storage.

    Args:
        conversation: Conversation dict to save
    """
    ensure_data_dir()

    path = get_conversation_path(conversation['id'])
    with open(path, 'w') as f:
        json.dump(conversation, f, indent=2)


def update_conversation_work_mode(conversation_id: str, work_mode: Optional[str]):
    """
    Update a conversation's work mode.

    Args:
        conversation_id: Unique identifier for the conversation
        work_mode: Work mode ('case-study', 'meeting-minutes', or None)
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    # Validate work_mode
    if work_mode is not None and work_mode not in ['case-study', 'meeting-minutes']:
        raise ValueError(f"Invalid work_mode: {work_mode}")

    conversation['work_mode'] = work_mode
    save_conversation(conversation)


def list_conversations() -> List[Dict[str, Any]]:
    """
    List all conversations (metadata only).

    Returns:
        List of conversation metadata dicts
    """
    ensure_data_dir()

    conversations = []
    for filename in os.listdir(DATA_DIR):
        if filename.endswith('.json'):
            path = os.path.join(DATA_DIR, filename)
            # Skip non-conversation JSON files (e.g., project metadata)
            if filename.startswith("_"):
                continue
            try:
                with open(path, 'r') as f:
                    data = json.load(f)
                # Validate required keys to avoid breaking the response model
                if not all(key in data for key in ["id", "created_at", "messages"]):
                    continue
                conversations.append({
                    "id": data["id"],
                    "created_at": data["created_at"],
                    "title": data.get("title", "New Conversation"),
                    "message_count": len(data.get("messages", [])),
                    "project_id": data.get("project_id")
                })
            except (json.JSONDecodeError, OSError):
                # Ignore unreadable/bad files so one bad file doesn't 500 the endpoint
                continue

    # Sort by creation time, newest first
    conversations.sort(key=lambda x: x["created_at"], reverse=True)

    return conversations


def add_user_message(
    conversation_id: str,
    content: str,
    attachments: Optional[List[Dict[str, Any]]] = None,
    case_settings: Optional[Dict[str, Any]] = None
):
    """
    Add a user message to a conversation.

    Args:
        conversation_id: Conversation identifier
        content: User message content
        attachments: Optional list of attachment metadata dicts
        case_settings: Optional dict of case study inputs
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["messages"].append({
        "role": "user",
        "content": content,
        "attachments": attachments or [],
        "case_settings": case_settings or {}
    })

    save_conversation(conversation)


def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any],
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Add an assistant message with all 3 stages to a conversation.

    Args:
        conversation_id: Conversation identifier
        stage1: List of individual model responses
        stage2: List of model rankings
        stage3: Final synthesized response
        metadata: Optional metadata (e.g., label mapping, aggregate rankings)
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["messages"].append({
        "role": "assistant",
        "stage1": stage1,
        "stage2": stage2,
        "stage3": stage3,
        "metadata": metadata or {}
    })

    save_conversation(conversation)


def update_conversation_title(conversation_id: str, title: str):
    """
    Update the title of a conversation.

    Args:
        conversation_id: Conversation identifier
        title: New title for the conversation
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["title"] = title
    save_conversation(conversation)


def delete_conversation(conversation_id: str):
    """
    Delete a conversation and its file.
    """
    path = get_conversation_path(conversation_id)
    if os.path.exists(path):
        os.remove(path)


def get_all_uploaded_files() -> List[Dict[str, Any]]:
    """
    Get all uploaded files across all conversations.
    
    Returns:
        List of file metadata dicts with:
        - name: filename
        - url: file URL
        - mime_type: file MIME type
        - size: file size in bytes
        - uploaded_at: upload timestamp
        - conversation_id: source conversation ID
        - conversation_title: source conversation title
    """
    ensure_data_dir()
    
    files = []
    seen_urls = set()  # Deduplicate files
    
    for filename in os.listdir(DATA_DIR):
        if not filename.endswith('.json'):
            continue
            
        path = os.path.join(DATA_DIR, filename)
        try:
            with open(path, 'r') as f:
                conversation = json.load(f)
            
            conv_id = conversation.get("id")
            conv_title = conversation.get("title", "New Conversation")
            conv_created = conversation.get("created_at")
            
            # Scan all messages for attachments
            for msg in conversation.get("messages", []):
                if msg.get("role") != "user":
                    continue
                    
                for attachment in msg.get("attachments", []):
                    url = attachment.get("url")
                    if not url or url in seen_urls:
                        continue
                    
                    seen_urls.add(url)
                    files.append({
                        "name": attachment.get("name", "Unknown"),
                        "url": url,
                        "mime_type": attachment.get("mime_type"),
                        "size": attachment.get("size"),
                        "uploaded_at": conv_created,  # Use conversation created date as proxy
                        "conversation_id": conv_id,
                        "conversation_title": conv_title,
                    })
        except (json.JSONDecodeError, IOError) as e:
            # Skip corrupted files
            continue
    
    # Sort by upload date, newest first
    files.sort(key=lambda x: x.get("uploaded_at", ""), reverse=True)
    
    return files


# ==================== Project Management ====================

PROJECTS_FILE = os.path.join(DATA_DIR, "_projects.json")


def ensure_projects_file():
    """Ensure the projects file exists."""
    ensure_data_dir()
    if not os.path.exists(PROJECTS_FILE):
        with open(PROJECTS_FILE, 'w') as f:
            json.dump([], f, indent=2)


def get_all_projects() -> List[Dict[str, Any]]:
    """Get all projects."""
    ensure_projects_file()
    with open(PROJECTS_FILE, 'r') as f:
        return json.load(f)


def save_projects(projects: List[Dict[str, Any]]):
    """Save all projects."""
    ensure_projects_file()
    with open(PROJECTS_FILE, 'w') as f:
        json.dump(projects, f, indent=2)


def create_project(project_id: str, name: str, color: str = "#10b981") -> Dict[str, Any]:
    """Create a new project."""
    projects = get_all_projects()
    
    project = {
        "id": project_id,
        "name": name,
        "color": color,
        "created_at": datetime.utcnow().isoformat()
    }
    
    projects.append(project)
    save_projects(projects)
    
    return project


def update_project(project_id: str, name: Optional[str] = None, color: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Update a project."""
    projects = get_all_projects()
    
    for project in projects:
        if project["id"] == project_id:
            if name is not None:
                project["name"] = name
            if color is not None:
                project["color"] = color
            save_projects(projects)
            return project
    
    return None


def delete_project(project_id: str) -> bool:
    """Delete a project and remove project_id from all conversations."""
    projects = get_all_projects()
    projects = [p for p in projects if p["id"] != project_id]
    save_projects(projects)
    
    # Remove project_id from all conversations
    for filename in os.listdir(DATA_DIR):
        if filename.endswith('.json') and filename != "_projects.json":
            path = os.path.join(DATA_DIR, filename)
            with open(path, 'r') as f:
                conv = json.load(f)
            
            if conv.get("project_id") == project_id:
                conv["project_id"] = None
                with open(path, 'w') as f:
                    json.dump(conv, f, indent=2)
    
    return True


def assign_conversation_to_project(conversation_id: str, project_id: Optional[str]) -> bool:
    """Assign a conversation to a project."""
    conv = get_conversation(conversation_id)
    if not conv:
        return False
    
    conv["project_id"] = project_id
    save_conversation(conv)
    
    return True
