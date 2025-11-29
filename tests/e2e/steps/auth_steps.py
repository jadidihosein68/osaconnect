import os
from behave import when, then


@when("I sign in with valid credentials")
def step_sign_in_valid(context):
    username = os.getenv("E2E_USER", "admin@test.com")
    password = os.getenv("E2E_PASS", "change-me")
    context.page.fill('input[id="username"]', username)
    context.page.fill('input[id="password"]', password)
    context.page.click('button[type="submit"]')
    context.page.wait_for_timeout(500)


@when('I sign in with username "{username}" and password "{password}"')
def step_sign_in_custom(context, username, password):
    context.page.fill('input[id="username"]', username)
    context.page.fill('input[id="password"]', password)
    context.page.click('button[type="submit"]')
    context.page.wait_for_timeout(500)


@then("I should see the dashboard")
def step_see_dashboard(context):
    context.page.wait_for_load_state("networkidle")
    assert "dashboard" in context.page.url.lower() or "Dashboard" in context.page.inner_text("body"), "Dashboard not detected"


@then("I should see a login error message")
def step_see_login_error(context):
    # Try to find a visible error/toast; fall back to asserting we stayed on the login page.
    body_text = context.page.inner_text("body").lower()
    error_el = (
        context.page.query_selector(".text-red-600")
        or context.page.query_selector("text=Invalid")
        or context.page.query_selector("text=error")
    )
    stayed_on_login = "login" in context.page.url.lower() or context.page.query_selector('input[id="username"]')
    assert error_el or "invalid" in body_text or stayed_on_login, "No error message found and did not remain on login page"
