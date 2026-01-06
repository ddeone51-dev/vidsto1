import jwt from "jsonwebtoken";
import { userDb } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized", message: "No token provided" });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded || !decoded.userId) {
    return res.status(401).json({ error: "Unauthorized", message: "Invalid token" });
  }

  const user = userDb.findById(decoded.userId);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized", message: "User not found" });
  }

  req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
  }
  
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden", message: "Admin access required" });
  }
  
  next();
}




















