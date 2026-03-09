# CloudStore API Documentation

## Authentication

All API requests require authentication using JWT tokens.

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

Include token in subsequent requests:
```bash
Authorization: Bearer <token>
```

## Products API

### List Products

```bash
GET /api/v1/products?page=1&limit=20&category=electronics

Response:
{
  "products": [
    {
      "id": "prod_123",
      "name": "Wireless Headphones",
      "price": 79.99,
      "category": "electronics",
      "inStock": true,
      "rating": 4.5
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### Get Product

```bash
GET /api/v1/products/:id

Response:
{
  "id": "prod_123",
  "name": "Wireless Headphones",
  "description": "High-quality wireless headphones with noise cancellation",
  "price": 79.99,
  "category": "electronics",
  "images": ["url1", "url2"],
  "specifications": {
    "battery": "30 hours",
    "bluetooth": "5.0",
    "weight": "250g"
  },
  "inStock": true,
  "quantity": 45,
  "rating": 4.5,
  "reviews": 128
}
```

### Create Product

```bash
POST /api/v1/products
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "New Product",
  "description": "Product description",
  "price": 99.99,
  "category": "electronics",
  "quantity": 100
}

Response: 201 Created
{
  "id": "prod_124",
  "name": "New Product",
  ...
}
```

### Update Product

```bash
PUT /api/v1/products/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "price": 89.99,
  "quantity": 75
}

Response: 200 OK
```

### Delete Product

```bash
DELETE /api/v1/products/:id
Authorization: Bearer <admin_token>

Response: 204 No Content
```

## Orders API

### Create Order

```bash
POST /api/v1/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "prod_123",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102",
    "country": "US"
  },
  "paymentMethod": "card"
}

Response: 201 Created
{
  "orderId": "ord_456",
  "status": "pending",
  "total": 159.98,
  "estimatedDelivery": "2026-03-15"
}
```

### Get Order

```bash
GET /api/v1/orders/:id
Authorization: Bearer <token>

Response:
{
  "orderId": "ord_456",
  "status": "shipped",
  "items": [...],
  "total": 159.98,
  "shippingAddress": {...},
  "trackingNumber": "TRK123456789",
  "createdAt": "2026-03-09T10:00:00Z",
  "updatedAt": "2026-03-10T14:30:00Z"
}
```

### List User Orders

```bash
GET /api/v1/orders?status=shipped&page=1

Response:
{
  "orders": [...],
  "total": 5,
  "page": 1
}
```

### Cancel Order

```bash
POST /api/v1/orders/:id/cancel
Authorization: Bearer <token>

Response: 200 OK
{
  "orderId": "ord_456",
  "status": "cancelled"
}
```

## Payments API

### Process Payment

```bash
POST /api/v1/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "ord_456",
  "method": "card",
  "cardToken": "tok_visa_4242"
}

Response: 200 OK
{
  "paymentId": "pay_789",
  "status": "succeeded",
  "amount": 159.98
}
```

### Get Payment Status

```bash
GET /api/v1/payments/:id
Authorization: Bearer <token>

Response:
{
  "paymentId": "pay_789",
  "orderId": "ord_456",
  "status": "succeeded",
  "amount": 159.98,
  "method": "card",
  "createdAt": "2026-03-09T10:05:00Z"
}
```

## Users API

### Create User

```bash
POST /api/v1/users
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}

Response: 201 Created
{
  "userId": "usr_789",
  "email": "newuser@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Get User Profile

```bash
GET /api/v1/users/me
Authorization: Bearer <token>

Response:
{
  "userId": "usr_789",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "addresses": [...],
  "orders": 12,
  "createdAt": "2025-01-15T08:00:00Z"
}
```

### Update Profile

```bash
PUT /api/v1/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane"
}

Response: 200 OK
```

## Error Responses

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product with ID prod_999 not found",
    "statusCode": 404
  }
}
```

Common error codes:
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## Rate Limiting

- **Standard**: 100 requests per minute
- **Premium**: 1000 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1709985600
```

## Pagination

All list endpoints support pagination:

```bash
GET /api/v1/products?page=2&limit=50
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

## Webhooks

Subscribe to events:

```bash
POST /api/v1/webhooks
Content-Type: application/json

{
  "url": "https://your-site.com/webhook",
  "events": ["order.created", "order.shipped", "payment.succeeded"]
}
```

Webhook payload:
```json
{
  "event": "order.shipped",
  "timestamp": "2026-03-10T14:30:00Z",
  "data": {
    "orderId": "ord_456",
    "trackingNumber": "TRK123456789"
  }
}
```
