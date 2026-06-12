from app.services.source_comparison import SourceComparisonService


def test_keywords_extract_cves_and_terms():
    text = "Critical CVE-2024-1234 ransomware attack on Microsoft Exchange servers"
    cves = SourceComparisonService._extract_cves(text)
    keywords = SourceComparisonService._keywords(text)

    assert "CVE-2024-1234" in cves
    assert "ransomware" in keywords
    assert "microsoft" in keywords
    assert "exchange" in keywords


def test_clean_summary_strips_html():
    summary = SourceComparisonService._clean_summary("<p>Hello <b>world</b> from vendor</p>")
    assert "<" not in summary
    assert "Hello world from vendor" in summary
