import html
import logging
import re
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

logger = logging.getLogger(__name__)

SMTP_TIMEOUT = 30


class EmailPublisherService:
    def test_connection(self, config: dict[str, Any]) -> None:
        host, port, username, password, encryption = self._connection_params(config)
        server = self._connect(host, port, username, password, encryption)
        try:
            server.noop()
        finally:
            try:
                server.quit()
            except smtplib.SMTPServerDisconnected:
                pass

    def send(
        self,
        config: dict[str, Any],
        *,
        subject: str,
        body: str,
        recipients: list[str],
    ) -> str:
        if not recipients:
            raise ValueError("At least one recipient email is required")
        self._send_raw(config, subject, body, recipients)
        return f"Email sent to {len(recipients)} recipient(s)"

    def _send_raw(
        self,
        config: dict[str, Any],
        subject: str,
        body: str,
        recipients: list[str],
    ) -> None:
        host, port, username, password, encryption = self._connection_params(config)
        sender_email = config["sender_email"]
        sender_name = config.get("sender_name", "Security Intelligence")

        safe_body = self._sanitize_body(body)
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{sender_name} <{sender_email}>"
        msg["To"] = ", ".join(recipients)
        msg.attach(MIMEText(body, "plain", "utf-8"))
        msg.attach(MIMEText(safe_body, "html", "utf-8"))

        server = self._connect(host, port, username, password, encryption)
        try:
            server.sendmail(sender_email, recipients, msg.as_string())
        finally:
            try:
                server.quit()
            except smtplib.SMTPServerDisconnected:
                pass

    @staticmethod
    def normalize_encryption(encryption: str | None) -> str:
        """Map UI values to smtplib modes: SSL, STARTTLS, or NONE."""
        value = (encryption or "STARTTLS").upper()
        if value == "SSL":
            return "SSL"
        if value in ("STARTTLS", "TLS"):
            return "STARTTLS"
        if value == "NONE":
            return "NONE"
        return "STARTTLS"

    @staticmethod
    def _connection_params(config: dict[str, Any]) -> tuple[str, int, str, str, str]:
        return (
            config["smtp_host"].strip(),
            int(config["smtp_port"]),
            config["username"].strip(),
            config["password"],
            EmailPublisherService.normalize_encryption(config.get("encryption")),
        )

    def _connect(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        encryption: str,
    ) -> smtplib.SMTP:
        if not host:
            raise ValueError("SMTP host is required")
        if encryption != "NONE" and (not username or not password):
            raise ValueError("SMTP username and password are required")

        context = ssl.create_default_context()
        try:
            if encryption == "SSL":
                server = smtplib.SMTP_SSL(host, port, timeout=SMTP_TIMEOUT, context=context)
            else:
                server = smtplib.SMTP(host, port, timeout=SMTP_TIMEOUT)
                server.ehlo()
                if encryption == "STARTTLS":
                    server.starttls(context=context)
                    server.ehlo()

            self._login(server, username, password, encryption)
            return server
        except smtplib.SMTPAuthenticationError as exc:
            raise ValueError(
                "Authentication failed. For Gmail/Outlook use an app password, not your "
                f"regular login password. ({exc})"
            ) from exc
        except ssl.SSLError as exc:
            raise ValueError(
                f"TLS/SSL handshake failed on port {port}. "
                f"Try port 587 with STARTTLS or port 465 with SSL. ({exc})"
            ) from exc
        except (TimeoutError, OSError) as exc:
            errno = getattr(exc, "errno", None)
            hint = ""
            if host in ("localhost", "127.0.0.1"):
                hint = (
                    " When running in Docker, use host 'mailpit' (not localhost) "
                    "for the bundled test server."
                )
            elif "gmail.com" in host or "office365.com" in host or "outlook.com" in host:
                hint = (
                    " Outbound SMTP (ports 587/465) is often blocked from Docker/WSL "
                    "or corporate networks. Use the Mailpit preset for local dev "
                    "(host: mailpit, port: 1025, encryption: NONE) and view emails "
                    "at http://localhost:8025."
                )
            elif errno == 111:
                hint = (
                    " Connection refused usually means the port is blocked by a firewall "
                    "or the SMTP service is not running."
                )
            raise ValueError(
                f"Could not reach SMTP server {host}:{port}.{hint} ({exc})"
            ) from exc
        except smtplib.SMTPException as exc:
            raise ValueError(f"SMTP error: {exc}") from exc

    @staticmethod
    def _login(
        server: smtplib.SMTP,
        username: str,
        password: str,
        encryption: str,
    ) -> None:
        """Authenticate when required; skip for local servers without AUTH (e.g. Mailpit)."""
        if encryption == "NONE":
            if not username and not password:
                return
            try:
                server.login(username, password)
            except smtplib.SMTPNotSupportedError:
                return
            return

        server.login(username, password)

    @staticmethod
    def _sanitize_body(body: str) -> str:
        """Convert plain text to safe HTML; strip any raw HTML tags from input."""
        stripped = re.sub(r"<[^>]+>", "", body)
        paragraphs = "".join(
            f"<p>{html.escape(line)}</p>" for line in stripped.split("\n") if line.strip()
        )
        return paragraphs or f"<p>{html.escape(stripped)}</p>"

    @staticmethod
    def config_from_request(data: dict[str, Any]) -> dict[str, Any]:
        encryption = EmailPublisherService.normalize_encryption(data.get("encryption"))
        return {
            "smtp_host": data["smtp_host"].strip(),
            "smtp_port": data["smtp_port"],
            "username": data["username"].strip(),
            "password": data["password"],
            "sender_email": str(data["sender_email"]).strip(),
            "sender_name": data.get("sender_name", "Security Intelligence"),
            "encryption": encryption,
        }

    @staticmethod
    def public_config(config: dict[str, Any]) -> dict[str, Any]:
        return {
            "smtp_host": config.get("smtp_host"),
            "smtp_port": config.get("smtp_port"),
            "username": config.get("username"),
            "sender_email": config.get("sender_email"),
            "sender_name": config.get("sender_name"),
            "encryption": config.get("encryption"),
        }

    @staticmethod
    def merge_with_stored(stored: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
        """Use stored password when the form leaves password blank on reconnect/test."""
        merged = {**stored, **incoming}
        if not incoming.get("password") and stored.get("password"):
            merged["password"] = stored["password"]
        return merged
