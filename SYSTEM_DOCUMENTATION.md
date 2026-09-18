# Everett Hotel Management System - System Architecture Documentation

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Database Design](#database-design)
- [Authentication Flow](#authentication-flow)
- [Authorization Model](#authorization-model)
- [Booking Lifecycle](#booking-lifecycle)
- [Payment Flow](#payment-flow)
- [Email System](#email-system)
- [Security Measures](#security-measures)
- [API Design Patterns](#api-design-patterns)
- [Frontend Architecture](#frontend-architecture)
- [Deployment Guide](#deployment-guide)
- [Scalability Considerations](#scalability-considerations)

---

## System Overview

The **Everett Hotel Management System** is a full-stack web application designed to manage all aspects of luxury hotel operations. The system serves three primary user groups:

1. **Customers** - Browse rooms, make bookings, process payments, leave reviews
2. **Employees** - Manage daily operations (housekeeping, restaurant, front desk)
3. **Administrators** - Oversee all operations, analytics, staff, and system configuration

The application follows the **MVC (Model-View-Controller)** architectural pattern with a clear separation between the frontend (client-side SPA) and backend (RESTful API server). The database layer uses MySQL for reliable relational data management with full ACID compliance.

### Key Design Principles

- **Separation of Concerns** - Frontend, backend, and database layers are fully decoupled
- **RESTful API Design** - Predictable, resource-oriented URL structure
- **Role-Based Access Control (RBAC)** - Granular permissions per role
- **Stateless Authentication** - JWT tokens for session management
- **Defense in Depth** - Multiple security layers from network to application
- **Responsive Design** - Mobile-first, works on all device sizes
- **Scalable Architecture** - Designed for horizontal and vertical scaling

---

## Architecture Diagram

```
+-------------------------------------------------------------+
|                        CLIENT LAYER                         |
|                                                             |
|  +-----------------------------------------------------+    |
|  |                  Browser / Client                    |    |
|  |                                                     |    |
|  |  +----------+ +----------+ +--------------------+  |    |
|  |  |  HTML5    | |  CSS3    | |  JavaScript ES6+   |  |    |
|  |  |  Pages   | |  Styles  | |  +--------------+  |  |    |
|  |  |          | |  (SASS)  | |  |  API Client   |  |  |    |
|  |  |  +----+  | |          | |  |  (Fetch/XHR)  |  |  |    |
|  |  |  |UI  |  | |  Bootstrap| |  +--------------+  |  |    |
|  |  |  |Lib |  | |  AOS     | |  +--------------+  |  |    |
|  |  |  +----+  | |  FA      | |  |  State Mgmt  |  |  |    |
|  |  |          | |  Charts  | |  +--------------+  |  |    |
|  |  +----------+ +----------+ +--------------------+  |    |
|  +-----------------------------------------------------+    |
|                           |                                 |
|                    HTTP/HTTPS                                |
|                     (REST API)                               |
+---------------------------+---------------------------------+
                            |
+---------------------------+---------------------------------+
|                     SERVER LAYER                             |
|                           |                                 |
|  +------------------------+-------------------------------+    |
|  |              Express.js Server (Port 5000)            |    |
|  |                       |                               |    |
|  |  +--------------------+---------------------------+   |    |
|  |  |              MIDDLEWARE LAYER                    |   |    |
|  |  |  +------+ +-------+ +--------+ +----------+   |   |    |
|  |  |  |Helmet| |CORS   | |Morgan  | |Rate Limit|   |   |    |
|  |  |  +------+ +-------+ +--------+ +----------+   |   |    |
|  |  |  +------+ +-------+ +--------+ +----------+   |   |    |
|  |  |  |Auth  | |RBAC   | |Validate| |Upload    |   |   |    |
|  |  |  |(JWT) | |       | |        | |(Multer)  |   |   |    |
|  |  |  +------+ +-------+ +--------+ +----------+   |   |    |
|  |  +------------------------------------------------+   |    |
|  |                       |                               |    |
|  |  +--------------------+---------------------------+   |    |
|  |  |              ROUTE LAYER                        |   |    |
|  |  |  Auth | Users | Rooms | Bookings | Payments     |   |    |
|  |  |  Invoices | Reviews | Employees | Housekeeping  |   |    |
|  |  |  Restaurant | Inventory | Gallery | Promotions  |   |    |
|  |  |  Notifications | Contact | Newsletter | Reports  |   |    |
|  |  |  Analytics | Settings | Admin                    |   |    |
|  |  +------------------------------------------------+   |    |
|  |                       |                               |    |
|  |  +--------------------+---------------------------+   |    |
|  |  |           CONTROLLER LAYER (MVC)                |   |    |
|  |  |  Business Logic | Validation | Data Processing  |   |    |
|  |  +------------------------------------------------+   |    |
|  |                       |                               |    |
|  |  +--------------------+---------------------------+   |    |
|  |  |              MODEL LAYER                        |   |    |
|  |  |  Database Queries | ORM Operations | Joins       |   |    |
|  |  +------------------------------------------------+   |    |
|  |                       |                               |    |
|  |  +--------------------+---------------------------+   |    |
|  |  |           UTILITY LAYER                         |   |    |
|  |  |  EmailService | TokenUtils | Helpers             |   |    |
|  |  +------------------------------------------------+   |    |
|  +--------------------------------------------------------+    |
|                           |                                 |
|                    MySQL Protocol                            |
|                   Port 3306                                 |
+---------------------------+---------------------------------+
                            |
+---------------------------+---------------------------------+
|                      DATA LAYER                              |
|                           |                                 |
|  +------------------------+-------------------------------+    |
|  |                MySQL Database                         |    |
|  |                everett_hotel                          |    |
|  |                                                     |    |
|  |  +-------------+ +--------------+ +-------------+  |    |
|  |  | users       | | rooms        | | bookings    |  |    |
|  |  | roles       | | categories   | | payments    |  |    |
|  |  | permissions | | amenities    | | invoices    |  |    |
|  |  | role_perms  | | room_images  | | reviews     |  |    |
|  |  +-------------+ +--------------+ +-------------+  |    |
|  |  +-------------+ +--------------+ +-------------+  |    |
|  |  | employees   | | housekeeping | | restaurant  |  |    |
|  |  | departments | | tasks        | | menu_items  |  |    |
|  |  | schedules   | |              | | categories  |  |    |
|  |  +-------------+ +--------------+ +-------------+  |    |
|  |  +-------------+ +--------------+ +-------------+  |    |
|  |  | inventory   | | gallery      | | promotions  |  |    |
|  |  | categories  | | images       | | promo_codes |  |    |
|  |  +-------------+ +--------------+ +-------------+  |    |
|  |  +-------------+ +--------------+ +-------------+  |    |
|  |  | notifications| | contact_msgs | | newsletter  |  |    |
|  |  | templates   | |              | | subscribers |  |    |
|  |  +-------------+ +--------------+ +-------------+  |    |
|  |  +-------------+ +--------------+                   |    |
|  |  | settings    | | password_    |                   |    |
|  |  | hotel_config| | resets       |                   |    |
|  |  +-------------+ +--------------+                   |    |
|  +--------------------------------------------------------+    |
+-------------------------------------------------------------+
```

### MVC Pattern Implementation

| Layer | Location | Responsibility |
|---|---|---|
| **Model** | `backend/models/` | Database queries, data access, business rules |
| **View** | `frontend/` | HTML pages, CSS styling, client-side rendering |
| **Controller** | `backend/controllers/` | Request handling, response formatting, orchestration |
| **Routes** | `backend/routes/` | URL mapping to controller methods |
| **Middleware** | `backend/middleware/` | Cross-cutting concerns (auth, validation, logging) |

---

## Database Design

The database contains **30+ tables** organized into logical domains. The schema uses InnoDB engine for foreign key support and transactional integrity.

### Tables Overview

| # | Table Name | Description | Key Fields |
|---|---|---|---|
| 1 | `users` | All system users (customers, staff, admins) | id, email, password, role, profile_photo |
| 2 | `roles` | System roles definitions | id, name, description |
| 3 | `permissions` | Granular permission definitions | id, name, description, module |
| 4 | `role_permissions` | Role-permission mapping | role_id, permission_id |
| 5 | `password_resets` | Password reset tokens | id, user_id, token, expires_at |
| 6 | `email_verifications` | Email verification tokens | id, user_id, token, expires_at |
| 7 | `refresh_tokens` | JWT refresh tokens | id, user_id, token, expires_at |
| 8 | `rooms` | Hotel rooms inventory | id, room_number, category_id, status |
| 9 | `room_categories` | Room type/category definitions | id, name, base_price |
| 10 | `room_images` | Room photographs | id, room_id, image_url |
| 11 | `room_amenities` | Room amenities mapping | id, room_id, amenity_name |
| 12 | `bookings` | Guest reservations | id, user_id, room_id, check_in, check_out, status |
| 13 | `payments` | Payment transactions | id, booking_id, amount, method, status, error_note |
| 14 | `invoices` | Generated invoices | id, booking_id, total, status |
| 15 | `invoice_items` | Invoice line items | id, invoice_id, description, amount |
| 16 | `reviews` | Guest reviews and ratings | id, user_id, room_id, rating |
| 17 | `employees` | Employee records | id, user_id, department, position, photo |
| 18 | `departments` | Department definitions | id, name, description |
| 19 | `employee_schedules` | Work schedules | id, employee_id, shift, date |
| 20 | `attendance` | Clock-in/out records with geofencing | id, employee_id, clock_in, clock_out, is_remote, distance_meters, ip_address |
| 21 | `housekeeping_tasks` | Housekeeping task records | id, room_id, assigned_to, status |
| 22 | `restaurant_menu_items` | Restaurant menu with images | id, name, category, price, image, is_available |
| 23 | `menu_categories` | Menu category definitions | id, name, description |
| 24 | `inventory_items` | Hotel inventory/supplies | id, name, quantity, min_quantity |
| 25 | `inventory_categories` | Inventory category definitions | id, name, description |
| 26 | `gallery_images` | Photo gallery images | id, title, image_url, category |
| 27 | `promotions` | Promotional offers | id, title, discount, promo_code |
| 28 | `notifications` | User notifications | id, user_id, title, is_read |
| 29 | `notification_templates` | Email/push templates | id, type, subject, body |
| 30 | `contact_messages` | Contact form submissions | id, name, email, message, status |
| 31 | `newsletter_subscribers` | Newsletter subscriptions | id, email, status |
| 32 | `system_settings` | System configuration (key-value) | hotel_name, check_in_time, hotel_latitude, hotel_longitude, geofence_radius_meters, attendance_block_remote |
| 33 | `activity_logs` | Audit trail | id, user_id, action, details |

### Entity Relationships

```
                    +--------------+
                    |    users     |
                    |--------------|
                    | id (PK)      |
                    | first_name   |
                    | last_name    |
                    | email        |
                    | password     |
                    | phone        |
                    | role         |
                    | photo        |
                    | is_verified  |
                    | created_at   |
                    +------+-------+
                           |
              +------------+------------+
              |            |            |
              v            v            v
     +--------------+ +----------+ +--------------+
     |   bookings   | | reviews  | | notifications|
     |--------------| |----------| |--------------|
     | id (PK)      | | id (PK)  | | id (PK)      |
     | user_id (FK) | |user_id   | | user_id (FK) |
     | room_id (FK) | |room_id   | | title        |
     | check_in     | | rating   | | message      |
     | check_out    | | comment  | | is_read      |
     | status       | | title    | | type         |
     | total_amount | | approved | | created_at   |
     +------+-------+ +----------+ +--------------+
            |
     +------+--------------+
     |                     |
     v                     v
+----------+        +----------+
| payments |        | invoices |
|----------|        |----------|
| id (PK)  |        | id (PK)  |
|booking_id|        |booking_id|
| amount   |        | subtotal |
| method   |        | tax      |
| status   |        | total    |
| txn_id   |        | status   |
+----------+        +----+-----+
                         |
                         v
                  +--------------+
                  | invoice_items|
                  |--------------|
                  | id (PK)      |
                  | invoice_id   |
                  | description  |
                  | quantity     |
                  | unit_price   |
                  | amount       |
                  +--------------+

+--------------+       +------------------+
|    rooms     |       | room_categories  |
|--------------|       |------------------|
| id (PK)      |<------| id (PK)          |
| room_number  |       | name             |
|category_id   |------>| description      |
| description  |       | base_price       |
| price/night  |       +------------------+
| max_guests   |
| bed_type     |
| floor        |
| status       |
| is_featured  |
+------+-------+
       |
+------+----------+
|                 |
v                 v
+----------+     +--------------+
|room_imgs |     |room_amenities|
|----------|     |--------------|
| id (PK)  |     | id (PK)      |
| room_id  |     | room_id      |
| image_url|     | amenity_name |
+----------+     +--------------+

+--------------+       +------------------+
|  employees   |       |  departments     |
|--------------|       |------------------|
| id (PK)      |------>| id (PK)          |
| user_id (FK) |       | name             |
|dept_id (FK)  |       | description      |
| position     |       +------------------+
| hire_date    |
| salary       |
+------+-------+
       |
+------+----------+
|                 |
v                 v
+----------+     +--------------+
|schedules |     |housekeeping  |
|----------|     |_tasks        |
| id (PK)  |     |--------------|
| emp_id   |     | id (PK)      |
| shift    |     | room_id (FK) |
| date     |     | assigned_to  |
| status   |     | task_type    |
+----------+     | status       |
                 +--------------+
```

### Key Relationships

| Relationship | Type | Description |
|---|---|---|
| `users` -> `bookings` | One-to-Many | A user can have many bookings |
| `rooms` -> `bookings` | One-to-Many | A room can have many bookings (over time) |
| `bookings` -> `payments` | One-to-Many | A booking can have multiple payments |
| `bookings` -> `invoices` | One-to-One | A booking generates one invoice |
| `invoices` -> `invoice_items` | One-to-Many | An invoice has many line items |
| `users` -> `reviews` | One-to-Many | A user can write many reviews |
| `rooms` -> `reviews` | One-to-Many | A room can have many reviews |
| `users` -> `employees` | One-to-One | A user record linked to an employee |
| `employees` -> `departments` | Many-to-One | Employees belong to departments |
| `employees` -> `employee_schedules` | One-to-Many | Employees have many schedules |
| `rooms` -> `housekeeping_tasks` | One-to-Many | A room has many housekeeping tasks |
| `employees` -> `housekeeping_tasks` | One-to-Many | An employee is assigned many tasks |
| `users` -> `notifications` | One-to-Many | A user receives many notifications |
| `roles` -> `role_permissions` | One-to-Many | A role has many permissions |
| `permissions` -> `role_permissions` | One-to-Many | A permission is assigned to many roles |
| `rooms` -> `room_categories` | Many-to-One | Rooms belong to categories |
| `rooms` -> `room_images` | One-to-Many | A room has many images |
| `rooms` -> `room_amenities` | One-to-Many | A room has many amenities |

---

## Authentication Flow

### Registration -> Email Verification -> Login

```
Client                    Server                    Database               Email
  |                         |                          |                      |
  |  POST /auth/register   |                          |                      |
  |  {name, email, pass}   |                          |                      |
  |------------------------>|                          |                      |
  |                         |  Hash password           |                      |
  |                         |  (bcrypt, 12 rounds)     |                      |
  |                         |                          |                      |
  |                         |  INSERT user             |                      |
  |                         |------------------------->|                      |
  |                         |                          |                      |
  |                         |  Generate verify token   |                      |
  |                         |                          |                      |
  |                         |  INSERT email_verif.     |                      |
  |                         |------------------------->|                      |
  |                         |                          |                      |
  |                         |  Send verification email |                      |
  |                         |------------------------------------------------>|
  |                         |                          |                      |
  |  {token, user}         |                          |                      |
  |<------------------------|                          |                      |
  |                         |                          |                      |
  |  GET /auth/verify-email?token=xxx                  |                      |
  |------------------------>|                          |                      |
  |                         |  Validate token          |                      |
  |                         |------------------------->|                      |
  |                         |                          |                      |
  |                         |  UPDATE user             |                      |
  |                         |  is_verified=1           |                      |
  |                         |------------------------->|                      |
  |                         |                          |                      |
  |  {success}              |                          |                      |
  |<------------------------|                          |                      |
  |                         |                          |                      |
  |  POST /auth/login      |                          |                      |
  |  {email, password}     |                          |                      |
  |------------------------>|                          |                      |
  |                         |  Fetch user by email     |                      |
  |                         |------------------------->|                      |
  |                         |                          |                      |
  |                         |  Compare password        |                      |
  |                         |  (bcrypt.compare)        |                      |
  |                         |                          |                      |
  |                         |  Generate JWT            |                      |
  |                         |  (access + refresh)      |                      |
  |                         |                          |                      |
  |  {user, token}         |                          |                      |
  |<------------------------|                          |                      |
```

### Password Reset Flow

```
Client                    Server                    Database               Email
  |                         |                          |                      |
  | POST /auth/forgot-password                         |                      |
  | {email}                 |                          |                      |
  |------------------------>|                          |                      |
  |                         |  Find user by email      |                      |
  |                         |------------------------->|                      |
  |                         |                          |                      |
  |                         |  Generate reset token    |                      |
  |                         |  (crypto.randomBytes)    |                      |
  |                         |                          |                      |
  |                         |  INSERT password_resets  |                      |
  |                         |------------------------->|                      |
  |                         |                          |                      |
  |                         |  Send reset email        |                      |
  |                         |------------------------------------------------>|
  |                         |                          |                      |
  |  {message}              |                          |                      |
  |<------------------------|                          |                      |
  |                         |                          |                      |
  | POST /auth/reset-password                          |                      |
  | {token, new_password}   |                          |                      |
  |------------------------>|                          |                      |
  |                         |  Validate token & expiry |                      |
  |                         |------------------------->|                      |
  |                         |                          |                      |
  |                         |  Hash new password       |                      |
  |                         |                          |                      |
  |                         |  UPDATE user password    |                      |
  |                         |------------------------->|                      |
  |                         |                          |                      |
  |                         |  DELETE used reset token |                      |
  |                         |------------------------->|                      |
  |                         |                          |                      |
  |  {success}              |                          |                      |
  |<------------------------|                          |                      |
```

### Token Refresh Mechanism

```
Client                    Server                    Database
  |                         |                          |
  |  Request with expired   |                          |
  |  access token           |                          |
  |  + valid refresh token  |                          |
  |------------------------>|                          |
  |                         |  Validate refresh token  |
  |                         |------------------------->|
  |                         |                          |
  |                         |  Token valid & not       |
  |                         |  expired?                |
  |                         |<-------------------------|
  |                         |                          |
  |                         |  Generate new access     |
  |                         |  + refresh token pair    |
  |                         |                          |
  |                         |  Update refresh token    |
  |                         |  in database             |
  |                         |------------------------->|
  |                         |                          |
  |  {new_access_token,     |                          |
  |   new_refresh_token}    |                          |
  |<------------------------|                          |
```

---

## Authorization Model

### Role Hierarchy

```
super_admin
    |
    +-- admin
    |     |
    |     +-- manager
    |     |     |
    |     |     +-- receptionist
    |     |     +-- housekeeping_supervisor
    |     |     +-- restaurant_manager
    |     |
    |     +-- housekeeping
    |     +-- restaurant_staff
    |     +-- maintenance
    |
    +-- customer
```

### Role Definitions

| Role | Description | Access Level |
|---|---|---|
| `super_admin` | Full system access, manage other admins | All operations |
| `admin` | Hotel administration, all management features | All except super_admin operations |
| `manager` | Department management, limited admin | Reports, employee management, limited settings |
| `receptionist` | Front desk operations | Bookings, check-in/out, guest management |
| `housekeeping` | Housekeeping staff | Housekeeping tasks, room status updates |
| `restaurant_staff` | Restaurant operations | Menu management, orders |
| `customer` | Hotel guests | Booking, profile, reviews |

### Permission System

Permissions are organized by module and action using `module:action` naming convention:

| Module | Permissions |
|---|---|
| `rooms` | rooms:view, rooms:create, rooms:update, rooms:delete |
| `bookings` | bookings:view, bookings:create, bookings:update, bookings:cancel |
| `payments` | payments:view, payments:process |
| `users` | users:view, users:create, users:update, users:delete |
| `reviews` | reviews:view, reviews:create, reviews:update, reviews:delete, reviews:moderate |
| `employees` | employees:view, employees:manage |
| `housekeeping` | housekeeping:view, housekeeping:manage |
| `restaurant` | restaurant:view, restaurant:manage |
| `inventory` | inventory:view, inventory:manage |
| `gallery` | gallery:view, gallery:manage |
| `promotions` | promotions:view, promotions:manage |
| `notifications` | notifications:view, notifications:send |
| `contact` | contact:view, contact:reply |
| `settings` | settings:view, settings:update |
| `reports` | reports:view, reports:export |

### RBAC Middleware Flow

```
HTTP Request
     |
     v
+-------------+
| auth.js     |  Verify JWT token, extract user_id and role
| Middleware  |
+------+------+
       |
       v
+-------------+
| rbac.js     |  Check if route requires specific role(s)
| Middleware  |  Compare user role against required roles
+------+------+
       |
       +-- PASS --> Controller --> Response
       |
       +-- FAIL --> 403 Forbidden
```

```javascript
// Middleware chain example
router.get('/admin/users',
  authMiddleware,        // Step 1: Verify JWT, attach user to req
  rbacMiddleware(['admin', 'super_admin']),  // Step 2: Check role
  userController.listUsers  // Step 3: Execute controller
);
```

### Permission Matrix

| Resource | super_admin | admin | manager | receptionist | housekeeping | restaurant_staff | customer |
|---|---|---|---|---|---|---|---|
| Users (CRUD) | Full | Full | View | View | - | - | Own profile |
| Rooms | Full | Full | Full | View | View status | - | View |
| Bookings | Full | Full | Full | Full | View | - | Own bookings |
| Payments | Full | Full | View | Process | - | - | Own payments |
| Invoices | Full | Full | View | Create | - | - | Own invoices |
| Reviews | Full | Full | Moderate | View | - | - | Create/Own |
| Employees | Full | Full | Manage | - | - | - | - |
| Housekeeping | Full | Full | Manage | Assign | View/Update | - | - |
| Restaurant | Full | Full | Manage | - | - | Full | View menu |
| Inventory | Full | Full | Manage | - | - | View | - |
| Gallery | Full | Full | Manage | - | - | - | View |
| Promotions | Full | Full | Manage | - | - | - | View |
| Reports | Full | Full | View | - | - | - | - |
| Settings | Full | Full | Limited | - | - | - | - |

---

## Booking Lifecycle

### Status Flow

```
                          +--------------+
                          |   Customer   |
                          | Creates      |
                          | Booking      |
                          +------+-------+
                                 |
                                 v
                        +----------------+
                        |    PENDING      |
                        |  (Awaiting      |
                        |   payment)      |
                        +--------+-------+
                                 |
                  +--------------+--------------+
                  |              |              |
                  v              |              v
         +----------------+     |     +----------------+
         |   CONFIRMED    |     |     |   CANCELLED    |
         |  (Payment       |     |     |  (Customer     |
         |   received)     |     |     |   cancels)     |
         +--------+-------+     |     +----------------+
                  |              |
                  |              v
                  |     +----------------+
                  |     |   CANCELLED    |
                  |     |  (No-show or   |
                  |     |   admin cancels)|
                  |     +----------------+
                  |
                  v
        +----------------+
        |  CHECKED IN     |
        |  (Guest arrives |
        |   at hotel)     |
        +--------+-------+
                 |
                 v
        +----------------+
        |  CHECKED OUT    |
        |  (Guest departs |
        |   hotel)        |
        +----------------+
```

### Status Triggers and Side Effects

| Transition | Trigger | Side Effects |
|---|---|---|
| -> `pending` | Customer creates booking | Room temporarily reserved, notification sent |
| `pending` -> `confirmed` | Payment received | Room status -> "occupied", confirmation email sent |
| `pending` -> `cancelled` | Customer cancels before payment | Room released, cancellation notification |
| `confirmed` -> `checked_in` | Admin/receptionist checks in guest | Room status -> "occupied", welcome email sent |
| `confirmed` -> `cancelled` | Customer cancels before check-in | Room released, refund initiated, email sent |
| `confirmed` -> `no_show` | Guest doesn't arrive by midnight | Room released, no-show notification |
| `checked_in` -> `checked_out` | Admin/receptionist checks out guest | Room status -> "maintenance", invoice finalized, checkout email sent |

### Room Status Auto-Update Triggers

```
Booking Status Change          Room Status Update
---------------------          ------------------
booking.confirmed       ->     room.status = 'occupied'
booking.checked_out     ->     room.status = 'maintenance'
housekeeping.completed  ->     room.status = 'available'
booking.cancelled       ->     room.status = 'available'
booking.no_show         ->     room.status = 'available'
```

### Cancellation Flow

```
Customer Requests Cancellation
         |
         v
+--------------------+
| Check cancellation  |
| policy              |
| (> 24h before       |
|  check-in?)         |
+--------+-----------+
         |
    +----+----+
    |         |
    v         v
+--------+ +------------+
| FULL   | | PARTIAL/   |
| REFUND | | NO REFUND  |
+----+---+ +-----+------+
     |           |
     v           v
+--------------------+
| Update booking     |
| status: cancelled  |
|                    |
| Release room       |
|                    |
| Process refund     |
| (if applicable)    |
|                    |
| Send cancellation  |
| email              |
|                    |
| Send notification  |
+--------------------+
```

---

## Payment Flow

### Payment Processing Pipeline

```
+----------+     +----------+     +--------------+     +----------+
| Customer |     | Server   |     | Payment      |     | Database |
|          |     |          |     | Gateway      |     |          |
+----+-----+     +----+-----+     +------+-------+     +----+-----+
     |                |                  |                  |
     | POST /mpesa/pay                   |                  |
     | or /card-bank/*|                  |                  |
     | {booking_id,   |                  |                  |
     |  amount}       |                  |                  |
     |--------------->|                  |                  |
     |                |  Validate booking|                  |
     |                |  + user phone#   |                  |
     |                |------------------|                  |
     |                |                  |                  |
     |                |  Create payment  |                  |
     |                |  record (pending)|                  |
     |                |------------------------------------->|
     |                |                  |                  |
     |                |  Route to payment gateway            |
     |                |  based on method:                    |
     |                |                  |                  |
     |                |  +-- M-Pesa: STK Push to phone      |
     |                |  +-- Card: Stripe PaymentIntent     |
     |                |  +-- Bank: Generate reference #     |
     |                |                  |                  |
     |                |  If gateway error:                   |
     |                |  +-- Return friendly message         |
     |                |  +-- Record as failed in DB          |
     |                |                  |                  |
     |                |<-----------------|                  |
     |                |  Gateway response|                  |
     |                |                  |                  |
     |                |  Update payment  |                  |
     |                |  status          |                  |
     |                |------------------------------------->|
     |                |                  |                  |
     |                |  If successful:                      |
     |                |  +-- Update booking status           |
     |                |  +-- Generate invoice                |
     |                |  +-- Send confirmation email         |
     |                |  +-- Create notification             |
     |                |                  |                  |
     |  {payment,     |                  |                  |
     |   status}      |                  |                  |
     |<---------------|                  |                  |
```

### Supported Payment Methods

| Method | Gateway | Status | Flow |
|---|---|---|---|
| **M-Pesa** | Safaricom Daraja API | Requires valid credentials | STK Push -> PIN entry on phone -> Server polls status |
| **Card** | Stripe API | Requires valid keys | Create PaymentIntent -> Client confirms -> Server verifies |
| **Bank Transfer** | Manual | Fully functional | Generate reference -> Customer transfers -> Admin verifies proof |
| **Cash** | Manual | Fully functional | Mark as pending -> Admin confirms on arrival |
| **PayPal** | PayPal REST API | Not implemented | — |
| **Visa/Mastercard** | Stripe/Braintree | Via Stripe card flow | Same as Card method above |

### Graceful Degradation

When a payment gateway is unavailable (invalid credentials, network error, or service down), the system returns a friendly error message instead of a raw 500 error:

- **M-Pesa unavailable**: `"M-Pesa is temporarily unavailable. Please try again later or use bank transfer."` (502)
- **Stripe unavailable**: `"Card payments are currently unavailable. Please use M-Pesa or bank transfer."` (502)

Failed payments are recorded in the `payments` table with status `failed` and an error note, preserving the audit trail.

### Payment States

```
created -> processing -> completed
                       -> failed (with error note)
                       -> refunded
                       -> partially_refunded
```

---

## Email System

### Nodemailer Configuration

```javascript
// backend/utils/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,     // smtp.gmail.com
  port: process.env.EMAIL_PORT,     // 587
  secure: false,                     // true for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

### Email Types and Triggers

| Email Type | Trigger | Template |
|---|---|---|
| **Welcome / Verification** | User registration | Welcome message with verification link |
| **Booking Confirmation** | Payment completed | Booking details, room info, dates |
| **Check-in Reminder** | 24h before check-in | Check-in time, directions, requirements |
| **Check-out Reminder** | Day of checkout | Checkout time, invoice summary |
| **Booking Cancelled** | Booking cancellation | Cancellation confirmation, refund details |
| **Password Reset** | Forgot password request | Reset link (expires in 1 hour) |
| **Contact Reply** | Admin replies to contact message | Response message |
| **Promotional** | New promotion created | Offer details, promo code |
| **Invoice** | Invoice generated | PDF attachment |

### Email Flow

```
Controller Action
       |
       v
+--------------+
| emailService |
| .sendEmail() |
+------+-------+
       |
       v
+--------------+     +-----------+
| Prepare      |     | Select    |
| template     |     | template  |
| with data    |     | by type   |
+------+-------+     +-----------+
       |
       v
+--------------+
| Nodemailer   |
| transporter  |
| .sendMail()  |
+------+-------+
       |
       v
+--------------+
| SMTP Server  |
| (Gmail/      |
|  SendGrid)   |
+------+-------+
       |
       v
+--------------+
| User Inbox   |
+--------------+
```

---

## Security Measures

### 1. JWT Authentication

- **Access Token**: Short-lived (24h), used for API requests
- **Refresh Token**: Long-lived (7d), used to obtain new access tokens
- **Token Storage**: Client-side localStorage/sessionStorage
- **Token Revocation**: Tokens blacklisted on logout

### 2. Password Security

- **Hashing**: bcrypt with 12 salt rounds
- **Policy**: Minimum 8 characters, uppercase, lowercase, number, special character
- **Reset**: Time-limited tokens (1 hour expiry), single-use

### 3. Helmet (HTTP Security Headers)

```
Content-Security-Policy    - Prevents XSS attacks
X-Frame-Options           - Prevents clickjacking
X-Content-Type-Options    - Prevents MIME sniffing
Strict-Transport-Security - Enforces HTTPS
X-XSS-Protection          - XSS filter
Referrer-Policy           - Controls referrer info
```

### 4. CORS (Cross-Origin Resource Sharing)

- Configured to allow only the frontend origin
- Credentials enabled for cookie-based auth
- Methods restricted to GET, POST, PUT, DELETE, OPTIONS
- Headers restricted to Content-Type, Authorization

### 5. Rate Limiting

| Endpoint Category | Limit | Window |
|---|---|---|
| General API | 100 requests | 15 minutes |
| Authentication | 20 requests | 15 minutes |
| Password Reset | 10 requests | 15 minutes |
| File Upload | 10 requests | 15 minutes |

### 6. Input Validation

- **Server-side**: Express-validator middleware on all inputs
- **Sanitization**: HTML entity encoding to prevent XSS
- **Type Checking**: Required field types enforced
- **Length Limits**: Maximum string lengths on all fields
- **Regex Patterns**: Email, phone, and password format validation

### 7. SQL Injection Prevention

- **Parameterized Queries**: All database queries use parameterized placeholders
- **No String Concatenation**: User input never directly concatenated into SQL
- **ORM Patterns**: Model layer abstracts raw SQL
- **Input Validation**: Type checking before query execution

### 8. XSS Protection

- **Output Encoding**: HTML entities escaped in responses
- **Content-Security-Policy**: Restricts script sources
- **Sanitization**: HTML stripped from user inputs (comments, reviews)
- **HTTP-only Cookies**: For any cookie-based tokens

### 9. File Upload Security

- **Multer Configuration**: File type whitelist (JPEG, PNG, WebP, PDF)
- **Size Limits**: Maximum 5MB per file, configurable
- **Magic Byte Validation**: Uploaded images verified by reading file header bytes (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`, WebP: `52 49 46 46`) to confirm actual file type matches extension
- **Filename Sanitization**: Random filenames to prevent path traversal
- **Storage**: Files stored outside web root where possible
- **Old File Cleanup**: Previous uploads deleted when replaced or entity removed (profile photos, menu images, gallery images)
- **Virus Scanning**: Recommended for production (ClamAV integration)

### 10. Content Security Policy (CSP)

- **Script Sources**: `scriptSrcAttr: ["'unsafe-inline'"]` allowed for inline event handlers in admin/employee dashboards
- **Style Sources**: Inline styles permitted for dynamic UI components
- **Image Sources**: Data URIs and blob URLs allowed for camera capture (attendance photo, profile upload)
- **Connect Sources**: `http://localhost:5000` for API calls in development

### 11. Audit Logging

- All admin actions logged to `activity_logs` table
- Logs include: user_id, action, IP address, timestamp, details
- Retention policy: 90 days for general logs, permanent for financial

---

## Attendance & Geofencing

### Overview

The attendance system tracks employee clock-in/clock-out with GPS geofencing, IP logging, and optional photo verification. It uses the browser's Geolocation API on the frontend and validates coordinates server-side against configurable hotel geofence settings.

### Geofence Configuration

Geofence settings are stored in the `system_settings` table:

| Setting Key | Default | Description |
|---|---|---|
| `hotel_latitude` | `-1.2642` | Hotel GPS latitude (Nairobi) |
| `hotel_longitude` | `36.8069` | Hotel GPS longitude |
| `geofence_radius_meters` | `500` | Maximum distance for on-site attendance |
| `attendance_block_remote` | `false` | If `true`, remote clock-ins are rejected entirely |

### Clock-In Flow

```
Employee clicks "Clock In"
  |
  v
Browser requests Geolocation
  |
  v
Frontend POST /api/attendance/clock-in
  {latitude, longitude}
  |
  v
Server reads geofence settings from system_settings
  |
  v
Calculate haversine distance from hotel coordinates
  |
  v
+-- distance <= radius --> is_remote = false, location_valid = true
+-- distance >  radius --> is_remote = true, flagged for admin review
+-- attendance_block_remote = true AND distance > radius --> REJECTED
  |
  v
Capture IP address from request headers
  (X-Forwarded-For, X-Real-IP, or req.ip)
  |
  v
Insert into attendance table with:
  clock_in, is_remote, distance_meters, ip_address, location_valid
```

### Photo Verification (Optional)

When the employee dashboard's camera compare view is active:
1. Employee's registration photo (`users.profile_photo`) is fetched
2. Current camera capture is compared side-by-side
3. Both photos are visible to admin when reviewing attendance

### Admin Attendance Monitoring

The admin attendance page provides:
- **Full attendance list** with employee name, role, profile photo thumbnail
- **Remote filter**: Show only on-site or only remote entries
- **Date range filtering**: Filter by date_from/date_to
- **Statistics**: Total records, remote count, on-site count, average distance
- **Export**: CSV export of filtered attendance records
- **Manual adjustment**: Admin can update `is_remote` and `location_valid` flags

### IP Address Logging

Every clock-in records the client IP address for audit purposes:
- Priority: `X-Forwarded-For` header > `X-Real-IP` header > `req.ip`
- IP addresses are stored but not displayed in the default admin view
- Used for security auditing and verifying remote work claims

---

## Restaurant Menu Image Feature

### Overview

Menu items in the restaurant module support optional image uploads. Images are stored on the server filesystem and served statically. The admin dashboard provides CRUD operations with image preview, upload, and deletion.

### Image Handling

- **Upload**: Single image per menu item via `uploadSingle` middleware (field name: `images`)
- **Storage**: Files saved to `backend/uploads/restaurant/` with timestamp-prefixed filenames
- **Validation**: Magic-byte verification confirms actual image type (JPEG, PNG, WebP)
- **Old File Cleanup**: Previous image deleted from disk when:
  - Menu item is updated with a new image
  - Menu item is deleted entirely
- **Thumbnail Display**: Admin menu table shows image thumbnails; public menu page shows full images
- **Fallback**: Items without images display a placeholder icon

### Menu Categories

The `restaurant_menu_items` table supports 8 category values:
`appetizer`, `main_course`, `dessert`, `beverage`, `breakfast`, `lunch`, `dinner`, `special`

### Admin CRUD Flow

1. **Create**: Modal form with image file input, preview on selection, dynamic category dropdown
2. **Read**: Table with thumbnail, name, category, price, availability toggle
3. **Update**: Pre-filled modal, replace image option, availability toggle
4. **Delete**: Confirmation dialog, automatic old file cleanup

### Employee Profile Photo Feature

Employee registration includes a profile photo that serves two purposes:

1. **Identification**: Photo displayed in admin employee management and attendance records
2. **Attendance Verification**: Side-by-side camera capture at clock-in compares current appearance with registration photo

**Photo handling:**
- Stored in `backend/uploads/employees/` with unique filename
- Old photo deleted when replaced (update) or employee removed (delete)
- Displayed as thumbnail in admin attendance list alongside clock-in records

---

## API Design Patterns

### RESTful Conventions

| Operation | HTTP Method | URL Pattern | Status Code |
|---|---|---|---|
| List resources | GET | `/api/resource` | 200 |
| Get single resource | GET | `/api/resource/:id` | 200 |
| Create resource | POST | `/api/resource` | 201 |
| Update resource | PUT | `/api/resource/:id` | 200 |
| Delete resource | DELETE | `/api/resource/:id` | 200 |

### Naming Conventions

- **Plural nouns** for collections: `/api/rooms`, `/api/bookings`
- **Nested resources**: `/api/bookings/:id/payments`
- **Actions as sub-resources**: `/api/bookings/:id/cancel`, `/api/bookings/:id/status`
- **Admin endpoints**: `/api/bookings/admin/all`, `/api/bookings/admin/:id/status`
- **Query parameters**: For filtering, sorting, pagination

### Pagination Pattern

```
GET /api/rooms?page=1&limit=10&sort=price&order=asc&category=deluxe

Response:
{
  "success": true,
  "data": [...],
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

### Filtering Pattern

```
GET /api/rooms?min_price=100&max_price=500&guests=2&status=available

GET /api/bookings?status=confirmed&date_from=2024-06-01&date_to=2024-06-30

GET /api/users?role=customer&search=john
```

### Sorting Pattern

```
GET /api/rooms?sort=price_per_night&order=asc
GET /api/reviews?sort=rating&order=desc
GET /api/bookings?sort=created_at&order=desc
```

### Error Handling Pattern

```javascript
// Global error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errors: err.errors || []
  });
});

// Controller error pattern
try {
  const data = await Model.findById(id);
  if (!data) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }
  res.json({
    success: true,
    message: 'Retrieved successfully',
    data
  });
} catch (error) {
  next(error);
}
```

---

## Frontend Architecture

### Page Structure

```
Frontend Pages (HTML5)
    |
    +-- Public Pages
    |     +-- index.html          (Landing/Home)
    |     +-- rooms.html          (Room listing)
    |     +-- room-detail.html    (Single room view)
    |     +-- restaurant.html     (Restaurant menu)
    |     +-- gallery.html        (Photo gallery)
    |     +-- about.html          (About us)
    |     +-- contact.html        (Contact form)
    |     +-- promotions.html     (Special offers)
    |     +-- login.html          (Login)
    |     +-- register.html       (Registration)
    |
    +-- Authenticated Pages
    |     +-- profile.html        (User profile)
    |     +-- my-bookings.html    (Booking management)
    |     +-- booking.html        (New booking)
    |     +-- payments.html       (Payment history)
    |     +-- invoices.html       (Invoice list)
    |
    +-- Admin Pages
          +-- admin/index.html    (Dashboard)
          +-- admin/rooms.html    (Room management)
          +-- admin/bookings.html (Booking management)
          +-- admin/users.html    (User management)
          +-- admin/employees.html(Employee management)
          +-- admin/payments.html (Payment tracking)
          +-- admin/invoices.html (Invoice management)
          +-- admin/reviews.html  (Review moderation)
          +-- admin/housekeeping.html (Housekeeping)
          +-- admin/restaurant.html   (Restaurant mgmt)
          +-- admin/inventory.html    (Inventory tracking)
          +-- admin/gallery.html (Gallery management)
          +-- admin/promotions.html   (Promotions)
          +-- admin/notifications.html(Notifications)
          +-- admin/reports.html  (Reports & analytics)
          +-- admin/settings.html (System settings)
          +-- admin/contact.html  (Contact messages)
```

### Shared Components

| Component | Description | Location |
|---|---|---|
| Navigation Bar | Responsive top navigation with auth state | `assets/js/app.js` |
| Footer | Site footer with links and newsletter | `assets/css/style.css` |
| Sidebar | Admin panel sidebar navigation | `assets/css/admin.css` |
| Alert/Toast | Success/error notification system | SweetAlert2 |
| Modal | Reusable modal dialogs | Bootstrap Modal |
| Loading Spinner | Page/component loading indicator | CSS animation |
| Pagination | Reusable pagination component | `assets/js/utils.js` |
| Data Table | Sortable, filterable data display | Custom JS |

### Theme System

```css
/* CSS Custom Properties (Variables) */
:root {
  --primary-color: #1a1a2e;
  --secondary-color: #c9a96e;
  --accent-color: #e8d5b7;
  --text-color: #333333;
  --bg-color: #ffffff;
  --light-bg: #f8f9fa;
  --border-color: #e0e0e0;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
  --info-color: #17a2b8;

  --font-heading: 'Playfair Display', serif;
  --font-body: 'Inter', sans-serif;

  --shadow-sm: 0 2px 4px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 8px rgba(0,0,0,0.1);
  --shadow-lg: 0 8px 16px rgba(0,0,0,0.15);

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;

  --transition: all 0.3s ease;
}
```

### Frontend-Backend Integration

```
Frontend Module            API Endpoint              Method
-----------------          ----------------          ------
auth.js                    /api/auth/login           POST
auth.js                    /api/auth/register        POST
rooms.js                   /api/rooms                GET
rooms.js                   /api/rooms/available       GET
booking.js                 /api/bookings             POST
booking.js                 /api/bookings/my           GET
payments.js                /api/payments             POST
dashboard.js               /api/analytics/dashboard   GET

API Client (api.js) handles:
  - Base URL configuration
  - JWT token attachment to headers
  - Response parsing
  - Error handling
  - Token refresh logic
  - Request/response interceptors
```

---

## Deployment Guide

### Environment Setup

```bash
# Install Node.js (v16+)
# Download from https://nodejs.org/

# Install MySQL (v8.0+)
# Download from https://dev.mysql.com/downloads/mysql/

# Verify installations
node --version      # Should show v16.x or higher
npm --version       # Should show v8.x or higher
mysql --version     # Should show 8.0.x or higher
```

### Database Setup

```bash
# 1. Start MySQL service
# Windows: net start MySQL80
# macOS: brew services start mysql
# Linux: sudo systemctl start mysql

# 2. Create database and import schema
mysql -u root -p < database/everett_hotel.sql

# 3. Verify tables
mysql -u root -p everett_hotel -e "SHOW TABLES;"

# Expected output: 30+ tables
```

### Backend Deployment

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with production values:
#   NODE_ENV=production
#   DB_HOST=your-db-host
#   DB_PASSWORD=secure-password
#   JWT_SECRET=long-random-secret
#   EMAIL_PASS=app-specific-password

# 3. Start production server
npm start
# Or with PM2 for process management:
pm2 start server.js --name "everett-api"
```

### Frontend Deployment

```bash
# Option 1: Static file server (Nginx/Apache)
# Copy frontend/ contents to web root directory

# Option 2: Serve with Node.js
cd frontend
npx serve . -l 3000

# Option 3: Docker
# See docker-compose.yml
```

### Production Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET (64+ random characters)
- [ ] Enable HTTPS (SSL/TLS certificate)
- [ ] Configure CORS for production domain only
- [ ] Set NODE_ENV=production
- [ ] Enable MySQL slow query log
- [ ] Configure automated database backups
- [ ] Set up error monitoring (Sentry/similar)
- [ ] Configure log rotation
- [ ] Set up reverse proxy (Nginx)
- [ ] Enable gzip compression
- [ ] Configure CDN for static assets
- [ ] Set up CI/CD pipeline

---

## Scalability Considerations

### Horizontal Scaling

- **Load Balancer**: Nginx or HAProxy distributing requests across multiple Node.js instances
- **Session Store**: Redis for shared session data (if switching from JWT to sessions)
- **File Storage**: Move from local uploads to cloud storage (AWS S3, Cloudinary, Google Cloud Storage)
- **Database**: MySQL read replicas for read-heavy operations

### Vertical Scaling

- **Database Indexing**: Optimize frequently queried columns
  ```sql
  CREATE INDEX idx_bookings_user_id ON bookings(user_id);
  CREATE INDEX idx_bookings_status ON bookings(status);
  CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
  CREATE INDEX idx_rooms_category ON rooms(category_id);
  CREATE INDEX idx_rooms_status ON rooms(status);
  CREATE INDEX idx_payments_booking ON payments(booking_id);
  CREATE INDEX idx_reviews_room ON reviews(room_id);
  ```
- **Connection Pooling**: MySQL connection pool with configurable limits
- **Caching**: Redis caching for frequently accessed data (room listings, settings)

### Performance Optimizations

| Area | Optimization |
|---|---|
| Database | Query optimization, proper indexing, connection pooling |
| API | Response compression, pagination, field selection |
| Frontend | Asset minification, lazy loading, image optimization |
| Caching | Redis for sessions, API response caching, browser cache headers |
| CDN | Static assets via CDN (images, CSS, JS) |

### Monitoring

- **Application**: PM2 monitoring, custom health check endpoints
- **Database**: MySQL performance schema, slow query log
- **Server**: CPU, memory, disk usage monitoring
- **API**: Request/response time tracking, error rate monitoring
- **Uptime**: External uptime monitoring service

### Future Enhancements

- **Microservices**: Split into separate services (auth, booking, payment, notification)
- **Message Queue**: RabbitMQ/Redis Pub-Sub for async operations (email, notifications)
- **WebSocket**: Real-time notifications via Socket.io
- **GraphQL**: Consider GraphQL for complex data fetching needs
- **Mobile App**: React Native or Flutter mobile application
- **Multi-property**: Support for multiple hotel locations
- **AI Integration**: Chatbot, pricing optimization, demand forecasting

---

<p align="center">
  <strong>Everett Hotel Management System - System Documentation v1.0</strong><br>
  For questions or support, contact development@everetthotel.com
</p>
