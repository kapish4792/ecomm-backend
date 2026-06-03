import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dbPool from '../config/db.ts';
import { generateAccessToken, generateRefreshToken, refreshCookieOptions } from '../utils/auth.ts';
import { sendError, ErrorCode } from '../utils/errors.ts';
import { ErrorMessage } from '../utils/errorMessages.ts';
import crypto from 'crypto';
import sendResetEmail from '../utils/mailer.ts';

// User registration
export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    const existing = await dbPool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return sendError(res, 400, ErrorCode.CONFLICT, ErrorMessage.USER_EXISTS);
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
      success: true,
      accessToken,
      user: newUser.rows[0],
    });
  } catch (err) {
    console.error(err);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.SERVER_ERROR);
  }
};

// User login
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await dbPool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return sendError(res, 400, ErrorCode.BAD_REQUEST, ErrorMessage.INVALID_CREDENTIALS);
    }

    const isMatch = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!isMatch) {
      return sendError(res, 400, ErrorCode.BAD_REQUEST, ErrorMessage.INVALID_CREDENTIALS);
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
      success: true,
      accessToken,
      user: {
        id: userId,
        name: user.rows[0].name,
        email: user.rows[0].email,
      },
    });
  } catch (err) {
    console.error(err);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.SERVER_ERROR);
  }
};

// Change password
export const changePassword = async (req: any, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.userId;

  try {
    const user = await dbPool.query(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );

    if (user.rows.length === 0) {
      return sendError(res, 400, ErrorCode.BAD_REQUEST, ErrorMessage.INVALID_CREDENTIALS);
    }

    const isMatch = await bcrypt.compare(
      oldPassword,
      user.rows[0].password
    );

    if (!isMatch) {
      return sendError(res, 400, ErrorCode.BAD_REQUEST, ErrorMessage.INVALID_CREDENTIALS);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await dbPool.query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hashedPassword, userId]
    );

    return res.json({ success: true, message: ErrorMessage.PASSWORD_CHANGED });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.SERVER_ERROR);
  }
};

// Forgot password
export const forgotPassword = async (req: any, res: Response) => {
  const { email } = req.body;

  try {
    // Update query to include 'name'
    const result = await dbPool.query('SELECT id, name FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      // Security: Return same message even if email doesn't exist
      return res.status(200).json({ success: true, message: ErrorMessage.RESET_LINK_SENT_GENERIC });
    }

    // Access the first row of the result
    const user = result.rows[0];

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000);

    await dbPool.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
      [hashedToken, expires, email]
    );

    // Now user.name will work
    await sendResetEmail(email, user.name, resetToken);

    return res.status(200).json({ success: true, message: ErrorMessage.RESET_LINK_SENT });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.SERVER_ERROR);
  }
};

// Reset password
export const resetPassword = async (req: any, res: Response) => {
  const { token } = req.query;
  const { password } = req.body;

  try {
    // 1. Hash the token from the URL to match what's in the DB
    const hashedToken = crypto.createHash('sha256').update(token as string).digest('hex');

    // 2. Check DB for matching hashed token and valid expiry
    const userResult = await dbPool.query(
      'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [hashedToken]
    );

    if (userResult.rows.length === 0) {
      return sendError(res, 400, ErrorCode.BAD_REQUEST, ErrorMessage.TOKEN_INVALID_OR_EXPIRED);
    }

    // 3. Hash the new password and Update
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(password, salt);

    // 4. Update password and NULL out the token fields (One-time use)
    await dbPool.query(
      'UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
      [newHashedPassword, userResult.rows[0].id]
    );

    return res.status(200).json({ success: true, message: ErrorMessage.PASSWORD_UPDATED });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.SERVER_ERROR);
  }
};

// Refresh token
export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return sendError(res, 401, ErrorCode.UNAUTHORIZED, ErrorMessage.NO_REFRESH_TOKEN);
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
      return sendError(res, 403, ErrorCode.FORBIDDEN, ErrorMessage.INVALID_REFRESH_TOKEN);
    }

    const newAccessToken = generateAccessToken(decoded.userId);

    return res.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (err) {
    return sendError(res, 403, ErrorCode.FORBIDDEN, ErrorMessage.INVALID_REFRESH_TOKEN);
  }
};

// Get current user
export const getMe = async (req: any, res: Response) => {
  try {
    const user = await dbPool.query(
      "SELECT id,name,email FROM users WHERE id = $1",
      [req.user.userId]
    );

    if (user.rows.length === 0) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.USER_NOT_FOUND);
    }

    return res.json({ success: true, user: user.rows[0] });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.SERVER_ERROR);
  }
};

// User logout
export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  try {
    await dbPool.query(
      "DELETE FROM refresh_tokens WHERE token = $1",
      [refreshToken]
    );

    res.clearCookie("refreshToken");

    return res.json({ success: true, message: ErrorMessage.LOGGED_OUT });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.SERVER_ERROR);
  }
};
