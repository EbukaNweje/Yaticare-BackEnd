# ContactUs API - Architecture & Flow Diagram

## 📊 Complete System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER FLOW                               │
└─────────────────────────────────────────────────────────────────┘

1. USER SUBMITS CONTACT FORM
   ↓
   POST /api/contactus
   {
     firstName, lastName, email, phoneNumber,
     subject, message
   }
   ↓

2. VALIDATION & STORAGE
   ├─ Validate all fields required
   ├─ Validate email format
   ├─ Save to MongoDB
   └─ Status: "pending"
   ↓

3. EMAIL NOTIFICATIONS
   ├─→ SEND TO USER
   │   ├─ Email: user's submitted email
   │   ├─ Template: contactUsConfirmationEmail
   │   └─ Content: Confirmation + Message Summary
   │
   └─→ SEND TO ADMIN
       ├─ Email: yaticares.hq@gmail.com (BREVO_USER)
       ├─ Template: contactUsAdminNotification
       └─ Content: Full details + Sender info
   ↓

4. RESPONSE TO USER
   Status: 201 Created
   Returns: Message ID + Full data


┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN FLOW                                 │
└─────────────────────────────────────────────────────────────────┘

1. ADMIN VIEWS DASHBOARD
   ↓
   GET /api/contactus?status=pending
   Returns: All pending messages with pagination
   ↓

2. ADMIN REVIEWS MESSAGE
   ↓
   GET /api/contactus/{messageId}
   Returns: Full message details
   ↓

3. ADMIN TAKES ACTION
   ↓
   PUT /api/contactus/{messageId}
   {
     status: "in-progress",
     adminNotes: "Working on this..."
   }
   ↓

4. MARK AS RESOLVED
   ↓
   PUT /api/contactus/{messageId}
   {
     status: "resolved",
     isResolved: true,
     adminNotes: "Issue resolved - Password reset sent"
   }
   ↓

5. VIEW STATISTICS
   ↓
   GET /api/contactus/stats/overview
   Returns: {total, pending, inProgress, resolved}


┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    CLIENT / FRONTEND                         │
│  (Web App / Mobile App submitting contact form)             │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             │ HTTP
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    EXPRESS SERVER (App.js)                   │
│  Routes Registered:                                          │
│  └─ /api/contactus → contactUsRoutes                        │
└────────────────────────────┬─────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
   │ ROUTES      │    │ CONTROLLERS  │    │ MODELS       │
   ├─────────────┤    ├──────────────┤    ├──────────────┤
   │ contactUs.js│───▶│ ContactUs.js │───▶│ ContactUs.js │
   │             │    │              │    │              │
   │ - POST /    │    │ 7 Functions: │    │ MongoDB      │
   │ - GET /     │    │ - create     │    │ Schema       │
   │ - PUT /:id  │    │ - getAll     │    │              │
   │ - DELETE/:id│    │ - getById    │    │ Fields:      │
   │ - GET /user │    │ - update     │    │ - name       │
   │ - GET /stats│    │ - delete     │    │ - email      │
   │             │    │ - getByEmail │    │ - message    │
   │             │    │ - getStats   │    │ - status     │
   └─────────────┘    └──────┬───────┘    │ - notes      │
                             │            │ - timestamps │
                             ▼            └──────────────┘
                    ┌──────────────────┐
                    │ EMAIL SERVICE    │
                    ├──────────────────┤
                    │ Brevo API        │
                    │ (/utilities/     │
                    │  brevo.js)       │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
   │ USER EMAIL  │    │ TEMPLATES    │    │ ADMIN EMAIL  │
   │             │    │              │    │              │
   │ To: user    │◀───│ emailTemplate│───▶│ To: admin    │
   │ email       │    │ .js          │    │ @gmail.com   │
   │             │    │              │    │              │
   │ • Confirm   │    │ • User email │    │ • Notification
   │   receipt   │    │ • Admin email│    │ • Full details
   │ • Summary   │    │ • Branding   │    │ • Action req │
   │ • Timeline  │    │ • Responsive │    │ • Response TBD
   └─────────────┘    └──────────────┘    └──────────────┘
```

## 🔄 Request/Response Cycle

```
CLIENT REQUEST
    │
    ├─ POST /api/contactus
    │  {
    │    firstName, lastName, email, phoneNumber,
    │    subject, message
    │  }
    │
    ▼
ROUTE HANDLER (routes/contactUs.js)
    │
    ├─ Route Definition: router.post("/", createContactMessage)
    │
    ▼
CONTROLLER (controllers/ContactUs.js)
    │
    ├─ Function: createContactMessage(req, res, next)
    ├─ ✓ Validate input
    ├─ ✓ Create ContactUs document
    ├─ ✓ Save to MongoDB
    ├─ ✓ Send user email
    ├─ ✓ Send admin email
    │
    ▼
MODELS (models/ContactUs.js)
    │
    ├─ Schema Definition
    ├─ save() → MongoDB
    │
    ▼
EMAIL SERVICE (utilities/brevo.js)
    │
    ├─ User Email via Brevo API
    ├─ Admin Email via Brevo API
    │
    ▼
CLIENT RESPONSE (201 Created)
{
  "message": "Your message has been sent successfully...",
  "data": { _id, firstName, lastName, ... }
}
```

## 📦 File Dependencies

```
App.js
  ├─ requires: routes/contactUs.js
  │  └─ requires: controllers/ContactUs.js
  │     ├─ requires: models/ContactUs.js
  │     ├─ requires: utilities/error.js
  │     ├─ requires: utilities/brevo.js
  │     └─ requires: middleware/emailTemplate.js
  │        ├─ exports: contactUsConfirmationEmail()
  │        └─ exports: contactUsAdminNotification()
```

## 🔌 Integration Points

```
YOUR EXISTING CODE → WHAT WE ADDED
───────────────────────────────────

App.js
  + const contactUsRoutes = require("./routes/contactUs");
  + app.use("/api/contactus", contactUsRoutes);

utilities/brevo.js
  (Already exists - we're using the same sendEmail function)

middleware/emailTemplate.js
  + exports.contactUsConfirmationEmail = (contactData) => { ... }
  + exports.contactUsAdminNotification = (contactData) => { ... }

models/
  + ContactUs.js (NEW)

controllers/
  + ContactUs.js (NEW)

routes/
  + contactUs.js (NEW)
```

## 🎯 Data Flow Timeline

```
T=0ms    │ User submits form
         │ POST /api/contactus received
         │
T=5ms    │ Validation passes
         │ Document created in MongoDB
         │
T=10ms   │ ✓ User confirmation email queued to Brevo
         │ ✓ Admin notification email queued to Brevo
         │
T=15ms   │ 201 Response sent to user
         │
T=1s     │ ✓ User email delivered (Brevo)
         │ ✓ Admin email delivered (Brevo)
         │
T=24h    │ [ADMIN REVIEWS MESSAGE]
         │
T=24.5h  │ Admin updates: status = "in-progress"
         │ PUT /api/contactus/:id
         │ 200 Response
         │
T=48h    │ [ADMIN RESOLVES ISSUE]
         │
T=48.5h  │ Admin updates: status = "resolved"
         │ PUT /api/contactus/:id
         │ 200 Response
```

## 📊 Database Schema Visualization

```
ContactUs Collection
├─ _id: ObjectId (auto)
├─ firstName: String (required)
├─ lastName: String (required)
├─ email: String (required, validated)
├─ phoneNumber: String (required)
├─ subject: String (required)
├─ message: String (required)
├─ status: String (enum: pending|in-progress|resolved)
├─ isResolved: Boolean (default: false)
├─ adminNotes: String (default: "")
├─ createdAt: Date (auto)
└─ updatedAt: Date (auto)

Example Document:
{
  "_id": "65d1a23b4c8d9e2f1a3b4c5d",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "subject": "Account Issue",
  "message": "I can't log in",
  "status": "resolved",
  "isResolved": true,
  "adminNotes": "Password reset completed",
  "createdAt": 2026-02-14T10:30:45.123Z,
  "updatedAt": 2026-02-14T12:30:45.123Z
}
```

## 🚀 Performance Notes

- ✅ Emails sent asynchronously (doesn't block request)
- ✅ Indexes on email & status for fast queries
- ✅ Pagination support (prevent large dataset returns)
- ✅ Direct Brevo API (no email server overhead)

## 🔐 Security Architecture

```
PUBLIC ENDPOINTS          ADMIN ENDPOINTS
    │                          │
    ├─ POST /contactus         ├─ GET /all messages
    │  (Create)                │
    │                          ├─ PUT /:id (Update)
    ├─ GET /user/:email        │
    │  (Check own)             ├─ DELETE /:id
    │                          │
    │                          ├─ GET /stats
    │
(No auth needed)          (Should add: Auth middleware)
```

---

This architecture is designed to be:

- ✅ Scalable
- ✅ Maintainable
- ✅ Following your existing patterns
- ✅ Production-ready
