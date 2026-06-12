"""
Phase 3 — Entity Extraction Service.

Extracts: CVEs, vendors, products, vulnerability types, threat indicators.

Strategy (in priority order):
  1. Regex-based CVE extraction (always runs)
  2. Keyword/heuristic NLP for vendors, products, vuln types
  3. spaCy NER if installed  (optional upgrade — model must be pre-downloaded)
  4. OpenAI extraction via existing AI provider if configured
"""

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ── Patterns ──────────────────────────────────────────────────────────────────

CVE_RE = re.compile(r"CVE-\d{4}-\d{4,7}", re.IGNORECASE)
CVSS_RE = re.compile(r"CVSS[v ]?[\d.]+\s+(?:score\s+)?(\d+\.\d+)", re.IGNORECASE)

WELL_KNOWN_VENDORS = {
    "microsoft", "apple", "google", "cisco", "palo alto", "fortinet",
    "juniper", "vmware", "broadcom", "oracle", "sap", "adobe", "mozilla",
    "linux", "redhat", "canonical", "debian", "openssh", "openssl",
    "apache", "nginx", "wordpress", "drupal", "atlassian", "gitlab",
    "github", "jenkins", "docker", "kubernetes", "aws", "azure", "gcp",
    "intel", "amd", "qualcomm", "samsung", "huawei", "zyxel", "netgear",
    "ivanti", "solarwinds", "progress", "barracuda", "f5", "citrix",
    "crowdstrike", "sentinelone", "paloalto", "checkpoint",
}

VULN_TYPE_KEYWORDS = {
    "remote code execution": "rce",
    "rce": "rce",
    "sql injection": "sqli",
    "sqli": "sqli",
    "cross-site scripting": "xss",
    "xss": "xss",
    "cross-site request forgery": "csrf",
    "csrf": "csrf",
    "path traversal": "path_traversal",
    "directory traversal": "path_traversal",
    "privilege escalation": "privesc",
    "privesc": "privesc",
    "buffer overflow": "buffer_overflow",
    "heap overflow": "buffer_overflow",
    "stack overflow": "buffer_overflow",
    "use after free": "use_after_free",
    "uaf": "use_after_free",
    "integer overflow": "integer_overflow",
    "null pointer": "null_pointer",
    "zero-day": "zero_day",
    "0-day": "zero_day",
    "0day": "zero_day",
    "denial of service": "dos",
    "dos": "dos",
    "ddos": "ddos",
    "authentication bypass": "auth_bypass",
    "auth bypass": "auth_bypass",
    "command injection": "cmd_injection",
    "xml injection": "xml_injection",
    "xxe": "xxe",
    "ssrf": "ssrf",
    "server-side request forgery": "ssrf",
    "deserialization": "deserialization",
    "race condition": "race_condition",
    "man-in-the-middle": "mitm",
    "mitm": "mitm",
    "supply chain": "supply_chain",
    "backdoor": "backdoor",
    "ransomware": "ransomware",
    "phishing": "phishing",
    "credential stuffing": "credential_stuffing",
    "brute force": "brute_force",
}

THREAT_INDICATOR_RE = re.compile(
    r"""
    (?:
        \b(?:\d{1,3}\.){3}\d{1,3}\b      # IPv4
      | \b[0-9a-fA-F:]{7,39}\b            # IPv6 (loose)
      | [a-zA-Z0-9.-]+\.(?:exe|dll|bat|ps1|sh|py|js|vbs|jar|zip|rar|7z)  # malware filenames
      | [0-9a-fA-F]{32,64}\b              # MD5/SHA hash
    )
    """,
    re.VERBOSE | re.IGNORECASE,
)


# ── Result container ──────────────────────────────────────────────────────────

@dataclass
class ExtractionResult:
    cves: list[str] = field(default_factory=list)
    vendors: list[str] = field(default_factory=list)
    products: list[str] = field(default_factory=list)
    vulnerability_types: list[str] = field(default_factory=list)
    threat_indicators: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "cves": self.cves,
            "vendors": self.vendors,
            "products": self.products,
            "vulnerability_types": self.vulnerability_types,
            "threat_indicators": self.threat_indicators,
        }


# ── Service ───────────────────────────────────────────────────────────────────

class EntityExtractionService:
    def __init__(self, openai_api_key: str = "", openai_model: str = "gpt-4o-mini"):
        self.openai_api_key = openai_api_key
        self.openai_model = openai_model
        self._spacy_nlp = None
        self._spacy_tried = False

    def extract(self, title: str, description: str, raw_cves: list[str] | None = None) -> ExtractionResult:
        """Main extraction entry point. Falls back gracefully between strategies."""
        text = f"{title}\n{description}"

        result = ExtractionResult()

        # 1. Regex CVE extraction (always)
        regex_cves = self._extract_cves_regex(text)
        all_cves = list(dict.fromkeys((raw_cves or []) + regex_cves))
        result.cves = [c.upper() for c in all_cves]

        # 2. Heuristic vendor/product/vuln extraction (always)
        result.vendors = self._extract_vendors(text)
        result.vulnerability_types = self._extract_vuln_types(text)
        result.threat_indicators = self._extract_indicators(text)

        # 3. Try spaCy for additional named entities
        try:
            nlp = self._get_spacy()
            if nlp:
                spacy_vendors, spacy_products = self._spacy_extract(nlp, text)
                for v in spacy_vendors:
                    if v not in result.vendors:
                        result.vendors.append(v)
                result.products = spacy_products
        except Exception as exc:
            logger.debug("spaCy extraction failed (non-fatal): %s", exc)

        # 4. AI extraction for products if spaCy unavailable and key configured
        if not result.products and self.openai_api_key:
            try:
                result.products = self._ai_extract_products(title, description)
            except Exception as exc:
                logger.debug("AI product extraction failed (non-fatal): %s", exc)

        return result

    # ── Private helpers ───────────────────────────────────────────────────────

    def _extract_cves_regex(self, text: str) -> list[str]:
        matches = CVE_RE.findall(text)
        return list(dict.fromkeys(m.upper() for m in matches))

    def _extract_vendors(self, text: str) -> list[str]:
        lower = text.lower()
        found: list[str] = []
        for vendor in WELL_KNOWN_VENDORS:
            if vendor in lower:
                found.append(vendor.title())
        return list(dict.fromkeys(found))

    def _extract_vuln_types(self, text: str) -> list[str]:
        lower = text.lower()
        found: list[str] = []
        for keyword, normalized in VULN_TYPE_KEYWORDS.items():
            if keyword in lower and normalized not in found:
                found.append(normalized)
        return found

    def _extract_indicators(self, text: str) -> list[str]:
        matches = THREAT_INDICATOR_RE.findall(text)
        return list(dict.fromkeys(matches))[:20]  # cap at 20

    def _get_spacy(self):
        if self._spacy_tried:
            return self._spacy_nlp
        self._spacy_tried = True
        try:
            import spacy  # type: ignore
            self._spacy_nlp = spacy.load("en_core_web_sm")
        except Exception:
            self._spacy_nlp = None
        return self._spacy_nlp

    def _spacy_extract(self, nlp, text: str) -> tuple[list[str], list[str]]:
        doc = nlp(text[:5000])  # cap input
        vendors, products = [], []
        for ent in doc.ents:
            if ent.label_ == "ORG" and ent.text not in vendors:
                vendors.append(ent.text)
            elif ent.label_ == "PRODUCT" and ent.text not in products:
                products.append(ent.text)
        return vendors[:10], products[:10]

    def _ai_extract_products(self, title: str, description: str) -> list[str]:
        import json
        from openai import OpenAI

        client = OpenAI(api_key=self.openai_api_key)
        prompt = (
            f"From this security advisory, list the affected software products and versions.\n\n"
            f"Title: {title}\nDescription: {description[:1000]}\n\n"
            "Respond ONLY with a JSON array of strings, e.g. [\"ProductA 1.2\", \"ProductB\"]."
        )
        resp = client.chat.completions.create(
            model=self.openai_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=200,
        )
        raw = (resp.choices[0].message.content or "[]").strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
