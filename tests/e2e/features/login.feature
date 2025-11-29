@smoke
Feature: User login
  As a user I want to sign in so I can access campaigns, contacts, and analytics

  Scenario: Successful login
    Given I am on the login page
    When I sign in with valid credentials
    Then I should see the dashboard

  Scenario: Failed login with wrong password
    Given I am on the login page
    When I sign in with username "admin@test.com" and password "wrong-pass"
    Then I should see a login error message
