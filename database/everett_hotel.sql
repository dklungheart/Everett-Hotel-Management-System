-- ============================================================
-- Everett Hotel Management System - Complete Database Schema
-- Tagline: "Luxury, Comfort, Excellence."
-- Engine: MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS everett_hotel
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE everett_hotel;

-- ============================================================
-- 1. ROLES & PERMISSIONS
-- ============================================================

CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 2. USERS (Customers & Admins)
-- ============================================================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  zip_code VARCHAR(20),
  profile_photo VARCHAR(500),
  role_id INT DEFAULT 2,
  is_active TINYINT(1) DEFAULT 1,
  is_verified TINYINT(1) DEFAULT 0,
  verification_token VARCHAR(255),
  verification_expires TIMESTAMP NULL,
  reset_password_token VARCHAR(255),
  reset_password_expires TIMESTAMP NULL,
  failed_login_attempts INT DEFAULT 0,
  lockout_until TIMESTAMP NULL,
  token_version INT DEFAULT 0,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_role (role_id),
  INDEX idx_phone (phone),
  INDEX idx_is_active (is_active),
  INDEX idx_verification_token (verification_token),
  INDEX idx_reset_token (reset_password_token)
) ENGINE=InnoDB;

CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  department VARCHAR(100),
  position VARCHAR(100),
  permissions_level INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 3. EMPLOYEES
-- ============================================================

CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  employee_code VARCHAR(20) NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL,
  position VARCHAR(100) NOT NULL,
  hire_date DATE NOT NULL,
  salary DECIMAL(10, 2),
  shift_start TIME,
  shift_end TIME,
  status ENUM('active', 'inactive', 'on_leave', 'terminated') DEFAULT 'active',
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_employee_code (employee_code),
  INDEX idx_department (department)
) ENGINE=InnoDB;

-- ============================================================
-- 4. ROOM CATEGORIES
-- ============================================================

CREATE TABLE room_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL,
  max_adults INT DEFAULT 2,
  max_children INT DEFAULT 1,
  bed_type VARCHAR(50),
  room_size VARCHAR(50),
  image VARCHAR(500),
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug)
) ENGINE=InnoDB;

-- ============================================================
-- 5. ROOMS
-- ============================================================

CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_number VARCHAR(10) NOT NULL UNIQUE,
  category_id INT NOT NULL,
  floor INT,
  status ENUM('available', 'occupied', 'maintenance', 'cleaning', 'reserved') DEFAULT 'available',
  price_per_night DECIMAL(10, 2) NOT NULL,
  description TEXT,
  image VARCHAR(500),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES room_categories(id) ON DELETE RESTRICT,
  INDEX idx_status (status),
  INDEX idx_category (category_id),
  INDEX idx_floor (floor)
) ENGINE=InnoDB;

CREATE TABLE room_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 6. AMENITIES
-- ============================================================

CREATE TABLE amenities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(100),
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE room_amenities (
  room_id INT NOT NULL,
  amenity_id INT NOT NULL,
  PRIMARY KEY (room_id, amenity_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 7. GUESTS
-- ============================================================

CREATE TABLE guests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  id_type ENUM('passport', 'national_id', 'drivers_license') DEFAULT 'national_id',
  id_number VARCHAR(100),
  nationality VARCHAR(100),
  date_of_birth DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_name (first_name, last_name),
  INDEX idx_phone (phone)
) ENGINE=InnoDB;

-- ============================================================
-- 8. BOOKINGS
-- ============================================================

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_reference VARCHAR(20) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  room_id INT NOT NULL,
  guest_id INT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  adults INT DEFAULT 1,
  children_count INT DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  final_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show') DEFAULT 'pending',
  special_requests TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL,
  INDEX idx_booking_ref (booking_reference),
  INDEX idx_user (user_id),
  INDEX idx_room (room_id),
  INDEX idx_status (status),
  INDEX idx_dates (check_in, check_out),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 9. PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_reference VARCHAR(30) NOT NULL UNIQUE,
  booking_id INT NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  method ENUM('mpesa', 'paypal', 'stripe', 'card', 'visa', 'mastercard', 'cash', 'bank_transfer') NOT NULL,
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  transaction_id VARCHAR(255),
  card_last_four VARCHAR(4),
  billing_name VARCHAR(200),
  billing_address TEXT,
  notes TEXT,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_payment_ref (payment_reference),
  INDEX idx_booking (booking_id),
  INDEX idx_user (user_id),
  INDEX idx_method (method),
  INDEX idx_status (status),
  INDEX idx_paid_at (paid_at)
) ENGINE=InnoDB;

-- ============================================================
-- 10. INVOICES
-- ============================================================

CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(30) NOT NULL UNIQUE,
  booking_id INT NOT NULL,
  user_id INT NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_invoice_number (invoice_number),
  INDEX idx_booking (booking_id)
) ENGINE=InnoDB;

-- ============================================================
-- 11. REVIEWS & RATINGS
-- ============================================================

CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room_id INT,
  booking_id INT,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(255),
  comment TEXT,
  response TEXT,
  responded_by INT,
  responded_at TIMESTAMP NULL,
  is_approved TINYINT(1) DEFAULT 1,
  is_featured TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_room (room_id),
  INDEX idx_rating (rating)
) ENGINE=InnoDB;

-- ============================================================
-- 12. HOUSEKEEPING
-- ============================================================

CREATE TABLE housekeeping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  assigned_to INT,
  task_type ENUM('cleaning', 'deep_cleaning', 'maintenance', 'inspection', 'turnover') NOT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  notes TEXT,
  scheduled_date DATE,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
  FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_room (room_id),
  INDEX idx_date (scheduled_date),
  INDEX idx_assigned (assigned_to)
) ENGINE=InnoDB;

-- ============================================================
-- 13. RESTAURANT
-- ============================================================

CREATE TABLE restaurant_menu (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category ENUM('appetizer', 'main_course', 'dessert', 'beverage', 'breakfast', 'lunch', 'dinner', 'special') NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image VARCHAR(500),
  is_available TINYINT(1) DEFAULT 1,
  is_vegetarian TINYINT(1) DEFAULT 0,
  is_vegan TINYINT(1) DEFAULT 0,
  is_gluten_free TINYINT(1) DEFAULT 0,
  preparation_time INT DEFAULT 15,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category)
) ENGINE=InnoDB;

CREATE TABLE restaurant_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(20) NOT NULL UNIQUE,
  user_id INT,
  booking_id INT,
  table_number INT,
  order_type ENUM('dine_in', 'room_service', 'takeaway') NOT NULL,
  status ENUM('pending', 'preparing', 'ready', 'served', 'completed', 'cancelled') DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  INDEX idx_order_number (order_number),
  INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE restaurant_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  FOREIGN KEY (order_id) REFERENCES restaurant_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES restaurant_menu(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- 14. INVENTORY
-- ============================================================

CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(200) NOT NULL,
  category ENUM('food', 'beverage', 'cleaning', 'linen', 'amenity', 'office', 'maintenance', 'other') NOT NULL,
  supplier_id INT,
  quantity INT DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'pieces',
  unit_cost DECIMAL(10, 2) DEFAULT 0,
  reorder_level INT DEFAULT 10,
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  INDEX idx_category (category)
) ENGINE=InnoDB;

-- ============================================================
-- 15. PROMOTIONS
-- ============================================================

CREATE TABLE promotions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  discount_type ENUM('percentage', 'fixed') NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  min_booking_amount DECIMAL(10, 2) DEFAULT 0,
  max_discount DECIMAL(10, 2),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  max_uses INT,
  used_count INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB;

-- ============================================================
-- 16. GALLERY
-- ============================================================

CREATE TABLE gallery (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200),
  description TEXT,
  image_url VARCHAR(500) NOT NULL,
  category ENUM('rooms', 'restaurant', 'spa', 'pool', 'events', 'exterior', 'interior', 'other') DEFAULT 'other',
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 17. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('booking', 'payment', 'promotion', 'system', 'review') DEFAULT 'system',
  is_read TINYINT(1) DEFAULT 0,
  link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read)
) ENGINE=InnoDB;

-- ============================================================
-- 18. NEWSLETTER
-- ============================================================

CREATE TABLE newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  user_id INT,
  is_active TINYINT(1) DEFAULT 1,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- ============================================================
-- 19. CONTACT MESSAGES
-- ============================================================

CREATE TABLE contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('unread', 'read', 'replied', 'archived') DEFAULT 'unread',
  replied_at TIMESTAMP NULL,
  replied_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (replied_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- 20. AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 21. PASSWORD RESETS & EMAIL VERIFICATIONS
-- (Managed via columns on users table: reset_password_token,
--  reset_password_expires, verification_token, verification_expires)
-- ============================================================

-- ============================================================
-- 23. SYSTEM SETTINGS
-- ============================================================

CREATE TABLE system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description VARCHAR(500),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 24. WISHLIST / FAVORITES
-- ============================================================

CREATE TABLE wishlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_room (user_id, room_id)
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Roles
INSERT INTO roles (name, description) VALUES
('admin', 'Full system administrator'),
('customer', 'Registered hotel guest'),
('receptionist', 'Front desk staff'),
('housekeeping', 'Housekeeping staff'),
('restaurant_staff', 'Restaurant team member'),
('manager', 'Hotel manager'),
('super_admin', 'Super administrator with full access');

-- Permissions
INSERT INTO permissions (name, description) VALUES
('manage_rooms', 'Create, update, delete rooms'),
('manage_bookings', 'Manage all bookings'),
('manage_users', 'Manage user accounts'),
('manage_employees', 'Manage employee records'),
('manage_payments', 'Process and manage payments'),
('manage_reviews', 'Moderate reviews'),
('manage_restaurant', 'Manage restaurant operations'),
('manage_inventory', 'Manage inventory'),
('manage_gallery', 'Manage photo gallery'),
('manage_settings', 'System settings'),
('manage_reports', 'View and generate reports'),
('manage_housekeeping', 'Manage housekeeping tasks'),
('manage_promotions', 'Manage promotions and discounts'),
('manage_newsletter', 'Manage newsletter subscribers'),
('view_dashboard', 'Access analytics dashboard');

-- Assign all permissions to super_admin (role_id = 7)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions;

-- Assign subset to admin (role_id = 1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE name IN (
  'manage_rooms', 'manage_bookings', 'manage_users', 'manage_employees',
  'manage_payments', 'manage_reviews', 'manage_restaurant', 'manage_inventory',
  'manage_gallery', 'manage_reports', 'manage_housekeeping', 'manage_promotions', 'view_dashboard'
);

-- Assign dashboard + bookings to receptionist (role_id = 3)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE name IN (
  'manage_bookings', 'view_dashboard'
);

-- Assign housekeeping permissions (role_id = 4)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE name IN (
  'manage_housekeeping', 'view_dashboard'
);

-- Assign restaurant permissions (role_id = 5)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE name IN (
  'manage_restaurant', 'view_dashboard'
);

-- Assign manager permissions (role_id = 6)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions WHERE name IN (
  'manage_rooms', 'manage_bookings', 'manage_users', 'manage_employees',
  'manage_payments', 'manage_reviews', 'manage_restaurant', 'manage_inventory',
  'manage_reports', 'manage_housekeeping', 'view_dashboard'
);

-- Room Categories
INSERT INTO room_categories (name, slug, description, base_price, max_adults, max_children, bed_type, room_size, sort_order) VALUES
('Standard', 'standard', 'Comfortable rooms with essential amenities for a pleasant stay.', 120.00, 2, 1, 'Queen', '28 sqm', 1),
('Deluxe', 'deluxe', 'Spacious rooms with premium furnishings and city views.', 200.00, 2, 2, 'King', '35 sqm', 2),
('Executive', 'executive', 'Elegant rooms designed for business travelers with work desk and lounge access.', 300.00, 2, 1, 'King', '42 sqm', 3),
('Family', 'family', 'Roomy accommodations perfect for families with connecting rooms.', 280.00, 4, 2, 'Queen + Bunk', '50 sqm', 4),
('Suite', 'suite', 'Luxurious suite with separate living area and panoramic views.', 450.00, 3, 2, 'King', '65 sqm', 5),
('Presidential Suite', 'presidential-suite', 'The ultimate luxury experience with private butler and exclusive amenities.', 1200.00, 4, 2, 'California King', '120 sqm', 6);

-- Rooms
-- (Add rooms via admin panel)

-- Amenities
INSERT INTO amenities (name, icon, description) VALUES
('Free Wi-Fi', 'fa-wifi', 'Complimentary high-speed internet access'),
('Air Conditioning', 'fa-snowflake', 'Individual climate control'),
('Flat Screen TV', 'fa-tv', '55-inch Smart TV with cable channels'),
('Mini Bar', 'fa-wine-bottle', 'Stocked mini bar with premium beverages'),
('Room Service', 'fa-concierge-bell', '24-hour in-room dining service'),
('Safe Box', 'fa-lock', 'In-room electronic safe'),
('Hair Dryer', 'fa-wind', 'Professional hair dryer'),
('Bathrobe & Slippers', 'fa-tshirt', 'Luxury cotton bathrobe and slippers'),
('Iron & Ironing Board', 'fa-tshirt', 'Full-size iron and board'),
('Balcony', 'fa-door-open', 'Private balcony with views'),
('Coffee Maker', 'fa-mug-hot', 'Nespresso coffee machine'),
('Telephone', 'fa-phone', 'Direct dial telephone'),
('Ocean View', 'fa-water', 'Beautiful ocean panorama'),
('Jacuzzi', 'fa-bath', 'In-room jacuzzi tub'),
('Kitchen', 'fa-utensils', 'Fully equipped kitchenette');

-- Assign amenities to rooms
-- (Assign via admin panel after creating rooms)

-- Admin user and demo data are created at runtime via the application
-- Use the registration endpoint or initDatabase.js to create the first admin account

-- System Settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('hotel_name', 'Everett Hotel', 'string', 'Hotel display name'),
('hotel_tagline', 'Luxury, Comfort, Excellence.', 'string', 'Hotel tagline'),
('hotel_email', 'info@everetthotel.com', 'string', 'Primary hotel email'),
('hotel_phone', '+254 700 123 456', 'string', 'Primary hotel phone'),
('hotel_address', 'Westlands, Nairobi, Nairobi, KE 00100', 'string', 'Hotel address'),
('currency', 'USD', 'string', 'Default currency'),
('tax_rate', '12', 'number', 'Tax percentage'),
('check_in_time', '15:00', 'string', 'Standard check-in time'),
('check_out_time', '11:00', 'string', 'Standard check-out time'),
('max_booking_advance_days', '365', 'number', 'How far in advance a booking can be made'),
('cancellation_policy_hours', '24', 'number', 'Hours before check-in for free cancellation'),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode'),
('registration_enabled', 'true', 'boolean', 'Allow new user registrations'),
('email_notifications', 'true', 'boolean', 'Enable email notifications');

-- Sample data (optional, for testing):
-- INSERT INTO guests (first_name, last_name, email, phone, nationality) VALUES
-- ('John', 'Doe', 'john.doe@email.com', '+1-555-0201', 'American');

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update room status when booking is confirmed
DELIMITER //
CREATE TRIGGER trg_booking_after_insert
AFTER INSERT ON bookings
FOR EACH ROW
BEGIN
  IF NEW.status = 'confirmed' THEN
    UPDATE rooms SET status = 'reserved' WHERE id = NEW.room_id;
  END IF;
END//

-- Auto-update room status when booking is checked in
CREATE TRIGGER trg_booking_after_update
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
  IF NEW.status = 'checked_in' AND OLD.status != 'checked_in' THEN
    UPDATE rooms SET status = 'occupied' WHERE id = NEW.room_id;
  ELSEIF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    UPDATE rooms SET status = 'cleaning' WHERE id = NEW.room_id;
  ELSEIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE rooms SET status = 'available' WHERE id = NEW.room_id;
  END IF;
END//

-- Auto-update inventory when restaurant order is completed
CREATE TRIGGER trg_order_item_after_insert
AFTER INSERT ON restaurant_order_items
FOR EACH ROW
BEGIN
  UPDATE inventory
    SET quantity = quantity - NEW.quantity
    WHERE item_name = (SELECT name FROM restaurant_menu WHERE id = NEW.menu_item_id)
    AND category IN ('food', 'beverage')
    AND quantity >= NEW.quantity;
END//
DELIMITER ;

-- ============================================================
-- VIEWS for common queries
-- ============================================================

CREATE VIEW vw_room_availability AS
SELECT
  r.id,
  r.room_number,
  rc.name AS category,
  rc.slug AS category_slug,
  r.floor,
  r.status,
  r.price_per_night,
  rc.max_adults,
  rc.max_children,
  rc.bed_type,
  rc.room_size
FROM rooms r
JOIN room_categories rc ON r.category_id = rc.id
WHERE r.is_active = 1;

CREATE VIEW vw_booking_summary AS
SELECT
  b.id,
  b.booking_reference,
  CONCAT(u.first_name, ' ', u.last_name) AS guest_name,
  u.email AS guest_email,
  r.room_number,
  rc.name AS room_category,
  b.check_in,
  b.check_out,
  b.adults,
  b.children_count,
  b.total_amount,
  b.tax_amount,
  b.final_amount,
  b.status,
  b.created_at
FROM bookings b
JOIN users u ON b.user_id = u.id
JOIN rooms r ON b.room_id = r.id
JOIN room_categories rc ON r.category_id = rc.id;

CREATE VIEW vw_daily_revenue AS
SELECT
  DATE(p.paid_at) AS payment_date,
  COUNT(p.id) AS total_payments,
  SUM(p.amount) AS total_revenue,
  AVG(p.amount) AS average_payment
FROM payments p
WHERE p.status = 'completed'
GROUP BY DATE(p.paid_at)
ORDER BY payment_date DESC;

-- ============================================================
-- M-Pesa Transactions Table
-- ============================================================
CREATE TABLE mpesa_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  checkout_request_id VARCHAR(100) NOT NULL UNIQUE,
  merchant_request_id VARCHAR(100),
  phone_number VARCHAR(20) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  account_reference VARCHAR(100),
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  result_code INT,
  result_desc TEXT,
  mpesa_receipt_number VARCHAR(50),
  transaction_date BIGINT,
  payment_id INT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_checkout_id (checkout_request_id),
  INDEX idx_receipt_number (mpesa_receipt_number),
  INDEX idx_status (status),
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- CMS Content Table
-- ============================================================
CREATE TABLE cms_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(100) NOT NULL UNIQUE,
  section_type ENUM('hero', 'banner', 'text', 'about', 'services', 'gallery', 'testimonial', 'cta', 'faq', 'custom') NOT NULL,
  title VARCHAR(255),
  subtitle VARCHAR(500),
  content TEXT,
  image_url VARCHAR(500),
  button_text VARCHAR(100),
  button_url VARCHAR(500),
  meta JSON,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_section_key (section_key),
  INDEX idx_sort_order (sort_order)
);

-- ============================================================
-- CMS FAQs Table
-- ============================================================
CREATE TABLE cms_faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100),
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_sort_order (sort_order)
);

-- ============================================================
-- 25. GUEST FEEDBACK (Post-Checkout Rating 1-10)
-- ============================================================
CREATE TABLE guest_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_reference VARCHAR(20) NOT NULL,
  guest_name VARCHAR(200) NOT NULL,
  guest_phone VARCHAR(20),
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 10),
  comment TEXT,
  is_submitted TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_booking_ref (booking_reference),
  INDEX idx_rating (rating)
) ENGINE=InnoDB;

-- ============================================================
-- Seed CMS Content (Default Sections)
-- ============================================================
INSERT INTO cms_content (section_key, section_type, title, subtitle, content, image_url, button_text, button_url, sort_order) VALUES
('home_hero', 'hero', 'Welcome to Everett Hotel', 'Experience luxury in the heart of Nairobi', 'Nestled in the vibrant Westlands district, Everett Hotel offers an unforgettable blend of African warmth and world-class hospitality.', '/images/hero-bg.jpg', 'Book Now', '/booking.html', 1),
('about_intro', 'about', 'About Everett Hotel', 'A Legacy of Excellence', 'Everett Hotel is Nairobi''s premier luxury destination, offering exquisite accommodations, fine dining, and unparalleled service since 2010.', '/images/about.jpg', 'Learn More', '/about.html', 2),
('services_title', 'services', 'Our Services', 'World-Class Amenities', 'From our spa and wellness center to our business facilities, we provide everything you need for a perfect stay.', NULL, NULL, NULL, 3),
('contact_info', 'text', 'Contact Us', 'We''d Love to Hear From You', 'Visit us at Westlands, Nairobi, Kenya or call +254 700 123 456. Our team is available 24/7 to assist you.', NULL, NULL, NULL, 4),
('booking_cta', 'cta', 'Ready to Experience Luxury?', 'Book your stay at Everett Hotel today', 'Enjoy exclusive rates, world-class amenities, and personalized service that makes every moment special.', NULL, 'Book Your Stay', '/booking.html', 5);
