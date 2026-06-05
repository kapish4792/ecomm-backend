import { z } from 'zod';
import { ErrorMessage } from '../utils/errorMessages.ts';

export const RegisterSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, ErrorMessage.NAME_REQUIRED),
    email: z.string().trim().email(ErrorMessage.EMAIL_INVALID),
    password: z.string().min(8, ErrorMessage.PASSWORD_MIN_LENGTH),
    phone: z.string().min(10, ErrorMessage.PHONE_REQUIRED).length(10, "Mobile number must be exactly 10 digits").regex(/^[6-9]\d{9}$/, "Invalid Mobile number"),
  }),
});

export const LoginSchema = z.object({
  body: z.object({
    email: z.string().trim().email(ErrorMessage.EMAIL_INVALID),
    password: z.string().min(1, ErrorMessage.PASSWORD_REQUIRED),
  }),
});

export const ChangePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, ErrorMessage.OLD_PASSWORD_REQUIRED),
    newPassword: z.string().min(6, ErrorMessage.NEW_PASSWORD_MIN_LENGTH),
  }),
});

export const ForgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email(ErrorMessage.EMAIL_INVALID),
  }),
});

export const ResetPasswordSchema = z.object({
  query: z.object({
    token: z.string({ message: ErrorMessage.RESET_TOKEN_REQUIRED }).min(1, ErrorMessage.RESET_TOKEN_REQUIRED),
  }),
  body: z.object({
    password: z.string().min(6, ErrorMessage.PASSWORD_MIN_LENGTH),
  }),
});
