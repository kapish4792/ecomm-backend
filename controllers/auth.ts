import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dbPool from '../config/db.ts';
import { generateAccessToken, generateRefreshToken, refreshCookieOptions } from '../utils/auth.ts';

// User registration
export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  try {
    const existing = await dbPool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await dbPool.query(
      "INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id,name,email",
      [name, email, hashedPassword]
    );

    const userId = newUser.rows[0].id;

    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);

    await dbPool.query(
      "INSERT INTO refresh_tokens (user_id, token) VALUES ($1,$2)",
      [userId, refreshToken]
    );

    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return res.status(201).json({
      accessToken,
      user: newUser.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// User login
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const user = await dbPool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const userId = user.rows[0].id;

    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);

    await dbPool.query(
      "INSERT INTO refresh_tokens (user_id, token) VALUES ($1,$2)",
      [userId, refreshToken]
    );

    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return res.json({
      accessToken,
      user: {
        id: userId,
        name: user.rows[0].name,
        email: user.rows[0].email,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const changePassword = async (req: any, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.userId;

  try {
    const user = await dbPool.query(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(
      oldPassword,
      user.rows[0].password
    );

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await dbPool.query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hashedPassword, userId]
    );

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Refresh token
export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_SECRET as string
    ) as { userId: number };

    const stored = await dbPool.query(
      "SELECT * FROM refresh_tokens WHERE token = $1",
      [refreshToken]
    );

    if (stored.rows.length === 0) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(decoded.userId);

    return res.json({
      accessToken: newAccessToken,
    });
  } catch (err) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }
};

// Get current user
export const getMe = async (req: any, res: Response) => {
  const user = await dbPool.query(
    "SELECT id,name,email FROM users WHERE id = $1",
    [req.user.userId]
  );

  return res.json(user.rows[0]);
};

// User logout
export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  await dbPool.query(
    "DELETE FROM refresh_tokens WHERE token = $1",
    [refreshToken]
  );

  res.clearCookie("refreshToken");

  return res.json({ message: "Logged out" });
};
