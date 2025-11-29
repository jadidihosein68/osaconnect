import os
from behave import given


def go_to(context, path=""):
    base = getattr(context, "base_url", os.getenv("E2E_BASE_URL", "http://localhost:3000"))
    url = base.rstrip("/") + "/" + path.lstrip("/")
    context.page.goto(url)


@given("I am on the login page")
def step_go_login(context):
    go_to(context, "/login")


@given("I am signed in")
def step_signed_in(context):
    username = os.getenv("E2E_USER", "admin@test.com")
    password = os.getenv("E2E_PASS", "change-me")
    go_to(context, "/login")
    context.page.fill('input[id="username"]', username)
    context.page.fill('input[id="password"]', password)
    context.page.click('button[type="submit"]')
    context.page.wait_for_timeout(500)  # small pause for navigation
