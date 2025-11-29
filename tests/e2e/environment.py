import os
from playwright.sync_api import sync_playwright


def before_all(context):
    context.playwright = sync_playwright().start()
    headless = os.getenv("E2E_HEADLESS", "true").lower() != "false"
    context.browser = context.playwright.chromium.launch(headless=headless)
    context.base_url = os.getenv("E2E_BASE_URL", "http://localhost:3000")


def before_scenario(context, scenario):
    # New browser context per scenario to avoid shared localStorage/cookies between scenarios.
    context.browser_context = context.browser.new_context()
    context.page = context.browser_context.new_page()


def after_scenario(context, scenario):
    if getattr(context, "browser_context", None):
        context.browser_context.close()
        context.browser_context = None
    if getattr(context, "page", None):
        context.page = None


def after_all(context):
    if hasattr(context, "browser"):
        context.browser.close()
    if hasattr(context, "playwright"):
        context.playwright.stop()
