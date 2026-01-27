import { onCall, HttpsError } from "firebase-functions/v2/https";
import { Resend } from "resend";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Define secret for secure access
// Run: firebase functions:secrets:set RESEND_API_KEY
const resendApiKey = defineSecret("RESEND_API_KEY");

export const sendWelcomeEmail = onCall({
    secrets: [resendApiKey],
    cors: true // Enable CORS for web app
}, async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado para realizar esta acción.');
    }

    // 2. Validate Data
    const { email, name, password, clubName } = request.data;
    if (!email || !password || !name) {
        throw new HttpsError('invalid-argument', 'Faltan datos requeridos (email, name, password).');
    }

    // 3. Initialize Resend
    const resend = new Resend(resendApiKey.value());

    try {
        const { data, error } = await resend.emails.send({
            from: 'PadelRank <onboarding@resend.dev>', // Use resend.dev for testing until domain is verified
            to: [email],
            subject: '¡Bienvenido a PadelRank Pro!',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #4F46E5;">¡Bienvenido a PadelRank, ${name}!</h1>
                    <p>Tu cuenta para gestionar las competiciones de <strong>${clubName}</strong> ha sido creada exitosamente.</p>
                    
                    <div style="background-color: #F3F4F6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <p style="margin: 0; font-weight: bold;">Tus credenciales de acceso:</p>
                        <ul style="margin-top: 10px;">
                            <li>Email: <strong>${email}</strong></li>
                            <li>Contraseña temporal: <code style="background: #E5E7EB; padding: 2px 5px; border-radius: 4px;">${password}</code></li>
                        </ul>
                    </div>

                    <p>Accede a tu panel de control aquí:</p>
                    <a href="https://padelrank-pro.web.app/admin" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ir al Panel de Admin</a>
                    
                    <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                        Por favor, cambia tu contraseña inmediatamente después del primer inicio de sesión por motivos de seguridad.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error("Resend API Error:", error);
            throw new HttpsError('internal', `Error enviando email: ${error.message}`);
        }

        return { success: true, data };
    } catch (e: any) {
        console.error("Email send failed:", e);
        throw new HttpsError('internal', e.message);
    }
});

export const sendActivationEmail = onCall({
    secrets: [resendApiKey],
    cors: true // Enable CORS for web app
}, async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado para realizar esta acción.');
    }

    // 2. Validate Data
    const { email, name, clubName } = request.data;
    if (!email || !name) {
        throw new HttpsError('invalid-argument', 'Faltan datos requeridos (email, name).');
    }

    try {
        // 3. Generate Password Reset Link using Firebase Admin
        const resetLink = await admin.auth().generatePasswordResetLink(email, {
            url: 'https://padelrank-pro.web.app/', // Redirect after password reset
        });

        // 4. Send Activation Email via Resend
        const resend = new Resend(resendApiKey.value());

        const { data, error } = await resend.emails.send({
            from: 'PadelRank <onboarding@resend.dev>',
            to: [email],
            subject: '🎾 Activa tu cuenta de PadelRank Pro',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #4F46E5;">¡Bienvenido a PadelRank, ${name}!</h1>
                    <p>Tu cuenta para gestionar las competiciones de <strong>${clubName || 'tu club'}</strong> ha sido creada.</p>
                    
                    <div style="background-color: #F3F4F6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <p style="margin: 0; font-weight: bold;">Para empezar, activa tu cuenta:</p>
                        <p style="margin-top: 10px;">Haz clic en el botón de abajo para crear tu contraseña y acceder a tu panel de control.</p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                            Activar mi cuenta
                        </a>
                    </div>
                    
                    <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                        Este enlace es válido por 1 hora. Si no solicitaste esta cuenta, puedes ignorar este correo.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
                    
                    <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
                        PadelRank Pro - Sistema de Gestión de Torneos de Pádel
                    </p>
                </div>
            `
        });

        if (error) {
            console.error("Resend API Error:", error);
            throw new HttpsError('internal', `Error enviando email: ${error.message}`);
        }

        return { success: true, data };
    } catch (e: any) {
        console.error("Activation email failed:", e);
        throw new HttpsError('internal', e.message);
    }
});

export const deleteUser = onCall({ cors: true }, async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado para realizar esta acción.');
    }

    // 2. Validate Data
    const { userId } = request.data;
    if (!userId) {
        throw new HttpsError('invalid-argument', 'Falta el ID del usuario.');
    }

    try {
        // 3. Delete from Firestore
        await admin.firestore().collection('users').doc(userId).delete();

        // 4. Delete from Firebase Auth
        await admin.auth().deleteUser(userId);

        return { success: true, message: 'Usuario eliminado correctamente de Auth y Firestore' };
    } catch (e: any) {
        console.error("Delete user failed:", e);
        throw new HttpsError('internal', e.message);
    }
});
