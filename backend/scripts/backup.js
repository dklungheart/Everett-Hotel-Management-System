/**
 * Automated Database Backup Script - Everett Hotel Management System
 * Usage: node scripts/backup.js [--daily|--weekly|--manual]
 * 
 * Backups are stored in: ../backups/
 * Keeps last 7 daily and 4 weekly backups automatically.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '12756980';
const DB_NAME = process.env.DB_NAME || 'everett_hotel';
const MYSQL_BIN = process.env.MYSQL_BIN || 'C:\\xampp\\mysql\\bin\\mysqldump.exe';

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DAILY_KEEP = 7;
const WEEKLY_KEEP = 4;

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }
}

function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function runBackup(type = 'daily') {
  return new Promise((resolve, reject) => {
    const timestamp = getTimestamp();
    const filename = `everett_hotel_${type}_${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    const escapedPassword = DB_PASSWORD.replace(/"/g, '\\"');
    const cmd = `"${MYSQL_BIN}" -h ${DB_HOST} -u ${DB_USER} -p"${escapedPassword}" --single-transaction --routines --triggers --events ${DB_NAME} > "${filepath}"`;

    console.log(`Starting ${type} backup...`);
    console.log(`Database: ${DB_NAME} @ ${DB_HOST}`);
    console.log(`Output: ${filepath}`);

    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Backup failed: ${error.message}`);
        if (stderr) console.error(`stderr: ${stderr}`);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        reject(error);
        return;
      }

      const stats = fs.statSync(filepath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`Backup completed: ${filename} (${sizeMB} MB)`);
      resolve(filepath);
    });
  });
}

function cleanupOldBackups(type = 'daily') {
  const keepCount = type === 'weekly' ? WEEKLY_KEEP : DAILY_KEEP;
  const prefix = `everett_hotel_${type}_`;

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.sql'))
    .sort()
    .reverse();

  if (files.length > keepCount) {
    const toDelete = files.slice(keepCount);
    toDelete.forEach(file => {
      const filepath = path.join(BACKUP_DIR, file);
      fs.unlinkSync(filepath);
      console.log(`Deleted old backup: ${file}`);
    });
  }

  console.log(`Keeping ${Math.min(files.length, keepCount)} ${type} backups`);
}

async function main() {
  const type = process.argv[2] || 'daily';

  if (!['daily', 'weekly', 'manual'].includes(type)) {
    console.error('Usage: node scripts/backup.js [--daily|--weekly|--manual]');
    process.exit(1);
  }

  console.log('=== Everett Hotel Database Backup ===');
  console.log(`Type: ${type}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  ensureBackupDir();

  try {
    await runBackup(type);

    if (type !== 'manual') {
      cleanupOldBackups(type);
    }

    console.log('');
    console.log('Backup process completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('Backup process failed.');
    process.exit(1);
  }
}

main();
