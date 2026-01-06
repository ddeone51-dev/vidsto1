import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import bcrypt from "bcrypt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, "..", "data", "vidsto.db");
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT,
    google_id TEXT UNIQUE,
    role TEXT DEFAULT 'user',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS featured_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    video_url TEXT,
    thumbnail_url TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    credits INTEGER NOT NULL DEFAULT 0,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_usd REAL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS credit_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TZS',
    external_id TEXT UNIQUE NOT NULL,
    azampay_transaction_id TEXT,
    provider TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    account_number TEXT,
    callback_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
  );

  CREATE TABLE IF NOT EXISTS user_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    video_data BLOB NOT NULL,
    video_mime_type TEXT NOT NULL,
    thumbnail_data BLOB,
    duration_seconds REAL,
    language TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS featured_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    video_url TEXT,
    thumbnail_url TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audio_generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    duration_minutes REAL NOT NULL,
    credits_used INTEGER NOT NULL,
    narration_text TEXT,
    voice_id TEXT,
    language TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
  CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
  CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);
  CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
  CREATE INDEX IF NOT EXISTS idx_audio_generations_user_id ON audio_generations(user_id);
`);

// Add role column to users if it doesn't exist (for existing databases)
try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
} catch (e) {
  // Column already exists, ignore
}
try {
  db.exec(`ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1`);
} catch (e) {
  // Column already exists, ignore
}

// Initialize default plans
const defaultPlans = [
  { name: "Free", credits: 20, price_usd: 0, description: "Perfect for trying out Vidisto" },
  { name: "Starter", credits: 200, price_usd: 9.00, description: "Great for small projects - up to 30 min videos" },
  { name: "Professional", credits: 500, price_usd: 19.99, description: "For regular creators - up to 75 min videos" },
  { name: "Premium", credits: 1000, price_usd: 39.99, description: "For power users and agencies - up to 150 min videos" },
];

const existingPlans = db.prepare("SELECT COUNT(*) as count FROM plans").get();
if (existingPlans.count === 0) {
  const insertPlan = db.prepare("INSERT INTO plans (name, credits, price_usd, description) VALUES (?, ?, ?, ?)");
  const insertMany = db.transaction((plans) => {
    for (const plan of plans) {
      insertPlan.run(plan.name, plan.credits, plan.price_usd, plan.description);
    }
  });
  insertMany(defaultPlans);
}

// User operations
export const userDb = {
  create: (email, password, name) => {
    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)").run(email, passwordHash, name);
    return result.lastInsertRowid;
  },

  createGoogleUser: (email, name, googleId) => {
    const result = db.prepare("INSERT INTO users (email, name, google_id) VALUES (?, ?, ?)").run(email, name, googleId);
    return result.lastInsertRowid;
  },

  findByEmail: (email) => {
    return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  },

  findByGoogleId: (googleId) => {
    return db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId);
  },

  findById: (id) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (!user) return null;
    // Return user with role and is_active (may be null for old users)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      is_active: user.is_active !== undefined ? user.is_active : 1,
      created_at: user.created_at,
    };
  },

  findAll: (limit = 100, offset = 0) => {
    return db.prepare("SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset);
  },

  updateRole: (userId, role) => {
    return db.prepare("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(role, userId);
  },

  updateActiveStatus: (userId, isActive) => {
    return db.prepare("UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(isActive ? 1 : 0, userId);
  },

  deleteUser: (userId) => {
    return db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  },

  verifyPassword: (password, hash) => {
    return bcrypt.compareSync(password, hash);
  },

  updateGoogleId: (userId, googleId) => {
    db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(googleId, userId);
  },
};

// Plan operations
export const planDb = {
  getAll: () => {
    return db.prepare("SELECT * FROM plans WHERE is_active = 1 ORDER BY credits ASC").all();
  },

  getById: (id) => {
    return db.prepare("SELECT * FROM plans WHERE id = ? AND is_active = 1").get(id);
  },

  findByName: (name) => {
    return db.prepare("SELECT * FROM plans WHERE name = ? AND is_active = 1").get(name);
  },
};

// User plan operations
export const userPlanDb = {
  assignPlan: (userId, planId, credits) => {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    db.prepare("INSERT INTO user_plans (user_id, plan_id, credits, expires_at) VALUES (?, ?, ?, ?)").run(
      userId,
      planId,
      credits,
      expiresAt.toISOString()
    );
  },

  getUserCredits: (userId) => {
    const result = db
      .prepare(
        `SELECT COALESCE(SUM(credits), 0) as total_credits 
         FROM user_plans 
         WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))`
      )
      .get(userId);
    return result.total_credits || 0;
  },

  getUserPlans: (userId) => {
    return db
      .prepare("SELECT * FROM user_plans WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now')) ORDER BY purchased_at DESC")
      .all(userId);
  },

  deductCredits: (userId, amount, description) => {
    const currentCredits = userPlanDb.getUserCredits(userId);
    if (currentCredits < amount) {
      return { success: false, message: "Insufficient credits" };
    }

    db.prepare("INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)").run(
      userId,
      -amount,
      "deduction",
      description
    );

    const userPlans = db
      .prepare("SELECT * FROM user_plans WHERE user_id = ? AND credits > 0 AND (expires_at IS NULL OR expires_at > datetime('now')) ORDER BY purchased_at DESC")
      .all(userId);

    let remaining = amount;
    for (const plan of userPlans) {
      if (remaining <= 0) break;
      const deduct = Math.min(plan.credits, remaining);
      db.prepare("UPDATE user_plans SET credits = credits - ? WHERE id = ?").run(deduct, plan.id);
      remaining -= deduct;
    }

    return { success: true };
  },

  addCredits: (userId, amount, description) => {
    // Log the transaction
    db.prepare("INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)").run(
      userId,
      amount,
      "admin_adjustment",
      description
    );
    
    // Add credits to user's first active plan
    const userPlans = userPlanDb.getUserPlans(userId);
    if (userPlans.length > 0) {
      const firstPlan = userPlans[0];
      db.prepare("UPDATE user_plans SET credits = credits + ? WHERE id = ?").run(amount, firstPlan.id);
    }
  },

  getTransactions: (userId, limit = 50) => {
    return db
      .prepare("SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
      .all(userId, limit);
  },

  getAllUserPlans: (limit = 100, offset = 0) => {
    return db
      .prepare(`
        SELECT up.*, u.email, u.name as user_name, p.name as plan_name, p.price_usd
        FROM user_plans up
        JOIN users u ON up.user_id = u.id
        JOIN plans p ON up.plan_id = p.id
        ORDER BY up.purchased_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(limit, offset);
  },

  getUserPlansByUserId: (userId) => {
    return db
      .prepare(`
        SELECT up.*, p.name as plan_name, p.price_usd, p.description as plan_description
        FROM user_plans up
        JOIN plans p ON up.plan_id = p.id
        WHERE up.user_id = ?
        ORDER BY up.purchased_at DESC
      `)
      .all(userId);
  },

  updateExpiration: (userPlanId, expiresAt) => {
    return db
      .prepare("UPDATE user_plans SET expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(expiresAt, userPlanId);
  },

  renewPlan: (userPlanId, months = 1) => {
    const plan = db.prepare("SELECT expires_at FROM user_plans WHERE id = ?").get(userPlanId);
    if (!plan) {
      throw new Error("User plan not found");
    }
    
    let newExpiresAt;
    if (plan.expires_at) {
      const currentExpiry = new Date(plan.expires_at);
      currentExpiry.setMonth(currentExpiry.getMonth() + months);
      newExpiresAt = currentExpiry.toISOString();
    } else {
      const newExpiry = new Date();
      newExpiry.setMonth(newExpiry.getMonth() + months);
      newExpiresAt = newExpiry.toISOString();
    }
    
    return db
      .prepare("UPDATE user_plans SET expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(newExpiresAt, userPlanId);
  },

  getPlanById: (userPlanId) => {
    return db
      .prepare(`
        SELECT up.*, u.email, u.name as user_name, p.name as plan_name, p.price_usd, p.description as plan_description
        FROM user_plans up
        JOIN users u ON up.user_id = u.id
        JOIN plans p ON up.plan_id = p.id
        WHERE up.id = ?
      `)
      .get(userPlanId);
  },
};

// Payment operations
export const paymentDb = {
  create: (userId, planId, amount, currency, externalId, provider, paymentMethod, accountNumber) => {
    const result = db
      .prepare(
        "INSERT INTO payments (user_id, plan_id, amount, currency, external_id, provider, payment_method, account_number, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')"
      )
      .run(userId, planId, amount, currency, externalId, provider, paymentMethod, accountNumber);
    return result.lastInsertRowid;
  },

  findByExternalId: (externalId) => {
    return db.prepare("SELECT * FROM payments WHERE external_id = ?").get(externalId);
  },

  updateStatus: (paymentId, status, azampayTransactionId = null, callbackData = null) => {
    const updateQuery = azampayTransactionId
      ? "UPDATE payments SET status = ?, azampay_transaction_id = ?, callback_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      : "UPDATE payments SET status = ?, callback_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
    
    let result;
    if (azampayTransactionId) {
      result = db.prepare(updateQuery).run(status, azampayTransactionId, callbackData ? JSON.stringify(callbackData) : null, paymentId);
    } else {
      result = db.prepare(updateQuery).run(status, callbackData ? JSON.stringify(callbackData) : null, paymentId);
    }
    
    console.log(`[Payment DB] updateStatus called: paymentId=${paymentId}, status=${status}, rowsChanged=${result.changes}`);
    
    if (result.changes === 0) {
      console.error(`[Payment DB] ⚠️ WARNING: No rows updated for payment ID ${paymentId}!`);
    }
    
    return result;
  },

  getUserPayments: (userId, limit = 50) => {
    return db
      .prepare(
        "SELECT p.*, pl.name as plan_name FROM payments p JOIN plans pl ON p.plan_id = pl.id WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT ?"
      )
      .all(userId, limit);
  },

  getById: (paymentId, userId) => {
    return db
      .prepare("SELECT * FROM payments WHERE id = ? AND user_id = ?")
      .get(paymentId, userId);
  },
};

// User videos operations
export const videoDb = {
  save: (userId, title, videoData, videoMimeType, thumbnailData, durationSeconds, language) => {
    const result = db
      .prepare(
        "INSERT INTO user_videos (user_id, title, video_data, video_mime_type, thumbnail_data, duration_seconds, language) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(userId, title, videoData, videoMimeType, thumbnailData, durationSeconds, language);
    return result.lastInsertRowid;
  },

  getUserVideos: (userId, limit = 100) => {
    return db
      .prepare(
        "SELECT id, title, video_mime_type, thumbnail_data, duration_seconds, language, created_at FROM user_videos WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
      )
      .all(userId, limit);
  },

  getVideoById: (videoId, userId) => {
    return db
      .prepare("SELECT * FROM user_videos WHERE id = ? AND user_id = ?")
      .get(videoId, userId);
  },

  deleteVideo: (videoId, userId) => {
    return db.prepare("DELETE FROM user_videos WHERE id = ? AND user_id = ?").run(videoId, userId);
  },
};

// Featured videos operations
// Audio generation operations
export const audioDb = {
  recordGeneration: (userId, durationMinutes, creditsUsed, narrationText, voiceId, language) => {
    return db
      .prepare(
        "INSERT INTO audio_generations (user_id, duration_minutes, credits_used, narration_text, voice_id, language) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(userId, durationMinutes, creditsUsed, narrationText || null, voiceId || null, language || null);
  },

  getUserAudioUsage: (userId, startDate, endDate) => {
    let query = "SELECT * FROM audio_generations WHERE user_id = ?";
    const params = [userId];
    
    if (startDate) {
      query += " AND created_at >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND created_at <= ?";
      params.push(endDate);
    }
    
    query += " ORDER BY created_at DESC";
    return db.prepare(query).all(...params);
  },

  getUserTotalAudioMinutes: (userId) => {
    const result = db
      .prepare("SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes FROM audio_generations WHERE user_id = ?")
      .get(userId);
    return result.total_minutes || 0;
  },

  getUserTotalAudioCredits: (userId) => {
    const result = db
      .prepare("SELECT COALESCE(SUM(credits_used), 0) as total_credits FROM audio_generations WHERE user_id = ?")
      .get(userId);
    return result.total_credits || 0;
  },
};

export const featuredVideoDb = {
  create: (title, videoUrl, thumbnailUrl, description, orderIndex, createdBy) => {
    // Explicitly set is_active to 1 so the video appears on the homepage
    const result = db
      .prepare(
        "INSERT INTO featured_videos (title, video_url, thumbnail_url, description, order_index, created_by, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)"
      )
      .run(title, videoUrl, thumbnailUrl, description, orderIndex || 0, createdBy);
    return result.lastInsertRowid;
  },

  findAll: (limit = 100) => {
    return db
      .prepare("SELECT * FROM featured_videos WHERE is_active = 1 ORDER BY order_index ASC, created_at DESC LIMIT ?")
      .all(limit);
  },

  findAllAdmin: (limit = 100) => {
    return db
      .prepare("SELECT * FROM featured_videos ORDER BY order_index ASC, created_at DESC LIMIT ?")
      .all(limit);
  },

  findById: (id) => {
    return db.prepare("SELECT * FROM featured_videos WHERE id = ?").get(id);
  },

  update: (id, title, videoUrl, thumbnailUrl, description, orderIndex, isActive) => {
    return db
      .prepare(
        "UPDATE featured_videos SET title = ?, video_url = ?, thumbnail_url = ?, description = ?, order_index = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(title, videoUrl, thumbnailUrl, description, orderIndex || 0, isActive ? 1 : 0, id);
  },

  delete: (id) => {
    return db.prepare("DELETE FROM featured_videos WHERE id = ?").run(id);
  },
};

export default db;




















