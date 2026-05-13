"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.sendActivationEmail = exports.sendWelcomeEmail = exports.migrateMatchesToSubcollection = void 0;
const https_1 = require("firebase-functions/v2/https");
const resend_1 = require("resend");
const params_1 = require("firebase-functions/params");
const admin = require("firebase-admin");
// Initialize Firebase Admin
admin.initializeApp();
/**
 * PHASE 3 MIGRATION: Move matches from the root Ranking document into a subcollection.
 */
exports.migrateMatchesToSubcollection = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b, _c;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    const db = admin.firestore();
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'superadmin') {
        throw new https_1.HttpsError('permission-denied', 'Only superadmins can run migrations.');
    }
    const dryRun = (_c = (_b = request.data) === null || _b === void 0 ? void 0 : _b.dryRun) !== null && _c !== void 0 ? _c : true;
    const rankingsSnapshot = await db.collection('rankings').get();
    const result = { total: rankingsSnapshot.size, migrated: 0, skipped: 0, errors: [] };
    for (const rankingDoc of rankingsSnapshot.docs) {
        const rankingId = rankingDoc.id;
        const data = rankingDoc.data();
        const divisions = data.divisions || [];
        // Check if already migrated
        const existingMatchesSnap = await db.collection('rankings').doc(rankingId).collection('matches').limit(1).get();
        const allDivisionsEmpty = divisions.every(d => !d.matches || d.matches.length === 0);
        if (allDivisionsEmpty && !existingMatchesSnap.empty) {
            result.skipped++;
            continue;
        }
        let totalMatchesInDoc = 0;
        divisions.forEach(d => { totalMatchesInDoc += (d.matches || []).length; });
        if (totalMatchesInDoc === 0) {
            result.skipped++;
            continue;
        }
        if (!dryRun) {
            try {
                const batch = db.batch();
                const newDivisions = divisions.map((division) => {
                    const matches = division.matches || [];
                    matches.forEach((match) => {
                        const matchRef = db.collection('rankings').doc(rankingId).collection('matches').doc(match.id);
                        batch.set(matchRef, Object.assign(Object.assign({}, match), { divisionId: division.id, rankingId: rankingId, _migrated: true }));
                    });
                    return Object.assign(Object.assign({}, division), { matches: [] });
                });
                await batch.commit();
                await db.collection('rankings').doc(rankingId).update({
                    divisions: newDivisions,
                    _matchesMigrated: true,
                    _matchesMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                result.migrated++;
            }
            catch (err) {
                result.errors.push(`${rankingId}: ${err.message}`);
            }
        }
        else {
            result.migrated++;
        }
    }
    return result;
});
// Define secret for secure access
// Run: firebase functions:secrets:set RESEND_API_KEY
const resendApiKey = (0, params_1.defineSecret)("RESEND_API_KEY");
exports.sendWelcomeEmail = (0, https_1.onCall)({
    secrets: [resendApiKey],
    cors: true // Enable CORS for web app
}, async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes estar autenticado para realizar esta acción.');
    }
    // 2. Validate Data
    const { email, name, password, clubName } = request.data;
    if (!email || !password || !name) {
        throw new https_1.HttpsError('invalid-argument', 'Faltan datos requeridos (email, name, password).');
    }
    // 3. Initialize Resend
    const resend = new resend_1.Resend(resendApiKey.value());
    try {
        const { data, error } = await resend.emails.send({
            from: 'Racket Grid <onboarding@resend.dev>',
            to: [email],
            subject: '¡Bienvenido a Racket Grid!',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #4F46E5;">¡Bienvenido a Racket Grid, ${name}!</h1>
                    <p>Tu cuenta para gestionar las competiciones de <strong>${clubName}</strong> ha sido creada exitosamente.</p>
                    
                    <div style="background-color: #F3F4F6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <p style="margin: 0; font-weight: bold;">Tus credenciales de acceso:</p>
                        <ul style="margin-top: 10px;">
                            <li>Email: <strong>${email}</strong></li>
                            <li>Contraseña temporal: <code style="background: #E5E7EB; padding: 2px 5px; border-radius: 4px;">${password}</code></li>
                        </ul>
                    </div>

                    <p>Accede a tu panel de control aquí:</p>
                    <a href="https://www.racketgrid.com/admin" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ir al Panel de Admin</a>
                    
                    <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                        Por favor, cambia tu contraseña inmediatamente después del primer inicio de sesión por motivos de seguridad.
                    </p>
                </div>
            `
        });
        if (error) {
            console.error("Resend API Error:", error);
            throw new https_1.HttpsError('internal', `Error enviando email: ${error.message}`);
        }
        return { success: true, data };
    }
    catch (e) {
        console.error("Email send failed:", e);
        throw new https_1.HttpsError('internal', e.message);
    }
});
exports.sendActivationEmail = (0, https_1.onCall)({
    secrets: [resendApiKey],
    cors: true // Enable CORS for web app
}, async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes estar autenticado para realizar esta acción.');
    }
    // 2. Validate Data
    const { email, name, clubName } = request.data;
    if (!email || !name) {
        throw new https_1.HttpsError('invalid-argument', 'Faltan datos requeridos (email, name).');
    }
    try {
        // 3. Generate Password Reset Link using Firebase Admin
        const resetLink = await admin.auth().generatePasswordResetLink(email, {
            url: 'https://www.racketgrid.com/', // Redirect after password reset
        });
        // 4. Send Activation Email via Resend
        const resend = new resend_1.Resend(resendApiKey.value());
        const { data, error } = await resend.emails.send({
            from: 'Racket Grid <onboarding@resend.dev>',
            to: [email],
            subject: '🎾 Activa tu cuenta de Racket Grid',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #4F46E5;">¡Bienvenido a Racket Grid, ${name}!</h1>
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
                        Racket Grid - Sistema de Gestión de Torneos
                    </p>
                </div>
            `
        });
        if (error) {
            console.error("Resend API Error:", error);
            throw new https_1.HttpsError('internal', `Error enviando email: ${error.message}`);
        }
        return { success: true, data };
    }
    catch (e) {
        console.error("Activation email failed:", e);
        throw new https_1.HttpsError('internal', e.message);
    }
});
exports.deleteUser = (0, https_1.onCall)({ cors: true }, async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes estar autenticado para realizar esta acción.');
    }
    // 2. Validate Data
    const { userId } = request.data;
    if (!userId) {
        throw new https_1.HttpsError('invalid-argument', 'Falta el ID del usuario.');
    }
    try {
        // 3. Delete from Firestore
        await admin.firestore().collection('users').doc(userId).delete();
        // 4. Delete from Firebase Auth
        await admin.auth().deleteUser(userId);
        return { success: true, message: 'Usuario eliminado correctamente de Auth y Firestore' };
    }
    catch (e) {
        console.error("Delete user failed:", e);
        throw new https_1.HttpsError('internal', e.message);
    }
});
// Export Stripe Functions
__exportStar(require("./stripe"), exports);
//# sourceMappingURL=index.js.map