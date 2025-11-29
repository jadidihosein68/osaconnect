import os
from playwright.sync_api import sync_playwright


def before_all(context):
    context.playwright = sync_playwright().start()
    headless = os.getenv("E2E_HEADLESS", "true").lower() != "false"
    context.browser = context.playwright.chromium.launch(headless=headless)
    context.base_url = os.getenv("E2E_BASE_URL", "http://localhost:3000")


def before_scenario(context, scenario):
    context.page = context.browser.new_page()


def after_scenario(context, scenario):
    if hasattr(context, "page") and context.page:
        context.page.close()


def after_all(context):
    if hasattr(context, "browser"):
        context.browser.close()
    if hasattr(context, "playwright"):
        context.playwright.stop()
