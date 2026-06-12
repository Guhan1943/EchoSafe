from app.services.email_publisher import EmailPublisherService
import smtplib


def test_normalize_encryption_maps_tls_to_starttls():
    assert EmailPublisherService.normalize_encryption("TLS") == "STARTTLS"
    assert EmailPublisherService.normalize_encryption("STARTTLS") == "STARTTLS"
    assert EmailPublisherService.normalize_encryption("SSL") == "SSL"
    assert EmailPublisherService.normalize_encryption("NONE") == "NONE"


def test_merge_with_stored_keeps_password_when_blank():
    stored = {"smtp_host": "mailpit", "password": "secret"}
    incoming = {"smtp_host": "mailpit", "password": ""}
    merged = EmailPublisherService.merge_with_stored(stored, incoming)
    assert merged["password"] == "secret"


def test_login_skips_auth_when_none_encryption_and_server_has_no_auth():
    class FakeServer:
        def login(self, _user, _pass):
            raise smtplib.SMTPNotSupportedError("AUTH not supported")

    EmailPublisherService._login(FakeServer(), "dev", "dev", "NONE")
