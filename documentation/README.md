# 🏨 Everett Hotel Management System

<p align="center">
  <strong>Luxury, Comfort, Excellence.</strong>
</p>

<p align="center">
  A full-featured, modern hotel management system built with cutting-edge web technologies. Designed for luxury hospitality operations, Everett delivers seamless booking experiences, powerful admin controls, and robust backend infrastructure.
</p>

---

## 📋 Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| HTML5 | Semantic markup & structure |
| CSS3 | Styling, animations, responsive design |
| JavaScript ES6+ | Client-side logic, API integration |
| Bootstrap 5 | Responsive UI framework |
| Font Awesome | Icon library |
| Google Fonts | Typography (Playfair Display, Inter) |
| AOS (Animate On Scroll) | Scroll-triggered animations |
| Chart.js | Data visualization & analytics dashboards |
| SweetAlert2 | Beautiful alert dialogs & notifications |

### Backend
| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime environment |
| Express.js | Web application framework |
| MySQL | Relational database management |
| JWT (JSON Web Tokens) | Stateless authentication |
| bcrypt | Password hashing & salting |
| Nodemailer | Transactional email delivery |

### Development & DevOps
| Technology | Purpose |
|---|---|
| REST API | Architectural style for API design |
| MVC Pattern | Application structure & separation of concerns |
| CORS | Cross-Origin Resource Sharing configuration |
| Multer | Multipart form-data / file upload handling |
| Morgan | HTTP request logging |
| Helmet | Security HTTP headers |
| Rate Limiting | API abuse prevention |

---

## 📁 Project Structure

```
EverettHotel/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── roomController.js
│   │   ├── bookingController.js
│   │   ├── paymentController.js
│   │   ├── mpesaController.js
│   │   ├── cardBankController.js
│   │   ├── invoiceController.js
│   │   ├── reviewController.js
│   │   ├── employeeController.js
│   │   ├── attendanceController.js
│   │   ├── housekeepingController.js
│   │   ├── restaurantController.js
│   │   ├── inventoryController.js
│   │   ├── galleryController.js
│   │   ├── promotionController.js
│   │   ├── notificationController.js
│   │   ├── contactController.js
│   │   ├── newsletterController.js
│   │   ├── reportController.js
│   │   ├── analyticsController.js
│   │   ├── settingController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── rbac.js
│   │   ├── validate.js
│   │   ├── upload.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── roomRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── mpesaRoutes.js
│   │   ├── cardBankRoutes.js
│   │   ├── invoiceRoutes.js
│   │   ├── reviewRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── housekeepingRoutes.js
│   │   ├── restaurantRoutes.js
│   │   ├── inventoryRoutes.js
│   │   ├── galleryRoutes.js
│   │   ├── promotionRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── contactRoutes.js
│   │   ├── newsletterRoutes.js
│   │   ├── reportRoutes.js
│   │   ├── analyticsRoutes.js
│   │   ├── settingRoutes.js
│   │   └── adminRoutes.js
│   ├── utils/
│   │   ├── emailService.js
│   │   ├── tokenUtils.js
│   │   ├── mpesa.js
│   │   └── helpers.js
│   ├── uploads/
│   ├── .env
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── css/
│   │   ├── main.css
│   │   └── admin.css
│   ├── js/
│   │   └── api.js
│   ├── pages/
│   │   ├── index.html
│   │   ├── rooms.html
│   │   ├── room-detail.html
│   │   ├── booking.html
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── profile.html
│   │   ├── my-bookings.html
│   │   ├── restaurant.html
│   │   ├── gallery.html
│   │   ├── contact.html
│   │   ├── about.html
│   │   ├── promotions.html
│   │   ├── employee/
│   │   │   └── dashboard.html
│   │   ├── receptionist/
│   │   │   └── dashboard.html
│   │   └── admin/
│   │       ├── index.html
│   │       ├── rooms.html
│   │       ├── bookings.html
│   │       ├── users.html
│   │       ├── employees.html
│   │       ├── attendance.html
│   │       ├── payments.html
│   │       ├── invoices.html
│   │       ├── reviews.html
│   │       ├── housekeeping.html
│   │       ├── restaurant.html
│   │       ├── inventory.html
│   │       ├── gallery.html
│   │       ├── promotions.html
│   │       ├── notifications.html
│   │       ├── reports.html
│   │       ├── settings.html
│   │       └── contact.html
│   └── index.html
├── database/
│   └── everett_hotel.sql
├── documentation/
│   ├── README.md
│   ├── API.md
│   └── SYSTEM_DOCUMENTATION.md
├── .gitignore
└── LICENSE
```

---

## ✨ Features

### 🛎️ Customer Features
- **User Registration & Authentication** – Sign up, login, email verification, password reset
- **Room Browsing** – View rooms by category with filters, high-quality images, amenities, and pricing
- **Dynamic Availability Check** – Real-time room availability by dates and guest count; rooms shown with actual DB prices and room numbers
- **Online Booking** – Complete booking flow with dynamic room selection, date validation, special requests, and instant confirmation
- **Payment Processing** – Multiple payment methods: M-Pesa (STK push), Card/Bank Transfer, with graceful error handling on unavailable providers
- **Invoice Downloads** – Generate and download PDF invoices for bookings
- **Booking Management** – View, track, and cancel bookings from personal dashboard
- **Reviews & Ratings** – Leave reviews and star ratings after completed stays
- **Restaurant Menu** – Browse restaurant menu by category, view food/drink images, filter by dietary preferences
- **Photo Gallery** – Explore hotel photo gallery with lightbox viewing
- **Promotions** – View current special offers and promotional packages
- **Profile Management** – Update personal information, upload profile photo
- **Contact & Support** – Send messages to hotel administration
- **Newsletter Subscription** – Subscribe to email newsletter for updates and offers
- **Notifications** – Receive real-time notifications for booking updates

### 👨‍💼 Admin Features
- **Dashboard Analytics** – Revenue charts, occupancy rates, booking trends, key metrics
- **Room Management** – CRUD operations for rooms and room categories
- **Booking Administration** – View all bookings, update statuses, manage check-in/out
- **User Management** – View, edit, deactivate, and delete user accounts
- **Employee Management** – Staff profiles, roles, schedules, department assignment, and profile photo upload (used for attendance verification)
- **Payment Tracking** – View all transactions, filter by status and method
- **Invoice Management** – Generate, view, and manage invoices
- **Review Moderation** – Approve, feature, or remove guest reviews
- **Housekeeping Management** – Task assignment, scheduling, and status tracking
- **Restaurant Management** – Menu items with image upload, categories, pricing, availability (8 category values)
- **Inventory Management** – Track supplies, stock levels, reorder alerts
- **Gallery Management** – Upload, organize, and delete gallery images
- **Promotion Management** – Create, edit, and schedule promotional offers
- **Attendance Monitoring** – View all staff attendance, filter by on-site vs remote, review flagged entries with location data and IP addresses
- **Geofence Configuration** – Set hotel GPS coordinates, geofence radius, and remote attendance policy via system settings
- **Notification Center** – Send notifications to users, manage notification templates
- **Contact Message Management** – View and respond to customer inquiries
- **Newsletter Management** – View subscribers, send campaigns
- **Reports & Analytics** – Revenue reports, occupancy reports, guest statistics
- **System Settings** – Hotel configuration, tax rates, policies, branding, geofence settings
- **Role-Based Access Control** – Assign roles and permissions to staff members

### 👷 Employee Features
- **Role-Based Dashboard** – Personalized view based on assigned role
- **Geofenced Clock In/Out** – GPS-verified attendance with distance from hotel, location capture, and IP logging
- **Photo Attendance Verification** – Side-by-side camera capture (current photo vs registration photo) at clock-in
- **Task Management** – View and update assigned housekeeping/maintenance tasks
- **Schedule Viewing** – View work schedules and shift assignments
- **Department Communication** – Internal messaging and notifications

---

## 🚀 Installation & Setup

### Prerequisites
Ensure the following software is installed on your machine:
- **Node.js** (v16.x or higher) – [Download](https://nodejs.org/)
- **MySQL** (v8.0 or higher) – [Download](https://dev.mysql.com/downloads/mysql/)
- **npm** (v8.x or higher) – Comes bundled with Node.js

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/EverettHotel.git
cd EverettHotel
```

### Step 2: Database Setup
```bash
# Log into MySQL
mysql -u root -p

# Create the database and import the schema
CREATE DATABASE everett_hotel;
USE everett_hotel;
SOURCE database/everett_hotel.sql;

# Or import directly from command line
mysql -u root -p everett_hotel < database/everett_hotel.sql
```

### Step 3: Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment configuration
# Copy the example env file and configure it
cp .env.example .env

# Edit .env with your database credentials and secrets
# See Environment Variables section below

# Start the development server
npm run dev
```

The backend server will start on `http://localhost:5000`.

### Step 4: Frontend Setup
```bash
# Option A: Open directly in browser
# Simply open frontend/pages/index.html in your browser

# Option B: Use VS Code Live Server
# Install "Live Server" extension in VS Code
# Right-click frontend/pages/index.html → "Open with Live Server"

# Option C: Use a simple HTTP server
cd frontend
npx serve . -p 3000
```

The frontend will be accessible at `http://localhost:3000` (or the Live Server port).

---

## 🔑 Default Credentials

| Role | Email | Password | Notes |
|---|---|---|---|
| **Admin** | admin@everetthotel.com | Admin@123 | Full system access |
| **Customer** | john.doe@email.com | Customer@123 | Standard customer account |

> ⚠️ **Important:** Change these default credentials immediately in production environments.

### Role IDs

| ID | Role |
|---|---|
| 1 | Admin |
| 2 | Customer |
| 3 | Receptionist |
| 4 | Housekeeping |
| 5 | Restaurant Staff |
| 6 | Manager |
| 7 | Super Admin |

---

## 📡 API Endpoints Overview

| Domain | Method | Endpoint | Description | Auth |
|---|---|---|---|---|
| **Auth** | POST | `/api/auth/register` | Register new user | No |
| | POST | `/api/auth/login` | Login | No |
| | POST | `/api/auth/logout` | Logout | Yes |
| | GET | `/api/auth/me` | Get current user | Yes |
| | POST | `/api/auth/forgot-password` | Request password reset | No |
| | POST | `/api/auth/reset-password` | Reset password | No |
| | GET | `/api/auth/verify-email` | Verify email address | No |
| **Users** | GET | `/api/users/profile` | Get own profile | Yes |
| | PUT | `/api/users/profile` | Update own profile | Yes |
| | PUT | `/api/users/profile/photo` | Upload profile photo | Yes |
| | GET | `/api/users` | List all users | Admin |
| | GET | `/api/users/:id` | Get user by ID | Admin |
| | PUT | `/api/users/:id` | Update user | Admin |
| | DELETE | `/api/users/:id` | Delete user | Admin |
| **Rooms** | GET | `/api/rooms` | List rooms | No |
| | GET | `/api/rooms/available` | Available rooms | No |
| | GET | `/api/rooms/categories` | List categories | No |
| | GET | `/api/rooms/:id` | Room details | No |
| | POST | `/api/rooms` | Create room | Admin |
| | PUT | `/api/rooms/:id` | Update room | Admin |
| | DELETE | `/api/rooms/:id` | Delete room | Admin |
| **Bookings** | POST | `/api/bookings` | Create booking | Yes |
| | GET | `/api/bookings/my` | My bookings | Yes |
| | GET | `/api/bookings/:id` | Booking details | Yes |
| | PUT | `/api/bookings/:id/cancel` | Cancel booking | Yes |
| | GET | `/api/bookings/availability/check` | Check availability | No |
| | GET | `/api/bookings/admin/all` | All bookings | Admin |
| | PUT | `/api/bookings/admin/:id/status` | Update status | Admin |
| **Payments** | POST | `/api/payments` | Create payment | Yes |
| | GET | `/api/payments/my` | My payments | Yes |
| | GET | `/api/payments/:id` | Payment details | Yes |
| | GET | `/api/payments/admin/all` | All payments | Admin |
| **Invoices** | POST | `/api/invoices` | Create invoice | Admin |
| | GET | `/api/invoices/my` | My invoices | Yes |
| | GET | `/api/invoices/:id` | Invoice details | Yes |
| | GET | `/api/invoices/:id/download` | Download invoice | Yes |
| **Reviews** | POST | `/api/reviews` | Create review | Yes |
| | GET | `/api/reviews` | List reviews | No |
| | PUT | `/api/reviews/:id` | Update review | Yes |
| | DELETE | `/api/reviews/:id` | Delete review | Yes |
| **Employees** | GET | `/api/employees` | List employees | Admin |
| | POST | `/api/employees` | Create employee | Admin |
| | PUT | `/api/employees/:id` | Update employee | Admin |
| | DELETE | `/api/employees/:id` | Delete employee | Admin |
| **Housekeeping** | GET | `/api/housekeeping` | List tasks | Yes |
| | POST | `/api/housekeeping` | Create task | Admin |
| | PUT | `/api/housekeeping/:id` | Update task | Yes |
| **Restaurant** | GET | `/api/restaurant/menu` | List menu items | No |
| | POST | `/api/restaurant/menu` | Create menu item | Admin |
| | PUT | `/api/restaurant/menu/:id` | Update menu item | Admin |
| | DELETE | `/api/restaurant/menu/:id` | Delete menu item | Admin |
| **Inventory** | GET | `/api/inventory` | List items | Admin |
| | POST | `/api/inventory` | Create item | Admin |
| | PUT | `/api/inventory/:id` | Update item | Admin |
| | DELETE | `/api/inventory/:id` | Delete item | Admin |
| **Gallery** | GET | `/api/gallery` | List images | No |
| | POST | `/api/gallery` | Upload image | Admin |
| | DELETE | `/api/gallery/:id` | Delete image | Admin |
| **Promotions** | GET | `/api/promotions` | List promotions | No |
| | POST | `/api/promotions` | Create promotion | Admin |
| | PUT | `/api/promotions/:id` | Update promotion | Admin |
| | DELETE | `/api/promotions/:id` | Delete promotion | Admin |
| **Notifications** | GET | `/api/notifications` | My notifications | Yes |
| | PUT | `/api/notifications/:id/read` | Mark as read | Yes |
| | POST | `/api/notifications/send` | Send notification | Admin |
| **Contact** | POST | `/api/contact` | Send message | No |
| | GET | `/api/contact` | List messages | Admin |
| **Newsletter** | POST | `/api/newsletter/subscribe` | Subscribe | No |
| | GET | `/api/newsletter/subscribers` | List subscribers | Admin |
| **Reports** | GET | `/api/reports/revenue` | Revenue report | Admin |
| | GET | `/api/reports/occupancy` | Occupancy report | Admin |
| | GET | `/api/reports/guests` | Guest statistics | Admin |
| **Attendance** | POST | `/api/attendance/clock-in` | Clock in | Yes |
| | POST | `/api/attendance/clock-out` | Clock out | Yes |
| | GET | `/api/attendance/my-status` | Today's status | Yes |
| | GET | `/api/attendance/my-recent` | Recent attendance | Yes |
| | GET | `/api/attendance/admin/all` | All attendance records | Admin |
| | GET | `/api/attendance/admin/stats` | Attendance statistics | Admin |
| | PUT | `/api/attendance/admin/:id` | Update record | Admin |
| | GET | `/api/attendance/admin/export` | Export CSV | Admin |
| **M-Pesa** | POST | `/api/mpesa/pay` | Initiate STK push | Yes |
| | GET | `/api/mpesa/status/:checkoutRequestId` | Check payment status | Yes |
| **Card/Bank** | POST | `/api/card-bank/card/create-intent` | Create payment intent | Yes |
| | POST | `/api/card-bank/card/confirm` | Confirm payment | Yes |
| | POST | `/api/card-bank/bank-transfer/initiate` | Initiate transfer | Yes |
| | GET | `/api/card-bank/bank-transfer/details` | Get details | Yes |
| **Analytics** | GET | `/api/analytics/dashboard` | Dashboard data | Admin |
| | GET | `/api/analytics/dashboard/executive` | Executive summary | Admin |
| | GET | `/api/analytics/trends` | Trend data | Admin |
| | GET | `/api/analytics/export` | Export data CSV | Admin |
| **Settings** | GET | `/api/settings` | Get settings | Admin |
| | PUT | `/api/settings` | Update settings | Admin |

> For complete endpoint documentation with request/response examples, see [API.md](./API.md).

---

## 🔧 Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration (XAMPP MySQL)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=everett_hotel
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Email Configuration (Nodemailer – placeholders, not yet functional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_app_password_here
SMTP_FROM="Everett Hotel" <your_gmail@gmail.com>
EMAIL_EXPIRY_HOURS=24

# M-Pesa Configuration (Daraja API – sandbox)
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_mpesa_passkey
MPESA_CALLBACK_URL=https://everetthotel.com/api/mpesa/callback

# Stripe Configuration (test mode – placeholder)
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX=20
RATE_LIMIT_PWRESET_WINDOW_MS=900000
RATE_LIMIT_PWRESET_MAX=10

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5000
```

> ⚠️ **Note:** M-Pesa requires valid Daraja API credentials and a publicly reachable callback URL. Stripe requires real keys for live payments. SMTP requires a Gmail app password for email delivery.

---

## 📄 License

This project is licensed under the **ISC License**.

```
ISC License

Copyright (c) 2024 Everett Hotel Management System

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

---

## 🙏 Credits

- **Express.js** – Fast, unopinionated web framework for Node.js
- **MySQL** – World's most popular open-source relational database
- **Bootstrap 5** – The most popular CSS framework
- **Font Awesome** – The icon library and toolkit
- **Google Fonts** – Free, open-source font library
- **Chart.js** – Simple yet flexible JavaScript charting library
- **SweetAlert2** – Beautiful, responsive, customizable pop-up boxes
- **AOS** – Animate On Scroll library
- **JWT.io** – JSON Web Tokens for secure authentication
- **Nodemailer** – Easy email sending for Node.js
- **Multer** – Node.js middleware for handling multipart/form-data
- **Helmet** – Secure Express apps with various HTTP headers
- **Morgan** – HTTP request logger middleware for Node.js

---

<p align="center">
  Built with care for luxury hospitality management.<br>
  <strong>Everett Hotel Management System &copy; 2024</strong>
</p>
