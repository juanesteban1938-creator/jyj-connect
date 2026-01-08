'use server';

import 'dotenv/config';
import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (smtpHost && smtpPort && smtpUser && smtpPass) {
  console.log('Conexión SMTP lista');
}

export const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: Number(smtpPort),
  secure: true, // true for 465, false for other ports
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});
