import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import ejs from 'ejs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
    },
});

const sendResetEmail = async (email: string, userName: string, token: string) => {
    const resetUrl = `${process.env.CLIENT_URL!}/reset-password?token=${token}`;
    const templatePath = path.join(__dirname, '../templates/forgotPassword.ejs');
    const data = {
        name: userName,
        resetUrl: resetUrl
    };

    const html = await ejs.renderFile(templatePath, data);
    const mailOptions = {
        from: `"Support Team" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        html: html,
        replyTo: 'no-reply@yourapp.com'
    };

    return transporter.sendMail(mailOptions);
};

export default sendResetEmail;