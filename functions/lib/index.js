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
exports.onRegistrationStatusChange = exports.mirrorRegistrationStatus = exports.sendSupportReply = exports.onFeedbackCreated = exports.deleteUser = exports.inviteStaff = exports.sendActivationEmail = exports.sendWelcomeEmail = exports.migrateMatchesToSubcollection = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
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
    // Club TVs sign in anonymously; they must never send emails
    if (request.auth.token.firebase.sign_in_provider === 'anonymous') {
        throw new https_1.HttpsError('permission-denied', 'Esta acción necesita una cuenta.');
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
    // Club TVs sign in anonymously; they must never send emails
    if (request.auth.token.firebase.sign_in_provider === 'anonymous') {
        throw new https_1.HttpsError('permission-denied', 'Esta acción necesita una cuenta.');
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
exports.inviteStaff = (0, https_1.onCall)({
    secrets: [resendApiKey],
    cors: true
}, async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes estar autenticado para invitar personal.');
    }
    // 2. Authorization Check (Only admins can invite staff)
    const db = admin.firestore();
    const adminDoc = await db.collection('users').doc(request.auth.uid).get();
    const adminData = adminDoc.data();
    if ((adminData === null || adminData === void 0 ? void 0 : adminData.role) !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo los administradores del club pueden invitar personal.');
    }
    // 3. Validate Data
    const { email, name } = request.data;
    if (!email || !name) {
        throw new https_1.HttpsError('invalid-argument', 'Faltan datos requeridos (email, name).');
    }
    try {
        // 4. Create Activation Link
        // We use the standard password reset link but we'll create the user doc first with 'staff' role
        // Check if user already exists
        try {
            await admin.auth().getUserByEmail(email);
            throw new https_1.HttpsError('already-exists', 'Este usuario ya está registrado en la plataforma.');
        }
        catch (e) {
            if (e.code === 'already-exists')
                throw e;
            // User does not exist in Auth, continue
        }
        // Create the user in Auth (without password)
        const newUserAuth = await admin.auth().createUser({
            email,
            displayName: name,
        });
        // Create the user in Firestore with 'staff' role and linked to the admin
        await db.collection('users').doc(newUserAuth.uid).set({
            id: newUserAuth.uid,
            email,
            name,
            role: 'staff',
            parentAdminId: request.auth.uid,
            clubName: adminData.clubName,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const resetLink = await admin.auth().generatePasswordResetLink(email, {
            url: 'https://www.racketgrid.com/', // Redirect after activation
        });
        // 5. Send Invitation Email
        const resend = new resend_1.Resend(resendApiKey.value());
        await resend.emails.send({
            from: 'Racket Grid <onboarding@resend.dev>',
            to: [email],
            subject: `🎾 Invitación de ${adminData.clubName} para gestionar torneos`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #4F46E5;">¡Hola, ${name}!</h1>
                    <p><strong>${adminData.name}</strong> te ha invitado a formar parte del equipo de gestión de <strong>${adminData.clubName}</strong> en Racket Grid.</p>
                    
                    <div style="background-color: #F3F4F6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <p style="margin: 0; font-weight: bold;">¿Qué puedes hacer como Staff?</p>
                        <ul style="margin-top: 10px;">
                            <li>Crear y gestionar torneos.</li>
                            <li>Gestionar la base de datos de jugadores.</li>
                            <li>Actualizar resultados y horarios.</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                            Aceptar Invitación y Crear Contraseña
                        </a>
                    </div>
                    
                    <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                        Si no esperabas esta invitación, puedes ignorar este correo.
                    </p>
                </div>
            `
        });
        return { success: true };
    }
    catch (e) {
        console.error("Staff invitation failed:", e);
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
exports.onFeedbackCreated = (0, firestore_1.onDocumentCreated)({
    document: "feedback/{feedbackId}",
    secrets: [resendApiKey]
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    const resend = new resend_1.Resend(resendApiKey.value());
    const superAdminEmail = "andresfb8@gmail.com";
    try {
        await resend.emails.send({
            from: 'RacketGrid Support <onboarding@resend.dev>',
            to: superAdminEmail,
            subject: `🚀 Nuevo Feedback: ${data.userName} (${data.clubName})`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #4f46e5;">Nuevo Mensaje de Feedback</h2>
                    <p><strong>Usuario:</strong> ${data.userName}</p>
                    <p><strong>Email:</strong> ${data.userEmail}</p>
                    <p><strong>Club:</strong> ${data.clubName}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="background: #f9fafb; padding: 15px; border-radius: 8px; font-style: italic;">
                        "${data.message}"
                    </p>
                    <a href="https://app.racketgrid.com/admin" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px;">
                        Ver en el Dashboard
                    </a>
                </div>
            `
        });
        console.log("Feedback notification email sent to", superAdminEmail);
    }
    catch (error) {
        console.error("Error sending feedback notification:", error);
    }
});
exports.sendSupportReply = (0, https_1.onCall)({
    cors: true,
    secrets: [resendApiKey],
}, async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    const db = admin.firestore();
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'superadmin') {
        throw new https_1.HttpsError('permission-denied', 'Only superadmins can reply to support messages.');
    }
    const { feedbackId, userEmail, userName, originalMessage, replyText } = request.data;
    if (!feedbackId || !userEmail || !replyText) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields.');
    }
    const resend = new resend_1.Resend(resendApiKey.value());
    try {
        await resend.emails.send({
            from: 'RacketGrid Soporte <onboarding@resend.dev>',
            to: userEmail,
            subject: 'Respuesta a tu mensaje de soporte - RacketGrid',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
                    <h2 style="color: #4f46e5;">Hola, ${userName}!</h2>
                    <p>Hemos respondido a tu mensaje de soporte:</p>
                    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #e5e7eb; margin: 16px 0;">
                        <p style="font-style: italic; color: #6b7280; font-size: 14px;">"${originalMessage}"</p>
                    </div>
                    <p><strong>Nuestra respuesta:</strong></p>
                    <div style="background: #eef2ff; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5; margin: 16px 0;">
                        <p style="color: #1e1b4b;">${replyText}</p>
                    </div>
                    <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">Si tienes más preguntas, no dudes en volver a contactarnos desde la aplicación.</p>
                    <p style="color: #6b7280; font-size: 13px;">— Equipo RacketGrid</p>
                </div>
            `
        });
        await db.collection('feedback').doc(feedbackId).update({
            status: 'resolved',
            reply: replyText,
            repliedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (error) {
        console.error("Error sending support reply:", error);
        throw new https_1.HttpsError('internal', error.message);
    }
});
// Export Stripe Functions
__exportStar(require("./stripe"), exports);
// ─────────────────────────────────────────────────────────────────────────────
// Tournament registrations: public status mirror + status-change emails
// ─────────────────────────────────────────────────────────────────────────────
/** Public doc: only the status of the registration, keyed by the player's tracking code. No personal data. */
const publicStatusData = (reg) => {
    var _a, _b;
    return ({
        rankingId: (_a = reg === null || reg === void 0 ? void 0 : reg.rankingId) !== null && _a !== void 0 ? _a : null,
        status: (_b = reg === null || reg === void 0 ? void 0 : reg.status) !== null && _b !== void 0 ? _b : 'pending',
        category: (reg === null || reg === void 0 ? void 0 : reg.assignedCategory) || (reg === null || reg === void 0 ? void 0 : reg.selectedCategory) || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
};
const localizadorOf = (regId, reg) => ((reg === null || reg === void 0 ? void 0 : reg.localizador) || regId.substring(0, 8)).toUpperCase();
exports.mirrorRegistrationStatus = (0, firestore_1.onDocumentCreated)('rankings/{rankingId}/registrations/{regId}', async (event) => {
    var _a;
    const reg = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!reg)
        return;
    const db = admin.firestore();
    await db.collection('registrationStatus').doc(localizadorOf(event.params.regId, reg)).set(publicStatusData(reg));
});
exports.onRegistrationStatusChange = (0, firestore_1.onDocumentUpdated)({
    document: 'rankings/{rankingId}/registrations/{regId}',
    secrets: [resendApiKey],
}, async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    const statusChanged = before.status !== after.status;
    const paymentChanged = before.paymentStatus !== after.paymentStatus;
    if (!statusChanged && !paymentChanged)
        return;
    if (before.updatedAt && after.updatedAt && before.updatedAt === after.updatedAt && !statusChanged && !paymentChanged)
        return;
    const db = admin.firestore();
    const regId = event.params.regId;
    const rankingId = event.params.rankingId;
    // 1. Update the public status mirror (the player's consultation page reads this collection)
    const code = localizadorOf(regId, after);
    try {
        await db.collection('registrationStatus').doc(code).set(publicStatusData(after), { merge: true });
    }
    catch (e) {
        console.error('Failed to update public status mirror:', e);
    }
    // 2. Only email when the player left an email address
    const emails = [(_c = after.player1) === null || _c === void 0 ? void 0 : _c.email, (_d = after.player2) === null || _d === void 0 ? void 0 : _d.email]
        .filter((e) => typeof e === 'string' && e.includes('@'));
    if (emails.length === 0)
        return;
    const rankName = ((_e = (await db.collection('rankings').doc(rankingId).get()).data()) === null || _e === void 0 ? void 0 : _e.nombre) || 'un torneo';
    const pairName = after.player2 ? `${(_f = after.player1) === null || _f === void 0 ? void 0 : _f.name} y ${after.player2.name}` : ((_h = (_g = after.player1) === null || _g === void 0 ? void 0 : _g.name) !== null && _h !== void 0 ? _h : '');
    const cat = assignedOrSelected(after);
    const resend = new resend_1.Resend(resendApiKey.value());
    if (statusChanged) {
        const texts = {
            approved: {
                subject: `✅ Inscripción APROBADA - ${rankName}`,
                body: `<p>¡Enhorabuena! La inscripción de <strong>${pairName}</strong> ha sido <strong style="color:#059669;">APROBADA</strong>.</p>
                       <p>Torneo: <strong>${rankName}</strong><br>Categoría: <strong>${cat || '-'}</strong><br>Localizador: <strong>#${code}</strong></p>
                       <p>El club os contactará con los horarios y el pago. ¡Nos vemos en la pista!</p>`,
            },
            waitlist: {
                subject: `📋 Lista de espera - ${rankName}`,
                body: `<p>La inscripción de <strong>${pairName}</strong> está ahora en <strong>lista de espera</strong>.</p>
                       <p>Torneo: <strong>${rankName}</strong><br>Categoría: <strong>${cat || '-'}</strong><br>Localizador: <strong>#${code}</strong></p>
                       <p>Si se libera un hueco, el club os avisará.</p>`,
            },
            rejected: {
                subject: `Inscripción no admitida - ${rankName}`,
                body: `<p>Lamentamos comunicaros que la inscripción de <strong>${pairName}</strong> no ha sido admitida en esta edición.</p>
                       <p>Torneo: <strong>${rankName}</strong><br>Categoría: <strong>${cat || '-'}</strong><br>Localizador: <strong>#${code}</strong></p>
                       <p>Esperamos veros en las próximas ediciones. ¡Gracias por inscribiros!</p>`,
            },
            pending: {
                subject: `Inscripción pendiente de revisión - ${rankName}`,
                body: `<p>Hemos vuelto la inscripción de <strong>${pairName}</strong> a estado <strong>pendiente de revisión</strong>.</p>
                       <p>Torneo: <strong>${rankName}</strong><br>Categoría: <strong>${cat || '-'}</strong><br>Localizador: <strong>#${code}</strong></p>`,
            },
        };
        const t = texts[after.status];
        if (!t)
            return;
        try {
            for (const email of Array.from(new Set(emails))) {
                await resend.emails.send({
                    from: 'RacketGrid <onboarding@resend.dev>',
                    to: [email],
                    subject: t.subject,
                    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">${t.body}</div>`,
                });
            }
        }
        catch (e) {
            console.error('Failed to send status email:', e);
        }
        return;
    }
    if (paymentChanged && after.paymentStatus === 'paid') {
        try {
            for (const email of Array.from(new Set(emails))) {
                await resend.emails.send({
                    from: 'RacketGrid <onboarding@resend.dev>',
                    to: [email],
                    subject: `💳 Pago confirmado - ${rankName}`,
                    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                            <p>El pago de la inscripción de <strong>${pairName}</strong> ha sido <strong style="color:#059669;">CONFIRMADO</strong>.</p>
                            <p>Torneo: <strong>${rankName}</strong><br>Categoría: <strong>${cat || '-'}</strong><br>Localizador: <strong>#${code}</strong></p>
                        </div>`,
                });
            }
        }
        catch (e) {
            console.error('Failed to send payment email:', e);
        }
    }
});
const assignedOrSelected = (reg) => (reg === null || reg === void 0 ? void 0 : reg.assignedCategory) || (reg === null || reg === void 0 ? void 0 : reg.selectedCategory) || '';
//# sourceMappingURL=index.js.map