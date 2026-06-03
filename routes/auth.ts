import express from 'express';
import { protect } from '../middleware/auth.ts';
import { register, login, refresh, getMe, logout, changePassword, forgotPassword, resetPassword } from '../controllers/auth.controller.ts';
import { forgotPasswordLimiter } from '../utils/auth.ts';
import { validate } from '../middleware/validate.ts';
import {
  RegisterSchema,
  LoginSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '../schemas/auth.schema.ts';

export { generateAccessToken, generateRefreshToken, accessCookieOptions, refreshCookieOptions } from '../utils/auth.ts';

const router = express.Router();

// User registration
router.post("/register", validate(RegisterSchema), register);

// User login
router.post("/login", validate(LoginSchema), login);

// Change password
router.post("/change-password", protect, validate(ChangePasswordSchema), changePassword);

// Forgot Password 
router.post("/forgot-password", forgotPasswordLimiter, validate(ForgotPasswordSchema), forgotPassword);

// Reset Password
router.post("/reset-password", validate(ResetPasswordSchema), resetPassword);

// Refresh token
router.post("/refresh", refresh);

// Get current user
router.get("/me", protect, getMe);

// User logout
router.post("/logout", logout);

export default router;