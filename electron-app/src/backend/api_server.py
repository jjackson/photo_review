"""
FastAPI backend server for Photo Review Utility Electron app
Exposes the existing Python functionality as REST API endpoints
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
import json
from datetime import datetime
import base64

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Add parent directory to path to import photo_utility modules
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.photo_utility.scanner import scan_directory_for_photos, group_by_question_id, group_by_form_id
from src.photo_utility.filenames import parse_commcare_filename, PhotoMeta
from src.photo_utility.gui import find_env_file

app = FastAPI(title="Photo Review Utility API")

# Enable CORS for Electron renderer
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
session_state = {
    "valid_metas": [],
    "invalid_paths": [],
    "question_options": [],
    "session_config": None,
    "session_visits": [],
    "results": []
}


# Request/Response Models
class ScanDirectoryRequest(BaseModel):
    directory: str


class APIDataRequest(BaseModel):
    api_file: str
    date_start: str
    date_end: str
    limit: int


class BuildSessionRequest(BaseModel):
    question_ids: List[str]
    buckets: List[str]
    percent: float
    include_known_bad: bool
    known_bad_dir: Optional[str] = None
    known_bad_count: Optional[int] = None


class RecordResultRequest(BaseModel):
    visit_index: int
    bucket: str
    reviewer_name: str


class SettingsData(BaseModel):
    reviewer_name: Optional[str] = None
    last_directory: Optional[str] = None
    api_file: Optional[str] = None


@app.get("/")
async def root():
    return {"status": "Photo Review API Server Running"}


@app.post("/scan-directory")
async def scan_directory(request: ScanDirectoryRequest):
    """Scan a local directory for photos"""
    try:
        directory = Path(request.directory)
        if not directory.exists() or not directory.is_dir():
            raise HTTPException(status_code=400, detail="Invalid directory")
        
        valid, invalid = scan_directory_for_photos(directory)
        
        # Convert PhotoMeta objects to dictionaries
        valid_dicts = [
            {
                "json_block": m.json_block,
                "question_id": m.question_id,
                "user_id": m.user_id,
                "form_id": m.form_id,
                "extension": m.extension,
                "filename": m.filename,
                "filepath": str(m.filepath)
            }
            for m in valid
        ]
        
        # Store in session
        session_state["valid_metas"] = valid
        session_state["invalid_paths"] = [str(p) for p in invalid]
        
        # Group by question ID
        groups = group_by_question_id(valid)
        session_state["question_options"] = sorted(groups.keys())
        
        # Return counts for each question
        question_counts = {q: len(groups[q]) for q in session_state["question_options"]}
        
        return {
            "success": True,
            "valid_count": len(valid),
            "invalid_count": len(invalid),
            "question_options": session_state["question_options"],
            "question_counts": question_counts,
            "has_invalid": len(invalid) > 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api-data")
async def get_api_data(request: APIDataRequest):
    """Download photos from CommCareHQ API"""
    try:
        # Import necessary functions
        import requests
        from pathlib import Path
        
        # Parse domain/app pairs file
        domain_form_pairs = parse_domain_form_file(request.api_file)
        if not domain_form_pairs:
            raise HTTPException(status_code=400, detail="Could not parse domain/app pairs file")
        
        # Find .env file
        env_file = find_env_file()
        if not env_file:
            raise HTTPException(status_code=400, detail="Could not find .env file")
        
        # Load API credentials
        api_username, api_key = load_api_credentials(env_file)
        if not api_username or not api_key:
            raise HTTPException(status_code=400, detail="Could not load API credentials")
        
        # Get forms from API
        forms_data = get_forms_from_api(
            domain_form_pairs, 
            request.date_start, 
            request.date_end, 
            api_username, 
            api_key, 
            request.limit
        )
        
        if not forms_data:
            raise HTTPException(status_code=404, detail="No forms found")
        
        # Download attachments
        downloaded_photos = download_attachments(forms_data, request.limit, api_username, api_key)
        
        if not downloaded_photos:
            raise HTTPException(status_code=404, detail="No photos found in forms")
        
        # Process downloaded photos
        process_downloaded_photos(downloaded_photos)
        
        # Group by question ID
        groups = group_by_question_id(session_state["valid_metas"])
        session_state["question_options"] = sorted(groups.keys())
        question_counts = {q: len(groups[q]) for q in session_state["question_options"]}
        
        return {
            "success": True,
            "valid_count": len(downloaded_photos),
            "question_options": session_state["question_options"],
            "question_counts": question_counts,
            "downloaded_count": len(downloaded_photos)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/build-session")
async def build_session(request: BuildSessionRequest):
    """Build a review session with selected filters"""
    try:
        import random
        
        if not session_state["valid_metas"]:
            raise HTTPException(status_code=400, detail="No photos loaded")
        
        # Filter by selected questions
        chosen = [m for m in session_state["valid_metas"] if m.question_id in request.question_ids]
        if not chosen:
            raise HTTPException(status_code=400, detail="No photos match selected filters")
        
        # Group by form_id (visit)
        visits = {}
        for m in chosen:
            if m.form_id not in visits:
                visits[m.form_id] = []
            visits[m.form_id].append(m)
        
        visit_items = list(visits.items())
        random.shuffle(visit_items)
        
        # Determine target count
        target_photos = max(1, int(round(len(chosen) * (request.percent / 100.0))))
        
        selected_visits = []
        total = 0
        for form_id, metas in visit_items:
            selected_visits.append({
                "form_id": form_id,
                "user_id": metas[0].user_id,
                "photos": [
                    {
                        "filepath": str(m.filepath),
                        "filename": m.filename,
                        "question_id": m.question_id,
                        "form_id": m.form_id,
                        "user_id": m.user_id
                    }
                    for m in metas
                ],
                "is_known_bad": False
            })
            total += len(metas)
            if total >= target_photos:
                break
        
        # Handle known bad photos
        if request.include_known_bad and request.known_bad_dir and request.known_bad_count:
            kb_dir = Path(request.known_bad_dir)
            kb_paths = [p for p in kb_dir.iterdir() if p.is_file()]
            random.shuffle(kb_paths)
            kb_paths = kb_paths[:request.known_bad_count]
            
            if kb_paths:
                kb_visits = []
                for i, p in enumerate(kb_paths):
                    kb_visits.append({
                        "form_id": f"KNOWN_BAD_{i}",
                        "user_id": "",
                        "photos": [{
                            "filepath": str(p),
                            "filename": p.name,
                            "question_id": "known_bad",
                            "form_id": f"KNOWN_BAD_{i}",
                            "user_id": ""
                        }],
                        "is_known_bad": True
                    })
                
                all_visits = selected_visits + kb_visits
                random.shuffle(all_visits)
                selected_visits = all_visits
        
        session_state["session_visits"] = selected_visits
        session_state["session_config"] = request.dict()
        session_state["results"] = []
        
        return {
            "success": True,
            "visit_count": len(selected_visits),
            "total_photos": sum(len(v["photos"]) for v in selected_visits)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/session-visit/{index}")
async def get_session_visit(index: int):
    """Get a specific visit from the session"""
    try:
        if index < 0 or index >= len(session_state["session_visits"]):
            raise HTTPException(status_code=404, detail="Visit not found")
        
        visit = session_state["session_visits"][index]
        
        # Load images as base64
        photos_with_data = []
        for photo in visit["photos"]:
            try:
                with open(photo["filepath"], "rb") as f:
                    image_data = base64.b64encode(f.read()).decode('utf-8')
                    # Detect image type
                    ext = Path(photo["filepath"]).suffix.lower()
                    mime_type = "image/jpeg"
                    if ext in [".png"]:
                        mime_type = "image/png"
                    elif ext in [".gif"]:
                        mime_type = "image/gif"
                    
                    photos_with_data.append({
                        **photo,
                        "image_data": f"data:{mime_type};base64,{image_data}"
                    })
            except Exception as e:
                photos_with_data.append({
                    **photo,
                    "error": f"Failed to load image: {str(e)}"
                })
        
        return {
            "visit": {
                **visit,
                "photos": photos_with_data
            },
            "index": index,
            "total": len(session_state["session_visits"])
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/record-result")
async def record_result(request: RecordResultRequest):
    """Record the result for a visit"""
    try:
        if request.visit_index < 0 or request.visit_index >= len(session_state["session_visits"]):
            raise HTTPException(status_code=404, detail="Visit not found")
        
        visit = session_state["session_visits"][request.visit_index]
        
        if visit.get("is_known_bad", False):
            # For known-bad photos
            photo_filename = visit["photos"][0]["filename"] if visit["photos"] else "unknown"
            session_state["results"].append({
                "form_id": photo_filename,
                "user_id": visit["form_id"],
                "reviewer": request.reviewer_name,
                "bucket": request.bucket,
                "is_known_bad": True,
                "date_reviewed": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
        else:
            # For real photos
            session_state["results"].append({
                "form_id": visit["form_id"],
                "user_id": visit.get("user_id", ""),
                "reviewer": request.reviewer_name,
                "bucket": request.bucket,
                "is_known_bad": False,
                "date_reviewed": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
        
        # Check if review is complete
        is_complete = (request.visit_index + 1) >= len(session_state["session_visits"])
        
        return {
            "success": True,
            "is_complete": is_complete,
            "results_count": len(session_state["results"])
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/export-results")
async def export_results():
    """Get results for export"""
    try:
        return {
            "results": session_state["results"],
            "count": len(session_state["results"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/settings")
async def get_settings():
    """Load saved settings"""
    try:
        settings = {}
        settings_file = Path.cwd() / "app_settings.txt"
        
        if settings_file.exists():
            with open(settings_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("reviewer_name:"):
                        settings["reviewer_name"] = line.split(":", 1)[1].strip()
                    elif line.startswith("last_directory:"):
                        settings["last_directory"] = line.split(":", 1)[1].strip()
                    elif line.startswith("api_file:"):
                        settings["api_file"] = line.split(":", 1)[1].strip()
        
        return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/settings")
async def save_settings(settings: SettingsData):
    """Save settings"""
    try:
        settings_file = Path.cwd() / "app_settings.txt"
        
        with open(settings_file, "w", encoding="utf-8") as f:
            if settings.reviewer_name:
                f.write(f"reviewer_name:{settings.reviewer_name}\n")
            if settings.last_directory:
                f.write(f"last_directory:{settings.last_directory}\n")
            if settings.api_file:
                f.write(f"api_file:{settings.api_file}\n")
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Helper functions (adapted from gui.py)
def parse_domain_form_file(file_path: str) -> dict:
    """Parse the domain/app pairs file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        lines = [line.strip() for line in content.split('\n') if line.strip() and not line.strip().startswith('#')]
        content = '\n'.join(lines)
        
        data = json.loads(content)
        
        domain_form_pairs = {}
        for domain, app_id in data.items():
            if app_id.startswith('http'):
                app_id = app_id.split('/')[-1]
            domain_form_pairs[domain] = app_id
        
        return domain_form_pairs
    except Exception as e:
        print(f"Error parsing domain/app file: {e}")
        return {}


def load_api_credentials(env_file: str) -> tuple:
    """Load API credentials from .env file"""
    try:
        username = ""
        api_key = ""
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('COMMCARE_USERNAME='):
                    username = line.split('=', 1)[1].strip()
                elif line.startswith('COMMCARE_API_KEY='):
                    api_key = line.split('=', 1)[1].strip()
        
        return username, api_key
    except Exception as e:
        print(f"Error loading credentials: {e}")
        return "", ""


def get_forms_from_api(domain_form_pairs: dict, date_start: str, date_end: str, username: str, api_key: str, limit: int) -> list:
    """Get forms from CommCare List Forms API"""
    import requests
    
    all_forms = []
    
    for domain, app_id in domain_form_pairs.items():
        try:
            url = f"https://www.commcarehq.org/a/{domain}/api/v0.5/form/"
            
            params = {
                'app_id': app_id,
                'limit': limit
            }
            
            if date_start and date_start.strip():
                params['received_on_start'] = date_start
            if date_end and date_end.strip():
                params['received_on_end'] = date_end
            
            response = requests.get(url, auth=(username, api_key), params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if 'objects' in data:
                    forms = data['objects']
                    all_forms.extend(forms)
        except Exception as e:
            print(f"Error getting forms for domain {domain}: {e}")
            continue
    
    return all_forms


def download_attachments(forms_data: list, limit: int, username: str, api_key: str) -> list:
    """Download attachments from forms"""
    import requests
    
    downloaded_photos = []
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    download_dir = Path("downloaded_photos") / f"session_{timestamp}"
    download_dir.mkdir(parents=True, exist_ok=True)
    
    for form in forms_data:
        form_data = form.get('form', {})
        meta = form_data.get('meta', {})
        user_id = meta.get('userID', 'unknown')
        form_id = form.get('id', 'unknown')
        
        attachments = form.get('attachments', {})
        
        for attachment_name, attachment_info in attachments.items():
            if attachment_name.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp')):
                try:
                    download_url = attachment_info.get('download_url') or attachment_info.get('url')
                    
                    if download_url:
                        photo_response = requests.get(download_url, auth=(username, api_key), timeout=30)
                        photo_response.raise_for_status()
                        
                        question_name = extract_question_name(attachment_name, form)
                        
                        file_ext = Path(attachment_name).suffix
                        filename = f"api_photo-{question_name}-{user_id}-form_{form_id}{file_ext}"
                        file_path = download_dir / filename
                        
                        with open(file_path, 'wb') as f:
                            f.write(photo_response.content)
                        
                        downloaded_photos.append(str(file_path))
                except Exception as e:
                    print(f"Error downloading {attachment_name}: {e}")
                    continue
    
    return downloaded_photos


def extract_question_name(attachment_name: str, form: dict) -> str:
    """Extract question name from form data"""
    form_data = form.get('form', {})
    
    def find_question_in_data(data, path=""):
        if isinstance(data, dict):
            for key, value in data.items():
                current_path = f"{path}.{key}" if path else key
                if isinstance(value, str) and (value == attachment_name or attachment_name in value):
                    return key
                elif isinstance(value, dict):
                    result = find_question_in_data(value, current_path)
                    if result:
                        return result
        return None
    
    question_name = find_question_in_data(form_data)
    if question_name:
        return question_name
    
    return attachment_name.replace('.jpg', '').replace('.jpeg', '').replace('.png', '')


def process_downloaded_photos(downloaded_photos: list) -> None:
    """Process downloaded photos and update session state"""
    session_state["valid_metas"] = []
    
    for photo_path in downloaded_photos:
        photo_path_obj = Path(photo_path)
        parsed_meta = parse_commcare_filename(photo_path_obj)
        
        if parsed_meta:
            session_state["valid_metas"].append(parsed_meta)
        else:
            # Create basic PhotoMeta
            filename = photo_path_obj.name
            extension = photo_path_obj.suffix.lstrip('.')
            
            question_name = "api_photo"
            if filename.startswith(('test_photo-', 'api_photo-')):
                parts = filename.split('-')
                if len(parts) >= 3:
                    question_name = parts[1]
            
            from src.photo_utility.filenames import PhotoMeta
            meta = PhotoMeta(
                json_block="api_download",
                question_id=question_name,
                user_id="unknown",
                form_id="unknown",
                extension=extension,
                filename=filename,
                filepath=photo_path_obj
            )
            session_state["valid_metas"].append(meta)


def run_server(port: int = 8765):
    """Run the FastAPI server"""
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")


if __name__ == "__main__":
    run_server()
