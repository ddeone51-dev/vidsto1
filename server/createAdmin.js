import dotenv from "dotenv";
dotenv.config({ override: true, path: ".env" });

import { userDb } from "./db.js";

// Create an admin user
// Usage: node server/createAdmin.js <email> <password> <name>
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log("Usage: node server/createAdmin.js <email> <password> [name]");
  process.exit(1);
}

const [email, password, name] = args;

try {
  // Check if user already exists
  const existingUser = userDb.findByEmail(email);
  if (existingUser) {
    // Update to admin
    userDb.updateRole(existingUser.id, "admin");
    console.log(`User ${email} is now an admin`);
  } else {
    // Create new admin user
    const userId = userDb.create(email, password, name || "Admin");
    userDb.updateRole(userId, "admin");
    console.log(`Admin user created: ${email}`);
  }
} catch (error) {
  console.error("Error creating admin:", error);
  process.exit(1);
}



















