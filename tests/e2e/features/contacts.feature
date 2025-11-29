Feature: Contacts management
  Manage contacts and groups within an organization

  @smoke
  Scenario: View contacts list
    Given I am signed in
    When I open the contacts page
    Then I should see a list of contacts

  Scenario: Create a new contact
    Given I am signed in
    And I open the contacts page
    When I create a contact named "Smoke Test Contact"
    Then I should see "Smoke Test Contact" in the contact list
