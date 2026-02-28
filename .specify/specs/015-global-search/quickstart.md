# Quickstart Validation — F-001: Global Search (Cmd+K)

## Key Validation Scenarios

### Scenario 1: Basic Search Flow (P1)
1. Log in as a rep user
2. Press Cmd+K (or Ctrl+K) on any page
3. Verify palette opens with focus on search input
4. Type "pacific"
5. Wait 300ms
6. Verify results appear grouped under Accounts, Contacts, Products
7. Use arrow keys to navigate results
8. Press Enter on a result
9. Verify navigation to correct detail page
10. Verify palette closes

### Scenario 2: Search Trigger Click (P2)
1. Click the search icon in the top navigation bar
2. Verify palette opens identically to Cmd+K
3. Type a query and select a result via mouse click
4. Verify navigation works

### Scenario 3: Empty and Error States
1. Open palette, type "xyznonexistent"
2. Verify "No results found" message
3. Open palette, type "a" (1 char)
4. Verify "Type at least 2 characters" helper text
5. Disconnect network, type a valid query
6. Verify error message with retry action

### Scenario 4: Mobile Responsive (320px)
1. Set viewport to 320px width
2. Open palette via nav bar trigger
3. Verify full-screen overlay
4. Verify keyboard shortcut hint is hidden
5. Type a query, tap a result
6. Verify navigation works

### Scenario 5: Keyboard-Only Navigation
1. Open palette with Cmd+K
2. Type query, results load
3. First result is auto-highlighted
4. Press Down arrow 3 times — verify highlight moves
5. Press Up arrow — verify highlight moves up
6. Press Up on first item — stays on first (no wrap)
7. Press Escape — palette closes, focus returns
