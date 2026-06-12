import pytest

from app.services.article_image import download_image, extract_image_from_html
from app.services.linkedin_publisher import LinkedInPublisherService


def test_extract_og_image_from_html():
    html = """
    <html><head>
    <meta property="og:image" content="https://cdn.example.com/cover.jpg" />
    </head></html>
    """
    assert extract_image_from_html(html) == "https://cdn.example.com/cover.jpg"


def test_format_post_text_strips_linkedin_prefix():
    text = "LinkedIn Post: Hello world\n\n#security"
    result = LinkedInPublisherService._format_post_text(text, None)
    assert result.startswith("Hello world")


def test_format_post_text_truncates():
    text = "x" * 3000
    result = LinkedInPublisherService._format_post_text(text, None)
    assert len(result) == 2800


def test_download_image_from_public_url():
    url = "https://www.bleepstatic.com/content/hl-images/2026/06/12/Novo_Nordisk.jpg"
    data, content_type = download_image(url)
    assert len(data) > 1000
    assert content_type.startswith("image/")
