from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List
from datetime import datetime
from models import Form, FormCreate, FormUpdate, Item
from auth import get_current_user
from database import get_db
from routes.activity_helper import log_activity

router = APIRouter(prefix="/forms", tags=["forms"])
db = get_db()


def _serialize_form(form_doc: dict) -> dict:
    """Strip Mongo _id and return safe dict."""
    if not form_doc:
        return form_doc
    return {k: v for k, v in form_doc.items() if k != "_id"}


# -------- Authenticated routes (form management) --------

@router.post("", response_model=Form)
async def create_form(
    form_data: FormCreate,
    current_user: dict = Depends(get_current_user),
):
    board = await db.boards.find_one({"id": form_data.board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if (
        board.get("owner_id") != current_user["id"]
        and current_user["id"] not in board.get("member_ids", [])
    ):
        raise HTTPException(status_code=403, detail="Not authorized")

    form = Form(
        **form_data.dict(),
        created_by=current_user["id"],
    )
    await db.forms.insert_one(form.dict())
    return form


@router.get("/board/{board_id}", response_model=List[Form])
async def list_board_forms(
    board_id: str,
    current_user: dict = Depends(get_current_user),
):
    forms = await db.forms.find({"board_id": board_id}).sort("created_at", -1).to_list(500)
    return [Form(**_serialize_form(f)) for f in forms]


@router.put("/{form_id}", response_model=Form)
async def update_form(
    form_id: str,
    body: FormUpdate,
    current_user: dict = Depends(get_current_user),
):
    form = await db.forms.find_one({"id": form_id})
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    update = {k: v for k, v in body.dict().items() if v is not None}
    if "fields" in update:
        update["fields"] = [f if isinstance(f, dict) else f.dict() for f in update["fields"]]
    update["updated_at"] = datetime.utcnow()

    await db.forms.update_one({"id": form_id}, {"$set": update})
    updated = await db.forms.find_one({"id": form_id})
    return Form(**_serialize_form(updated))


@router.delete("/{form_id}")
async def delete_form(
    form_id: str,
    current_user: dict = Depends(get_current_user),
):
    result = await db.forms.delete_one({"id": form_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Form not found")
    return {"message": "Form deleted"}


# -------- Public routes (no authentication) --------

@router.get("/public/{form_id}")
async def get_public_form(form_id: str):
    """Anyone with the form_id can view the form schema."""
    form = await db.forms.find_one({"id": form_id})
    if not form or not form.get("enabled", True):
        raise HTTPException(status_code=404, detail="Form not available")

    board = await db.boards.find_one({"id": form["board_id"]})
    if not board:
        raise HTTPException(status_code=404, detail="Form not available")

    # Build only fields that are NOT hidden, in board column order
    field_settings = {fs["column_id"]: fs for fs in form.get("fields", [])}
    visible_columns = []
    for col in board.get("columns", []):
        cfg = field_settings.get(col["id"], {})
        if cfg.get("hidden"):
            continue
        visible_columns.append({
            "id": col["id"],
            "title": cfg.get("label") or col["title"],
            "type": col["type"],
            "options": col.get("options", []),
            "settings": col.get("settings", {}),
            "required": cfg.get("required", False),
            "description": cfg.get("description", ""),
        })

    # Always include Item Name as the first required field
    return {
        "id": form["id"],
        "name": form["name"],
        "description": form.get("description"),
        "success_message": form.get("success_message"),
        "board_name": board.get("name"),
        "columns": visible_columns,
    }


@router.post("/public/{form_id}/submit")
async def submit_public_form(form_id: str, body: dict = Body(...)):
    """Public form submission. Creates an Item on the board."""
    form = await db.forms.find_one({"id": form_id})
    if not form or not form.get("enabled", True):
        raise HTTPException(status_code=404, detail="Form not available")

    board = await db.boards.find_one({"id": form["board_id"]})
    if not board:
        raise HTTPException(status_code=404, detail="Form not available")

    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Item name is required")

    column_values = body.get("column_values", {}) or {}

    # Validate required fields
    field_settings = {fs["column_id"]: fs for fs in form.get("fields", [])}
    for col in board.get("columns", []):
        cfg = field_settings.get(col["id"], {})
        if cfg.get("hidden") or not cfg.get("required"):
            continue
        val = column_values.get(col["id"])
        if val is None or val == "" or (isinstance(val, list) and len(val) == 0):
            raise HTTPException(
                status_code=400,
                detail=f"Field '{cfg.get('label') or col['title']}' is required",
            )

    # Determine target group
    group_id = form.get("group_id")
    if not group_id:
        first_group = await db.groups.find_one({"board_id": board["id"]})
        if first_group:
            group_id = first_group["id"]

    item = Item(
        board_id=board["id"],
        group_id=group_id,
        name=name,
        column_values=column_values,
        created_by=form.get("created_by", "form-submission"),
    )
    await db.items.insert_one(item.dict())

    # Log activity
    await log_activity(
        board_id=board["id"],
        user_id=form.get("created_by", ""),
        user_name="Form Submission",
        action="created_via_form",
        item_name=name,
        column_name=form.get("name", "Form"),
        item_id=item.id,
    )

    # Trigger automations on item creation
    try:
        from routes.automation_engine import run_automations_for_item
        await run_automations_for_item(
            item_id=item.id,
            board_id=board["id"],
            old_column_values={},
            new_column_values=column_values,
            user_id=form.get("created_by", ""),
            user_name="Form Submission",
        )
    except Exception:
        pass

    return {
        "message": form.get("success_message") or "Submission received",
        "item_id": item.id,
    }
