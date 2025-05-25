import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // Only for Mailtrap
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false
    }
});

export function generateConfirmationToken() {
    return uuidv4();
}

export async function sendConfirmationEmail(email, token) {
    const confirmationLink= `${process.env.BASE_URL}/auth/confirm?token=${token}`;

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: "Confirm Your Accont",
            html: `
                <h1>Welcome to Baydock Leather Store!</h1>
                <p>Please click the link below to confirm your email address:</p>
                <a href="${confirmationLink}">Confirm Email</a>
                <p>This link will expire in 10 minutes.<p>
            `,
        });
    } catch(err) {
        console.error('DEBUG - Full Mailtrap error:', err);
        throw new Error("Failed to send confirmation email");
    }
}

