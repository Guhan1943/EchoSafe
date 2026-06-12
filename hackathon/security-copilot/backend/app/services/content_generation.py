import logging
import os
import textwrap
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.article import Article
from app.models.content import GeneratedContent
from app.models.verification import VerificationResult
from app.services.article_image import fetch_image_from_url, resolve_article_image
from app.services.source_comparison import SourceComparisonService

logger = logging.getLogger(__name__)

CONTENT_TYPES = [
    "social_media",
    "email",
    "newsletter",
    "blog",
]

FORMAT_INSTRUCTIONS = {
    "email": (
        "Output ONLY a ready-to-send email draft in plain text. Use exactly this structure:\n"
        "────────────────────────────────────────\n"
        "To: security-team@company.com\n"
        "From: Security Intelligence <alerts@securitycopilot.dev>\n"
        "Subject: [SEVERITY] Short subject line\n"
        "────────────────────────────────────────\n\n"
        "Dear Team,\n\n"
        "[Opening paragraph — 2 sentences max]\n\n"
        "WHAT HAPPENED\n"
        "[Threat summary]\n\n"
        "WHO IS AFFECTED\n"
        "[Audience / systems]\n\n"
        "RECOMMENDED ACTIONS\n"
        "1. ...\n2. ...\n3. ...\n\n"
        "ADDITIONAL RESOURCES\n"
        "- Primary source: [url]\n\n"
        "Best regards,\n"
        "Security Intelligence Team\n"
        "Security Copilot | alerts@securitycopilot.dev\n"
        "Do NOT use markdown. Write as a real outbound email."
    ),
    "social_media": (
        "Output ONLY a LinkedIn post in plain text. Match real LinkedIn style:\n"
        "- Line 1: bold hook (use ALL CAPS sparingly or emoji once)\n"
        "- Blank line between every short paragraph (1-3 sentences each)\n"
        "- Use → or • for 3 short bullet takeaways\n"
        "- End with engagement question + call to action\n"
        "- Final line: 5-8 hashtags on one line\n"
        "- Total length: 180-250 words\n"
        "- NO email headers, NO markdown headings, NO 'Subject:' line\n"
        "- Tone: professional, conversational, thought-leadership"
    ),
    "blog": (
        "Output a blog article in Markdown formatted for a security company website:\n"
        "---\n"
        "title: \"Article Title\"\n"
        "author: Security Intelligence Team\n"
        "date: YYYY-MM-DD\n"
        "category: Threat Intelligence\n"
        "read_time: X min read\n"
        "severity: HIGH\n"
        "---\n\n"
        "# Article Title\n\n"
        "*Published [date] · X min read · Threat Intelligence*\n\n"
        "> Lead quote or key insight in blockquote\n\n"
        "## Introduction\n\n"
        "## What Happened\n\n"
        "## Technical Analysis\n\n"
        "## Industry Context\n\n"
        "## What You Should Do\n\n"
        "## Conclusion\n\n"
        "---\n"
        "*Tags: comma, separated, tags*"
    ),
    "newsletter": (
        "Output a security newsletter segment in plain text. Use this newsletter template:\n"
        "╔══════════════════════════════════════════════════════╗\n"
        "║     SECURITY INTELLIGENCE DIGEST                     ║\n"
        "║     [Month Day, Year] · Weekly Threat Roundup          ║\n"
        "╚══════════════════════════════════════════════════════╝\n\n"
        "IN THIS ISSUE\n"
        "  ▸ [Headline 1]\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "📌  FEATURE STORY\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "[Headline]\n"
        "Severity: [LEVEL]  |  Trust Score: XX/100\n\n"
        "[Story body — 2-3 short paragraphs]\n\n"
        "WHY IT MATTERS\n"
        "[Impact paragraph]\n\n"
        "ACTION CHECKLIST\n"
        "☐ Item 1\n☐ Item 2\n☐ Item 3\n\n"
        "ALSO ON OUR RADAR\n"
        "[Brief vendor/industry context — 2-3 lines]\n\n"
        "──────────────────────────────────────────────────────\n"
        "Security Intelligence · security@company.com\n"
        "View online | Manage preferences\n"
        "No markdown. Plain text newsletter layout only."
    ),
}


class ContentGenerationService:
    def __init__(self, db: Session):
        self.db = db

    def generate_all(self, article_id: int) -> list[GeneratedContent]:
        results = []
        for content_type in CONTENT_TYPES:
            try:
                item = self.generate_for_type(article_id, content_type)
                results.append(item)
            except Exception as exc:
                logger.error(
                    "Failed to generate %s for article %s: %s",
                    content_type,
                    article_id,
                    exc,
                )
        return results

    def generate_for_type(self, article_id: int, content_type: str) -> GeneratedContent:
        ctx = self._get_article_context(article_id)

        generator_map = {
            "social_media": self.generate_social_media,
            "email": self.generate_email,
            "newsletter": self.generate_newsletter,
            "blog": self.generate_blog,
            "executive_brief": self.generate_executive_brief,
            "customer_advisory": self.generate_customer_advisory,
            "technical_analysis": self.generate_technical_analysis,
        }

        generator = generator_map.get(content_type)
        if generator is None:
            raise ValueError(f"Unknown content type: {content_type}")

        content_text = generator(ctx)
        title = self._make_title(content_type, ctx)

        image_url = None
        if content_type == "social_media":
            image_url = self._resolve_social_image(article_id, ctx)

        record = (
            self.db.query(GeneratedContent)
            .filter(
                GeneratedContent.article_id == article_id,
                GeneratedContent.content_type == content_type,
            )
            .first()
        )

        if record is None:
            record = GeneratedContent(
                article_id=article_id,
                content_type=content_type,
                title=title,
                content=content_text,
                image_url=image_url,
                is_approved=ctx.get("status") in ("approved", "published"),
            )
            self.db.add(record)
        else:
            record.title = title
            record.content = content_text
            record.updated_at = datetime.utcnow()
            if content_type == "social_media":
                record.image_url = image_url
            if ctx.get("status") in ("approved", "published"):
                record.is_approved = True

        self.db.commit()
        self.db.refresh(record)
        return record

    def _get_article_context(self, article_id: int) -> dict:
        article = self.db.query(Article).filter(Article.id == article_id).first()
        if article is None:
            raise ValueError(f"Article {article_id} not found")

        verification = (
            self.db.query(VerificationResult)
            .filter(VerificationResult.article_id == article_id)
            .first()
        )

        source_name = ""
        if article.source:
            source_name = article.source.name or ""

        vendor_sources = self._load_vendor_comparison(article_id)
        today = datetime.utcnow().strftime("%B %d, %Y")
        iso_date = datetime.utcnow().strftime("%Y-%m-%d")

        return {
            "article_id": article.id,
            "title": article.title,
            "url": article.url,
            "content": article.content or "",
            "summary": article.summary or "",
            "author": article.author or "",
            "published_at": article.published_at,
            "severity": article.severity or "unknown",
            "trust_score": article.trust_score,
            "status": article.status,
            "source_name": source_name,
            "cves": (verification.cve_references or []) if verification else [],
            "affected_products": (verification.affected_products or []) if verification else [],
            "business_impact": (verification.business_impact or "") if verification else "",
            "recommended_actions": (verification.recommended_actions or "") if verification else "",
            "ai_analysis": (verification.ai_analysis or "") if verification else "",
            "authenticity_score": verification.authenticity_score if verification else 0,
            "credibility_score": verification.credibility_score if verification else 0,
            "confidence": (verification.confidence or "unknown") if verification else "unknown",
            "vendor_sources": vendor_sources,
            "vendor_context": self._format_vendor_context(vendor_sources),
            "today": today,
            "iso_date": iso_date,
            "image_url": article.image_url,
        }

    def _resolve_social_image(self, article_id: int, ctx: dict) -> Optional[str]:
        article = self.db.query(Article).filter(Article.id == article_id).first()
        image_url = resolve_article_image(ctx["url"], ctx.get("image_url"))
        if image_url and article and not article.image_url:
            article.image_url = image_url[:2048]
            self.db.flush()
        return image_url[:2048] if image_url else None

    def _load_vendor_comparison(self, article_id: int) -> list[dict]:
        try:
            result = SourceComparisonService(self.db).compare_article(article_id)
            return result.get("sources", [])
        except Exception as exc:
            logger.warning("Vendor comparison unavailable for article %s: %s", article_id, exc)
            return []

    @staticmethod
    def _format_vendor_context(vendor_sources: list[dict]) -> str:
        if not vendor_sources:
            return "No related vendor coverage found."

        blocks = []
        for source in vendor_sources:
            related = source.get("related")
            if not related:
                continue
            terms = ", ".join(related.get("matched_terms") or []) or "general security"
            blocks.append(
                f"- {source['name']}: {related['title']} ({terms})"
            )
        return "\n".join(blocks) if blocks else "No related vendor coverage found."

    def _build_intelligence_brief(self, ctx: dict) -> str:
        cves = ", ".join(ctx["cves"]) if ctx["cves"] else "None identified"
        return (
            f"Title: {ctx['title']}\n"
            f"Severity: {ctx['severity'].upper()} | Trust Score: {ctx['trust_score']}/100\n"
            f"Source: {ctx['source_name']} | URL: {ctx['url']}\n"
            f"Summary: {ctx['summary'] or ctx['content'][:600]}\n"
            f"CVEs: {cves}\n"
            f"Business Impact: {ctx['business_impact'] or 'Assess organizational exposure.'}\n"
            f"Recommended Actions: {ctx['recommended_actions'] or 'Review and remediate.'}\n"
            f"AI Analysis: {ctx['ai_analysis'] or 'See summary.'}\n"
            f"Vendor context:\n{ctx['vendor_context']}"
        )

    def _ai_generate(self, prompt: str, system: str, *, max_tokens: int = 1000) -> str:
        api_key = os.environ.get("OPENAI_API_KEY") or ""
        from app.config import settings as app_settings
        if not api_key:
            api_key = app_settings.OPENAI_API_KEY

        if api_key:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=api_key)
                model = app_settings.OPENAI_MODEL or "gpt-4o-mini"
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.35,
                    max_tokens=max_tokens,
                )
                return response.choices[0].message.content or ""
            except Exception as exc:
                logger.warning("OpenAI content generation failed: %s", exc)

        return ""

    def _make_title(self, content_type: str, ctx: dict) -> str:
        prefixes = {
            "social_media": "LinkedIn Post: ",
            "email": "Email Draft: ",
            "newsletter": "Newsletter: ",
            "blog": "Blog Article: ",
        }
        prefix = prefixes.get(content_type, "")
        return f"{prefix}{ctx.get('title', 'Security Intelligence Update')}"[:1024]

    def _summary_text(self, ctx: dict, limit: int = 400) -> str:
        return ctx["summary"] or ctx["content"][:limit] or "Details pending analyst review."

    def _actions_list(self, ctx: dict) -> str:
        if ctx["recommended_actions"]:
            lines = [
                line.strip()
                for line in ctx["recommended_actions"].replace("•", "\n").split("\n")
                if line.strip()
            ]
            if lines:
                return "\n".join(f"{i}. {line.lstrip('0123456789.-) ')}" for i, line in enumerate(lines[:5], 1))
        return "1. Review affected systems in your environment\n2. Apply vendor patches and mitigations\n3. Monitor for indicators of compromise"

    def _vendor_radar_lines(self, ctx: dict) -> str:
        lines = []
        for source in ctx.get("vendor_sources", []):
            related = source.get("related")
            if related:
                lines.append(f"  • {source['name']}: {related['title'][:80]}")
        return "\n".join(lines) if lines else "  • Monitoring vendor advisories for related coverage."

    # ------------------------------------------------------------------ #
    # Format-specific generators                                             #
    # ------------------------------------------------------------------ #

    def generate_email(self, ctx: dict) -> str:
        severity = ctx["severity"].upper()
        subject = f"[{severity}] {ctx['title'][:90]}"
        system = (
            "You are an expert security communications writer. "
            + FORMAT_INSTRUCTIONS["email"]
        )
        prompt = f"Draft an email using the intelligence below.\n\n{self._build_intelligence_brief(ctx)}"
        result = self._ai_generate(prompt, system, max_tokens=1200)
        if result:
            return result

        actions = self._actions_list(ctx)
        return textwrap.dedent(
            f"""\
            ────────────────────────────────────────
            To: security-team@company.com
            From: Security Intelligence <alerts@securitycopilot.dev>
            Subject: {subject}
            ────────────────────────────────────────

            Dear Team,

            We are sharing a validated {severity} severity intelligence alert (Trust Score: {ctx['trust_score']}/100) that requires your attention.

            WHAT HAPPENED
            {self._summary_text(ctx)}

            WHO IS AFFECTED
            Organizations using systems or services referenced in this intelligence should assess exposure immediately.

            RECOMMENDED ACTIONS
            {actions}

            ADDITIONAL RESOURCES
            - Primary source ({ctx['source_name']}): {ctx['url']}
            - Vendor context: see internal comparison report

            Best regards,
            Security Intelligence Team
            Security Copilot | alerts@securitycopilot.dev
            """
        ).strip()

    def generate_social_media(self, ctx: dict) -> str:
        system = (
            "You are a cybersecurity LinkedIn content strategist. "
            + FORMAT_INSTRUCTIONS["social_media"]
        )
        prompt = f"Write a LinkedIn post from this intelligence.\n\n{self._build_intelligence_brief(ctx)}"
        result = self._ai_generate(prompt, system, max_tokens=650)
        if result:
            return result

        hashtags = "#CyberSecurity #ThreatIntelligence #InfoSec #SecurityAwareness #CISO"
        if ctx["cves"]:
            hashtags += " " + " ".join(f"#{c.replace('-', '')}" for c in ctx["cves"][:2])
        if ctx["severity"] in ("critical", "high"):
            hashtags += " #SecurityAlert"

        summary = self._summary_text(ctx, 280)
        return textwrap.dedent(
            f"""\
            🚨 NEW THREAT INTELLIGENCE — {ctx['severity'].upper()} SEVERITY

            {ctx['title']}

            {summary}

            Here is what security leaders need to know right now:

            → Trust Score: {ctx['trust_score']}/100 — validated through our intelligence pipeline
            → Cross-referenced with CrowdStrike, SentinelOne, and Microsoft research
            → Action required: review exposure and apply mitigations this week

            {ctx['business_impact'][:200] if ctx['business_impact'] else 'Assess your environment and prioritize remediation based on your risk profile.'}

            How is your team handling threats like this? Drop a comment — I read every one.

            🔗 Full analysis: {ctx['url']}

            {hashtags}
            """
        ).strip()

    def generate_blog(self, ctx: dict) -> str:
        system = (
            "You are a senior security blog editor. "
            + FORMAT_INSTRUCTIONS["blog"]
        )
        prompt = f"Write a blog article from this intelligence.\n\n{self._build_intelligence_brief(ctx)}"
        result = self._ai_generate(prompt, system, max_tokens=2200)
        if result:
            return result

        title = ctx["title"]
        summary = self._summary_text(ctx, 500)
        vendor_block = self._vendor_radar_lines(ctx).replace("  •", "-")
        lines = [
            "---",
            f'title: "{title}"',
            "author: Security Intelligence Team",
            f"date: {ctx['iso_date']}",
            "category: Threat Intelligence",
            "read_time: 5 min read",
            f"severity: {ctx['severity'].upper()}",
            "---",
            "",
            f"# {title}",
            "",
            f"*Published {ctx['today']} · 5 min read · Threat Intelligence · Trust Score {ctx['trust_score']}/100*",
            "",
            f"> {summary[:200]}{'...' if len(summary) > 200 else ''}",
            "",
            "## Introduction",
            "",
            summary,
            "",
            "## What Happened",
            "",
            ctx["ai_analysis"] or ctx["content"][:600] or "Our team validated this intelligence through automated collection and analyst review.",
            "",
            "## Industry Context",
            "",
            "Leading vendors are also tracking related activity:",
            "",
            vendor_block,
            "",
            "## Impact Assessment",
            "",
            ctx["business_impact"] or "Organizations should evaluate whether critical business systems are exposed and plan remediation accordingly.",
            "",
            "## What You Should Do",
            "",
            self._actions_list(ctx),
            "",
            "## Conclusion",
            "",
            "Staying ahead of emerging threats requires continuous monitoring and rapid response. Subscribe to our intelligence feed for real-time updates.",
            "",
            "---",
            "",
            f"*Tags: threat intelligence, {ctx['severity']}, security operations*",
        ]
        return "\n".join(lines)

    def generate_newsletter(self, ctx: dict) -> str:
        system = (
            "You are a security newsletter editor. "
            + FORMAT_INSTRUCTIONS["newsletter"]
        )
        prompt = f"Write a newsletter feature story from this intelligence.\n\n{self._build_intelligence_brief(ctx)}"
        result = self._ai_generate(prompt, system, max_tokens=1400)
        if result:
            return result

        headline = ctx["title"]
        summary = self._summary_text(ctx, 350)
        lines = [
            "╔══════════════════════════════════════════════════════╗",
            "║     SECURITY INTELLIGENCE DIGEST                     ║",
            f"║     {ctx['today']} · Weekly Threat Roundup          ║",
            "╚══════════════════════════════════════════════════════╝",
            "",
            "IN THIS ISSUE",
            f"  ▸ {headline[:70]}{'...' if len(headline) > 70 else ''}",
            "",
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            "📌  FEATURE STORY",
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            "",
            headline,
            "",
            f"Severity: {ctx['severity'].upper()}  |  Trust Score: {ctx['trust_score']}/100",
            "",
            summary,
            "",
            "WHY IT MATTERS",
            "",
            ctx["business_impact"] or "This development may affect organizations relying on affected systems. Security teams should assess exposure and plan remediation within the current sprint.",
            "",
            "ACTION CHECKLIST",
            "☐ Review whether your environment is affected",
            "☐ Apply vendor patches and configuration hardening",
            "☐ Brief stakeholders and update incident playbooks",
            "",
            "ALSO ON OUR RADAR",
            self._vendor_radar_lines(ctx),
            "",
            "──────────────────────────────────────────────────────",
            "Security Intelligence · alerts@securitycopilot.dev",
            f"View online: {ctx['url']}  |  Manage preferences",
        ]
        return "\n".join(lines)

    def generate_executive_brief(self, ctx: dict) -> str:
        return self.generate_email(ctx)

    def generate_customer_advisory(self, ctx: dict) -> str:
        return self.generate_email(ctx)

    def generate_technical_analysis(self, ctx: dict) -> str:
        return self.generate_blog(ctx)
