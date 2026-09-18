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


```

</p>
