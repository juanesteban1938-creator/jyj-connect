'use client';

import 'dotenv/config';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (smtpHost && smtpPort && smtpUser && smtpPass) {
  console.log('Conexión SMTP lista');
}

export const transportOptions = {
  host: smtpHost,
  port: Number(smtpPort),
  secure: true, 
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
};
