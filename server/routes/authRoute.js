import express from "express";
import { db } from "../server.js";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';

const router = express.Router();
import { JWT_SECRET } from '../config.js';

// ... Login ...
router.post("/", (req, res) => {
  const { user, password } = req.body;

  if (!user || !password) {
    return res.status(400).json({
      success: false,
      message: "username and password are required*",
    });
  }

  // Updated SQL to include MULTI_DEPT field
  const sql = "SELECT * FROM `user0000inv` WHERE user = ?";

  db.query(sql, [user], async (err, results) => {
    if (err) {
      console.error("❌ Database query error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    if (!results.length) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const dbUser = results[0];

    // 1) Try bcrypt compare first (hashed passwords)
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, dbUser.password);
    } catch (e) {
      isMatch = false;
    }

    // 2) If bcrypt fails, fallback to plain-text check
    if (!isMatch && password === dbUser.password) {
      isMatch = true;

      // Auto-upgrade to bcrypt hash
      const newHash = await bcrypt.hash(password, 10);
      db.query(
        "UPDATE `user0000inv` SET password = ? WHERE user = ?",
        [newHash, user],
        (updateErr) => {
          if (updateErr) {
            console.error("⚠️ Failed to upgrade password hash:", updateErr);
          }
        }
      );
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // Process MULTI_DEPT field
    let departments = [];
    if (dbUser.MULTI_DEPT) {
      // Split by pipe and trim whitespace
      departments = dbUser.MULTI_DEPT.split('|')
        .map(dept => dept.trim())
        .filter(dept => dept.length > 0);
    }

    // 3) Generate JWT with department information
    const token = jwt.sign(
      {
        user: dbUser.user,
        Admin: dbUser.Admin === 1,
        departments: departments, // Include departments in JWT
        multiDept: dbUser.MULTI_DEPT || null // Original MULTI_DEPT string
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Send response with department information
    res.json({
      success: true,
      message: "Login successful",
      user: dbUser.user,
      Admin: dbUser.Admin === 1,
      departments: departments, // Array of departments
      multiDept: dbUser.MULTI_DEPT || null, // Original string
      token,
    });
  });
});

// Get user departments (useful for frontend to refresh permissions)
router.get("/user-departments/:username", (req, res) => {
  const { username } = req.params;
  const authHeader = req.headers.authorization;
  
  // Basic token verification (optional but recommended)
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      // Ensure user is requesting their own data or is admin
      if (decoded.user !== username && !decoded.Admin) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to access this user's departments"
        });
      }
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }
  }

  const sql = "SELECT MULTI_DEPT, Admin FROM `user0000inv` WHERE user = ?";
  
  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error("❌ Error fetching user departments:", err);
      return res.status(500).json({
        success: false,
        message: "Database error"
      });
    }

    if (!results.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const userData = results[0];
    let departments = [];
    
    if (userData.MULTI_DEPT) {
      departments = userData.MULTI_DEPT.split('|')
        .map(dept => dept.trim())
        .filter(dept => dept.length > 0);
    }

    res.json({
      success: true,
      username: username,
      isAdmin: userData.Admin === 1,
      departments: departments,
      multiDept: userData.MULTI_DEPT || null
    });
  });
});

// Health check
router.get("/health", (req, res) => {
  db.query("SELECT 1 as test", (err, results) => {
    if (err) {
      console.error("❌ Database health check failed:", err);
      return res.status(500).json({
        status: "error",
        message: "Database connection failed",
        error: err.message,
      });
    }
    res.json({
      status: "ok",
      message: "Database connection successful",
      result: results[0],
    });
  });
});

// Test table (temporary)
router.get("/test-table", (req, res) => {
  db.query("SHOW TABLES LIKE 'user0000inv'", (err, results) => {
    if (err) {
      console.error("Table check error:", err);
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.json({ message: "Table 'user0000inv' does not exist" });
    }

    // Also check the structure
    db.query("DESCRIBE `user0000inv`", (descErr, descResults) => {  
      if (descErr) {
        return res.json({ 
          message: "Table 'user0000inv' exists", 
          results 
        });
      }
      
      res.json({ 
        message: "Table 'user0000inv' exists", 
        structure: descResults,
        hasMultiDept: descResults.some(col => col.Field === 'MULTI_DEPT')
      });
    });
  });
});

export default router;