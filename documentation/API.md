# 📡 Everett Hotel Management System — REST API Documentation

---

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Pagination](#pagination)
- [API Endpoints](#api-endpoints)
  - [Auth](#auth)
  - [Users](#users)
  - [Rooms](#rooms)
  - [Bookings](#bookings)
  - [Payments](#payments)
  - [Invoices](#invoices)
  - [Reviews](#reviews)
  - [Employees](#employees)
  - [Housekeeping](#housekeeping)
  - [Restaurant](#restaurant)
  - [Inventory](#inventory)
  - [Gallery](#gallery)
  - [Promotions](#promotions)
  - [Notifications](#notifications)
  - [Contact](#contact)
  - [Newsletter](#newsletter)
  - [Reports](#reports)
  - [Analytics](#analytics)
  - [Settings](#settings)
  - [Admin](#admin)

---

## Base URL

```
http://localhost:5000/api
```

All endpoints are prefixed with `/api`. The backend server runs on port `5000` by default (configurable via `PORT` environment variable).

---

## Authentication

The API uses **JWT (JSON Web Tokens)** for authentication. After logging in, include the token in every authenticated request:

```
Authorization: Bearer <your_jwt_token>
```

### Token Lifecycle
- **Access Token**: Valid for 24 hours (configurable via `JWT_EXPIRE`)
- **Refresh Token**: Valid for 7 days (configurable via `JWT_REFRESH_EXPIRE`)
- Tokens are issued upon successful login or registration
- Tokens are invalidated upon logout

### Authentication Levels
| Level | Description |
|---|---|
| **Public** | No authentication required |
| **Authenticated** | Valid JWT token required (any role) |
| **Admin** | Valid JWT token with admin-level role required |
| **Super Admin** | Valid JWT token with `super_admin` role required |

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "id": 1,
    "name": "Example"
  }
}
```

### Success Response with Pagination
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Error Response (Single Error)
```json
{
  "success": false,
  "message": "Resource not found"
}
```

---

## Pagination

Most list endpoints support pagination via query parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `10` | Items per page (max 100) |

**Example:**
```
GET /api/rooms?page=2&limit=20
```

---

## API Endpoints

---

### Auth

Authentication endpoints for user registration, login, and account management.

---

#### POST `/api/auth/register`

Register a new user account.

**Auth Required:** No

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@email.com",
  "password": "SecurePass123!",
  "password_confirm": "SecurePass123!",
  "phone": "+1234567890",
  "date_of_birth": "1990-05-15"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `first_name` | string | Yes | 2-50 characters |
| `last_name` | string | Yes | 2-50 characters |
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Min 8 chars, uppercase, lowercase, number, special char |
| `password_confirm` | string | Yes | Must match `password` |
| `phone` | string | No | Valid phone format |
| `date_of_birth` | string | No | ISO date format (YYYY-MM-DD) |

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {
      "id": 42,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@email.com",
      "role": "customer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

#### POST `/api/auth/login`

Authenticate a user and receive JWT tokens.

**Auth Required:** No

**Request Body:**
```json
{
  "email": "john.doe@email.com",
  "password": "SecurePass123!"
}
```

| Field | Type | Required |
|---|---|---|
| `email` | string | Yes |
| `password` | string | Yes |

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 42,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@email.com",
      "role": "customer",
      "photo": "/uploads/photos/john_doe.jpg"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

#### POST `/api/auth/logout`

Invalidate the current JWT token.

**Auth Required:** Yes

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### GET `/api/auth/me`

Get the currently authenticated user's profile.

**Auth Required:** Yes

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User profile retrieved",
  "data": {
    "id": 42,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@email.com",
    "phone": "+1234567890",
    "role": "customer",
    "photo": "/uploads/photos/john_doe.jpg",
    "is_verified": true,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

#### POST `/api/auth/forgot-password`

Request a password reset link via email.

**Auth Required:** No

**Request Body:**
```json
{
  "email": "john.doe@email.com"
}
```

| Field | Type | Required |
|---|---|---|
| `email` | string | Yes |

**Response (200):**
```json
{
  "success": true,
  "message": "If the email exists in our system, a password reset link has been sent."
}
```

---

#### POST `/api/auth/reset-password`

Reset password using the token from email.

**Auth Required:** No

**Request Body:**
```json
{
  "token": "abc123resettoken",
  "password": "NewSecurePass123!",
  "password_confirm": "NewSecurePass123!"
}
```

| Field | Type | Required |
|---|---|---|
| `token` | string | Yes |
| `password` | string | Yes |
| `password_confirm` | string | Yes |

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful. Please login with your new password."
}
```

---

#### GET `/api/auth/verify-email`

Verify user email address via token.

**Auth Required:** No

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `token` | string | Yes | Email verification token |

**Example:**
```
GET /api/auth/verify-email?token=abc123verifytoken
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### Users

User profile management and admin user operations.

---

#### GET `/api/users/profile`

Get the authenticated user's profile.

**Auth Required:** Yes

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved",
  "data": {
    "id": 42,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@email.com",
    "phone": "+1234567890",
    "date_of_birth": "1990-05-15",
    "role": "customer",
    "photo": "/uploads/photos/john_doe.jpg",
    "is_verified": true,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

#### PUT `/api/users/profile`

Update the authenticated user's profile.

**Auth Required:** Yes

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body (all fields optional):**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "date_of_birth": "1990-05-15"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": 42,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@email.com",
    "phone": "+1234567890"
  }
}
```

---

#### PUT `/api/users/profile/photo`

Upload a profile photo for the authenticated user.

**Auth Required:** Yes

**Content-Type:** `multipart/form-data`

**Request Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `photo` | file | Yes | Image file (JPEG, PNG, WebP; max 5MB) |

**Response (200):**
```json
{
  "success": true,
  "message": "Photo uploaded successfully",
  "data": {
    "photo": "/uploads/photos/user_42_1234567890.jpg"
  }
}
```

---

#### GET `/api/users`

List all users with filtering and pagination.

**Auth Required:** Admin

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Items per page |
| `role` | string | — | Filter by role |
| `search` | string | — | Search by name or email |
| `sort` | string | `created_at` | Sort field |
| `order` | string | `DESC` | Sort order (ASC/DESC) |

**Response (200):**
```json
{
  "success": true,
  "message": "Users retrieved",
  "data": [
    {
      "id": 42,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@email.com",
      "role": "customer",
      "is_verified": true,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

#### GET `/api/users/:id`

Get a specific user by ID.

**Auth Required:** Admin

**Response (200):**
```json
{
  "success": true,
  "message": "User retrieved",
  "data": {
    "id": 42,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@email.com",
    "phone": "+1234567890",
    "role": "customer",
    "photo": "/uploads/photos/john_doe.jpg",
    "is_verified": true,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

#### PUT `/api/users/:id`

Update a user by ID (admin operations).

**Auth Required:** Admin

**Request Body (all fields optional):**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@email.com",
  "phone": "+1234567890",
  "role": "customer",
  "is_verified": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": { ... }
}
```

---

#### DELETE `/api/users/:id`

Delete a user by ID.

**Auth Required:** Admin

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### Rooms

Room catalog, categories, and availability management.

---

#### GET `/api/rooms`

List all rooms with filtering, sorting, and pagination.

**Auth Required:** No

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Items per page |
| `category_id` | integer | — | Filter by category |
| `min_price` | number | — | Minimum price |
| `max_price` | number | — | Maximum price |
| `guests` | integer | — | Minimum guest capacity |
| `status` | string | — | Filter by status (available, occupied, maintenance) |
| `search` | string | — | Search by room number or description |
| `sort` | string | `room_number` | Sort field |
| `order` | string | `ASC` | Sort order |

**Response (200):**
```json
{
  "success": true,
  "message": "Rooms retrieved",
  "data": [
    {
      "id": 1,
      "room_number": "101",
      "category_id": 1,
      "category_name": "Deluxe King",
      "description": "Spacious room with king-size bed and city view",
      "price_per_night": 250.00,
      "max_guests": 2,
      "bed_type": "King",
      "floor": 1,
      "status": "available",
      "amenities": ["WiFi", "TV", "Minibar", "Safe", "Balcony"],
      "images": ["/uploads/rooms/room_101_1.jpg", "/uploads/rooms/room_101_2.jpg"],
      "is_featured": true
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

#### GET `/api/rooms/available`

List available rooms for given dates.

**Auth Required:** No

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `check_in` | string | Yes | Check-in date (YYYY-MM-DD) |
| `check_out` | string | Yes | Check-out date (YYYY-MM-DD) |
| `guests` | integer | No | Number of guests |
| `category_id` | integer | No | Filter by category |

**Example:**
```
GET /api/rooms/available?check_in=2024-06-15&check_out=2024-06-20&guests=2
```

**Response (200):**
```json
{
  "success": true,
  "message": "Available rooms retrieved",
  "data": [
    {
      "id": 1,
      "room_number": "101",
      "category_name": "Deluxe King",
      "price_per_night": 250.00,
      "max_guests": 2,
      "total_nights": 5,
      "total_price": 1250.00
    }
  ]
}
```

---

#### GET `/api/rooms/categories`

List all room categories.

**Auth Required:** No

**Response (200):**
```json
{
  "success": true,
  "message": "Categories retrieved",
  "data": [
    {
      "id": 1,
      "name": "Deluxe King",
      "description": "Spacious rooms with premium amenities",
      "base_price": 250.00,
      "image": "/uploads/categories/deluxe_king.jpg",
      "room_count": 15
    },
    {
      "id": 2,
      "name": "Executive Suite",
      "description": "Luxury suites with separate living area",
      "base_price": 500.00,
      "image": "/uploads/categories/executive_suite.jpg",
      "room_count": 8
    }
  ]
}
```

---

#### GET `/api/rooms/:id`

Get detailed information about a specific room.

**Auth Required:** No

**Response (200):**
```json
{
  "success": true,
  "message": "Room details retrieved",
  "data": {
    "id": 1,
    "room_number": "101",
    "category_id": 1,
    "category_name": "Deluxe King",
    "description": "Spacious room with king-size bed and stunning city view. Features premium bedding, marble bathroom, and modern amenities.",
    "price_per_night": 250.00,
    "max_guests": 2,
    "bed_type": "King",
    "floor": 1,
    "size_sqm": 45,
    "status": "available",
    "amenities": ["WiFi", "TV", "Minibar", "Safe", "Balcony", "Air Conditioning", "Coffee Maker"],
    "images": ["/uploads/rooms/room_101_1.jpg", "/uploads/rooms/room_101_2.jpg"],
    "is_featured": true,
    "reviews": {
      "average_rating": 4.7,
      "total_reviews": 32
    }
  }
}
```

---

#### POST `/api/rooms`

Create a new room.

**Auth Required:** Admin

**Content-Type:** `multipart/form-data`

**Request Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `room_number` | string | Yes | Unique room number |
| `category_id` | integer | Yes | Room category ID |
| `description` | string | Yes | Room description |
| `price_per_night` | number | Yes | Price per night |
| `max_guests` | integer | Yes | Maximum guests |
| `bed_type` | string | Yes | King, Queen, Twin, etc. |
| `floor` | integer | Yes | Floor number |
| `size_sqm` | number | No | Room size in sqm |
| `status` | string | No | available, maintenance (default: available) |
| `amenities` | string | No | JSON array of amenities |
| `images` | file | No | Multiple room images |
| `is_featured` | boolean | No | Feature on homepage |

**Response (201):**
```json
{
  "success": true,
  "message": "Room created successfully",
  "data": {
    "id": 51,
    "room_number": "501",
    "category_name": "Presidential Suite",
    "price_per_night": 1000.00,
    "status": "available"
  }
}
```

---

#### PUT `/api/rooms/:id`

Update an existing room.

**Auth Required:** Admin

**Request Body:** Same as POST (all fields optional)

**Response (200):**
```json
{
  "success": true,
  "message": "Room updated successfully",
  "data": { ... }
}
```

---

#### DELETE `/api/rooms/:id`

Delete a room.

**Auth Required:** Admin

**Response (200):**
```json
{
  "success": true,
  "message": "Room deleted successfully"
}
```

---

#### POST `/api/rooms/categories`

Create a new room category.

**Auth Required:** Admin

**Request Body:**
```json
{
  "name": "Penthouse Suite",
  "description": "Exclusive penthouse with panoramic views",
  "base_price": 1500.00,
  "image": "category_image.jpg"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": 6,
    "name": "Penthouse Suite",
    "base_price": 1500.00
  }
}
```

---

#### PUT `/api/rooms/categories/:id`

Update a room category.

**Auth Required:** Admin

**Request Body (all fields optional):**
```json
{
  "name": "Penthouse Suite",
  "description": "Exclusive penthouse with panoramic city views",
  "base_price": 1500.00
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": { ... }
}
```

---

#### DELETE `/api/rooms/categories/:id`

Delete a room category. Fails if rooms are assigned to this category.

**Auth Required:** Admin

**Response (200):**
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

### Bookings

Reservation creation, management, and availability checking.

---

#### POST `/api/bookings`

Create a new booking/reservation.

**Auth Required:** Yes

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "room_id": 1,
  "check_in_date": "2024-06-15",
  "check_out_date": "2024-06-20",
  "adults": 2,
  "children": 0,
  "special_requests": "Late check-in please, around 11 PM",
  "payment_method": "mpesa"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `room_id` | integer | Yes | Room to book |
| `check_in_date` | string | Yes | Check-in date (YYYY-MM-DD), must be today or future |
| `check_out_date` | string | Yes | Check-out date (YYYY-MM-DD), must be after check-in |
| `adults` | integer | Yes | Number of adults (min 1) |
| `children` | integer | No | Number of children (default: 0) |
| `special_requests` | string | No | Special requests |
| `payment_method` | string | Yes | mpesa, paypal, stripe, card, cash, bank_transfer |

**Response (201):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": 100,
    "booking_reference": "EVH-2024-000100",
    "room": {
      "id": 1,
      "room_number": "101",
      "category_name": "Deluxe King"
    },
    "check_in_date": "2024-06-15",
    "check_out_date": "2024-06-20",
    "nights": 5,
    "total_amount": 1250.00,
    "status": "pending",
    "payment_status": "pending",
    "payment_method": "mpesa",
    "created_at": "2024-06-01T14:30:00.000Z"
  }
}
```

---

#### GET `/api/bookings/my`

Get all bookings for the authenticated user.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Items per page |
| `status` | string | — | Filter by status |

**Response (200):**
```json
{
  "success": true,
  "message": "Bookings retrieved",
  "data": [
    {
      "id": 100,
      "booking_reference": "EVH-2024-000100",
      "room_number": "101",
      "category_name": "Deluxe King",
      "check_in_date": "2024-06-15",
      "check_out_date": "2024-06-20",
      "nights": 5,
      "total_amount": 1250.00,
      "status": "confirmed",
      "payment_status": "completed",
      "created_at": "2024-06-01T14:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

#### GET `/api/bookings/:id`

Get detailed information about a specific booking.

**Auth Required:** Yes (must own the booking or be admin)

**Response (200):**
```json
{
  "success": true,
  "message": "Booking details retrieved",
  "data": {
    "id": 100,
    "booking_reference": "EVH-2024-000100",
    "user": {
      "id": 42,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@email.com"
    },
    "room": {
      "id": 1,
      "room_number": "101",
      "category_name": "Deluxe King",
      "floor": 1
    },
    "check_in_date": "2024-06-15",
    "check_out_date": "2024-06-20",
    "nights": 5,
    "adults": 2,
    "children": 0,
    "total_amount": 1250.00,
    "status": "confirmed",
    "payment_status": "completed",
    "payment_method": "mpesa",
    "special_requests": "Late check-in please",
    "created_at": "2024-06-01T14:30:00.000Z"
  }
}
```

---

#### PUT `/api/bookings/:id/cancel`

Cancel an existing booking.

**Auth Required:** Yes (must own the booking)

**Request Body (optional):**
```json
{
  "reason": "Change of travel plans"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "id": 100,
    "status": "cancelled",
    "refund_amount": 1250.00
  }
}
```

---

#### GET `/api/bookings/availability/check`

Check room availability for specific dates.

**Auth Required:** No

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `room_id` | integer | Yes | Room to check |
| `check_in` | string | Yes | Check-in date (YYYY-MM-DD) |
| `check_out` | string | Yes | Check-out date (YYYY-MM-DD) |

**Response (200):**
```json
{
  "success": true,
  "message": "Availability checked",
  "data": {
    "available": true,
    "room_id": 1,
    "room_number": "101",
    "check_in": "2024-06-15",
    "check_out": "2024-06-20",
    "nights": 5,
    "price_per_night": 250.00,
    "total_price": 1250.00
  }
}
```

---

#### GET `/api/bookings/admin/all`

List all bookings (admin view).

**Auth Required:** Admin

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Items per page |
| `status` | string | — | Filter by status |
| `date_from` | string | — | Filter bookings from date |
| `date_to` | string | — | Filter bookings to date |
| `search` | string | — | Search by reference or guest name |

**Response (200):**
```json
{
  "success": true,
  "message": "All bookings retrieved",
  "data": [
    {
      "id": 100,
      "booking_reference": "EVH-2024-000100",
      "guest_name": "John Doe",
      "guest_email": "john.doe@email.com",
      "room_number": "101",
      "category_name": "Deluxe King",
      "check_in_date": "2024-06-15",
      "check_out_date": "2024-06-20",
      "nights": 5,
      "total_amount": 1250.00,
      "status": "confirmed",
      "payment_status": "completed",
      "created_at": "2024-06-01T14:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 250,
    "page": 1,
    "limit": 10,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

#### PUT `/api/bookings/admin/:id/status`

Update a booking's status (admin operations).

**Auth Required:** Admin

**Request Body:**
```json
{
  "status": "confirmed",
  "notes": "Payment verified, booking confirmed"
}
```

| Status Value | Description |
|---|---|
| `pending` | Awaiting payment/confirmation |
| `confirmed` | Booking confirmed |
| `checked_in` | Guest has checked in |
| `checked_out` | Guest has checked out |
| `cancelled` | Booking cancelled |
| `no_show` | Guest did not show up |

**Response (200):**
```json
{
  "success": true,
  "message": "Booking status updated",
  "data": {
    "id": 100,
    "status": "confirmed",
    "updated_at": "2024-06-10T09:00:00.000Z"
  }
}
```

---

### Payments

Payment processing and transaction management.

---

#### POST `/api/payments`

Create a new payment for a booking.

**Auth Required:** Yes

**Request Body:**
```json
{
  "booking_id": 100,
  "amount": 1250.00,
  "payment_method": "mpesa",
  "transaction_id": "MPESA_TXN_12345"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `booking_id` | integer | Yes | Associated booking ID |
| `amount` | number | Yes | Payment amount |
| `payment_method` | string | Yes | mpesa, paypal, stripe, card, cash, bank_transfer |
| `transaction_id` | string | No | External transaction reference |

**Response (201):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "id": 500,
    "booking_id": 100,
    "amount": 1250.00,
    "payment_method": "mpesa",
    "transaction_id": "MPESA_TXN_12345",
    "status": "completed",
    "created_at": "2024-06-01T14:35:00.000Z"
  }
}
```

---

#### GET `/api/payments/my`

Get all payments for the authenticated user.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Items per page |

**Response (200):**
```json
{
  "success": true,
  "message": "Payments retrieved",
  "data": [
    {
      "id": 500,
      "booking_id": 100,
      "booking_reference": "EVH-2024-000100",
      "amount": 1250.00,
      "payment_method": "mpesa",
      "status": "completed",
      "created_at": "2024-06-01T14:35:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### GET `/api/payments/:id`

Get detailed information about a specific payment.

**Auth Required:** Yes (must own the payment or be admin)

**Response (200):**
```json
{
  "success": true,
  "message": "Payment details retrieved",
  "data": {
    "id": 500,
    "booking_id": 100,
    "booking_reference": "EVH-2024-000100",
    "user_id": 42,
    "amount": 1250.00,
    "payment_method": "mpesa",
    "transaction_id": "MPESA_TXN_12345",
    "status": "completed",
    "created_at": "2024-06-01T14:35:00.000Z"
  }
}
```

---

#### GET `/api/payments/admin/all`

List all payments (admin view).

**Auth Required:** Admin

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Items per page |
| `status` | string | — | Filter by status |
| `method` | string | — | Filter by payment method |
| `date_from` | string | — | Filter from date |
| `date_to` | string | — | Filter to date |

**Response (200):**
```json
{
  "success": true,
  "message": "All payments retrieved",
  "data": [
    {
      "id": 500,
      "booking_reference": "EVH-2024-000100",
      "guest_name": "John Doe",
      "amount": 1250.00,
      "payment_method": "mpesa",
      "status": "completed",
      "created_at": "2024-06-01T14:35:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

### Invoices

Invoice generation, retrieval, and download.

---

#### POST `/api/invoices`

Create an invoice for a booking.

**Auth Required:** Admin

**Request Body:**
```json
{
  "booking_id": 100,
  "due_date": "2024-06-25",
  "items": [
    {
      "description": "Deluxe King Room - 5 nights",
      "quantity": 5,
      "unit_price": 250.00,
      "amount": 1250.00
    },
    {
      "description": "Room Service - Breakfast",
      "quantity": 5,
      "unit_price": 35.00,
      "amount": 175.00
    }
  ],
  "tax_rate": 10,
  "notes": "Thank you for choosing Everett Hotel"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Invoice created successfully",
  "data": {
    "id": 200,
    "invoice_number": "INV-2024-000200",
    "booking_id": 100,
    "booking_reference": "EVH-2024-000100",
    "guest_name": "John Doe",
    "subtotal": 1425.00,
    "tax": 142.50,
    "total": 1567.50,
    "status": "pending",
    "due_date": "2024-06-25",
    "created_at": "2024-06-20T10:00:00.000Z"
  }
}
```

---

#### GET `/api/invoices/my`

Get all invoices for the authenticated user.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Items per page |
| `status` | string | — | Filter by status |

**Response (200):**
```json
{
  "success": true,
  "message": "Invoices retrieved",
  "data": [
    {
      "id": 200,
      "invoice_number": "INV-2024-000200",
      "booking_reference": "EVH-2024-000100",
      "total": 1567.50,
      "status": "pending",
      "due_date": "2024-06-25",
      "created_at": "2024-06-20T10:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### GET `/api/invoices/:id`

Get detailed invoice information.

**Auth Required:** Yes (must own the invoice or be admin)

**Response (200):**
```json
{
  "success": true,
  "message": "Invoice details retrieved",
  "data": {
    "id": 200,
    "invoice_number": "INV-2024-000200",
    "booking_id": 100,
    "booking_reference": "EVH-2024-000100",
    "guest": {
      "name": "John Doe",
      "email": "john.doe@email.com"
    },
    "items": [
      {
        "description": "Deluxe King Room - 5 nights",
        "quantity": 5,
        "unit_price": 250.00,
        "amount": 1250.00
      },
      {
        "description": "Room Service - Breakfast",
        "quantity": 5,
        "unit_price": 35.00,
        "amount": 175.00
      }
    ],
    "subtotal": 1425.00,
    "tax_rate": 10,
    "tax": 142.50,
    "total": 1567.50,
    "status": "pending",
    "due_date": "2024-06-25",
    "notes": "Thank you for choosing Everett Hotel",
    "created_at": "2024-06-20T10:00:00.000Z"
  }
}
```

---

#### GET `/api/invoices/:id/download`

Download invoice as PDF.

**Auth Required:** Yes (must own the invoice or be admin)

**Response:** PDF file download

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="INV-2024-000200.pdf"
```

---

### Reviews

Guest reviews and ratings management.

---

#### POST `/api/reviews`

Create a review for a completed booking.

**Auth Required:** Yes

**Request Body:**
```json
{
  "booking_id": 100,
  "room_id": 1,
  "rating": 5,
  "title": "Exceptional Stay!",
  "comment": "The room was immaculate, staff was incredibly attentive, and the amenities exceeded our expectations. Will definitely return!",
  "cleanliness_rating": 5,
  "service_rating": 5,
  "comfort_rating": 5,
  "value_rating": 4
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `booking_id` | integer | Yes | Must be a completed booking by this user |
| `room_id` | integer | Yes | Room being reviewed |
| `rating` | integer | Yes | Overall rating (1-5) |
| `title` | string | Yes | Review title |
| `comment` | string | Yes | Review body (min 10 chars) |
| `cleanliness_rating` | integer | No | Cleanliness (1-5) |
| `service_rating` | integer | No | Service (1-5) |
| `comfort_rating` | integer | No | Comfort (1-5) |
| `value_rating` | integer | No | Value for money (1-5) |

**Response (201):**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "id": 300,
    "user_name": "John D.",
    "room_number": "101",
    "rating": 5,
    "title": "Exceptional Stay!",
    "is_approved": false,
    "created_at": "2024-06-22T08:00:00.000Z"
  }
}
```

---

#### GET `/api/reviews`

List approved reviews (public) with optional filters.

**Auth Required:** No

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Items per page |
| `room_id` | integer | — | Filter by room |
| `rating` | integer | — | Filter by minimum rating |
| `sort` | string | `created_at` | Sort field |
| `order` | string | `DESC` | Sort order |

**Response (200):**
```json
{
  "success": true,
  "message": "Reviews retrieved",
  "data": [
    {
      "id": 300,
      "user_name": "John D.",
      "room_number": "101",
      "category_name": "Deluxe King",
      "rating": 5,
      "title": "Exceptional Stay!",
      "comment": "The room was immaculate...",
      "cleanliness_rating": 5,
      "service_rating": 5,
      "comfort_rating": 5,
      "value_rating": 4,
      "is_featured": false,
      "created_at": "2024-06-22T08:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### PUT `/api/reviews/:id`

Update a review (owner only).

**Auth Required:** Yes

**Request Body (all fields optional):**
```json
{
  "rating": 4,
  "title": "Updated: Very Good Stay",
  "comment": "Updated review text..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Review updated successfully",
  "data": { ... }
}
```

---

#### DELETE `/api/reviews/:id`

Delete a review (owner or admin).

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

---

### Employees

Employee/staff management (admin-only operations).

---

#### GET `/api/employees`

List all employees with filtering.

**Auth Required:** Admin

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Items per page |
| `department` | string | — | Filter by department |
| `search` | string | — | Search by name or position |

**Response (200):**
```json
{
  "success": true,
  "message": "Employees retrieved",
  "data": [
    {
      "id": 20,
      "user_id": 15,
      "first_name": "Sarah",
      "last_name": "Williams",
      "email": "sarah.w@everetthotel.com",
      "position": "Head Housekeeper",
      "department": "Housekeeping",
      "phone": "+1234567891",
      "hire_date": "2022-03-15",
      "status": "active",
      "salary": 45000.00
    }
  ],
  "pagination": { ... }
}
```

---

#### POST `/api/employees`

Create a new employee record.

**Auth Required:** Admin

**Request Body:**
```json
{
  "user_id": 15,
  "employee_id": "EMP-001",
  "position": "Head Housekeeper",
  "department": "Housekeeping",
  "hire_date": "2022-03-15",
  "salary": 45000.00,
  "emergency_contact": {
    "name": "James Williams",
    "phone": "+1234567892",
    "relationship": "Spouse"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "id": 20,
    "employee_id": "EMP-001",
    "position": "Head Housekeeper",
    "department": "Housekeeping",
    "status": "active"
  }
}
```

---

#### PUT `/api/employees/:id`

Update an employee record.

**Auth Required:** Admin

**Request Body (all fields optional):**
```json
{
  "position": "Housekeeping Manager",
  "department": "Housekeeping",
  "salary": 50000.00,
  "status": "active"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": { ... }
}
```

---

#### DELETE `/api/employees/:id`

Delete an employee record.

**Auth Required:** Admin

**Response (200):**
```json
{
  "success": true,
  "message": "Employee deleted successfully"
}
```

---

### Housekeeping

Housekeeping task management and room cleaning schedules.

---

#### GET `/api/housekeeping`

List housekeeping tasks.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Items per page |
| `status` | string | — | Filter by status (pending, in_progress, completed) |
| `date` | string | — | Filter by date (YYYY-MM-DD) |
| `room_id` | integer | — | Filter by room |

**Response (200):**
```json
{
  "success": true,
  "message": "Housekeeping tasks retrieved",
  "data": [
    {
      "id": 400,
      "room_id": 1,
      "room_number": "101",
      "task_type": "cleaning",
      "priority": "high",
      "status": "pending",
      "assigned_to": "Sarah Williams",
      "notes": "VIP guest arriving, deep clean required",
      "scheduled_date": "2024-06-15",
      "created_at": "2024-06-14T16:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### POST `/api/housekeeping`

Create a new housekeeping task.

**Auth Required:** Admin

**Request Body:**
```json
{
  "room_id": 1,
  "task_type": "deep_cleaning",
  "priority": "high",
  "assigned_to": 20,
  "notes": "VIP arrival, full deep clean required",
  "scheduled_date": "2024-06-15"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `room_id` | integer | Yes | Room to clean |
| `task_type` | string | Yes | cleaning, maintenance, inspection, deep_cleaning |
| `priority` | string | Yes | low, medium, high, urgent |
| `assigned_to` | integer | No | Employee ID |
| `notes` | string | No | Task notes |
| `scheduled_date` | string | Yes | Date (YYYY-MM-DD) |

**Response (201):**
```json
{
  "success": true,
  "message": "Housekeeping task created",
  "data": {
    "id": 401,
    "room_number": "101",
    "task_type": "deep_cleaning",
    "priority": "high",
    "status": "pending",
    "scheduled_date": "2024-06-15"
  }
}
```

---

#### PUT `/api/housekeeping/:id`

Update a housekeeping task status or details.

**Auth Required:** Yes

**Request Body (all fields optional):**
```json
{
  "status": "in_progress",
  "assigned_to": 20,
  "notes": "Started cleaning at 8 AM"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    "id": 400,
    "status": "in_progress",
    "updated_at": "2024-06-15T08:00:00.000Z"
  }
}
```

---

### Restaurant

Restaurant menu management and ordering.

---

#### GET `/api/restaurant/menu`

List all menu items.

**Auth Required:** No

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `category` | string | — | Filter by category (appetizer, main, dessert, beverage) |
| `available` | boolean | — | Filter by availability |

**Response (200):**
```json
{
  "success": true,
  "message": "Menu items retrieved",
  "data": [
    {
      "id": 1,
      "name": "Grilled Salmon",
      "description": "Fresh Atlantic salmon with lemon butter sauce",
      "category": "main",
      "price": 42.00,
      "image": "/uploads/menu/grilled_salmon.jpg",
      "is_available": true,
      "is_vegetarian": false,
      "is_vegan": false,
      "is_gluten_free": true,
      "calories": 380
    },
    {
      "id": 2,
      "name": "Caesar Salad",
      "description": "Classic Caesar with parmesan croutons",
      "category": "appetizer",
      "price": 18.00,
      "image": "/uploads/menu/caesar_salad.jpg",
      "is_available": true,
      "is_vegetarian": true,
      "is_vegan": false,
      "is_gluten_free": false,
      "calories": 220
    }
  ]
}
```

---

#### POST `/api/restaurant/menu`

Create a new menu item.

**Auth Required:** Admin

**Content-Type:** `multipart/form-data`

**Request Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Item name |
| `description` | string | Yes | Item description |
| `category` | string | Yes | appetizer, main, dessert, beverage |
| `price` | number | Yes | Item price |
| `image` | file | No | Item image |
| `is_available` | boolean | No | Availability (default: true) |
| `is_vegetarian` | boolean | No | Vegetarian flag |
| `is_vegan` | boolean | No | Vegan flag |
| `is_gluten_free` | boolean | No | Gluten-free flag |
| `calories` | integer | No | Calorie count |

**Response (201):**
```json
{
  "success": true,
  "message": "Menu item created",
  "data": {
    "id": 30,
    "name": "Truffle Risotto",
    "category": "main",
    "price": 38.00,
    "is_available": true
  }
}
```

---

#### PUT `/api/restaurant/menu/:id`

Update a menu item.

**Auth Required:** Admin

**Request Body (all fields optional):**
```json
{
  "name": "Updated Truffle Risotto",
  "price": 42.00,
  "is_available": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Menu item updated",
  "data": { ... }
}
```

---

#### DELETE `/api/restaurant/menu/:id`

Delete a menu item.

**Auth Required:** Admin

**Response (200):**
```json
{
  "success": true,
  "message": "Menu item deleted"
}
```

---

### Inventory

Hotel inventory and supply management.

---

#### GET `/api/inventory`

List all inventory items.

**Auth Required:** Admin

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Items per page |
| `category` | string | — | Filter by category |
| `low_stock` | boolean | — | Only show low stock items |

**Response (200):**
```json
{
  "success": true,
  "message": "Inventory items retrieved",
  "data": [
    {
      "id": 1,
      "name": "Bath Towels",
      "category": "linens",
      "quantity": 500,
      "min_quantity": 100,
      "unit": "pieces",
      "unit_cost": 12.50,
      "supplier": "LinenPro Supplies",
      "status": "in_stock",
      "last_restocked": "2024-06-01"
    },
    {
      "id": 2,
      "name": "Shampoo (250ml)",
      "category": "toiletries",
      "quantity": 45,
      "min_quantity": 50,
      "unit": "bottles",
      "unit_cost": 3.50,
      "supplier": "LuxStay Amenities",
      "status": "low_stock",
      "last_restocked": "2024-05-15"
    }
  ],
  "pagination": { ... }
}
```

---

#### POST `/api/inventory`

Create a new inventory item.

**Auth Required:** Admin

**Request Body:**
```json
{
  "name": "Pillows",
  "category": "linens",
  "quantity": 200,
  "min_quantity": 50,
  "unit": "pieces",
  "unit_cost": 8.00,
  "supplier": "LinenPro Supplies",
  "notes": "Standard hotel pillows"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Inventory item created",
  "data": {
    "id": 50,
    "name": "Pillows",
    "category": "linens",
    "quantity": 200,
    "status": "in_stock"
  }
}
```

---

#### PUT `/api/inventory/:id`

Update an inventory item.

**Auth Required:** Admin

**Request Body (all fields optional):**
```json
{
  "quantity": 250,
  "unit_cost": 9.00,
  "min_quantity": 60
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Inventory item updated",
  "data": { ... }
}
```

---

#### DELETE `/api/inventory/:id`

Delete an inventory item.

**Auth Required:** Admin

**Response (200):**
```json
{
  "success": true,
  "message": "Inventory item deleted"
}
```

---

### Gallery

Hotel photo gallery management.

---

#### GET `/api/gallery`

List all gallery images.

**Auth Required:** No

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page |
| `category` | string | — | Filter by category (room, lobby, restaurant, pool, exterior, event) |

**Response (200):**
```json
{
  "success": true,
  "message": "Gallery images retrieved",
  "data": [
    {
      "id": 1,
      "title": "Grand Lobby",
      "description": "The elegant grand lobby with crystal chandelier",
      "image": "/uploads/gallery/lobby_01.jpg",
      "category": "lobby",
      "sort_order": 1,
      "created_at": "2024-01-10T10:00:00.000Z"
    },
    {
      "id": 2,
      "title": "Deluxe King Room",
      "description": "Spacious deluxe room with panoramic city view",
      "image": "/uploads/gallery/room_deluxe_01.jpg",
      "category": "room",
      "sort_order": 2,
      "created_at": "2024-01-10T10:05:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### POST `/api/gallery`

Upload a new gallery image.

**Auth Required:** Admin

**Content-Type:** `multipart/form-data`

**Request Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `image` | file | Yes | Image file (JPEG, PNG, WebP; max 10MB) |
| `title` | string | Yes | Image title |
| `description` | string | No | Image description |
| `category` | string | Yes | lobby, room, restaurant, pool, exterior, event |
| `sort_order` | integer | No | Display order |

**Response (201):**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "id": 50,
    "title": "Infinity Pool",
    "image": "/uploads/gallery/pool_01.jpg",
    "category": "pool",
    "sort_order": 3
  }
}
```

---

#### DELETE `/api/gallery/:id`

Delete a gallery image.

**Auth Required:** Admin

**Response (200):**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

---

### Promotions

Promotional offers and discounts management.

---

#### GET `/api/promotions`

List active promotions.

**Auth Required:** No

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Items per page |

**Response (200):**
```json
{
  "success": true,
  "message": "Promotions retrieved",
  "data": [
    {
      "id": 1,
      "title": "Summer Getaway Special",
      "description": "Enjoy 20% off on all bookings for stays between June-August. Includes complimentary breakfast for two.",
      "discount_type": "percentage",
      "discount_value": 20,
      "min_nights": 3,
      "max_discount": 200.00,
      "promo_code": "SUMMER2024",
      "image": "/uploads/promotions/summer_2024.jpg",
      "start_date": "2024-06-01",
      "end_date": "2024-08-31",
      "is_active": true,
      "usage_count": 145
    }
  ],
  "pagination": { ... }
}
```

---

#### POST `/api/promotions`

Create a new promotion.

**Auth Required:** Admin

**Request Body:**
```json
{
  "title": "Early Bird Discount",
  "description": "Book 30 days in advance and save 15%",
  "discount_type": "percentage",
  "discount_value": 15,
  "min_nights": 2,
  "max_discount": 150.00,
  "promo_code": "EARLYBIRD15",
  "image": "promotion_image.jpg",
  "start_date": "2024-07-01",
  "end_date": "2024-12-31",
  "is_active": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Promotion title |
| `description` | string | Yes | Detailed description |
| `discount_type` | string | Yes | percentage or fixed |
| `discount_value` | number | Yes | Discount amount |
| `min_nights` | integer | No | Minimum nights required |
| `max_discount` | number | No | Maximum discount cap |
| `promo_code` | string | Yes | Unique promo code |
| `image` | file | No | Promotion image |
| `start_date` | string | Yes | Start date (YYYY-MM-DD) |
| `end_date` | string | Yes | End date (YYYY-MM-DD) |
| `is_active` | boolean | No | Active status (default: true) |

**Response (201):**
```json
{
  "success": true,
  "message": "Promotion created",
  "data": {
    "id": 10,
    "title": "Early Bird Discount",
    "promo_code": "EARLYBIRD15",
    "is_active": true
  }
}
```

---

#### PUT `/api/promotions/:id`

Update a promotion.

**Auth Required:** Admin

**Request Body (all fields optional):**
```json
{
  "is_active": false,
  "end_date": "2024-07-31"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Promotion updated",
  "data": { ... }
}
```

---

#### DELETE `/api/promotions/:id`

Delete a promotion.

**Auth Required:** Admin

**Response (200):**
```json
{
  "success": true,
  "message": "Promotion deleted"
}
```

---

### Notifications

User and system notifications management.

---

#### GET `/api/notifications`

Get all notifications for the authenticated user.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page |
| `unread_only` | boolean | `false` | Only unread notifications |

**Response (200):**
```json
{
  "success": true,
  "message": "Notifications retrieved",
  "data": [
    {
      "id": 600,
      "title": "Booking Confirmed",
      "message": "Your booking EVH-2024-000100 has been confirmed for June 15-20, 2024.",
      "type": "booking",
      "is_read": false,
      "link": "/my-bookings/100",
      "created_at": "2024-06-01T14:30:00.000Z"
    },
    {
      "id": 599,
      "title": "Welcome to Everett Hotel",
      "message": "Thank you for registering! Explore our rooms and exclusive offers.",
      "type": "system",
      "is_read": true,
      "link": null,
      "created_at": "2024-06-01T14:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### PUT `/api/notifications/:id/read`

Mark a notification as read.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

#### POST `/api/notifications/send`

Send a notification to users (admin).

**Auth Required:** Admin

**Request Body:**
```json
{
  "user_ids": [42, 43, 44],
  "title": "Room Rate Update",
  "message": "Updated room rates for the holiday season are now available.",
  "type": "announcement",
  "link": "/promotions"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `user_ids` | array | Yes | Recipient user IDs |
| `title` | string | Yes | Notification title |
| `message` | string | Yes | Notification message |
| `type` | string | Yes | booking, payment, system, announcement, reminder |
| `link` | string | No | Deep link URL |

**Response (201):**
```json
{
  "success": true,
  "message": "Notification sent to 3 users",
  "data": {
    "sent_count": 3
  }
}
```

---

### Contact

Contact form message management.

---

#### POST `/api/contact`

Send a contact message.

**Auth Required:** No

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@email.com",
  "phone": "+1234567890",
  "subject": "Room Reservation Inquiry",
  "message": "I would like to inquire about availability for a family suite during Christmas week."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Sender name |
| `email` | string | Yes | Sender email |
| `phone` | string | No | Sender phone |
| `subject` | string | Yes | Message subject |
| `message` | string | Yes | Message body (min 10 chars) |

**Response (201):**
```json
{
  "success": true,
  "message": "Message sent successfully. We'll get back to you within 24 hours."
}
```

---

#### GET `/api/contact`

List all contact messages.

**Auth Required:** Admin

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page |
| `status` | string | — | Filter by status (unread, read, replied) |

**Response (200):**
```json
{
  "success": true,
  "message": "Messages retrieved",
  "data": [
    {
      "id": 700,
      "name": "John Doe",
      "email": "john.doe@email.com",
      "phone": "+1234567890",
      "subject": "Room Reservation Inquiry",
      "message": "I would like to inquire about availability...",
      "status": "unread",
      "created_at": "2024-06-10T09:30:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

### Newsletter

Newsletter subscription management.

---

#### POST `/api/newsletter/subscribe`

Subscribe to the newsletter.

**Auth Required:** No

**Request Body:**
```json
{
  "email": "john.doe@email.com"
}
```

| Field | Type | Required |
|---|---|---|
| `email` | string | Yes |

**Response (201):**
```json
{
  "success": true,
  "message": "Successfully subscribed to our newsletter!"
}
```

---

#### GET `/api/newsletter/subscribers`

List all newsletter subscribers.

**Auth Required:** Admin

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `50` | Items per page |
| `status` | string | — | Filter by status (active, unsubscribed) |

**Response (200):**
```json
{
  "success": true,
  "message": "Subscribers retrieved",
  "data": [
    {
      "id": 1,
      "email": "john.doe@email.com",
      "status": "active",
      "subscribed_at": "2024-03-15T10:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

### Attendance

Staff attendance management with geofencing, IP logging, and photo verification.

---

#### POST `/api/attendance/clock-in`

Clock in for the day. Requires browser Geolocation API (latitude/longitude). Location is validated against hotel geofence settings from `system_settings` table.

**Auth Required:** Yes (employee roles)

**Request Body:**
```json
{
  "latitude": -1.2641,
  "longitude": 36.8068
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `latitude` | number | Yes | User's current GPS latitude |
| `longitude` | number | Yes | User's current GPS longitude |

**Response (201):**
```json
{
  "success": true,
  "message": "Clocked in successfully",
  "data": {
    "id": 100,
    "clock_in": "2024-06-15T08:00:00.000Z",
    "is_remote": false,
    "distance_meters": 125.5,
    "ip_address": "192.168.1.100",
    "location_valid": true
  }
}
```

> If `distance_meters` exceeds `geofence_radius_meters` (default 500m), `is_remote` is set to `true` and the record is flagged for admin review.

**Error Responses:**
```json
// Already clocked in today
{
  "success": false,
  "message": "You have already clocked in today"
}

// Geolocation not provided
{
  "success": false,
  "message": "Geolocation is required to clock in"
}
```

---

#### POST `/api/attendance/clock-out`

Clock out for the day. Captures current location for distance calculation.

**Auth Required:** Yes (employee roles)

**Request Body:**
```json
{
  "latitude": -1.2643,
  "longitude": 36.8070
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `latitude` | number | No | Current GPS latitude (recommended) |
| `longitude` | number | No | Current GPS longitude (recommended) |

**Response (200):**
```json
{
  "success": true,
  "message": "Clocked out successfully",
  "data": {
    "id": 100,
    "clock_out": "2024-06-15T17:00:00.000Z",
    "hours_worked": 9.0
  }
}
```

---

#### GET `/api/attendance/my-status`

Get today's attendance status for the authenticated user.

**Auth Required:** Yes (employee roles)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 100,
    "clock_in": "2024-06-15T08:00:00.000Z",
    "clock_out": null,
    "is_remote": false,
    "distance_meters": 125.5,
    "hours_worked": null
  }
}
```

**Response (200) — no record:**
```json
{
  "success": true,
  "data": null
}
```

---

#### GET `/api/attendance/my-recent`

Get recent attendance records for the authenticated user.

**Auth Required:** Yes (employee roles)

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | `7` | Number of records to return |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 100,
      "clock_in": "2024-06-15T08:00:00.000Z",
      "clock_out": "2024-06-15T17:00:00.000Z",
      "is_remote": false,
      "distance_meters": 125.5,
      "hours_worked": 9.0
    }
  ]
}
```

---

#### GET `/api/attendance/admin/all`

List all attendance records (admin). Supports filtering by date range, employee, and remote status.

**Auth Required:** Admin

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Records per page |
| `date_from` | string | — | Filter from date (YYYY-MM-DD) |
| `date_to` | string | — | Filter to date (YYYY-MM-DD) |
| `employee_id` | integer | — | Filter by specific employee |
| `is_remote` | boolean | — | Filter remote/on-site only |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 100,
      "employee_id": 5,
      "employee_name": "Jane Smith",
      "employee_role": "housekeeping",
      "profile_photo": "/uploads/employees/jane_smith.jpg",
      "clock_in": "2024-06-15T08:00:00.000Z",
      "clock_out": "2024-06-15T17:00:00.000Z",
      "is_remote": false,
      "distance_meters": 125.5,
      "ip_address": "192.168.1.100",
      "location_valid": true,
      "hours_worked": 9.0
    }
  ],
  "pagination": { "total": 50, "page": 1, "limit": 20 }
}
```

---

#### GET `/api/attendance/admin/stats`

Get attendance statistics (admin).

**Auth Required:** Admin

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `date_from` | string | — | Start date (YYYY-MM-DD) |
| `date_to` | string | — | End date (YYYY-MM-DD) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total_records": 120,
    "remote_count": 15,
    "on_site_count": 105,
    "avg_distance_meters": 180.5,
    "unique_employees": 12
  }
}
```

---

#### PUT `/api/attendance/admin/:id`

Update an attendance record (admin). Used to manually adjust or approve flagged remote entries.

**Auth Required:** Admin

**Request Body (all fields optional):**
```json
{
  "is_remote": false,
  "location_valid": true,
  "notes": "Approved - employee was at off-site training"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Attendance record updated"
}
```

---

#### GET `/api/attendance/admin/export`

Export attendance records as CSV.

**Auth Required:** Admin

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `date_from` | string | — | Start date (YYYY-MM-DD) |
| `date_to` | string | — | End date (YYYY-MM-DD) |

**Response:** CSV file download (`Content-Type: text/csv`)

---

### M-Pesa Payments

M-Pesa STK push integration via Safaricom Daraja API.

---

#### POST `/api/mpesa/pay`

Initiate an M-Pesa STK push payment. Sends the payment request to the customer's phone. The phone number is read from the authenticated user's profile.

**Auth Required:** Yes

**Request Body:**
```json
{
  "amount": 1200.00,
  "booking_id": 6
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `amount` | number | Yes | Payment amount |
| `booking_id` | integer | Yes | Associated booking ID |

**Response (200):**
```json
{
  "success": true,
  "message": "Payment request sent to your phone. Please complete on your M-Pesa device.",
  "data": {
    "checkout_request_id": "ws_CO_123456789",
    "response_code": "0",
    "response_description": "Success. Request accepted for processing"
  }
}
```

**Error Responses:**
```json
// M-Pesa service unavailable (credentials or network issue)
{
  "success": false,
  "message": "M-Pesa is temporarily unavailable. Please try again later or use bank transfer."
}

// User has no phone number
{
  "success": false,
  "message": "No phone number found in profile"
}
```

> **Note:** M-Pesa requires valid Daraja API credentials (`MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`) and a publicly reachable `MPESA_CALLBACK_URL`. In sandbox mode, test with Safaricom's test credentials.

---

#### GET `/api/mpesa/status/:checkoutRequestId`

Check the status of an M-Pesa payment request.

**Auth Required:** Yes

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `checkoutRequestId` | string | The checkout request ID from the pay response |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "pending",
    "result_code": null,
    "result_description": null
  }
}
```

> Status values: `pending`, `completed`, `failed`

---

### Card / Bank Transfer Payments

Card payment via Stripe and manual bank transfer.

---

#### POST `/api/card-bank/card/create-intent`

Create a Stripe payment intent for card payment.

**Auth Required:** Yes

**Request Body:**
```json
{
  "amount": 1200.00,
  "booking_id": 6
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `amount` | number | Yes | Payment amount |
| `booking_id` | integer | Yes | Associated booking ID |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "client_secret": "pi_abc123_secret_xyz789",
    "payment_intent_id": "pi_abc123"
  }
}
```

**Error Response:**
```json
// Stripe not configured or key invalid
{
  "success": false,
  "message": "Card payments are currently unavailable. Please use M-Pesa or bank transfer."
}
```

---

#### POST `/api/card-bank/card/confirm`

Confirm a Stripe card payment after client-side processing.

**Auth Required:** Yes

**Request Body:**
```json
{
  "payment_intent_id": "pi_abc123",
  "booking_id": 6
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Card payment confirmed",
  "data": {
    "payment_id": 200,
    "status": "completed"
  }
}
```

---

#### POST `/api/card-bank/bank-transfer/initiate`

Initiate a bank transfer payment. Creates a pending payment record with bank transfer instructions.

**Auth Required:** Yes

**Request Body:**
```json
{
  "amount": 1200.00,
  "booking_id": 6
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Bank transfer initiated. Please complete the transfer and upload proof.",
  "data": {
    "payment_id": 201,
    "bank_details": {
      "bank_name": "Equity Bank",
      "account_name": "Everett Hotel Ltd",
      "account_number": "1234567890",
      "reference": "EVH-PAY-2024-000201"
    }
  }
}
```

---

#### GET `/api/card-bank/bank-transfer/details`

Get bank transfer details and status for a payment.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `payment_id` | integer | Yes | Payment ID |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "payment_id": 201,
    "status": "pending",
    "reference": "EVH-PAY-2024-000201",
    "amount": 1200.00,
    "proof_of_payment": null,
    "verified_by": null,
    "verified_at": null
  }
}
```

---

### Reports

Reporting and analytics endpoints for admin.

---

#### GET `/api/reports/revenue`

Generate revenue report.

**Auth Required:** Admin

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `start_date` | string | Yes | Report start date (YYYY-MM-DD) |
| `end_date` | string | Yes | Report end date (YYYY-MM-DD) |
| `period` | string | No | daily, weekly, monthly |

**Response (200):**
```json
{
  "success": true,
  "message": "Revenue report generated",
  "data": {
    "period": {
      "start_date": "2024-06-01",
      "end_date": "2024-06-30"
    },
    "summary": {
      "total_revenue": 125000.00,
      "total_transactions": 150,
      "average_booking_value": 833.33,
      "occupancy_rate": 78.5
    },
    "daily_data": [
      {
        "date": "2024-06-01",
        "revenue": 4250.00,
        "bookings": 5
      },
      {
        "date": "2024-06-02",
        "revenue": 3800.00,
        "bookings": 4
      }
    ]
  }
}
```

---

#### GET `/api/reports/occupancy`

Generate occupancy report.

**Auth Required:** Admin

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `start_date` | string | Yes | Start date (YYYY-MM-DD) |
| `end_date` | string | Yes | End date (YYYY-MM-DD) |

**Response (200):**
```json
{
  "success": true,
  "message": "Occupancy report generated",
  "data": {
    "summary": {
      "total_rooms": 50,
      "average_occupancy": 78.5,
      "peak_occupancy": 96.0,
      "low_occupancy": 52.0,
      "total_room_nights": 1500,
      "occupied_room_nights": 1178
    },
    "by_category": [
      {
        "category": "Deluxe King",
        "total_rooms": 15,
        "average_occupancy": 82.3
      },
      {
        "category": "Executive Suite",
        "total_rooms": 8,
        "average_occupancy": 71.5
      }
    ],
    "daily_data": [
      {
        "date": "2024-06-01",
        "occupied": 39,
        "total": 50,
        "rate": 78.0
      }
    ]
  }
}
```

---

#### GET `/api/reports/guests`

Generate guest statistics report.

**Auth Required:** Admin

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `start_date` | string | Yes | Start date (YYYY-MM-DD) |
| `end_date` | string | Yes | End date (YYYY-MM-DD) |

**Response (200):**
```json
{
  "success": true,
  "message": "Guest statistics generated",
  "data": {
    "summary": {
      "total_guests": 420,
      "new_guests": 180,
      "returning_guests": 240,
      "average_stay_nights": 3.2,
      "satisfaction_rate": 4.6
    },
    "top_countries": [
      { "country": "Kenya", "guests": 120 },
      { "country": "USA", "guests": 85 },
      { "country": "UK", "guests": 60 }
    ],
    "demographics": {
      "age_groups": [
        { "group": "18-25", "count": 45 },
        { "group": "26-35", "count": 130 },
        { "group": "36-50", "count": 150 },
        { "group": "51+", "count": 95 }
      ]
    }
  }
}
```

---

### Analytics

Dashboard analytics and trend data.

---

#### GET `/api/analytics/dashboard`

Get dashboard overview data.

**Auth Required:** Admin

**Response (200):**
```json
{
  "success": true,
  "message": "Dashboard analytics retrieved",
  "data": {
    "overview": {
      "total_revenue": 125000.00,
      "revenue_change": 12.5,
      "total_bookings": 150,
      "bookings_change": 8.3,
      "occupancy_rate": 78.5,
      "occupancy_change": 5.2,
      "total_guests": 420,
      "guests_change": 15.0
    },
    "recent_bookings": [
      {
        "id": 250,
        "guest": "Emily Smith",
        "room": "202",
        "check_in": "2024-06-20",
        "status": "confirmed",
        "amount": 750.00
      }
    ],
    "revenue_chart": {
      "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      "data": [95000, 88000, 102000, 110000, 118000, 125000]
    },
    "occupancy_chart": {
      "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      "data": [72, 68, 75, 80, 92, 96, 88]
    },
    "room_status": {
      "available": 35,
      "occupied": 13,
      "maintenance": 2
    }
  }
}
```

---

#### GET `/api/analytics/trends`

Get trend data for charts.

**Auth Required:** Admin

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `metric` | string | Yes | revenue, bookings, occupancy, guests |
| `period` | string | No | daily, weekly, monthly (default: daily) |
| `start_date` | string | Yes | Start date (YYYY-MM-DD) |
| `end_date` | string | Yes | End date (YYYY-MM-DD) |

**Response (200):**
```json
{
  "success": true,
  "message": "Trend data retrieved",
  "data": {
    "metric": "revenue",
    "period": "daily",
    "labels": ["2024-06-01", "2024-06-02", "2024-06-03"],
    "values": [4250.00, 3800.00, 5100.00],
    "trend": "upward",
    "percentage_change": 12.5
  }
}
```

---

### Settings

System configuration management.

---

#### GET `/api/settings`

Get current system settings.

**Auth Required:** Admin

**Response (200):**
```json
{
  "success": true,
  "message": "Settings retrieved",
  "data": {
    "hotel_name": "Everett Hotel",
    "hotel_email": "info@everetthotel.com",
    "hotel_phone": "+1234567890",
    "hotel_address": "123 Luxury Avenue, Nairobi, Kenya",
    "check_in_time": "14:00",
    "check_out_time": "11:00",
    "currency": "USD",
    "tax_rate": 10,
    "cancellation_policy": "Free cancellation up to 24 hours before check-in",
    "max_booking_nights": 30,
    "min_booking_nights": 1,
    "logo": "/uploads/settings/logo.png",
    "social_media": {
      "facebook": "https://facebook.com/everetthotel",
      "instagram": "https://instagram.com/everetthotel",
      "twitter": "https://twitter.com/everetthotel"
    }
  }
}
```

---

#### PUT `/api/settings`

Update system settings.

**Auth Required:** Admin

**Request Body (all fields optional):**
```json
{
  "hotel_name": "Everett Hotel & Resort",
  "check_in_time": "15:00",
  "check_out_time": "11:00",
  "tax_rate": 12,
  "cancellation_policy": "Free cancellation up to 48 hours before check-in"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": { ... }
}
```

---

### Admin

Administrative dashboard and system operations.

---

#### GET `/api/admin/dashboard`

Get admin dashboard overview.

**Auth Required:** Admin

**Response (200):**
```json
{
  "success": true,
  "message": "Admin dashboard data retrieved",
  "data": {
    "stats": {
      "total_rooms": 50,
      "available_rooms": 35,
      "today_check_ins": 5,
      "today_check_outs": 3,
      "pending_bookings": 8,
      "active_guests": 45,
      "pending_payments": 3,
      "unread_messages": 12,
      "pending_reviews": 5,
      "low_stock_items": 2
    },
    "recent_activity": [
      {
        "type": "booking",
        "message": "New booking EVH-2024-000250 from Emily Smith",
        "time": "2024-06-20T10:30:00.000Z"
      },
      {
        "type": "payment",
        "message": "Payment of $750 received for booking EVH-2024-000249",
        "time": "2024-06-20T10:15:00.000Z"
      }
    ]
  }
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

| Limit | Window | Description |
|---|---|---|
| 100 requests | 15 minutes | General API endpoints |
| 20 requests | 15 minutes | Authentication endpoints |
| 10 requests | 15 minutes | Password reset endpoints |

When rate limited, the response will be:
```json
{
  "success": false,
  "message": "Too many requests. Please try again after 15 minutes."
}
```

Status code: `429 Too Many Requests`

---

## CORS Policy

Cross-Origin Resource Sharing is configured to allow requests from the frontend origin:

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

---

## HTTP Status Codes

| Code | Description |
|---|---|
| `200` | OK — Request successful |
| `201` | Created — Resource created |
| `400` | Bad Request — Invalid request data |
| `401` | Unauthorized — Authentication required or invalid token |
| `403` | Forbidden — Insufficient permissions |
| `404` | Not Found — Resource not found |
| `409` | Conflict — Resource already exists or conflict |
| `422` | Unprocessable Entity — Validation errors |
| `429` | Too Many Requests — Rate limit exceeded |
| `500` | Internal Server Error — Server error |

---

<p align="center">
  <strong>Everett Hotel Management System — API v1.0</strong><br>
  For questions or support, contact <a href="mailto:api-support@everetthotel.com">api-support@everetthotel.com</a>
</p>
