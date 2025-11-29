import time
from behave import given, when, then


@given("I open the contacts page")
@when("I open the contacts page")
def step_open_contacts(context):
    context.page.goto(context.base_url.rstrip("/") + "/contacts/all-contacts")
    context.page.wait_for_load_state("networkidle")


@then("I should see a list of contacts")
def step_contacts_list(context):
    assert context.page.query_selector("text=Contacts") or context.page.query_selector("table"), "Contacts list not visible"


@when('I create a contact named "{name}"')
def step_create_contact(context, name):
    # Click a create button; prefer stable text variants.
    for btn_text in ["Create Contact", "New Contact", "Add Contact"]:
        btn = context.page.query_selector(f"text={btn_text}")
        if btn:
            btn.click()
            break
    else:
        raise AssertionError("Create contact button not found")

    # Fill required fields: name + email (unique) + phone if present.
    unique_email = f"{int(time.time())}+e2e@contact.test"
    selectors = {
        "name": ['input[name="name"]', 'input[id="name"]'],
        "email": ['input[name="email"]', 'input[id="email"]'],
        "phone": ['input[name="phone"]', 'input[id="phone"]'],
    }

    filled = False
    for sel in selectors["name"]:
        if context.page.query_selector(sel):
            context.page.fill(sel, name)
            filled = True
            break
    if not filled:
        raise AssertionError("Name field not found")

    if any(context.page.query_selector(sel) for sel in selectors["email"]):
        for sel in selectors["email"]:
            if context.page.query_selector(sel):
                context.page.fill(sel, unique_email)
                break

    if any(context.page.query_selector(sel) for sel in selectors["phone"]):
        for sel in selectors["phone"]:
            if context.page.query_selector(sel):
                context.page.fill(sel, "+10000000000")
                break

    # Submit
    submit = context.page.query_selector('button[type="submit"]') or context.page.query_selector("text=Save")
    if not submit:
        raise AssertionError("Save/submit button not found")
    submit.click()

    # Wait for request/transition
    context.page.wait_for_load_state("networkidle")
    context.page.wait_for_timeout(500)

    # Reload the list to ensure the record is persisted, not just in the form.
    context.page.goto(context.base_url.rstrip("/") + "/contacts/all-contacts")
    context.page.wait_for_load_state("networkidle")
    context.page.wait_for_timeout(500)

    table = context.page.query_selector("table") or context.page
    if not table.query_selector(f"text={name}"):
        body = context.page.inner_text("body")
        raise AssertionError(f"Contact '{name}' not found after creation. Page excerpt: {body[:500]}")


@then('I should see "{name}" in the contact list')
def step_see_contact(context, name):
    context.page.wait_for_timeout(300)
    assert context.page.query_selector(f"text={name}"), f"{name} not found in contact list"
