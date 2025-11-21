from django.conf import settings
from urllib.parse import urljoin
import os


def build_media_url_from_request(file_field, request=None):
    """
    Build a publicly accessible URL for a stored file.
    Priority:
      1) MEDIA_EXTERNAL_BASE_URL env/setting
      2) SITE_URL
      3) request.build_absolute_uri (fallback)
    """
    if not file_field:
        return ""
    path = file_field.url if hasattr(file_field, "url") else ""
    if not path:
        return ""
    env_base = os.environ.get("MEDIA_EXTERNAL_BASE_URL") or os.environ.get("SITE_URL")
    base = getattr(settings, "MEDIA_EXTERNAL_BASE_URL", None) or getattr(settings, "SITE_URL", None) or env_base
    if base:
        return urljoin(base.rstrip("/") + "/", path.lstrip("/"))
    if request:
        return request.build_absolute_uri(path)
    return path
