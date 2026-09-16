/**
 * File Upload Middleware - Everett Hotel Management System
 * Handles multer configuration for image uploads
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const ATTENDANCE_DIR = path.join(UPLOAD_DIR, 'attendance');

// Ensure upload directories exist
for (const dir of [UPLOAD_DIR, ATTENDANCE_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// Attendance photo storage (private - served via authenticated route)
const attendanceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ATTENDANCE_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter - only images (no SVG - XSS risk)
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'), false);
  }
};

// Magic-byte signature check (defense against spoofed extensions/mimetypes)
function isValidImageSignature(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(16);
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
    // GIF: 47 49 46 38 ("GIF8")
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
    // WebP: "RIFF" + "WEBP"
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return true;

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Multer upload instances
 */
const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB
  },
});

const uploadAttendance = multer({
  storage: attendanceStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB
  },
});

/**
 * Single image upload
 */
const uploadSingle = upload.single('image');

/**
 * Multiple image upload (max 10)
 */
const uploadMultiple = upload.array('images', 10);

/**
 * Profile photo upload
 */
const uploadProfilePhoto = upload.single('profilePhoto');

/**
 * Attendance (biometric) photo upload - stored in private subdirectory
 */
const uploadAttendancePhoto = uploadAttendance.single('photo');

/**
 * Multer error handler (error-only middleware - 4 params)
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 images.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

/**
 * Magic-byte signature validation (runs AFTER multer writes the file).
 * Must be a 3-arg middleware so it executes on successful uploads.
 */
const validateUploadedImages = (req, res, next) => {
  const files = req.file ? [req.file] : (req.files || []);
  for (const file of files) {
    if (file && file.path && !isValidImageSignature(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
      return res.status(400).json({
        success: false,
        message: 'Uploaded file is not a valid image.',
      });
    }
  }
  next();
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadProfilePhoto,
  uploadAttendancePhoto,
  handleUploadError,
  validateUploadedImages,
};
