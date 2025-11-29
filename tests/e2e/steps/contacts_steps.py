from behave import when, then


@when("I open the contacts page")
def step_open_contacts(context):
    context.page.goto(context.base_url.rstrip("/") + "/contacts/all-contacts")
    context.page.wait_for_timeout(500)


@then("I should see a list of contacts")
def step_contacts_list(context):
    body = context.page.inner_text("body")
    assert "contact" in body.lower(), "Contacts list not visible"


@when('I create a contact named "{name}"')
def step_create_contact(context, name):
    # Assumes a create button and form; adjust selectors as needed.
    context.page.click("text=Create Contact") if context.page.query_selector("text=Create Contact") else None
    if context.page.query_selector('input[name="name"]'):
        context.page.fill('input[name="name"]', name)
    elif context.page.query_selector('input[id="name"]'):
        context.page.fill('input[id="name"]', name)
    # Save/submit
    if context.page.query_selector('button[type="submit"]'):
        context.page.click('button[type="submit"]')
    elif context.page.query_selector("text=Save"):
        context.page.click("text=Save")
    context.page.wait_for_timeout(500)


@then('I should see "{name}" in the contact list')
def step_see_contact(context, name):
    context.page.wait_for_timeout(500)
    body = context.page.inner_text("body")
    assert name in body, f"{name} not found in contact list"
