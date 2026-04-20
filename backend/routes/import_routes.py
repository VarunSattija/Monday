from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from auth import get_current_user
from database import get_db
from models import Board, BoardColumn, ColumnOption, Group, Item
from datetime import datetime
import uuid
import io
import csv

router = APIRouter(prefix="/import", tags=["import"])
db = get_db()


def guess_column_type(header: str, sample_values: list):
    """Guess column type from header name and sample values."""
    h = header.lower().strip()
    if h in ("status", "state", "progress"):
        return "status"
    if h in ("priority", "urgency"):
        return "priority"
    if h in ("person", "owner", "assigned", "assignee", "assigned to"):
        return "person"
    if h in ("date", "due date", "deadline", "start date", "end date", "timeline"):
        return "date"
    # Check if values look like dates
    for v in sample_values[:5]:
        if v and any(sep in str(v) for sep in ["/", "-"]) and len(str(v)) >= 8:
            try:
                from dateutil import parser
                parser.parse(str(v))
                return "date"
            except Exception:
                pass
    return "text"


def extract_status_options(values: list):
    """Extract unique status options from values."""
    colors = ["#fdab3d", "#00c875", "#e2445c", "#0086c0", "#a25ddc",
              "#037f4c", "#579bfc", "#caa2ff", "#ff5ac4", "#66ccff"]
    unique = list(dict.fromkeys([str(v).strip() for v in values if v and str(v).strip()]))
    options = []
    for i, label in enumerate(unique[:10]):
        options.append({
            "id": str(i + 1),
            "label": label,
            "color": colors[i % len(colors)]
        })
    # Add empty option
    options.append({"id": str(len(options) + 1), "label": "", "color": "#c4c4c4"})
    return options


@router.post("/excel")
async def import_from_excel(
    file: UploadFile = File(...),
    workspace_id: str = "",
    board_name: str = "",
    current_user: dict = Depends(get_current_user)
):
    if not workspace_id:
        raise HTTPException(status_code=400, detail="workspace_id is required")

    content = await file.read()
    filename = file.filename.lower()
    rows = []
    headers = []

    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            ws = wb.active
            all_rows = list(ws.iter_rows(values_only=True))
            if not all_rows:
                raise HTTPException(status_code=400, detail="Empty file")
            headers = [str(h).strip() if h else f"Column {i+1}" for i, h in enumerate(all_rows[0])]
            rows = all_rows[1:]
        elif filename.endswith(".csv"):
            text = content.decode("utf-8-sig")
            reader = csv.reader(io.StringIO(text))
            all_rows = list(reader)
            if not all_rows:
                raise HTTPException(status_code=400, detail="Empty file")
            headers = [h.strip() if h else f"Column {i+1}" for i, h in enumerate(all_rows[0])]
            rows = all_rows[1:]
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use .xlsx or .csv")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    if not headers:
        raise HTTPException(status_code=400, detail="No headers found")

    # Build column samples for type detection
    col_samples = {i: [] for i in range(len(headers))}
    for row in rows[:20]:
        for i in range(min(len(row), len(headers))):
            if row[i] is not None:
                col_samples[i].append(row[i])

    # Create columns (first column is always "Item" / name column)
    name_col_idx = 0
    # Try to find which column is the item name (usually first, or "Name", "Item", "Task")
    for i, h in enumerate(headers):
        if h.lower() in ("name", "item", "task", "title", "item name", "task name"):
            name_col_idx = i
            break

    columns = [BoardColumn(title="Item", type="text", width=250)]
    col_map = {}  # maps header index -> column id

    for i, header in enumerate(headers):
        if i == name_col_idx:
            continue
        col_type = guess_column_type(header, col_samples.get(i, []))
        col = BoardColumn(title=header, type=col_type, width=150)
        if col_type in ("status", "priority"):
            col.options = [ColumnOption(**o) for o in extract_status_options(col_samples.get(i, []))]
        columns.append(col)
        col_map[i] = col.id

    # Create the board
    final_name = board_name or file.filename.rsplit(".", 1)[0]
    board = Board(
        name=final_name,
        workspace_id=workspace_id,
        description=f"Imported from {file.filename}",
        columns=columns,
        owner_id=current_user["id"],
        member_ids=[current_user["id"]]
    )
    await db.boards.insert_one(board.dict())

    # Create a default group
    group = Group(board_id=board.id, title="Imported Items", color="#0086c0")
    await db.groups.insert_one(group.dict())

    # Create items from rows
    items_created = 0
    for row in rows:
        if not any(cell for cell in row):
            continue  # Skip empty rows

        item_name = str(row[name_col_idx]).strip() if name_col_idx < len(row) and row[name_col_idx] else f"Item {items_created + 1}"
        column_values = {}
        for i, header in enumerate(headers):
            if i == name_col_idx or i not in col_map:
                continue
            val = row[i] if i < len(row) else None
            if val is not None:
                column_values[col_map[i]] = str(val).strip()

        item = Item(
            board_id=board.id,
            group_id=group.id,
            name=item_name,
            column_values=column_values,
            created_by=current_user["id"]
        )
        await db.items.insert_one(item.dict())
        items_created += 1

    return {
        "message": f"Successfully imported {items_created} items into board '{final_name}'",
        "board_id": board.id,
        "items_created": items_created,
        "columns_created": len(columns)
    }
