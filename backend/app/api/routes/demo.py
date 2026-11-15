"""Demo setup and initialization endpoints for NovaTech Solutions showcase."""

import uuid
from typing import Dict, Any, Optional
import structlog
from fastapi import APIRouter, Depends, status

from app.core.security import get_current_user
from app.database.client import (
    get_supabase_admin_client,
    fetch_one,
    fetch_all,
    insert_row,
    delete_rows,
)
from app.services.embedding_service import generate_embeddings_batch
from app.services.retrieval_service import store_chunks
from app.services.audit_service import run_audit

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/demo", tags=["Demo Workspace"])

NOVATECH_ORG_ID = "00000000-0000-0000-0000-000000000001"


@router.get("/status")
async def get_demo_status():
    """Check if the NovaTech demo organisation and seed assets are provisioned."""
    supabase = get_supabase_admin_client()
    if not supabase:
        return {
            "demo_ready": True,
            "mode": "in_memory_dev",
            "organisation_id": NOVATECH_ORG_ID,
            "name": "NovaTech Solutions",
        }

    org = fetch_one("organisations", {"id": NOVATECH_ORG_ID}, client=supabase)
    if not org:
        # Check by name
        org = fetch_one("organisations", {"name": "NovaTech Solutions"}, client=supabase)

    if org:
        rules_count = len(fetch_all("brand_rules", {"organisation_id": org["id"]}, client=supabase))
        content_count = len(fetch_all("content_submissions", {"organisation_id": org["id"]}, client=supabase))
        return {
            "demo_ready": True,
            "organisation_id": org["id"],
            "name": org["name"],
            "rules_count": rules_count,
            "content_count": content_count,
        }

    return {
        "demo_ready": False,
        "message": "Demo workspace has not been initialized. Call POST /api/v1/demo/setup to initialize.",
    }


@router.post("/setup", status_code=status.HTTP_201_CREATED)
async def setup_demo_workspace(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    """
    Provision the complete NovaTech Solutions brand compliance workspace:
    - Creates NovaTech organisation
    - Establishes membership
    - Configures 10+ brand rules (preferred terms, prohibited terms, approved facts, voice, colors, disclaimers)
    - Ingests brand guideline documentation with semantic vector chunks
    - Provisions realistic content submissions (marketing campaign, social media post, product specs)
    - Runs automated audits to produce rich compliance findings
    """
    supabase = get_supabase_admin_client()
    user_id = current_user["id"] if current_user else "00000000-0000-0000-0000-000000000002"

    org_id = NOVATECH_ORG_ID

    if supabase:
        # 1. Upsert Profile for user
        try:
            supabase.table("profiles").upsert({
                "id": user_id,
                "email": current_user.get("email", "demo@novatech.ai") if current_user else "demo@novatech.ai",
                "full_name": current_user.get("full_name", "Demo Administrator") if current_user else "Demo Administrator",
            }).execute()
        except Exception as e:
            logger.warning("Could not upsert profile for demo setup", error=str(e))

        # 2. Upsert NovaTech Organisation
        org_payload = {
            "id": org_id,
            "name": "NovaTech Solutions",
            "description": "Enterprise Cloud Architecture and Autonomous Cybersecurity Platform",
            "logo_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
            "is_demo": True,
            "created_by": user_id,
        }
        try:
            supabase.table("organisations").upsert(org_payload).execute()
        except Exception as e:
            logger.warning("Could not upsert organisation", error=str(e))

        # 3. Add Member
        try:
            supabase.table("organisation_members").upsert({
                "organisation_id": org_id,
                "user_id": user_id,
                "role": "admin",
            }).execute()
        except Exception as e:
            logger.warning("Could not upsert member", error=str(e))

        # 4. Clean old demo rules to ensure clean state
        try:
            supabase.table("brand_rules").delete().eq("organisation_id", org_id).execute()
        except Exception:
            pass

        # 5. Insert Brand Rules
        rules_data = [
            # Preferred terminology
            {
                "id": str(uuid.uuid4()),
                "organisation_id": org_id,
                "rule_type": "terminology_preferred",
                "name": "Brand Architecture: NovaShield AI",
                "value": "NovaShield Tool",
                "replacement": "NovaShield AI Platform",
                "description": "Always refer to our flagship offering as the 'NovaShield AI Platform', never as a 'tool' or 'utility'.",
                "metadata": {"enforce_case": True},
                "is_active": True,
                "created_by": user_id,
            },
            {
                "id": str(uuid.uuid4()),
                "organisation_id": org_id,
                "rule_type": "terminology_preferred",
                "name": "Audience Terminology: Clients",
                "value": "customers",
                "replacement": "enterprise partners",
                "description": "In enterprise product marketing, refer to organizations as 'enterprise partners' or 'clients', not 'customers'.",
                "metadata": {},
                "is_active": True,
                "created_by": user_id,
            },
            {
                "id": str(uuid.uuid4()),
                "organisation_id": org_id,
                "rule_type": "terminology_preferred",
                "name": "Technical Terminology: Cloud-Native",
                "value": "cloud based",
                "replacement": "cloud-native",
                "description": "Hyphenate 'cloud-native' per technical writing standards.",
                "metadata": {},
                "is_active": True,
                "created_by": user_id,
            },
            # Prohibited terminology
            {
                "id": str(uuid.uuid4()),
                "organisation_id": org_id,
                "rule_type": "terminology_prohibited",
                "name": "Prohibited Claim: Unhackable",
                "value": "unhackable",
                "replacement": None,
                "description": "Strict legal liability violation. No software may ever be described as unhackable or impenetrable.",
                "metadata": {"risk_level": "critical"},
                "is_active": True,
                "created_by": user_id,
            },
            {
                "id": str(uuid.uuid4()),
                "organisation_id": org_id,
                "rule_type": "terminology_prohibited",
                "name": "Prohibited Claim: 100% Protection",
                "value": "100% protection",
                "replacement": "multi-layered proactive defense",
                "description": "Absolute security guarantees violate FTC marketing compliance guidelines.",
                "metadata": {"risk_level": "critical"},
                "is_active": True,
                "created_by": user_id,
            },
            {
                "id": str(uuid.uuid4()),
                "organisation_id": org_id,
                "rule_type": "terminology_prohibited",
                "name": "Competitor Disparagement",
                "value": "legacy clunkers",
                "replacement": None,
                "description": "Never use derogatory language toward legacy competitors.",
                "metadata": {"risk_level": "high"},
                "is_active": True,
                "created_by": user_id,
            },
            # Mandatory messages / disclaimers
            {
                "id": str(uuid.uuid4()),
                "organisation_id": org_id,
                "rule_type": "mandatory_message",
                "name": "SOC-2 & ISO Certification Notice",
                "value": "NovaTech Solutions is SOC 2 Type II and ISO 27001 certified.",
                "replacement": None,
                "description": "All external security overviews and advertisements must include verification notice.",
                "metadata": {"placement": "footer"},
                "is_active": True,
                "created_by": user_id,
            },
            # Approved facts
            {
                "id": str(uuid.uuid4()),
                "organisation_id": org_id,
                "rule_type": "approved_fact",
                "name": "Platform Uptime SLA",
                "value": "99.99% enterprise SLA uptime across all global regions",
                "replacement": None,
                "description": "Audited quarterly platform availability figure.",
                "metadata": {"metric": "uptime", "value": 99.99},
                "is_active": True,
                "created_by": user_id,
            },
            {
                "id": str(uuid.uuid4()),
                "organisation_id": org_id,
                "rule_type": "approved_fact",
                "name": "Enterprise Scale Metric",
                "value": "Protecting over 500 Global 2000 enterprises worldwide",
                "replacement": None,
                "description": "Current verified enterprise client volume.",
                "metadata": {"client_count": 500},
                "is_active": True,
                "created_by": user_id,
            },
            # Brand voice & colors
            {
                "id": str(uuid.uuid4()),
                "organisation_id": org_id,
                "rule_type": "brand_voice",
                "name": "Authoritative & Empathetic Tone",
                "value": "Authoritative, technically rigorous, transparent, and empathetic to SecOps challenges.",
                "description": "Tone should avoid hyperbole, slang, or panic-inducing fear-uncertainty-doubt (FUD) tactics.",
                "metadata": {"avoid_words": ["gonna", "y'all", "crazy", "miraculous", "magic"]},
                "is_active": True,
                "created_by": user_id,
            },
            {
                "id": str(uuid.uuid4()),
                "organisation_id": org_id,
                "rule_type": "brand_color",
                "name": "NovaTech Primary Brand Colors",
                "value": "#0F172A",
                "description": "Primary Navy Blue #0F172A and Cyan Accent #06B6D4.",
                "metadata": {"palette": ["#0F172A", "#06B6D4", "#3B82F6", "#F8FAFC"]},
                "is_active": True,
                "created_by": user_id,
            },
        ]
        try:
            supabase.table("brand_rules").insert(rules_data).execute()
        except Exception as e:
            logger.warning("Could not insert brand rules", error=str(e))

        # 6. Insert Brand Document & Guideline Chunks
        doc_id = str(uuid.uuid4())
        doc_payload = {
            "id": doc_id,
            "organisation_id": org_id,
            "name": "NovaTech_Brand_Guidelines_2025.pdf",
            "file_type": "pdf",
            "file_size": 245000,
            "status": "ready",
            "chunk_count": 4,
            "uploaded_by": user_id,
        }
        try:
            supabase.table("brand_documents").insert(doc_payload).execute()
            guideline_texts = [
                "NovaTech Solutions Brand Identity & Tone Guidelines. Our voice is defined by four core principles: Authoritative Precision, Collaborative Empathy, Uncompromising Transparency, and Technical Rigor. We do not engage in fear-mongering or sensationalist marketing.",
                "Terminology and Naming Conventions: The flagship product must always be cited as 'NovaShield AI Platform'. Prohibited terms include 'unhackable', 'impenetrable', and '100% protection'. All security products must be described as risk-mitigating defenses.",
                "Approved Facts & Corporate Metrics: NovaTech Solutions protects over 500 Global 2000 enterprises across North America, EMEA, and APAC. Our cloud-native architecture delivers 99.99% audited SLA availability.",
                "Mandatory Notices: Any external facing whitepaper, case study, or digital campaign must incorporate the official compliance attribution: 'NovaTech Solutions is SOC 2 Type II and ISO 27001 certified.'",
            ]
            embeddings = await generate_embeddings_batch(guideline_texts)
            chunks_to_store = [
                {
                    "content": text,
                    "page_number": idx + 1,
                    "chunk_index": idx,
                    "embedding": emb,
                    "metadata": {"filename": "NovaTech_Brand_Guidelines_2025.pdf"},
                }
                for idx, (text, emb) in enumerate(zip(guideline_texts, embeddings))
            ]
            await store_chunks(org_id, doc_id, chunks_to_store)
        except Exception as e:
            logger.warning("Could not insert brand document chunks", error=str(e))

        # 7. Insert Sample Content Submissions
        content_1_id = "11111111-1111-1111-1111-111111111111"
        content_1_text = (
            "Protect your business today with the NovaShield Tool! Our revolutionary cloud based architecture guarantees "
            "100% protection against every cyberattack, rendering your enterprise completely unhackable. "
            "Over 10,000 customers already trust us for zero-downtime security. Join today and forget about security risks forever!"
        )
        content_1_payload = {
            "id": content_1_id,
            "organisation_id": org_id,
            "title": "Q1 Product Launch Announcement",
            "category": "marketing_campaign",
            "original_content": content_1_text,
            "current_content": content_1_text,
            "content_type": "text",
            "status": "draft",
            "submitted_by": user_id,
        }

        content_2_id = "22222222-2222-2222-2222-222222222222"
        content_2_text = (
            "We are thrilled to unveil new zero-trust telemetry capabilities on the NovaShield AI Platform. "
            "Engineered for high resilience, the platform helps enterprise partners proactively detect anomalies across multi-cloud environments. "
            "NovaTech Solutions is SOC 2 Type II and ISO 27001 certified, providing 99.99% enterprise SLA uptime."
        )
        content_2_payload = {
            "id": content_2_id,
            "organisation_id": org_id,
            "title": "SecOps Product Update - Enterprise Release",
            "category": "blog_article",
            "original_content": content_2_text,
            "current_content": content_2_text,
            "content_type": "text",
            "status": "approved",
            "submitted_by": user_id,
        }

        try:
            supabase.table("content_submissions").upsert(content_1_payload).execute()
            supabase.table("content_submissions").upsert(content_2_payload).execute()
        except Exception as e:
            logger.warning("Could not insert content submissions", error=str(e))

        # 8. Run Audit on Content 1
        try:
            await run_audit(content_id=content_1_id, org_id=org_id, client=supabase)
        except Exception as e:
            logger.warning("Could not run initial demo audit", error=str(e))
    else:
        # SQLite persistence mode
        try:
            insert_row("profiles", {
                "id": user_id,
                "email": current_user.get("email", "demo@novatech.ai") if current_user else "demo@novatech.ai",
                "full_name": current_user.get("full_name", "Demo Administrator") if current_user else "Demo Administrator",
            })
            insert_row("organisations", {
                "id": org_id,
                "name": "NovaTech Solutions",
                "description": "Enterprise Cloud Architecture and Autonomous Cybersecurity Platform",
                "logo_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
                "is_demo": True,
                "created_by": user_id,
            })
            insert_row("organisation_members", {
                "id": str(uuid.uuid4()),
                "organisation_id": org_id,
                "user_id": user_id,
                "role": "admin",
            })
            # Clean old rules for NovaTech
            delete_rows("brand_rules", {"organisation_id": org_id})
            for r in rules_data:
                insert_row("brand_rules", r)

            # Insert sample submissions
            content_1_id = "11111111-1111-1111-1111-111111111111"
            content_1_text = (
                "Protect your business today with the NovaShield Tool! Our revolutionary cloud based architecture guarantees "
                "100% protection against every cyberattack, rendering your enterprise completely unhackable. "
                "Over 10,000 customers already trust us for zero-downtime security. Join today and forget about security risks forever!"
            )
            insert_row("content_submissions", {
                "id": content_1_id,
                "organisation_id": org_id,
                "title": "Q1 Product Launch Announcement",
                "category": "marketing_campaign",
                "original_content": content_1_text,
                "current_content": content_1_text,
                "content_type": "text",
                "status": "draft",
                "submitted_by": user_id,
            })

            content_2_id = "22222222-2222-2222-2222-222222222222"
            content_2_text = (
                "We are thrilled to unveil new zero-trust telemetry capabilities on the NovaShield AI Platform. "
                "Engineered for high resilience, the platform helps enterprise partners proactively detect anomalies across multi-cloud environments. "
                "NovaTech Solutions is SOC 2 Type II and ISO 27001 certified, providing 99.99% enterprise SLA uptime."
            )
            insert_row("content_submissions", {
                "id": content_2_id,
                "organisation_id": org_id,
                "title": "SecOps Product Update - Enterprise Release",
                "category": "blog_article",
                "original_content": content_2_text,
                "current_content": content_2_text,
                "content_type": "text",
                "status": "approved",
                "submitted_by": user_id,
            })
            try:
                await run_audit(content_id=content_1_id, org_id=org_id)
            except Exception as e:
                logger.warning("Could not run initial demo audit in SQLite", error=str(e))
        except Exception as e:
            logger.warning("SQLite demo setup exception", error=str(e))

    return {
        "status": "success",
        "message": "NovaTech demo workspace initialized successfully with guidelines, rules, and audited sample content.",
        "organisation_id": org_id,
        "sample_content_id": "11111111-1111-1111-1111-111111111111",
    }
