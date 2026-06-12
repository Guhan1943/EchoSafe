import logging
import os
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.article import Article
from app.models.content import GeneratedContent
from app.models.verification import VerificationResult

logger = logging.getLogger(__name__)

CONTENT_TYPES = [
    "executive_brief",
    "customer_advisory",
    "technical_analysis",
    "newsletter",
    "social_media",
]


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
            "executive_brief": self.generate_executive_brief,
            "customer_advisory": self.generate_customer_advisory,
            "technical_analysis": self.generate_technical_analysis,
            "newsletter": self.generate_newsletter,
            "social_media": self.generate_social_media,
        }

        generator = generator_map.get(content_type)
        if generator is None:
            raise ValueError(f"Unknown content type: {content_type}")

        content_text = generator(ctx)
        title = self._make_title(content_type, ctx)

        # Upsert by article_id + content_type
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
            )
            self.db.add(record)
        else:
            record.title = title
            record.content = content_text
            record.updated_at = datetime.utcnow()

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
        }

    def _ai_generate(self, prompt: str, system: str) -> str:
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
                    temperature=0.4,
                    max_tokens=800,
                )
                return response.choices[0].message.content or ""
            except Exception as exc:
                logger.warning("OpenAI content generation failed: %s", exc)

        return ""

    def _make_title(self, content_type: str, ctx: dict) -> str:
        prefixes = {
            "executive_brief": "Executive Brief: ",
            "customer_advisory": "Customer Advisory: ",
            "technical_analysis": "Technical Analysis: ",
            "newsletter": "Newsletter Entry: ",
            "social_media": "Social Post: ",
        }
        prefix = prefixes.get(content_type, "")
        article_title = ctx.get("title", "Security Intelligence Update")
        return f"{prefix}{article_title}"[:1024]

    # ------------------------------------------------------------------ #
    # Individual generators                                                  #
    # ------------------------------------------------------------------ #

    def generate_executive_brief(self, ctx: dict) -> str:
        system = (
            "You are a cybersecurity communications specialist. "
            "Write concise, business-focused security briefings for executive audiences."
        )
        prompt = (
            f"Write a 2-3 paragraph executive brief for the following security intelligence:\n\n"
            f"Title: {ctx['title']}\n"
            f"Severity: {ctx['severity'].upper()}\n"
            f"Trust Score: {ctx['trust_score']}/100\n"
            f"Source: {ctx['source_name']}\n"
            f"Summary: {ctx['summary'] or ctx['content'][:500]}\n"
            f"Business Impact: {ctx['business_impact']}\n"
            f"CVEs: {', '.join(ctx['cves']) if ctx['cves'] else 'None identified'}\n"
            f"Affected Products: {', '.join(ctx['affected_products']) if ctx['affected_products'] else 'Under investigation'}\n\n"
            "Focus on business risk and required executive decisions. Avoid excessive technical jargon."
        )
        result = self._ai_generate(prompt, system)
        if result:
            return result

        # Template fallback
        cve_str = ", ".join(ctx["cves"]) if ctx["cves"] else "None identified"
        products_str = (
            ", ".join(ctx["affected_products"]) if ctx["affected_products"] else "Under investigation"
        )
        return (
            f"EXECUTIVE BRIEF: {ctx['title']}\n\n"
            f"Severity: {ctx['severity'].upper()} | Trust Score: {ctx['trust_score']}/100\n\n"
            f"Summary\n"
            f"{ctx['summary'] or ctx['content'][:400] or 'No summary available.'}\n\n"
            f"Business Impact\n"
            f"{ctx['business_impact'] or 'Impact assessment pending manual review.'}\n\n"
            f"Key Details\n"
            f"- CVEs: {cve_str}\n"
            f"- Affected Products: {products_str}\n"
            f"- Source: {ctx['source_name']}\n\n"
            f"Recommended Actions\n"
            f"{ctx['recommended_actions'] or 'Review with security team and apply patches as available.'}"
        )

    def generate_customer_advisory(self, ctx: dict) -> str:
        system = (
            "You are a security advisory writer. "
            "Write clear, actionable advisories for business customers."
        )
        prompt = (
            f"Write a customer-facing security advisory for:\n\n"
            f"Title: {ctx['title']}\n"
            f"Severity: {ctx['severity'].upper()}\n"
            f"Summary: {ctx['summary'] or ctx['content'][:500]}\n"
            f"CVEs: {', '.join(ctx['cves']) if ctx['cves'] else 'None'}\n"
            f"Affected Products: {', '.join(ctx['affected_products']) if ctx['affected_products'] else 'TBD'}\n"
            f"Recommended Actions: {ctx['recommended_actions']}\n\n"
            "Include: overview, who is affected, what to do, and timeline for action."
        )
        result = self._ai_generate(prompt, system)
        if result:
            return result

        cve_str = ", ".join(ctx["cves"]) if ctx["cves"] else "None identified"
        products_str = (
            ", ".join(ctx["affected_products"]) if ctx["affected_products"] else "Under investigation"
        )
        default_actions = (
            "1. Review your environment for affected systems.\n"
            "2. Apply available patches immediately.\n"
            "3. Contact your security team for further guidance."
        )
        actions = ctx["recommended_actions"] or default_actions
        return (
            f"CUSTOMER SECURITY ADVISORY\n\n"
            f"Subject: {ctx['title']}\n"
            f"Severity: {ctx['severity'].upper()}\n"
            f"Date: {datetime.utcnow().strftime('%Y-%m-%d')}\n\n"
            f"Overview\n"
            f"{ctx['summary'] or 'A security issue has been identified that may affect your environment.'}\n\n"
            f"Who Is Affected\n"
            f"Affected Products/Systems: {products_str}\n"
            f"CVE References: {cve_str}\n\n"
            f"What You Should Do\n"
            f"{actions}\n\n"
            f"Additional Information\n"
            f"Source: {ctx['source_name']}\n"
            f"URL: {ctx['url']}"
        )

    def generate_technical_analysis(self, ctx: dict) -> str:
        system = (
            "You are a senior cybersecurity analyst. "
            "Write detailed technical analyses for security engineers and analysts."
        )
        prompt = (
            f"Write a detailed technical security analysis for:\n\n"
            f"Title: {ctx['title']}\n"
            f"Severity: {ctx['severity'].upper()}\n"
            f"Full Content: {ctx['content'][:1500] or ctx['summary']}\n"
            f"CVEs: {', '.join(ctx['cves']) if ctx['cves'] else 'None'}\n"
            f"Affected Products: {', '.join(ctx['affected_products']) if ctx['affected_products'] else 'TBD'}\n"
            f"AI Analysis: {ctx['ai_analysis']}\n\n"
            "Include: technical description, attack vectors, CVSS impact, affected versions, "
            "detection methods, and specific mitigation steps."
        )
        result = self._ai_generate(prompt, system)
        if result:
            return result

        cve_str = ", ".join(ctx["cves"]) if ctx["cves"] else "None identified"
        products_str = (
            ", ".join(ctx["affected_products"]) if ctx["affected_products"] else "Under investigation"
        )
        return (
            f"TECHNICAL ANALYSIS REPORT\n\n"
            f"Title: {ctx['title']}\n"
            f"Severity: {ctx['severity'].upper()} | Confidence: {ctx['confidence'].upper()}\n"
            f"Authenticity Score: {ctx['authenticity_score']}/100 | Credibility Score: {ctx['credibility_score']}/100\n"
            f"Date: {datetime.utcnow().strftime('%Y-%m-%d')}\n\n"
            f"CVE References\n{cve_str}\n\n"
            f"Affected Products\n{products_str}\n\n"
            f"Technical Description\n"
            f"{ctx['content'][:800] or ctx['summary'] or 'Detailed technical content not available.'}\n\n"
            f"AI Analysis\n"
            f"{ctx['ai_analysis'] or 'AI analysis not available.'}\n\n"
            f"Recommended Mitigations\n"
            f"{ctx['recommended_actions'] or 'Apply vendor patches. Enable monitoring. Review access controls.'}\n\n"
            f"References\n"
            f"- Source: {ctx['source_name']}\n"
            f"- URL: {ctx['url']}"
        )

    def generate_newsletter(self, ctx: dict) -> str:
        system = (
            "You are a security newsletter editor. "
            "Write concise, engaging security news digest entries."
        )
        prompt = (
            f"Write a newsletter digest entry (150-200 words) for:\n\n"
            f"Title: {ctx['title']}\n"
            f"Severity: {ctx['severity'].upper()}\n"
            f"Summary: {ctx['summary'] or ctx['content'][:400]}\n"
            f"CVEs: {', '.join(ctx['cves']) if ctx['cves'] else 'None'}\n\n"
            "Write in a professional but accessible tone suitable for a weekly security digest."
        )
        result = self._ai_generate(prompt, system)
        if result:
            return result

        cve_str = f" ({', '.join(ctx['cves'])})" if ctx["cves"] else ""
        return (
            f"[{ctx['severity'].upper()}] {ctx['title']}{cve_str}\n\n"
            f"{ctx['summary'] or ctx['content'][:300] or 'Details pending.'}\n\n"
            f"Severity: {ctx['severity'].upper()} | Trust Score: {ctx['trust_score']}/100\n"
            f"Source: {ctx['source_name']} | More info: {ctx['url']}"
        )

    def generate_social_media(self, ctx: dict) -> str:
        system = (
            "You are a cybersecurity social media manager. "
            "Write professional LinkedIn posts that inform and engage security professionals."
        )
        cve_str = " ".join(ctx["cves"]) if ctx["cves"] else ""
        prompt = (
            f"Write a LinkedIn-ready security awareness post (~200 words) for:\n\n"
            f"Title: {ctx['title']}\n"
            f"Severity: {ctx['severity'].upper()}\n"
            f"Key Points: {ctx['summary'] or ctx['content'][:300]}\n"
            f"CVEs: {cve_str or 'None'}\n\n"
            "Include relevant hashtags such as #CyberSecurity #ThreatIntelligence. "
            "Keep a professional, informative tone. End with a call to action."
        )
        result = self._ai_generate(prompt, system)
        if result:
            return result

        hashtags = "#CyberSecurity #ThreatIntelligence #InfoSec #SecurityAlert"
        if ctx["cves"]:
            hashtags += " " + " ".join(f"#{c.replace('-', '')}" for c in ctx["cves"][:3])
        if ctx["severity"] in ("critical", "high"):
            hashtags += " #CriticalVulnerability"

        return (
            f"Security Alert: {ctx['title']}\n\n"
            f"Severity: {ctx['severity'].upper()} | Trust Score: {ctx['trust_score']}/100\n\n"
            f"{ctx['summary'] or 'A new security threat has been identified. Stay informed and take action.'}\n\n"
            f"Key Takeaways:\n"
            f"- Review your environment for exposure\n"
            f"- Apply available patches promptly\n"
            f"- Monitor for indicators of compromise\n\n"
            f"Read more: {ctx['url']}\n\n"
            f"{hashtags}"
        )
