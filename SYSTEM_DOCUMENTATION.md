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
