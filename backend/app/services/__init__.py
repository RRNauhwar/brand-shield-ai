"""Services package containing business logic, AI engines, and external integrations."""

from app.services.document_processor import (
    validate_file,
    extract_text_from_pdf,
    extract_text_from_docx,
    extract_text_from_txt,
    chunk_text,
    process_document_bytes,
)
from app.services.embedding_service import (
    generate_embedding,
    generate_embeddings_batch,
)
from app.services.retrieval_service import (
    store_chunks,
    retrieve_relevant_chunks,
    delete_document_chunks,
)
from app.services.rule_engine import RuleEngine
from app.services.llm_analyzer import LLMAnalyzer
from app.services.audit_service import run_audit
from app.services.correction_service import (
    accept_correction,
    reject_correction,
    edit_correction,
    ignore_correction,
    get_corrected_content,
)
from app.services.approval_service import (
    submit_for_review,
    approve_content,
    reject_content,
    request_changes,
    add_comment,
    get_review_history,
)
from app.services.analytics_service import (
    get_overview,
    get_violation_stats,
    get_terminology_stats,
    get_review_turnaround,
)
from app.services.visual_analyzer import (
    extract_text_from_image,
    extract_dominant_colors,
    check_color_compliance,
    compare_images,
    analyze_contrast,
)

__all__ = [
    "validate_file",
    "extract_text_from_pdf",
    "extract_text_from_docx",
    "extract_text_from_txt",
    "chunk_text",
    "process_document_bytes",
    "generate_embedding",
    "generate_embeddings_batch",
    "store_chunks",
    "retrieve_relevant_chunks",
    "delete_document_chunks",
    "RuleEngine",
    "LLMAnalyzer",
    "run_audit",
    "accept_correction",
    "reject_correction",
    "edit_correction",
    "ignore_correction",
    "get_corrected_content",
    "submit_for_review",
    "approve_content",
    "reject_content",
    "request_changes",
    "add_comment",
    "get_review_history",
    "get_overview",
    "get_violation_stats",
    "get_terminology_stats",
    "get_review_turnaround",
    "extract_text_from_image",
    "extract_dominant_colors",
    "check_color_compliance",
    "compare_images",
    "analyze_contrast",
]
