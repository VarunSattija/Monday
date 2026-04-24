from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from auth import get_current_user
from database import get_db
from models import Board, BoardColumn, ColumnOption, Group, Item
from datetime import datetime
import uuid
import io
import csv

router = APIRouter(prefix="/import", tags=["import"])
db = get_db()

GROUP_COLORS = [
    "#579bfc", "#a25ddc", "#00c875", "#fdab3d", "#e2445c",
    "#0086c0", "#037f4c", "#caa2ff", "#ff5ac4", "#66ccff"
]


def guess_column_type(header: str, sample_values: list):
    """Guess column type from header name and sample values."""
    h = header.lower().strip()
    if h in ("status", "state", "progress"):
        return "status"
    if h in ("priority", "urgency"):
        return "priority"
    if h in ("person", "owner", "assigned", "assignee", "assigned to"):
        return "person"
    if h in ("date", "due date", "deadline", "start date", "end date", "timeline",
             "date sign up", "comp date", "inv date", "pred comp", "pred pay"):
        return "date"
    if h in ("link", "url", "website", "app", "offer", "files"):
        return "link"
    # Detect number columns by header keywords
    num_keywords = ("fee", "amount", "price", "cost", "total", "paid", "proc", "broker",
                    "life fee", "exc.", "payment", "p price", "m amount")
    if any(kw in h for kw in num_keywords):
        return "numbers"
    # Check if most sample values are URLs
    url_count = sum(1 for v in sample_values[:10] if v and str(v).startswith("http"))
    if url_count >= len(sample_values[:10]) * 0.5 and url_count >= 2:
        return "link"
    # Check if most sample values are numeric
    num_count = 0
    for v in sample_values[:10]:
        if v is not None:
            try:
                float(str(v).replace(',', '').replace('£', '').replace('$', '').replace('€', ''))
                num_count += 1
            except (ValueError, TypeError):
                pass
    if num_count >= len(sample_values[:10]) * 0.6 and num_count >= 3:
        return "numbers"
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
    options.append({"id": str(len(options) + 1), "label": "", "color": "#c4c4c4"})
    return options


def is_blank_row(row):
    """Check if a row is completely blank."""
    return all(cell is None or (isinstance(cell, str) and not cell.strip()) for cell in row)


def is_header_row(row, known_headers):
    """Check if a row is a repeated header row by comparing with known headers."""
    if not known_headers:
        return False
    row_vals = [str(cell).strip() if cell is not None else "" for cell in row]
    matches = sum(1 for i, h in enumerate(known_headers) if i < len(row_vals) and row_vals[i] == h)
    return matches >= max(3, len(known_headers) // 2)


def is_group_name_row(row):
    """Check if a row is a group name (only first cell has meaningful text, rest empty)."""
    non_empty = [(i, cell) for i, cell in enumerate(row) if cell is not None and str(cell).strip()]
    if len(non_empty) == 1 and non_empty[0][0] == 0:
        return str(non_empty[0][1]).strip()
    return None


def is_summary_row(row, name_col_idx=0):
    """Check if a row is a summary/totals row (name column is empty but other numeric data exists)."""
    if name_col_idx < len(row) and row[name_col_idx] is not None and str(row[name_col_idx]).strip():
        return False
    non_empty = sum(1 for cell in row if cell is not None and str(cell).strip())
    return non_empty > 0


def parse_groups_from_rows(all_rows, headers):
    """Parse rows into groups based on blank-row-separated sections.
    
    Pattern:
    - [Title row] (optional, first cell only)
    - [Group name row] (optional, first cell only, colored)
    - Header row
    - Data rows
    - [Summary row] (optional)
    - Blank row (separator)
    - Group name row (first cell only)
    - Header row (repeated)
    - Data rows
    - ...
    """
    groups = []
    current_group_name = None
    current_data_rows = []
    found_first_header = False

    for row_idx, row in enumerate(all_rows):
        if is_blank_row(row):
            # Save current group if we have data
            if current_data_rows:
                groups.append({
                    "name": current_group_name or "Default",
                    "rows": current_data_rows
                })
                current_data_rows = []
                current_group_name = None
            continue

        # Check if this is a group name row (only first cell has content)
        group_name = is_group_name_row(row)
        if group_name is not None:
            # If we haven't found the first header yet, this might be the title or first group name
            if not found_first_header:
                current_group_name = group_name
            else:
                # This is a new group name after a separator
                current_group_name = group_name
            continue

        # Check if this is a header row
        if is_header_row(row, headers):
            found_first_header = True
            continue

        # Check if this is a summary row (name column empty, has numeric data)
        if is_summary_row(row, name_col_idx=0):
            continue

        # This is a data row
        if not found_first_header:
            # Haven't found headers yet, try to detect if this IS the header
            non_empty_vals = [str(cell).strip() for cell in row if cell is not None and str(cell).strip()]
            if len(non_empty_vals) >= 3:
                # Might be the header row itself
                found_first_header = True
            continue

        current_data_rows.append(row)

    # Don't forget the last group
    if current_data_rows:
        groups.append({
            "name": current_group_name or "Default",
            "rows": current_data_rows
        })

    return groups


@router.post("/excel")
async def import_from_excel(
    file: UploadFile = File(...),
    workspace_id: str = "",
    board_name: str = "",
    existing_board_id: str = Query("", description="If provided, append data to this existing board"),
    current_user: dict = Depends(get_current_user)
):
    if not workspace_id and not existing_board_id:
        raise HTTPException(status_code=400, detail="workspace_id or existing_board_id is required")

    content = await file.read()
    filename = file.filename.lower()
    all_rows = []
    headers = []

    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            ws = wb.active
            raw_rows = list(ws.iter_rows(values_only=True))
            if not raw_rows:
                raise HTTPException(status_code=400, detail="Empty file")
            all_rows = raw_rows
        elif filename.endswith(".csv"):
            text = content.decode("utf-8-sig")
            reader = csv.reader(io.StringIO(text))
            raw_rows = list(reader)
            if not raw_rows:
                raise HTTPException(status_code=400, detail="Empty file")
            all_rows = raw_rows
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use .xlsx or .csv")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    # Find the first header row - look for a row with many non-empty cells that look like headers
    header_row_idx = None
    for idx, row in enumerate(all_rows):
        non_empty = [str(cell).strip() for cell in row if cell is not None and str(cell).strip()]
        if len(non_empty) >= 3:
            # Check if first cell looks like a header name (not a data value)
            first_val = str(row[0]).strip() if row[0] else ""
            if first_val.lower() in ("name", "item", "task", "title", "item name", "task name"):
                header_row_idx = idx
                break
            # If we have many column-like strings, treat as header
            if len(non_empty) >= 5 and all(len(str(v)) < 40 for v in non_empty):
                header_row_idx = idx
                break

    if header_row_idx is None:
        # Fallback: use the first row with the most non-empty cells
        max_count = 0
        for idx, row in enumerate(all_rows[:10]):
            non_empty = sum(1 for cell in row if cell is not None and str(cell).strip())
            if non_empty > max_count:
                max_count = non_empty
                header_row_idx = idx

    if header_row_idx is None:
        raise HTTPException(status_code=400, detail="No headers found")

    headers = [str(h).strip() if h else f"Column {i+1}" for i, h in enumerate(all_rows[header_row_idx])]
    # Remove trailing empty headers
    while headers and (not headers[-1] or headers[-1].startswith("Column ")):
        # Keep if there's data in that column
        col_idx = len(headers) - 1
        has_data = any(
            len(row) > col_idx and row[col_idx] is not None
            for row in all_rows[header_row_idx + 1: header_row_idx + 20]
        )
        if not has_data:
            headers.pop()
        else:
            break

    # Parse groups from all rows after finding headers
    parsed_groups = parse_groups_from_rows(all_rows, headers)
    if not parsed_groups:
        # Fallback: treat all rows after header as single group
        data_rows = [r for r in all_rows[header_row_idx + 1:] if not is_blank_row(r)]
        parsed_groups = [{"name": "Imported Items", "rows": data_rows}]

    # Find the name column index
    name_col_idx = 0
    for i, h in enumerate(headers):
        if h.lower() in ("name", "item", "task", "title", "item name", "task name"):
            name_col_idx = i
            break

    # Build column samples for type detection (from all group data)
    all_data_rows = []
    for g in parsed_groups:
        all_data_rows.extend(g["rows"])
    col_samples = {i: [] for i in range(len(headers))}
    for row in all_data_rows[:50]:
        for i in range(min(len(row), len(headers))):
            if row[i] is not None:
                col_samples[i].append(row[i])

    if existing_board_id:
        # Append to existing board
        existing_board = await db.boards.find_one({"id": existing_board_id})
        if not existing_board:
            raise HTTPException(status_code=404, detail="Board not found")

        # Authorization check
        if current_user["id"] not in existing_board.get("member_ids", []) and existing_board.get("owner_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to import into this board")

        board_id = existing_board_id
        # Use existing columns, map imported headers to existing column ids
        existing_columns = existing_board.get("columns", [])
        col_map = {}
        for i, header in enumerate(headers):
            if i == name_col_idx:
                continue
            # Try to match by title (case-insensitive)
            matched = False
            for ecol in existing_columns:
                if ecol["title"].lower().strip() == header.lower().strip():
                    col_map[i] = ecol["id"]
                    matched = True
                    break
            if not matched:
                # Create new column for unmatched headers
                col_type = guess_column_type(header, col_samples.get(i, []))
                new_col = BoardColumn(title=header, type=col_type, width=150)
                if col_type in ("status", "priority"):
                    new_col.options = [ColumnOption(**o) for o in extract_status_options(col_samples.get(i, []))]
                col_map[i] = new_col.id
                await db.boards.update_one(
                    {"id": board_id},
                    {"$push": {"columns": new_col.dict()}}
                )
    else:
        # Create new board
        columns = [BoardColumn(title="Item", type="text", width=250)]
        col_map = {}
        for i, header in enumerate(headers):
            if i == name_col_idx:
                continue
            col_type = guess_column_type(header, col_samples.get(i, []))
            col = BoardColumn(title=header, type=col_type, width=150)
            if col_type in ("status", "priority"):
                col.options = [ColumnOption(**o) for o in extract_status_options(col_samples.get(i, []))]
            columns.append(col)
            col_map[i] = col.id

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
        board_id = board.id

    # Create groups and items
    total_items = 0
    groups_created = []
    for g_idx, g in enumerate(parsed_groups):
        group = Group(
            board_id=board_id,
            title=g["name"],
            color=GROUP_COLORS[g_idx % len(GROUP_COLORS)],
            position=g_idx
        )
        await db.groups.insert_one(group.dict())
        groups_created.append(g["name"])

        for row in g["rows"]:
            if is_blank_row(row):
                continue
            # Skip summary rows (name col empty)
            name_val = row[name_col_idx] if name_col_idx < len(row) else None
            if name_val is None or not str(name_val).strip():
                continue

            item_name = str(name_val).strip()
            column_values = {}
            for i, header in enumerate(headers):
                if i == name_col_idx or i not in col_map:
                    continue
                val = row[i] if i < len(row) else None
                if val is not None:
                    column_values[col_map[i]] = str(val).strip()

            item = Item(
                board_id=board_id,
                group_id=group.id,
                name=item_name,
                column_values=column_values,
                created_by=current_user["id"]
            )
            await db.items.insert_one(item.dict())
            total_items += 1

    return {
        "message": f"Successfully imported {total_items} items into {len(groups_created)} groups",
        "board_id": board_id,
        "items_created": total_items,
        "groups_created": groups_created,
        "columns_created": len(col_map) + (0 if existing_board_id else 1)
    }
