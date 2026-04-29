"""Routes that serve the Acuity SDK files for download."""
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse

router = APIRouter(prefix="/sdk", tags=["sdk"])

SDK_DIR = Path(__file__).resolve().parent.parent.parent / "sdk"


@router.get("/python")
async def get_python_sdk():
    f = SDK_DIR / "python" / "acuity_sdk.py"
    if not f.exists():
        raise HTTPException(status_code=404, detail="SDK file not found")
    return FileResponse(
        path=str(f),
        media_type="text/x-python",
        filename="acuity_sdk.py",
    )


@router.get("/javascript")
async def get_javascript_sdk():
    f = SDK_DIR / "javascript" / "acuity-sdk.js"
    if not f.exists():
        raise HTTPException(status_code=404, detail="SDK file not found")
    return FileResponse(
        path=str(f),
        media_type="application/javascript",
        filename="acuity-sdk.js",
    )


@router.get("/javascript/cdn")
async def get_javascript_sdk_cdn():
    """CDN-style endpoint: returns JS as text so users can <script src="...">."""
    f = SDK_DIR / "javascript" / "acuity-sdk.js"
    if not f.exists():
        raise HTTPException(status_code=404, detail="SDK file not found")
    return PlainTextResponse(content=f.read_text(), media_type="application/javascript")


@router.get("/readme")
async def get_readme():
    f = SDK_DIR / "README.md"
    if not f.exists():
        raise HTTPException(status_code=404, detail="README not found")
    return PlainTextResponse(content=f.read_text(), media_type="text/markdown")
