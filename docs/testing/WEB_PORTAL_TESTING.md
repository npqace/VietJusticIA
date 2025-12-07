# Web Portal Testing Documentation

**Last Updated**: December 7, 2025  
**Web Portal URL**: http://localhost:5173

## Summary

All major functionalities of the VietJusticIA web-portal have been tested from both **Admin** and **Lawyer** perspectives. All features are working correctly.

---

## Admin Portal Testing

### 1. Login & Authentication ✅
- **Credentials**: `admin@vietjusticia.com` / `Admin@123`
- Role-based routing redirects admin to `/admin` dashboard

### 2. Admin Dashboard ✅
**Stats Displayed:**
| Metric | Value |
|--------|-------|
| Total Users | 1 |
| Total Lawyers | 6 |
| Total Admins | 1 |
| Requests | 2 |
| Documents | 2659 |

### 3. Lawyers Management ✅
**Features:**
- Table with columns: ID, Name, Email, Status, Experience
- Actions: Details, Edit, Lock/Deactivate buttons
- Refresh button

### 4. Users Management ✅
**Features:**
- Search bar with real-time filtering ✅
- Create User button
- Filter tabs: All, User, Lawyer, Admin
- Table columns: ID, Name, Email, Phone, Role, Status, Verified, Actions
- Pagination

### 5. Requests Management ✅
**Features:**
- Tabs for request types: Service, Consultation, Help (with counts)
- View Details button opens modal
- Details modal shows: ID, Status, User, Lawyer, Title, Description, Dates

### 6. Document CMS ✅
**Features:**
- Document upload with folder selection
- Processing options: ASCII diagram, Qdrant indexing, MongoDB indexing, BM25 index
- Search and filter by domain/status
- Paginated document list (2659 documents, 133 pages)
- Each document shows: Title, Domains, Status, Upload Date, Processing Status
- Delete button per document
- RAG System Test section

---

## Lawyer Portal Testing

### 1. Login & Role Switch ✅
- **Credentials**: `ls.vuthiphuong@vietjusticia.com` / `Lawyer@123`
- Logout from admin works correctly
- Role-based routing redirects lawyer to `/lawyer` dashboard

### 2. Lawyer Dashboard ✅
**Stats Displayed:**
- Total Requests: 1
- Pending: 0
- In Progress: 0

**Features:**
- Service Requests list with status (Accepted)
- View Details button
- Conversations navigation button

### 3. Conversations Page ✅
**Features:**
- List of conversations linked to requests
- Click to open chat modal
- WebSocket connection status: "Connected"
- Message history displayed
- Text input for sending messages

### 4. Real-time Chat ✅
**Verified:**
- Chat modal opens for selected conversation
- Shows existing messages with timestamps
- Input field for typing new messages
- WebSocket connection established

---

## Playwright E2E Tests

The following automated tests have been created:

### Test Files
| File | Tests | Description |
|------|-------|-------------|
| `login.spec.ts` | 6 | Basic login form validation |
| `admin.spec.ts` | 3 | Admin login, dashboard, logout |
| `admin-pages.spec.ts` | 14 | Lawyers, Users, Requests, Document CMS |
| `lawyer.spec.ts` | 3 | Lawyer login, dashboard, logout |
| `lawyer-conversations.spec.ts` | 9 | Dashboard stats, conversations, chat |

**Total Tests: 35**

### Running Tests
```bash
cd web-portal
npx playwright test
```

### View Test Report
```bash
cd web-portal
npx playwright show-report
```

---

## Test Results Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Admin Login | ✅ Pass | Redirects to /admin |
| Admin Dashboard | ✅ Pass | All stats displayed |
| Lawyers Management | ✅ Pass | CRUD actions available |
| Users Management | ✅ Pass | Search/filter works |
| Requests Management | ✅ Pass | Details modal works |
| Document CMS | ✅ Pass | 2659 docs, upload works |
| Lawyer Login | ✅ Pass | Redirects to /lawyer |
| Lawyer Dashboard | ✅ Pass | Request stats shown |
| Conversations | ✅ Pass | WebSocket connected |
| Real-time Chat | ✅ Pass | Messages displayed |

**Overall Result: All 10 manual test cases PASSED** ✅

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vietjusticia.com | Admin@123 |
| Lawyer | ls.vuthiphuong@vietjusticia.com | Lawyer@123 |
