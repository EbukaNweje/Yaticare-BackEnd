# ContactUs API Integration Guide

## Overview

The ContactUs API allows users to submit contact messages, which are then:

1. Saved to the database
2. Confirmation email sent to the user
3. Notification email sent to the admin

## Files Created/Modified

### 1. **Model** - `/models/ContactUs.js` ✅

Defines the ContactUs schema with fields:

- `firstName`, `lastName`, `email`, `phoneNumber`
- `subject`, `message`
- `status` (pending, in-progress, resolved)
- `isResolved`, `adminNotes`
- `timestamps` (createdAt, updatedAt)

### 2. **Controller** - `/controllers/ContactUs.js` ✅

Contains the following functions:

- `createContactMessage` - Create a new contact message (sends emails to both user and admin)
- `getAllContactMessages` - Get all messages with pagination and filtering
- `getContactMessageById` - Get a specific message by ID
- `updateContactMessage` - Update status, notes, and resolution (Admin)
- `deleteContactMessage` - Delete a message (Admin)
- `getContactMessagesByEmail` - Get messages by user email
- `getContactStats` - Get statistics overview (Admin)

### 3. **Routes** - `/routes/contactUs.js` ✅

API endpoints:

```
POST   /api/contactus                 - Create contact message (PUBLIC)
GET    /api/contactus                 - Get all messages (ADMIN)
GET    /api/contactus/:id             - Get single message (ADMIN)
PUT    /api/contactus/:id             - Update message (ADMIN)
DELETE /api/contactus/:id             - Delete message (ADMIN)
GET    /api/contactus/user/:email     - Get user's messages (PUBLIC)
GET    /api/contactus/stats/overview  - Get statistics (ADMIN)
```

### 4. **Email Templates** - `/middleware/emailTemplate.js` ✅

Added two email templates:

- `contactUsConfirmationEmail` - Sent to user confirming receipt
- `contactUsAdminNotification` - Sent to admin with full details

## Integration Steps

### Step 1: Add Route to App.js

Add this line to `/App.js` with the other route imports:

```javascript
const contactUsRoutes = require("./routes/contactUs");
```

Then add this line with the other route middlewares:

```javascript
app.use("/api/contactus", contactUsRoutes);
```

**Example (updated App.js):**

```javascript
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const AuthRoutes = require("./routes/authRoutes");
const UserRoutes = require("./routes/UserRoutes");
const userDeposit = require("./routes/Deposit");
const userHistory = require("./routes/History");
const planRouter = require("./routes/plansRouter");
const withdrawalRoutes = require("./routes/withdrawal");
const subscriptions = require("./routes/Subscription");
const admin = require("./routes/admin");
const contactUsRoutes = require("./routes/contactUs"); // ← ADD THIS
const morgan = require("morgan");
// ... rest of imports

app.use("/api/auth", AuthRoutes);
app.use("/api/user", UserRoutes);
app.use("/api/deposit", userDeposit);
app.use("/api/withdrawal", withdrawalRoutes);
app.use("/api/history", userHistory);
app.use("/api", planRouter);
app.use("/api", subscriptions);
app.use("/api/admin", admin);
app.use("/api/contactus", contactUsRoutes); // ← ADD THIS

// ... rest of app
```

## API Usage Examples

### 1. Create Contact Message (PUBLIC)

**Endpoint:** `POST /api/contactus`

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "subject": "Account Issue",
  "message": "I'm having trouble logging into my account. Can you help?"
}
```

**Response (201):**

```json
{
  "message": "Your message has been sent successfully. We will get back to you soon.",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "subject": "Account Issue",
    "message": "I'm having trouble logging into my account. Can you help?",
    "status": "pending",
    "isResolved": false,
    "adminNotes": "",
    "createdAt": "2026-02-14T10:30:00.000Z",
    "updatedAt": "2026-02-14T10:30:00.000Z"
  }
}
```

### 2. Get All Contact Messages (ADMIN)

**Endpoint:** `GET /api/contactus?status=pending&page=1&limit=10`

**Query Parameters:**

- `status` (optional): filter by 'pending', 'in-progress', or 'resolved'
- `page` (optional): page number (default: 1)
- `limit` (optional): items per page (default: 10)

**Response (200):**

```json
{
  "message": "Contact messages retrieved successfully",
  "data": [{ ... }],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

### 3. Get Single Message (ADMIN)

**Endpoint:** `GET /api/contactus/:id`

**Response (200):**

```json
{
  "message": "Contact message retrieved successfully",
  "data": { ... }
}
```

### 4. Update Contact Message (ADMIN)

**Endpoint:** `PUT /api/contactus/:id`

**Request Body:**

```json
{
  "status": "in-progress",
  "adminNotes": "User's account is being investigated",
  "isResolved": false
}
```

**Response (200):**

```json
{
  "message": "Contact message updated successfully",
  "data": { ... }
}
```

### 5. Get User's Messages (PUBLIC)

**Endpoint:** `GET /api/contactus/user/:email`

Example: `GET /api/contactus/user/john@example.com`

**Response (200):**

```json
{
  "message": "Contact messages retrieved successfully",
  "data": [ { ... } ]
}
```

### 6. Get Contact Statistics (ADMIN)

**Endpoint:** `GET /api/contactus/stats/overview`

**Response (200):**

```json
{
  "message": "Contact statistics retrieved successfully",
  "data": {
    "total": 45,
    "pending": 12,
    "inProgress": 8,
    "resolved": 25
  }
}
```

### 7. Delete Contact Message (ADMIN)

**Endpoint:** `DELETE /api/contactus/:id`

**Response (200):**

```json
{
  "message": "Contact message deleted successfully",
  "data": { ... }
}
```

## Email Features

### Confirmation Email (To User)

- Sent immediately when contact form is submitted
- Confirms receipt of the message
- Shows the user their submitted information
- Indicates expected response time (24-48 hours)

### Admin Notification Email (To Admin)

- Sent to `BREVO_USER` email (yaticares.hq@gmail.com)
- Contains all user and message details
- Marked as requiring action
- Includes sender's contact information for easy reply

## Security Recommendations

1. **Add Authentication Middleware** for admin routes:

   ```javascript
   const { authenticate, authorize } = require("../middleware/auth");

   router.get("/", authenticate, authorize("admin"), getAllContactMessages);
   ```

2. **Add Rate Limiting** to prevent spam:

   ```javascript
   const rateLimit = require("express-rate-limit");
   const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
   router.post("/", limiter, createContactMessage);
   ```

3. **Add Input Validation** using express-validator (optional enhancement)

## Testing the API

You can test these endpoints using:

- **Postman** - Import the API and test each endpoint
- **cURL** - Command line testing
- **Thunder Client** - VS Code extension

## Troubleshooting

1. **Emails not sending?**
   - Check `BREVO_API_KEY` in `.env`
   - Verify sender email (`BREVO_USER`)
   - Check email service status

2. **Database errors?**
   - Ensure MongoDB connection is active
   - Check if ContactUs model is properly required

3. **CORS issues?**
   - Already configured in App.js

## Next Steps

1. Update `/App.js` with the route integration
2. Test the `/api/contactus` endpoint with Postman
3. Monitor admin emails for incoming contact messages
4. Consider adding authentication/authorization for admin endpoints
5. Optionally add rate limiting to prevent spam
