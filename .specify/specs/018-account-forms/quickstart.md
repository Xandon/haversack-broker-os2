# Quickstart Validation: Account Forms (F-002c)

## Scenario 1: Create Account (Happy Path)
1. Navigate to /accounts
2. Click "New Account" button
3. Fill in: Name="Test Bakery", Type=retail, Address="100 NW 5th Ave", City="Portland", State="OR", Zip="97209"
4. Select a territory from the dropdown
5. Fill in primary contact: First="Jane", Last="Smith"
6. Click "Save"
7. **Verify**: Redirected to /accounts/[new-id] with success toast

## Scenario 2: Duplicate Detection
1. Navigate to /accounts/new
2. Type a name that closely matches an existing account (e.g., if "Acme Foods" exists, type "Acme Food")
3. Tab/click out of the name field (blur)
4. **Verify**: Duplicate warning dialog appears with the matching account name, territory, and "View Existing" link
5. Click "Create Anyway"
6. Fill remaining fields and save
7. **Verify**: Account created successfully despite duplicate warning

## Scenario 3: Edit Account
1. Navigate to /accounts
2. Click on an account to go to its detail page
3. Click "Edit" button in the header
4. **Verify**: Form is pre-populated with current account data
5. Change the city field
6. Click "Save"
7. **Verify**: Redirected to account detail page with success toast, city updated

## Scenario 4: Validation Errors
1. Navigate to /accounts/new
2. Click "Save" without filling any fields
3. **Verify**: Inline error messages appear on all required fields
4. Fill in name only, click "Save"
5. **Verify**: Remaining required fields still show errors

## Scenario 5: Cancel
1. Navigate to /accounts/[id]/edit
2. Change the name field
3. Click "Cancel"
4. **Verify**: Redirected to account detail page, name unchanged
