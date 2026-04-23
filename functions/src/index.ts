import { onCall, HttpsError } from "firebase-functions/v2/https";
import { Resend } from "resend";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

/**
 * PHASE 3 MIGRATION: Move matches from the root Ranking document into a subcollection.
 */
export const migrateMatchesToSubcollection = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const db = admin.firestore();
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (callerDoc.data()?.role !== 'superadmin') {
        throw new HttpsError('permission-denied', 'Only superadmins can run migrations.');
    }

    const dryRun: boolean = request.data?.dryRun ?? true;
    const rankingsSnapshot = await db.collection('rankings').get();
    const result = { total: rankingsSnapshot.size, migrated: 0, skipped: 0, errors: [] as string[] };

    for (const rankingDoc of rankingsSnapshot.docs) {
        const rankingId = rankingDoc.id;
        const data = rankingDoc.data();
        const divisions: any[] = data.divisions || [];

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
                const newDivisions = divisions.map((division: any) => {
                    const matches: any[] = division.matches || [];
                    matches.forEach((match: any) => {
                        const matchRef = db.collection('rankings').doc(rankingId).collection('matches').doc(match.id);
                        batch.set(matchRef, { ...match, divisionId: division.id, rankingId: rankingId, _migrated: true });
                    });
                    return { ...division, matches: [] };
                });
                await batch.commit();
                await db.collection('rankings').doc(rankingId).update({
                    divisions: newDivisions,
                    _matchesMigrated: true,
                    _matchesMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                result.migrated++;
            } catch (err: any) {
                result.errors.push(`${rankingId}: ${err.message}`);
            }
        } else {
            result.migrated++;
        }
    }
    return result;
});

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
            from: 'Racket Grid <onboarding@resend.dev>', // Use resend.dev for testing until domain is verified
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
            url: 'https://www.racketgrid.com/', // Redirect after password reset
        });

        // 4. Send Activation Email via Resend
        const resend = new Resend(resendApiKey.value());

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
            throw new HttpsError('internal', `Error enviando email: ${error.message}`);
        }

        return { success: true, data };
    } catch (e: any) {
        console.error("Activation email failed:", e);
        throw new HttpsError('internal', e.message);
    }
});

export const inviteStaff = onCall({
    secrets: [resendApiKey],
    cors: true
}, async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado para invitar personal.');
    }

    // 2. Authorization Check (Only admins can invite staff)
    const db = admin.firestore();
    const adminDoc = await db.collection('users').doc(request.auth.uid).get();
    const adminData = adminDoc.data();
    if (adminData?.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Solo los administradores del club pueden invitar personal.');
    }

    // 3. Validate Data
    const { email, name } = request.data;
    if (!email || !name) {
        throw new HttpsError('invalid-argument', 'Faltan datos requeridos (email, name).');
    }

    try {
        // 4. Create Activation Link
        // We use the standard password reset link but we'll create the user doc first with 'staff' role
        
        // Check if user already exists
        try {
            await admin.auth().getUserByEmail(email);
            throw new HttpsError('already-exists', 'Este usuario ya está registrado en la plataforma.');
        } catch (e: any) {
            if (e.code === 'already-exists') throw e;
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
        const resend = new Resend(resendApiKey.value());
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
    } catch (e: any) {
        console.error("Staff invitation failed:", e);
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

export const onFeedbackCreated = onDocumentCreated({
    document: "feedback/{feedbackId}",
    secrets: [resendApiKey]
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const resend = getResend();

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
    } catch (error) {
        console.error("Error sending feedback notification:", error);
    }
});

// Export Stripe Functions
export * from './stripe';

