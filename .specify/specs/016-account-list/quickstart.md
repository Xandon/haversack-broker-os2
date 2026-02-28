# Quickstart — F-002a: Account List & Search

## Key Validation Scenarios

### 1. Rep sees territory-scoped accounts
1. Log in as a rep with assigned territories
2. Navigate to /accounts
3. Verify table shows only accounts from rep's territories
4. Verify default sort is updatedAt descending

### 2. Manager sees all territories
1. Log in as a manager
2. Navigate to /accounts
3. Verify table shows accounts across all territories
4. Verify territory filter dropdown lists all active territories

### 3. Filter by health score
1. On /accounts page, click "At Risk" health score preset
2. Verify only accounts with healthScore 0-39 are displayed
3. Verify result count updates
4. Verify URL contains healthScoreMin=0&healthScoreMax=39

### 4. Sort by column header
1. Click "Name" column header -> ascending sort
2. Click again -> descending sort
3. Verify sort indicator icon changes
4. Verify URL contains sortBy=name&sortOrder=desc

### 5. Paginate with cursor
1. Ensure > 20 accounts exist
2. Verify "Showing 1-20 of N" label
3. Click Next -> page 2 loads with skeletons during fetch
4. Verify Previous button is now enabled
5. Verify URL contains cursor parameter

### 6. Search by text
1. Type "pac" in search input (3 chars minimum)
2. Wait 300ms for debounce
3. Verify table filters to matching accounts
4. Clear search -> table returns to full view

### 7. URL state preservation
1. Apply territory filter + sort by healthScore desc
2. Copy URL
3. Open in new tab
4. Verify same filters, sort, and data displayed

### 8. Empty states
1. Apply filter combination that returns zero results
2. Verify "No accounts match your filters" message with "Clear Filters" CTA
3. Clear filters -> table returns to normal
