# 🎯 ContactUs API - Cheat Sheet

## 📍 Files Location

```
YATiCare-BackEnd/
├── models/
│   └── ContactUs.js                          ✅ NEW
├── controllers/
│   └── ContactUs.js                          ✅ NEW
├── routes/
│   └── contactUs.js                          ✅ NEW
├── middleware/
│   └── emailTemplate.js                      ✏️ MODIFIED
├── App.js                                    ✏️ MODIFIED
└── Documentation/
    ├── CONTACTUS_START_HERE.md               📖 START HERE
    ├── CONTACTUS_DOCUMENTATION_INDEX.md      📚 INDEX
    ├── CONTACTUS_QUICK_REFERENCE.md          ⚡ QUICK LOOKUP
    ├── CONTACTUS_IMPLEMENTATION_SUMMARY.md   📋 COMPLETE
    ├── CONTACTUS_API_GUIDE.md                🔌 DEVELOPER
    ├── CONTACTUS_POSTMAN_EXAMPLES.md         🧪 TESTING
    ├── CONTACTUS_ARCHITECTURE.md             🏗️ DESIGN
    ├── CONTACTUS_SETUP_CHECKLIST.md          ✅ DEPLOY
    ├── IMPLEMENTATION_REPORT.md              📊 SUMMARY
    └── CONTACTUS_CHEAT_SHEET.md             (this file)
```

---

## 🚀 Quick Start (Copy & Paste)

### Create Contact Message

```bash
curl -X POST http://localhost:2025/api/contactus \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "phoneNumber": "1234567890",
    "subject": "I need help",
    "message": "Hello, I have a question..."
  }'
```

**Response:** `201 Created`

### Get All Messages

```bash
curl http://localhost:2025/api/contactus
```

**Response:** `200 OK` with pagination

### Get with Filter

```bash
curl "http://localhost:2025/api/contactus?status=pending&page=1&limit=10"
```

### Get Single Message

```bash
curl http://localhost:2025/api/contactus/[message_id]
```

### Update Message

```bash
curl -X PUT http://localhost:2025/api/contactus/[message_id] \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in-progress",
    "adminNotes": "Working on it..."
  }'
```

### Get User Messages

```bash
curl http://localhost:2025/api/contactus/user/user@example.com
```

### Get Statistics

```bash
curl http://localhost:2025/api/contactus/stats/overview
```

### Delete Message

```bash
curl -X DELETE http://localhost:2025/api/contactus/[message_id]
```

---

## 📊 Response Status Codes

| Code | Meaning      | Example                            |
| ---- | ------------ | ---------------------------------- |
| 201  | Created      | Message submitted successfully     |
| 200  | OK           | Messages retrieved/updated/deleted |
| 400  | Bad Request  | Missing fields, invalid email      |
| 404  | Not Found    | Message doesn't exist              |
| 500  | Server Error | Database/email error               |

---

## 🔍 Query Parameters

| Parameter | Type   | Usage                                |
| --------- | ------ | ------------------------------------ |
| `status`  | string | `pending`, `in-progress`, `resolved` |
| `page`    | number | Default: 1                           |
| `limit`   | number | Default: 10, Max: recommended 50     |

**Example:**

```
GET /api/contactus?status=resolved&page=2&limit=20
```

---

## ✉️ Email Triggers

| Action         | User Email | Admin Email |
| -------------- | ---------- | ----------- |
| Create message | ✅ YES     | ✅ YES      |
| Update status  | ❌ NO      | ❌ NO       |
| Mark resolved  | ❌ NO      | ❌ NO       |
| Delete message | ❌ NO      | ❌ NO       |

---

## 🗂️ Data Fields

### Request Fields (POST/Create)

```javascript
{
  firstName: String (required),
  lastName: String (required),
  email: String (required, validated),
  phoneNumber: String (required),
  subject: String (required),
  message: String (required)
}
```

### Response Fields

```javascript
{
  _id: ObjectId,
  firstName: String,
  lastName: String,
  email: String,
  phoneNumber: String,
  subject: String,
  message: String,
  status: "pending" | "in-progress" | "resolved",
  isResolved: Boolean,
  adminNotes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Update Fields (PUT)

```javascript
{
  status: String,        // optional
  adminNotes: String,    // optional
  isResolved: Boolean    // optional
}
```

---

## 🎯 7 API Endpoints

| #   | Method | Endpoint                        | Status  | Purpose          |
| --- | ------ | ------------------------------- | ------- | ---------------- |
| 1   | POST   | `/api/contactus`                | 201     | Create message   |
| 2   | GET    | `/api/contactus`                | 200     | Get all messages |
| 3   | GET    | `/api/contactus/:id`            | 200/404 | Get single       |
| 4   | PUT    | `/api/contactus/:id`            | 200/404 | Update message   |
| 5   | DELETE | `/api/contactus/:id`            | 200/404 | Delete message   |
| 6   | GET    | `/api/contactus/user/:email`    | 200     | User's messages  |
| 7   | GET    | `/api/contactus/stats/overview` | 200     | Get stats        |

---

## ⚙️ Status Values

```javascript
"pending"; // New message, not reviewed
"in-progress"; // Admin reviewing/working on it
"resolved"; // Issue resolved
```

---

## 📧 Email Information

**User Email:**

- From: YATiCare (yaticares.hq@gmail.com)
- To: User's submitted email
- Template: Professional confirmation
- Sent: Automatically on form submit

**Admin Email:**

- From: YATiCare (yaticares.hq@gmail.com)
- To: yaticares.hq@gmail.com
- Template: Detailed notification
- Sent: Automatically on form submit

---

## 🔄 Admin Workflow

```
1. User submits form
   ↓
2. Admin checks: GET /api/contactus?status=pending
   ↓
3. Admin reviews: GET /api/contactus/:id
   ↓
4. Admin updates: PUT /api/contactus/:id
   { status: "in-progress", adminNotes: "..." }
   ↓
5. Admin resolves: PUT /api/contactus/:id
   { status: "resolved", isResolved: true }
   ↓
6. Admin checks stats: GET /api/contactus/stats/overview
```

---

## ❌ Common Errors

| Error                       | Cause              | Solution                            |
| --------------------------- | ------------------ | ----------------------------------- |
| 400 - "All fields required" | Missing field      | Include all 6 fields                |
| 400 - "Invalid email"       | Bad email format   | Use valid email (a@b.com)           |
| 404 - "Not found"           | Wrong message ID   | Verify the ID exists                |
| 400 - "Invalid status"      | Wrong status value | Use: pending, in-progress, resolved |

---

## 🧪 Postman Quick Setup

### 1. Create Environment Variable

```
baseUrl = http://localhost:2025
```

### 2. Create Requests

**POST Create**

```
POST {{baseUrl}}/api/contactus
```

**GET All**

```
GET {{baseUrl}}/api/contactus
```

**GET Stats**

```
GET {{baseUrl}}/api/contactus/stats/overview
```

---

## 📋 Validation Rules

| Field       | Rule                           |
| ----------- | ------------------------------ |
| firstName   | Required, string, trimmed      |
| lastName    | Required, string, trimmed      |
| email       | Required, valid format (regex) |
| phoneNumber | Required, string               |
| subject     | Required, string, trimmed      |
| message     | Required, string, trimmed      |

---

## 🎯 Response Examples

### Success 201

```json
{
  "message": "Your message has been sent successfully...",
  "data": {
    "_id": "65d1a23b...",
    "firstName": "John",
    "email": "john@example.com",
    "status": "pending",
    "createdAt": "2026-02-14T10:30:45.123Z"
  }
}
```

### Success 200 (List)

```json
{
  "message": "Contact messages retrieved successfully",
  "data": [...messages...],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

### Error 400

```json
{
  "error": true,
  "statusCode": 400,
  "message": "All fields are required"
}
```

### Error 404

```json
{
  "error": true,
  "statusCode": 404,
  "message": "Contact message not found"
}
```

---

## 🔐 Security Notes

- ✅ Input validation implemented
- ✅ Email format validated
- 🔄 Consider: Add auth middleware for admin routes
- 🔄 Consider: Add rate limiting for POST
- 🔄 Consider: Add CORS restrictions

---

## 📚 Documentation Links

| Need             | Link                                                 |
| ---------------- | ---------------------------------------------------- |
| Quick Overview   | [START_HERE.md](CONTACTUS_START_HERE.md)             |
| This Cheat Sheet | [CHEAT_SHEET.md](CONTACTUS_CHEAT_SHEET.md)           |
| API Docs         | [API_GUIDE.md](CONTACTUS_API_GUIDE.md)               |
| Test Examples    | [POSTMAN_EXAMPLES.md](CONTACTUS_POSTMAN_EXAMPLES.md) |
| System Design    | [ARCHITECTURE.md](CONTACTUS_ARCHITECTURE.md)         |
| Deployment       | [SETUP_CHECKLIST.md](CONTACTUS_SETUP_CHECKLIST.md)   |

---

## ⚡ Performance Tips

- ✅ Emails sent asynchronously (non-blocking)
- ✅ Use pagination for large datasets
- ✅ Index created on email field
- ✅ Status filtering works efficiently
- ⚠️ Set reasonable pagination limit (default 10)

---

## 🎯 Key Points to Remember

1. **POST creates AND sends emails** ✉️
2. **All 6 fields required** for POST
3. **Email must be valid** format
4. **Status has 3 values only** (pending, in-progress, resolved)
5. **Pagination included** for GET all
6. **Admin emails go to** yaticares.hq@gmail.com
7. **Errors have helpful messages**

---

## 🚀 Ready to Use!

Everything is set up and ready to test. Start with:

```bash
npm start
# Then test endpoint above
```

---

**Created:** February 14, 2026  
**Status:** ✅ Production Ready  
**Endpoints:** 7 functional  
**Emails:** Automatic on submit
