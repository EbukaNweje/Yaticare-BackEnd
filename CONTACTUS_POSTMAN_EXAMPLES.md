# ContactUs API - Postman Examples

## Base URL

```
http://localhost:2025/api/contactus
```

---

## 1. Create Contact Message (PUBLIC)

**Method:** `POST`  
**Endpoint:** `/api/contactus`

### Request Body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+1 (555) 123-4567",
  "subject": "Account Access Issue",
  "message": "I'm unable to log into my account. I've tried resetting my password but it's not working. Could you please help me regain access to my account?"
}
```

### Success Response (201)

```json
{
  "message": "Your message has been sent successfully. We will get back to you soon.",
  "data": {
    "_id": "65d1a23b4c8d9e2f1a3b4c5d",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+1 (555) 123-4567",
    "subject": "Account Access Issue",
    "message": "I'm unable to log into my account. I've tried resetting my password but it's not working. Could you please help me regain access to my account?",
    "status": "pending",
    "isResolved": false,
    "adminNotes": "",
    "createdAt": "2026-02-14T10:30:45.123Z",
    "updatedAt": "2026-02-14T10:30:45.123Z",
    "__v": 0
  }
}
```

### Error Response (400)

```json
{
  "error": true,
  "statusCode": 400,
  "message": "All fields are required"
}
```

---

## 2. Get All Contact Messages (ADMIN)

**Method:** `GET`  
**Endpoint:** `/api/contactus`

### Query Parameters

| Parameter | Type   | Default | Example                        |
| --------- | ------ | ------- | ------------------------------ |
| status    | string | (none)  | pending, in-progress, resolved |
| page      | number | 1       | 1, 2, 3                        |
| limit     | number | 10      | 10, 20, 50                     |

### Examples

**Get all pending messages:**

```
GET /api/contactus?status=pending
```

**Get resolved messages with pagination:**

```
GET /api/contactus?status=resolved&page=2&limit=5
```

**Get all messages, page 1, 15 per page:**

```
GET /api/contactus?page=1&limit=15
```

### Success Response (200)

```json
{
  "message": "Contact messages retrieved successfully",
  "data": [
    {
      "_id": "65d1a23b4c8d9e2f1a3b4c5d",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+1 (555) 123-4567",
      "subject": "Account Access Issue",
      "message": "I'm unable to log into my account...",
      "status": "pending",
      "isResolved": false,
      "adminNotes": "",
      "createdAt": "2026-02-14T10:30:45.123Z",
      "updatedAt": "2026-02-14T10:30:45.123Z"
    },
    {
      "_id": "65d1a24c5c8d9e3g2a4c5d6e",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@example.com",
      "phoneNumber": "+1 (555) 987-6543",
      "subject": "Subscription Question",
      "message": "I have a question about the premium plan...",
      "status": "pending",
      "isResolved": false,
      "adminNotes": "",
      "createdAt": "2026-02-14T11:15:20.456Z",
      "updatedAt": "2026-02-14T11:15:20.456Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

---

## 3. Get Single Contact Message (ADMIN)

**Method:** `GET`  
**Endpoint:** `/api/contactus/:id`

### Example

```
GET /api/contactus/65d1a23b4c8d9e2f1a3b4c5d
```

### Success Response (200)

```json
{
  "message": "Contact message retrieved successfully",
  "data": {
    "_id": "65d1a23b4c8d9e2f1a3b4c5d",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+1 (555) 123-4567",
    "subject": "Account Access Issue",
    "message": "I'm unable to log into my account. I've tried resetting my password but it's not working. Could you please help me regain access to my account?",
    "status": "pending",
    "isResolved": false,
    "adminNotes": "",
    "createdAt": "2026-02-14T10:30:45.123Z",
    "updatedAt": "2026-02-14T10:30:45.123Z"
  }
}
```

### Error Response (404)

```json
{
  "error": true,
  "statusCode": 404,
  "message": "Contact message not found"
}
```

---

## 4. Update Contact Message (ADMIN)

**Method:** `PUT`  
**Endpoint:** `/api/contactus/:id`

### Example

```
PUT /api/contactus/65d1a23b4c8d9e2f1a3b4c5d
```

### Request Body (Examples)

**Update Status to In-Progress:**

```json
{
  "status": "in-progress",
  "adminNotes": "User's issue has been identified. Working on solution."
}
```

**Mark as Resolved:**

```json
{
  "isResolved": true,
  "status": "resolved",
  "adminNotes": "User password has been reset. Temporary password sent to email."
}
```

**Update Only Notes:**

```json
{
  "adminNotes": "Follow up required - user not responding to emails"
}
```

### Success Response (200)

```json
{
  "message": "Contact message updated successfully",
  "data": {
    "_id": "65d1a23b4c8d9e2f1a3b4c5d",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+1 (555) 123-4567",
    "subject": "Account Access Issue",
    "message": "I'm unable to log into my account...",
    "status": "resolved",
    "isResolved": true,
    "adminNotes": "User password has been reset. Temporary password sent to email.",
    "createdAt": "2026-02-14T10:30:45.123Z",
    "updatedAt": "2026-02-14T12:45:30.789Z"
  }
}
```

---

## 5. Delete Contact Message (ADMIN)

**Method:** `DELETE`  
**Endpoint:** `/api/contactus/:id`

### Example

```
DELETE /api/contactus/65d1a23b4c8d9e2f1a3b4c5d
```

### Success Response (200)

```json
{
  "message": "Contact message deleted successfully",
  "data": {
    "_id": "65d1a23b4c8d9e2f1a3b4c5d",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+1 (555) 123-4567",
    "subject": "Account Access Issue",
    "message": "I'm unable to log into my account...",
    "status": "pending",
    "isResolved": false,
    "adminNotes": "",
    "createdAt": "2026-02-14T10:30:45.123Z",
    "updatedAt": "2026-02-14T10:30:45.123Z"
  }
}
```

---

## 6. Get Messages by User Email (PUBLIC)

**Method:** `GET`  
**Endpoint:** `/api/contactus/user/:email`

### Example

```
GET /api/contactus/user/john.doe@example.com
```

### Success Response (200)

```json
{
  "message": "Contact messages retrieved successfully",
  "data": [
    {
      "_id": "65d1a23b4c8d9e2f1a3b4c5d",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+1 (555) 123-4567",
      "subject": "Account Access Issue",
      "message": "I'm unable to log into my account...",
      "status": "resolved",
      "isResolved": true,
      "adminNotes": "Password reset successful",
      "createdAt": "2026-02-14T10:30:45.123Z",
      "updatedAt": "2026-02-14T12:45:30.789Z"
    },
    {
      "_id": "65d1b34c5d9e4f3g2b5d6e7f",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+1 (555) 123-4567",
      "subject": "Billing Question",
      "message": "I was charged twice for my subscription...",
      "status": "pending",
      "isResolved": false,
      "adminNotes": "",
      "createdAt": "2026-02-14T14:20:15.234Z",
      "updatedAt": "2026-02-14T14:20:15.234Z"
    }
  ]
}
```

### No Messages Response (200)

```json
{
  "message": "No contact messages found for this email",
  "data": []
}
```

---

## 7. Get Contact Statistics (ADMIN)

**Method:** `GET`  
**Endpoint:** `/api/contactus/stats/overview`

### Success Response (200)

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

---

## Common Errors & Solutions

### Error: Invalid Email Format

```json
{
  "error": true,
  "statusCode": 400,
  "message": "Please provide a valid email address"
}
```

**Solution:** Ensure email follows format: `user@example.com`

### Error: Missing Required Fields

```json
{
  "error": true,
  "statusCode": 400,
  "message": "All fields are required"
}
```

**Solution:** Include all fields: firstName, lastName, email, phoneNumber, subject, message

### Error: Message Not Found

```json
{
  "error": true,
  "statusCode": 404,
  "message": "Contact message not found"
}
```

**Solution:** Verify the message ID is correct

### Error: Invalid Status

```json
{
  "error": true,
  "statusCode": 400,
  "message": "Invalid status value"
}
```

**Solution:** Use only: `pending`, `in-progress`, or `resolved`

---

## Testing Workflow

1. **Create a message** (POST) - User submits contact form
2. **Check emails** - Verify confirmation & admin notification received
3. **Admin retrieves all** (GET) - See all pending messages
4. **Admin updates status** (PUT) - Change to in-progress
5. **Admin resolves** (PUT) - Mark as resolved
6. **User checks messages** (GET by email) - See update status
7. **Admin deletes** (DELETE) - Archive or remove after resolution

---

## Postman Collection Import

You can import this as a Postman collection:

```json
{
  "info": {
    "name": "ContactUs API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Contact Message",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/contactus"
      }
    },
    {
      "name": "Get All Messages",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/contactus"
      }
    }
  ]
}
```

Set `baseUrl` variable to: `http://localhost:2025`
