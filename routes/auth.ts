import express from 'express';
import { protect } from '../middleware/auth.ts';
import { register, login, refresh, getMe, logout, changePassword, forgotPassword, resetPassword } from '../controllers/auth.ts';
import { forgotPasswordLimiter } from '../utils/auth.ts';

export { generateAccessToken, generateRefreshToken, accessCookieOptions, refreshCookieOptions } from '../utils/auth.ts';

const router = express.Router();

// User registration
router.post("/register", register);

// User login
router.post("/login", login);

// Change password
router.post("/change-password", protect, changePassword);

//Forgot Password 
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

//Reset Password
router.post("/reset-password", resetPassword);

// Refresh token
router.post("/refresh", refresh);

// Get current user
router.get("/me", protect, getMe);


// User logout
router.post("/logout", logout);

export default router;