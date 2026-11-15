"""Document processing service for PDF, DOCX, and text file extraction and chunking."""

import io
from typing import Dict, List, Tuple, Any, Optional
import structlog
import fitz  # PyMuPDF
import docx

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


def validate_file(filename: str, file_bytes: bytes) -> Tuple[bool, Optional[str]]:
    """
    Validate uploaded file format and size constraints.
    Returns (is_valid, error_message).
    """
    settings = get_settings()

    if not file_bytes or len(file_bytes) == 0:
        return False, "File is empty"

    if len(file_bytes) > settings.max_file_size_bytes:
        return (
            False,
            f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB",
        )

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    allowed = (
        settings.ALLOWED_FILE_TYPES
        if isinstance(settings.ALLOWED_FILE_TYPES, list)
        else [ft.strip().lower() for ft in str(settings.ALLOWED_FILE_TYPES).split(",")]
    )

    if ext not in allowed:
        return (
            False,
            f"File type '{ext}' is not supported. Allowed formats: {', '.join(allowed)}",
        )

    return True, None


def extract_text_from_pdf(file_bytes: bytes) -> Dict[str, Any]:
    """
    Extract text and page-by-page content from a PDF document using PyMuPDF.
    Returns dict with 'text' and 'pages' list.
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages_content = []
        full_text_parts = []

        for page_index in range(len(doc)):
            page = doc[page_index]
            page_text = page.get_text("text").strip()
            pages_content.append({
                "page_number": page_index + 1,
                "text": page_text,
            })
            if page_text:
                full_text_parts.append(page_text)

        doc.close()
        return {
            "text": "\n\n".join(full_text_parts),
            "pages": pages_content,
            "total_pages": len(pages_content),
        }
    except Exception as e:
        logger.error("Error extracting text from PDF", error=str(e))
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")


def extract_text_from_docx(file_bytes: bytes) -> Dict[str, Any]:
    """
    Extract text from a DOCX document using python-docx.
    Includes paragraphs and table cells.
    """
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
        paragraphs_text = []

        for p in doc.paragraphs:
            text = p.text.strip()
            if text:
                paragraphs_text.append(text)

        for table in doc.tables:
            for row in table.rows:
                row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_text:
                    paragraphs_text.append(" | ".join(row_text))

        full_text = "\n\n".join(paragraphs_text)
        return {
            "text": full_text,
            "pages": [{"page_number": 1, "text": full_text}],
            "total_pages": 1,
        }
    except Exception as e:
        logger.error("Error extracting text from DOCX", error=str(e))
        raise ValueError(f"Failed to extract text from DOCX: {str(e)}")


def extract_text_from_txt(file_bytes: bytes) -> str:
    """Extract string content from raw text bytes."""
    try:
        return file_bytes.decode("utf-8").strip()
    except UnicodeDecodeError:
        return file_bytes.decode("latin-1", errors="replace").strip()


def chunk_text(
    text: str,
    chunk_size: int = 500,
    overlap: int = 50,
    metadata: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Break a text block into overlapping chunks based on word count.
    Preserves paragraph context and returns chunk list with metadata.
    """
    if not text or not text.strip():
        return []

    words = text.split()
    chunks = []
    start = 0
    chunk_index = 0
    base_metadata = metadata or {}

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk_words = words[start:end]
        chunk_str = " ".join(chunk_words).strip()

        if chunk_str:
            chunks.append({
                "content": chunk_str,
                "chunk_index": chunk_index,
                "metadata": {
                    **base_metadata,
                    "word_count": len(chunk_words),
                    "start_word": start,
                    "end_word": end,
                },
            })
            chunk_index += 1

        if end >= len(words):
            break

        start += chunk_size - overlap

    return chunks


def process_document_bytes(
    filename: str,
    file_bytes: bytes,
    chunk_size: int = 500,
    overlap: int = 50,
) -> Dict[str, Any]:
    """
    High-level entry point to validate, extract, and chunk any supported document.
    """
    is_valid, err = validate_file(filename, file_bytes)
    if not is_valid:
        raise ValueError(err)

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        doc_data = extract_text_from_pdf(file_bytes)
        chunks = []
        for page_info in doc_data["pages"]:
            page_num = page_info["page_number"]
            page_text = page_info["text"]
            page_chunks = chunk_text(
                page_text,
                chunk_size=chunk_size,
                overlap=overlap,
                metadata={"filename": filename, "page_number": page_num},
            )
            for c in page_chunks:
                c["page_number"] = page_num
            chunks.extend(page_chunks)

        # Re-index chunks monotonically
        for idx, c in enumerate(chunks):
            c["chunk_index"] = idx

        return {
            "text": doc_data["text"],
            "chunks": chunks,
            "total_pages": doc_data["total_pages"],
            "file_type": "pdf",
        }

    elif ext == "docx":
        doc_data = extract_text_from_docx(file_bytes)
        chunks = chunk_text(
            doc_data["text"],
            chunk_size=chunk_size,
            overlap=overlap,
            metadata={"filename": filename, "page_number": 1},
        )
        for c in chunks:
            c["page_number"] = 1
        return {
            "text": doc_data["text"],
            "chunks": chunks,
            "total_pages": 1,
            "file_type": "docx",
        }

    elif ext == "txt":
        text = extract_text_from_txt(file_bytes)
        chunks = chunk_text(
            text,
            chunk_size=chunk_size,
            overlap=overlap,
            metadata={"filename": filename, "page_number": 1},
        )
        for c in chunks:
            c["page_number"] = 1
        return {
            "text": text,
            "chunks": chunks,
            "total_pages": 1,
            "file_type": "txt",
        }

    else:
        raise ValueError(f"Direct text processing not implemented for '{ext}'")
