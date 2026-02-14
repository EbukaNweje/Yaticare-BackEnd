# ContactUs API - Setup & Deployment Checklist

## ✅ Implementation Status

| Component       | Status      | File                           |
| --------------- | ----------- | ------------------------------ |
| Model           | ✅ Complete | `/models/ContactUs.js`         |
| Controller      | ✅ Complete | `/controllers/ContactUs.js`    |
| Routes          | ✅ Complete | `/routes/contactUs.js`         |
| Email Templates | ✅ Complete | `/middleware/emailTemplate.js` |
| App Integration | ✅ Complete | `/App.js`                      |

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All files created successfully
- [ ] App.js has been updated with route
- [ ] No syntax errors in code
- [ ] MongoDB connection is active
- [ ] Brevo API credentials in `.env`

### Code Review

- [ ] Model schema is appropriate
- [ ] Controller functions handle errors
- [ ] Routes are properly secured (optional: add auth)
- [ ] Email templates display correctly
- [ ] Error messages are helpful

### Testing

- [ ] ✅ Test POST /api/contactus (create message)
- [ ] ✅ Test GET /api/contactus (get all)
- [ ] ✅ Test GET /api/contactus/:id (get single)
- [ ] ✅ Test PUT /api/contactus/:id (update)
- [ ] ✅ Test DELETE /api/contactus/:id (delete)
- [ ] ✅ Test GET /api/contactus/user/:email (user messages)
- [ ] ✅ Test GET /api/contactus/stats/overview (stats)
- [ ] ✅ Verify user email is sent
- [ ] ✅ Verify admin email is sent
- [ ] ✅ Verify email content is correct

### Email Verification

- [ ] Check BREVO_USER in `.env` (admin email)
- [ ] Check BREVO_API_KEY in `.env` (API key)
- [ ] Test user receives confirmation email
- [ ] Test admin receives notification email
- [ ] Verify email formatting and branding
- [ ] Test with various message lengths

### Database

- [ ] MongoDB collection is created
- [ ] Schema validation works
- [ ] Indexes are created (if needed)
- [ ] Data persists after restart
- [ ] Timestamps are accurate

### Error Handling

- [ ] Invalid email rejected
- [ ] Missing fields rejected
- [ ] Non-existent ID returns 404
- [ ] Database errors caught
- [ ] Email failures don't crash app

### Documentation

- [ ] ✅ CONTACTUS_QUICK_REFERENCE.md
- [ ] ✅ CONTACTUS_IMPLEMENTATION_SUMMARY.md
- [ ] ✅ CONTACTUS_API_GUIDE.md
- [ ] ✅ CONTACTUS_POSTMAN_EXAMPLES.md
- [ ] ✅ CONTACTUS_ARCHITECTURE.md

## 🔧 Quick Setup Commands

### 1. Verify Installation

```bash
# Check if all files exist
ls -la models/ContactUs.js
ls -la controllers/ContactUs.js
ls -la routes/contactUs.js
```

### 2. Test API Endpoint

```bash
# Start server first
npm start

# In another terminal, test endpoint
curl -X POST http://localhost:2025/api/contactus \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phoneNumber": "1234567890",
    "subject": "Test Message",
    "message": "This is a test message"
  }'
```

### 3. Check Email Sending

```bash
# Look for Brevo API calls in logs (if morgan middleware is active)
# Or check admin email: yaticares.hq@gmail.com
```

## 📋 Configuration Checklist

### Environment Variables (.env)

```bash
# Verify these exist in /config/index.env
DATABASE=<your_mongo_db>
BREVO_USER=yaticares.hq@gmail.com
BREVO_API_KEY=<your_api_key>
PORT=2025
```

### Dependencies Verification

```bash
# These should already be installed (used by existing code)
npm list mongoose
npm list axios     # Used by Brevo
npm list express
```

## 🧪 Testing Scenarios

### Scenario 1: Basic Message Submission

```
1. User submits form with valid data
2. System saves to database
3. System sends both emails
4. Returns 201 with message ID
✅ PASS
```

### Scenario 2: Invalid Email Format

```
1. User enters "not-an-email"
2. System validates and rejects
3. Returns 400 error
✅ PASS
```

### Scenario 3: Missing Required Field

```
1. User submits without "message" field
2. System validates and rejects
3. Returns 400 error
✅ PASS
```

### Scenario 4: Admin Update

```
1. Admin fetches all messages
2. Finds a pending message
3. Updates status to "in-progress"
4. Adds admin notes
5. System saves changes
6. Returns updated document
✅ PASS
```

### Scenario 5: User Email Retrieval

```
1. User checks own messages via email
2. System retrieves messages by email
3. Returns array of user's messages
✅ PASS
```

### Scenario 6: Statistics

```
1. Admin requests stats
2. System counts by status
3. Returns total, pending, in-progress, resolved
✅ PASS
```

## 🔐 Security Hardening (Optional)

### Add Authentication

```javascript
// routes/contactUs.js
const { authenticate } = require("../middleware/auth");

// Protect admin routes
router.get("/", authenticate, getAllContactMessages);
router.put("/:id", authenticate, updateContactMessage);
router.delete("/:id", authenticate, deleteContactMessage);
```

### Add Rate Limiting

```javascript
// routes/contactUs.js
const rateLimit = require("express-rate-limit");

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 messages per IP
});

router.post("/", createLimiter, createContactMessage);
```

### Add Input Sanitization

```javascript
// controllers/ContactUs.js
const { body, validationResult } = require("express-validator");

const validations = [
  body("firstName").trim().escape(),
  body("lastName").trim().escape(),
  body("email").isEmail(),
  body("message").trim().escape(),
];

router.post(
  "/",
  validations,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  createContactMessage,
);
```

## 🚨 Troubleshooting

### Issue: "ContactUs model not found"

**Solution:**

```bash
# Verify file exists
ls models/ContactUs.js
# Restart server
npm start
```

### Issue: Emails not sending

**Solution:**

```bash
# Check Brevo credentials
cat config/index.env | grep BREVO
# Verify API key is correct
# Check email service status
```

### Issue: Route not found (404)

**Solution:**

```bash
# Verify route imported in App.js
grep "contactUsRoutes" App.js
# Restart server
npm start
```

### Issue: Database connection error

**Solution:**

```bash
# Check MongoDB connection
mongo <your_connection_string>
# Verify DATABASE variable in .env
```

## 📊 Monitoring

### Check Recent Messages

```bash
# In MongoDB
db.contactus.find().sort({createdAt: -1}).limit(5)
```

### Check Statistics

```bash
# API endpoint
curl http://localhost:2025/api/contactus/stats/overview
```

### Check Email Logs

```bash
# Look in server logs for Brevo requests
# Or check email inboxes
```

## 🎓 Documentation Files

| File                                                                       | Purpose           |
| -------------------------------------------------------------------------- | ----------------- |
| [CONTACTUS_QUICK_REFERENCE.md](CONTACTUS_QUICK_REFERENCE.md)               | 1-page overview   |
| [CONTACTUS_IMPLEMENTATION_SUMMARY.md](CONTACTUS_IMPLEMENTATION_SUMMARY.md) | Complete summary  |
| [CONTACTUS_API_GUIDE.md](CONTACTUS_API_GUIDE.md)                           | Detailed API docs |
| [CONTACTUS_POSTMAN_EXAMPLES.md](CONTACTUS_POSTMAN_EXAMPLES.md)             | Request examples  |
| [CONTACTUS_ARCHITECTURE.md](CONTACTUS_ARCHITECTURE.md)                     | System design     |
| [CONTACTUS_SETUP_CHECKLIST.md](CONTACTUS_SETUP_CHECKLIST.md)               | This file         |

## ✨ Final Checklist Before Going Live

- [ ] All 7 endpoints tested and working
- [ ] Emails sending to both user and admin
- [ ] Database storing messages correctly
- [ ] Error handling working as expected
- [ ] Security measures considered (auth, rate limiting)
- [ ] Documentation reviewed and understood
- [ ] Team members notified of new API
- [ ] Frontend team has endpoint documentation
- [ ] Monitoring/logging in place
- [ ] Backup plan documented

## 🎉 You're Ready!

Once all items are checked, your ContactUs API is ready for:

- ✅ Production deployment
- ✅ User testing
- ✅ Integration with frontend
- ✅ Admin dashboard integration

---

**Questions?** Refer to the documentation files or check the implementation details in each source file.

**Last Updated:** February 14, 2026
