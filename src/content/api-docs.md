# Abancool SMS API Documentation

Complete REST API for integrating Abancool SMS into your applications.

## Authentication

All API requests require an API key in the `Authorization` header:

```
Authorization: Bearer sk_live_xxxxxxxxxxxxx
```

Get your API key from your Developer dashboard. Keep it secret!

## Base URL

```
https://api.abancool.tech/api/v1
```

## Rate Limiting

All endpoints are rate-limited to **60 requests per minute** per API key.

Response headers include:
- `X-RateLimit-Limit`: 60
- `X-RateLimit-Remaining`: requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Error Responses

All errors follow this format:

```json
{
  "error": true,
  "code": "INVALID_PHONE",
  "message": "Invalid phone number format",
  "status": 400
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `INSUFFICIENT_BALANCE` | 402 | Not enough SMS credit |
| `INVALID_PHONE` | 400 | Invalid phone number format |
| `INVALID_MESSAGE` | 400 | Message too long or invalid |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Endpoints

### 1. Send SMS

Send an SMS message to a single recipient or multiple recipients.

```
POST /sms/send
```

#### Request Body

```json
{
  "to": "254712345678",
  "message": "Hello {{name}}, your code is 1234",
  "sender_id": "ABANCOOL",
  "reference": "unique-id"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `to` | string | Yes | Phone number in E.164 format (254712345678) or standard (0712345678) |
| `message` | string | Yes | SMS text (max 160 chars for GSM-7, or will be split across multiple SMS) |
| `sender_id` | string | No | Custom sender ID (max 11 chars). Defaults to "ABANCOOL" |
| `reference` | string | No | Your custom reference for tracking |

#### Response (200 OK)

```json
{
  "success": true,
  "message_id": "msg_1234567890",
  "to": "254712345678",
  "parts": 1,
  "cost_sms": 1,
  "status": "sent"
}
```

#### Response (402 Payment Required)

```json
{
  "error": true,
  "code": "INSUFFICIENT_BALANCE",
  "message": "You have 5 SMS remaining. This message requires 2 SMS.",
  "status": 402,
  "your_balance": 5,
  "required": 2
}
```

#### Examples

**cURL**
```bash
curl -X POST https://api.abancool.tech/api/v1/sms/send \
  -H "Authorization: Bearer sk_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "254712345678",
    "message": "Hello world!"
  }'
```

**JavaScript**
```javascript
const response = await fetch('https://api.abancool.tech/api/v1/sms/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_xxxxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: '254712345678',
    message: 'Hello world!'
  })
});

const data = await response.json();
console.log(data.message_id);
```

**Python**
```python
import requests

response = requests.post(
  'https://api.abancool.tech/api/v1/sms/send',
  headers={
    'Authorization': 'Bearer sk_live_xxxxx',
    'Content-Type': 'application/json'
  },
  json={
    'to': '254712345678',
    'message': 'Hello world!'
  }
)

data = response.json()
print(data['message_id'])
```

---

### 2. Get SMS Status

Check the delivery status of an SMS.

```
GET /sms/{message_id}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message_id": "msg_1234567890",
  "to": "254712345678",
  "message": "Hello world!",
  "status": "delivered",
  "status_code": "200",
  "status_description": "Message successfully sent and delivered",
  "sent_at": "2025-07-02T10:30:00Z",
  "delivered_at": "2025-07-02T10:31:45Z",
  "cost_sms": 1
}
```

#### Status Values

| Status | Description |
|--------|-------------|
| `queued` | Message queued for sending |
| `sent` | Message sent to carrier |
| `delivered` | Message delivered to handset |
| `failed` | Message failed to deliver |
| `undelivered` | Carrier unable to deliver |
| `expired` | Message expired (no delivery within 24h) |

#### Examples

**cURL**
```bash
curl -X GET https://api.abancool.tech/api/v1/sms/msg_1234567890 \
  -H "Authorization: Bearer sk_live_xxxxx"
```

**JavaScript**
```javascript
const response = await fetch(
  'https://api.abancool.tech/api/v1/sms/msg_1234567890',
  {
    headers: { 'Authorization': 'Bearer sk_live_xxxxx' }
  }
);
const data = await response.json();
console.log(data.status);
```

---

### 3. Check Balance

Get your current SMS credit balance.

```
GET /balance
```

#### Response (200 OK)

```json
{
  "success": true,
  "free_sms": 5,
  "paid_sms": 1250,
  "total_sms": 1255,
  "wallet_balance_kes": 2500.50
}
```

#### Examples

**cURL**
```bash
curl -X GET https://api.abancool.tech/api/v1/balance \
  -H "Authorization: Bearer sk_live_xxxxx"
```

---

### 4. Get Contacts

List your stored contacts.

```
GET /contacts?limit=50&offset=0&group={group_id}
```

#### Query Parameters

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| `limit` | number | 50 | Max 500 |
| `offset` | number | 0 | Pagination offset |
| `group` | string | - | Filter by group ID |
| `search` | string | - | Search name/phone/email |

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "con_123",
      "name": "John Doe",
      "phone": "254712345678",
      "email": "john@example.com",
      "company": "Acme Inc",
      "tags": ["vip", "customer"],
      "created_at": "2025-07-01T08:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### Examples

**cURL**
```bash
curl -X GET "https://api.abancool.tech/api/v1/contacts?limit=10" \
  -H "Authorization: Bearer sk_live_xxxxx"
```

---

### 5. Create Contact

Add a new contact.

```
POST /contacts
```

#### Request Body

```json
{
  "name": "Jane Doe",
  "phone": "254712345679",
  "email": "jane@example.com",
  "company": "Beta Corp",
  "tags": ["vip"]
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "con_456",
    "name": "Jane Doe",
    "phone": "254712345679",
    "email": "jane@example.com",
    "company": "Beta Corp",
    "tags": ["vip"],
    "created_at": "2025-07-02T10:30:00Z"
  }
}
```

#### Examples

**JavaScript**
```javascript
const response = await fetch('https://api.abancool.tech/api/v1/contacts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_xxxxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Jane Doe',
    phone: '254712345679',
    email: 'jane@example.com',
    company: 'Beta Corp',
    tags: ['vip']
  })
});

const data = await response.json();
console.log(data.data.id);
```

---

### 6. Get Campaigns

List your campaigns.

```
GET /campaigns?limit=50&status=sent
```

#### Query Parameters

| Parameter | Type | Notes |
|-----------|------|-------|
| `limit` | number | Max 100 |
| `status` | string | `draft`, `sent`, `scheduled`, `failed` |
| `offset` | number | Pagination |

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "camp_123",
      "name": "Summer Promo",
      "status": "sent",
      "recipient_count": 500,
      "sent_count": 480,
      "delivered_count": 475,
      "failed_count": 5,
      "cost_sms": 960,
      "created_at": "2025-07-01T08:00:00Z"
    }
  ],
  "total": 12,
  "limit": 50,
  "offset": 0
}
```

---

### 7. Send Campaign

Trigger an existing campaign to send immediately.

```
POST /campaigns/{campaign_id}/send
```

#### Response (202 Accepted)

```json
{
  "success": true,
  "message": "Campaign queued for sending",
  "campaign_id": "camp_123",
  "estimated_sms": 500
}
```

#### Examples

**cURL**
```bash
curl -X POST https://api.abancool.tech/api/v1/campaigns/camp_123/send \
  -H "Authorization: Bearer sk_live_xxxxx"
```

---

## Webhook Events

When payment completes or SMS is delivered, we send webhooks to your configured endpoint.

### Webhook Headers

- `X-Abancool-Signature`: HMAC-SHA256 signature of request body
- `X-Abancool-Event`: Event type (`payment.completed`, `sms.delivered`, etc.)
- `X-Abancool-Timestamp`: Unix timestamp

### Payment Completed

```json
{
  "event": "payment.completed",
  "timestamp": 1688125200,
  "data": {
    "transaction_id": "tx_123",
    "amount_kes": 5000,
    "sms_credited": 10000,
    "receipt": "LHD121994UA",
    "user_email": "user@example.com"
  }
}
```

### SMS Delivered

```json
{
  "event": "sms.delivered",
  "timestamp": 1688125200,
  "data": {
    "message_id": "msg_123",
    "to": "254712345678",
    "status": "delivered",
    "delivered_at": "2025-07-02T10:31:45Z",
    "reference": "your-ref-123"
  }
}
```

---

## Rate Limit Examples

If you exceed the rate limit, you'll receive:

```json
{
  "error": true,
  "code": "RATE_LIMITED",
  "message": "Too many requests. Maximum 60 per minute.",
  "status": 429,
  "retry_after_seconds": 35
}
```

---

## Best Practices

1. **Store message IDs**: Keep track of `message_id` from send responses for delivery tracking
2. **Handle retries**: Implement exponential backoff for failed requests
3. **Validate phone numbers**: Always normalize phone numbers to E.164 format
4. **Check balance first**: Call `/balance` before bulk sends
5. **Use webhooks**: Instead of polling for delivery status, use webhooks
6. **Cache contacts**: Don't fetch contacts on every request
7. **Unique references**: Use `reference` field to prevent duplicate sends

---

## SDKs & Libraries

Official SDKs (coming soon):
- Python: `pip install abancool`
- JavaScript/Node: `npm install abancool`
- Go: `go get github.com/abancool/sdk-go`
- Java: `maven: com.abancool:sdk-java`

---

## Support

- Email: api@abancool.tech
- Slack: Join our developer community
- Docs: https://docs.abancool.tech
- Status: https://status.abancool.tech

---

## Changelog

### v1.0.0 (July 2025)
- Initial API release
- SMS send, status, and balance endpoints
- Contact and campaign management
- Webhook support
- Rate limiting (60 req/min)

