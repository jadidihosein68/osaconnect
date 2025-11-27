from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
import uuid
import logging

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-secret-key-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "django_filters",
    "corsheaders",
    "billing",
    "integrations",
    "organizations",
    "contacts",
    "messaging",
    "templates_app",
    "bookings",
    "monitoring",
    "assistant",
    "notifications",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "corbi.request_id.RequestIDMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "corbi.http_logging.HttpLoggingMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "corbi.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "corbi.wsgi.application"
ASGI_APPLICATION = "corbi.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
ENVIRONMENT = os.getenv("ENVIRONMENT", "DEV")
LOG_HTTP_BODIES = os.getenv("LOG_HTTP_BODIES", "true" if DEBUG else "false").lower() == "true"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.BasicAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
}

# SimpleJWT lifetimes (extend access to reduce frequent logouts; refresh for 14 days)
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

###############################################################################
# Cross-cutting config
###############################################################################
CORS_ALLOW_ALL_ORIGINS = True

###############################################################################
# Celery and task queue
###############################################################################
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "true").lower() == "true"

# Messaging throttling (per channel)
OUTBOUND_PER_MINUTE_LIMIT = int(os.getenv("OUTBOUND_PER_MINUTE_LIMIT", 60))
CHANNEL_THROTTLE_PER_MIN = {
    "email": int(os.getenv("THROTTLE_EMAIL_PER_MIN", OUTBOUND_PER_MINUTE_LIMIT)),
    "whatsapp": int(os.getenv("THROTTLE_WHATSAPP_PER_MIN", OUTBOUND_PER_MINUTE_LIMIT)),
    "telegram": int(os.getenv("THROTTLE_TELEGRAM_PER_MIN", OUTBOUND_PER_MINUTE_LIMIT)),
    "instagram": int(os.getenv("THROTTLE_INSTAGRAM_PER_MIN", OUTBOUND_PER_MINUTE_LIMIT)),
}

###############################################################################
# AI Assistant
###############################################################################
ASSISTANT_KB_PATH = os.getenv("ASSISTANT_KB_PATH", BASE_DIR / "knowledge_base.md")

###############################################################################
# Logging
###############################################################################
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {
            "()": "django.utils.log.CallbackFilter",
            "callback": lambda record: setattr(
                record,
                "request_id",
                getattr(record, "request_id", None) or __import__("corbi.request_id").request_id.get_request_id(),  # type: ignore
            )
            or True,
        },
    },
    "formatters": {
        "structured": {
            "format": "[{asctime}] {levelname} {name} request_id={request_id} env="
            + os.getenv("ENVIRONMENT", "DEV")
            + " :: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "structured",
            "level": "DEBUG" if DEBUG else "INFO",
            "filters": ["request_id"],
        },
        "app_file": {
            "class": "logging.handlers.TimedRotatingFileHandler",
            "formatter": "structured",
            "filename": str(LOG_DIR / "application.log"),
            "when": "midnight",
            "backupCount": 30,
            "encoding": "utf-8",
            "delay": True,
            "filters": ["request_id"],
        },
        "error_file": {
            "class": "logging.handlers.TimedRotatingFileHandler",
            "formatter": "structured",
            "filename": str(LOG_DIR / "application-errors.log"),
            "when": "midnight",
            "backupCount": 30,
            "encoding": "utf-8",
            "level": "WARNING",
            "delay": True,
            "filters": ["request_id"],
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console", "app_file", "error_file"],
            "level": os.getenv("DJANGO_LOG_LEVEL", "INFO"),
        },
        "django.request": {
            "handlers": ["console", "app_file", "error_file"],
            "level": "ERROR",
            "propagate": False,
        },
        "corbi.audit": {
            "handlers": ["console", "app_file", "error_file"],
            "level": "INFO",
        },
        "": {  # root logger
            "handlers": ["console", "app_file", "error_file"],
            "level": "INFO",
        },
    },
}
