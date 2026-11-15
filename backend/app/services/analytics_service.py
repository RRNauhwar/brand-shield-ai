"""Analytics service querying actual database records for compliance and audit reporting."""

from typing import Dict, Any, List
from datetime import datetime
import structlog

from app.database.client import (
    fetch_all,
    execute_query,
)
from app.schemas.analytics import (
    AnalyticsOverview,
    ViolationStats,
    ViolationCategoryStat,
    ViolationSeverityStat,
    TerminologyStats,
    TerminologyStatItem,
    TurnaroundStats,
)

logger = structlog.get_logger(__name__)


async def get_overview(org_id: str) -> AnalyticsOverview:
    """Calculate aggregated compliance overview metrics for an organisation."""
    try:
        # 1. Fetch audits for this org
        audits = fetch_all("audit_reports", {"organisation_id": org_id})
        total_audits = len(audits)
        total_findings = sum(a.get("total_findings", 0) for a in audits)
        avg_score = (
            round(sum(a.get("overall_score", 0.0) for a in audits) / total_audits, 1)
            if total_audits > 0
            else 0.0
        )

        # 2. Fetch content submission statuses
        contents = fetch_all("content_submissions", {"organisation_id": org_id})
        approved_count = sum(1 for c in contents if c.get("status") == "approved")
        pending_count = sum(1 for c in contents if c.get("status") in ("under_review", "changes_requested"))
        rejected_count = sum(1 for c in contents if c.get("status") == "rejected")

        return AnalyticsOverview(
            total_audits=total_audits,
            total_findings=total_findings,
            approved_content=approved_count,
            pending_reviews=pending_count,
            rejected_content=rejected_count,
            average_compliance_score=avg_score,
        )
    except Exception as e:
        logger.error("Error computing analytics overview", error=str(e), org_id=org_id)
        return AnalyticsOverview()


async def get_violation_stats(org_id: str) -> ViolationStats:
    """Breakdown findings by category and severity for an organisation."""
    try:
        query = """
        SELECT f.id, f.category, f.severity
        FROM compliance_findings f
        JOIN audit_reports a ON f.audit_id = a.id
        WHERE a.organisation_id = ?
        """
        findings = execute_query(query, (org_id,))
        total = len(findings)

        cat_counts: Dict[str, int] = {}
        sev_counts: Dict[str, int] = {}

        for f in findings:
            cat = f.get("category", "General Violation")
            sev = str(f.get("severity", "low")).lower()
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
            sev_counts[sev] = sev_counts.get(sev, 0) + 1

        by_cat = [
            ViolationCategoryStat(
                category=cat,
                count=count,
                percentage=round((count / total) * 100, 1) if total > 0 else 0.0,
            )
            for cat, count in sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        by_sev = [
            ViolationSeverityStat(severity=sev, count=count)
            for sev, count in sorted(sev_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        return ViolationStats(
            total_violations=total,
            by_category=by_cat,
            by_severity=by_sev,
        )
    except Exception as e:
        logger.error("Error computing violation stats", error=str(e), org_id=org_id)
        return ViolationStats()


async def get_terminology_stats(org_id: str) -> TerminologyStats:
    """Report most frequently flagged terminology violations and prohibited words."""
    try:
        query = """
        SELECT f.id, f.category, f.original_text, f.suggested_correction
        FROM compliance_findings f
        JOIN audit_reports a ON f.audit_id = a.id
        WHERE a.organisation_id = ?
          AND (f.category LIKE '%Terminology%' OR f.category LIKE '%Prohibited%')
        """
        records = execute_query(query, (org_id,))

        prohibited_count = 0
        term_map: Dict[str, Dict[str, Any]] = {}

        for r in records:
            cat = r.get("category", "")
            if "Prohibited" in cat:
                prohibited_count += 1

            term = (r.get("original_text") or "").strip()
            if len(term) > 40:
                term = term[:40] + "..."

            if term not in term_map:
                term_map[term] = {
                    "term": term,
                    "replacement": r.get("suggested_correction"),
                    "count": 0,
                    "category": cat,
                }
            term_map[term]["count"] += 1

        frequent_items = [
            TerminologyStatItem(
                term=item["term"],
                replacement=item["replacement"],
                count=item["count"],
                category=item["category"],
            )
            for item in sorted(term_map.values(), key=lambda x: x["count"], reverse=True)[:10]
        ]

        return TerminologyStats(
            frequently_flagged_terms=frequent_items,
            prohibited_terms_detected=prohibited_count,
        )
    except Exception as e:
        logger.error("Error computing terminology stats", error=str(e), org_id=org_id)
        return TerminologyStats()


async def get_review_turnaround(org_id: str) -> TurnaroundStats:
    """Calculate average review turnaround time and audit duration."""
    try:
        audits = fetch_all("audit_reports", {"organisation_id": org_id})
        durations = [
            a.get("processing_time_seconds")
            for a in audits
            if a.get("processing_time_seconds") is not None
        ]
        avg_audit_secs = (
            round(sum(durations) / len(durations), 2) if durations else 0.0
        )

        query = """
        SELECT a.content_id, a.action, a.created_at
        FROM approval_records a
        JOIN content_submissions c ON a.content_id = c.id
        WHERE c.organisation_id = ?
        ORDER BY a.created_at ASC
        """
        records = execute_query(query, (org_id,))

        submitted_at_map: Dict[str, datetime] = {}
        durations_hours: List[float] = []
        reviewed_count = 0

        for r in records:
            cid = r.get("content_id")
            action = r.get("action")
            raw_ts = r.get("created_at")
            if not raw_ts:
                continue

            try:
                dt = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
            except Exception:
                continue

            if action == "submitted":
                submitted_at_map[cid] = dt
            elif action in ("approved", "rejected", "changes_requested") and cid in submitted_at_map:
                delta = (dt - submitted_at_map[cid]).total_seconds() / 3600.0
                durations_hours.append(delta)
                reviewed_count += 1

        avg_hours = (
            round(sum(durations_hours) / len(durations_hours), 2)
            if durations_hours
            else 0.0
        )

        return TurnaroundStats(
            average_review_time_hours=avg_hours,
            average_audit_duration_seconds=avg_audit_secs,
            submissions_reviewed_count=reviewed_count,
        )
    except Exception as e:
        logger.error("Error computing review turnaround stats", error=str(e), org_id=org_id)
        return TurnaroundStats()
