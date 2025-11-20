1. Navigation / Sidebar
1.1 Contacts becomes expandable

In the left sidebar, Contacts becomes a parent expandable item.

Clicking the Contacts label:

Does not navigate.

Only toggles expand/collapse of its child items.

Children under Contacts:

All Contacts

Groups

1.2 Default behavior

When the user opens the contacts module:

Contacts is expanded.

All Contacts is selected by default and shows the existing contacts list page.

2. Data Model

Note: the platform is multi-organization.
Every contact and contact group belongs to exactly one organization.
Users must never see contacts or groups from another organization.

2.1 Contact

Extend existing Contact model (conceptually):

All queries on contacts must always be scoped by organization of the logged-in user.

2.2 ContactGroup

Create a new ContactGroup entity:

id (unique identifier)

an FK to Organization – required (follow your naming conversion)

name (string, required, unique per organization)

description (string, optional)

color (string, optional; one of a pre-defined list of colors)

created_at

updated_at

created_by (optional, user id)

Organization scoping:

A group belongs to exactly one organization.

A user can only:

See groups where group.organization_id == user.organization_id.

Create/edit/delete groups within their own organization only.

2.3 Relationship: Contact–Group

Many-to-many relationship between Contact and ContactGroup:

A contact can belong to multiple groups.

A group can contain multiple contacts.

Both sides must share the same organization_id.
Do not allow linking a contact to a group from different organizations.

3. All Contacts Page (Contacts > All Contacts)

This is the existing contacts list screen (the one in our current contacts).

3.1 Group column

Add a “Groups” column to the table.

Recommended position: after Email and before Telegram (or close to Status).

Each contact row shows its groups as chips:

Chip label = group.name.

Chip background or border color = group.color (if defined); otherwise a default color.

If the contact belongs to more than N groups (e.g. > 3), show the first 3 chips and a +X more indicator.

If no groups: display - or leave blank.

3.2 Group filter

Next to the existing Status filter on the right of the search bar, add a “Groups” dropdown.

Group filter behavior:

Default value: All Groups.

Options: all groups for the current user’s organization.

MVP can be single-select.

When a group is selected, show only contacts that belong to that group.

The Status filter and Group filter are combinable.

Example: Status = Active, Group = VIP → only active contacts in the “VIP” group for that organization.

3.3 Bulk assign / unassign (optional but recommended)

If you support row selection in the table:

When one or more contacts are selected, show a bulk action bar with:

Add to Group…

Remove from Group…

Add to Group…:

Opens a modal with a multi-select of available groups (for this organization).

On confirm: add all selected contacts to the selected groups (ignore duplicates).

Remove from Group…:

Opens a modal with a multi-select of groups.

On confirm: remove those groups from all selected contacts.

All operations must be scoped by the current organization.

4. Contact Detail View

(If you have a contact detail panel/drawer opened via the eye icon in Actions.)

4.1 Groups section

Add a “Groups” section to the contact detail.

UI component: multi-select chips input.

Shows current groups as chips (with name and color).

User can:

Add a group: open dropdown listing all groups within the same organization; selecting adds a chip.

Remove a group: click x on a chip to unassign.

On change:

Save the new contact–group assignments for this contact (per your existing auto-save or “Save” behavior).

Validation:

Ensure group and contact belong to the same organization.

5. Groups Page (Contacts > Groups)

This is a new screen shown when the user clicks Groups under Contacts in the sidebar.

5.1 Layout

Page title: Groups.

Top-right primary button: + Create Group.

Main content: table/list of all groups for the current organization.

5.2 Groups table columns

Name

Description (optional)

Color

Render a small colored square or circle displaying the group color.

Contacts

Number of contacts in the group (count).

Actions

Edit (pencil icon)

Delete (trash icon)

5.3 Create Group

Clicking + Create Group opens a modal:

Title: Create Group

Fields:

Group Name

Required.

Max length (e.g. 100 chars).

Must be unique within the same organization (case-insensitive).

Description

Optional text area.

Color

Optional dropdown of predefined colors.

Each option shows:

a small colored box/swab.

the color name (e.g. “Blue”, “Green”, “Orange”).

Selected value is stored in group.color.

Buttons:

Cancel

Create

Validation:

If Group Name is empty → show error.

If name already exists in this organization → show error:

A group with this name already exists in your organization. Please choose another name.

On success:

The group is created with organization_id = current_user.organization_id.

Modal closes.

New group appears in:

Groups table.

Group filter dropdown on All Contacts page.

Groups multi-select in Contact detail.

Bulk assignment modals (if implemented).

5.4 Edit Group

Clicking Edit in the Actions column opens an Edit Group modal:

Title: Edit Group

Fields (pre-filled with existing values):

Group Name

Description

Color (same dropdown with colored boxes)

Buttons:

Cancel

Save

Behavior:

Validate as in Create (uniqueness within organization).

On success, update the group:

Update chips in All Contacts page.

Update dropdown labels.

Keep existing contact–group relationships intact.

5.5 Delete Group

Clicking Delete in the Actions column opens confirmation dialog:

Message:

Are you sure you want to delete the group "{Group Name}"?

This will remove this group from all contacts, but it will not delete any contacts.

Buttons:

Cancel

Delete

On confirm:

Delete the group.

Remove all contact–group relationships for that group within the organization.

do not remove the contact if user click to remove the group. 

If this group was selected as the Group filter in All Contacts:

Reset the Group filter back to All Groups.

6. Permissions & Organization Isolation
6.1 Organization scoping

Every query or mutation for contacts, groups, and contact–group relationships must be scoped by organization_id of the logged-in user.

Users must never see or manipulate contacts or groups that belong to another organization.

6.2 Roles & permissions

Assuming two roles: Admin and Standard User.

Admin

Can create, edit, and delete groups in their organization.

Can assign or unassign contacts from any group in their organization.

Standard User

Can create groups in their organization.

Can edit groups in their organization.

Can remove (delete) groups in their organization.

Can assign and unassign contacts to/from groups in their organization.


7. General Rules & Edge Cases

A contact can belong to multiple groups (no strict limit).

Deleting a group never deletes contacts—only removes their group membership.

UI should handle the case when:

No groups exist: Groups table is empty and All Contacts group filter shows only All Groups.

A group is deleted while being used as a filter: automatically revert to All Groups.

All operations (create/edit/delete/assign/unassign) must respect organization_id to prevent cross-organization access.