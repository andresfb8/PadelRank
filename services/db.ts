import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    where,
    limit,
    writeBatch,
    setDoc,
    getDocs,
    getDoc,
    runTransaction
} from "firebase/firestore";
import { db } from "./firebase";
import { Player, Ranking, User } from "../types";

// --- USERS ---

export const subscribeToUsers = (callback: (users: User[]) => void) => {
    const q = query(collection(db, "users"));
    return onSnapshot(q, (snapshot) => {
        const usersList: User[] = [];
        snapshot.forEach((doc) => {
            usersList.push({ id: doc.id, ...doc.data() } as User);
        });
        callback(usersList);
    }, (error) => {
        // Silent failure if permission denied (normal for non-superadmins now)
        console.warn("Could not subscribe to users list (likely permission denied implies not superadmin):", error.message);
    });
};

export const subscribeToUserProfile = (userId: string, callback: (user: User | null) => void) => {
    return onSnapshot(doc(db, "users", userId), (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as User);
        } else {
            callback(null);
        }
    });
};



export const addUser = async (user: Omit<User, "id">) => {
    return await addDoc(collection(db, "users"), user);
};

export const updateUser = async (user: Partial<User> & { id: string }) => {
    const { id, ...data } = user;
    const userRef = doc(db, "users", id);
    return await updateDoc(userRef, data);
};

export const deleteUser = async (id: string) => {
    return await deleteDoc(doc(db, "users", id));
};

export const logActivity = async (userId: string, content: string, author: string = 'SISTEMA') => {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data() as User;
    const note = {
        id: Date.now().toString(),
        content,
        author,
        date: new Date().toISOString()
    };

    const internalNotes = [...(userData.internalNotes || []), note];
    return await updateDoc(userRef, { internalNotes });
};

// --- PLAYERS ---

export const subscribeToPlayers = (callback: (players: Record<string, Player>) => void, ownerId?: string) => {
    let q;

    if (ownerId) {
        // Optimized: Only fetch players owned by this user
        // Note: orderBy requires an index if mixed with where(). 
        // If sorting by 'nombre', we need a composite index "ownerId ASC, nombre ASC".
        // Use 'orderBy' only if index exists, otherwise let client sort?
        // Safe bet: Query by ownerId, filter/sort client side if index missing.
        // But user request implies optimizing *fetching*.
        // Let's try simple query first.
        q = query(collection(db, "players"), where("ownerId", "==", ownerId));
    } else {
        // Fallback or Superadmin: Fetch all (careful with scale)
        q = query(collection(db, "players"), orderBy("nombre"));
    }

    return onSnapshot(q, (snapshot) => {
        const playersMap: Record<string, Player> = {};
        snapshot.forEach((doc) => {
            const data = doc.data();
            const player: Player = {
                id: doc.id,
                ...data,
                stats: data.stats || { pj: 0, pg: 0, pp: 0, winrate: 0 }
            } as Player;
            playersMap[doc.id] = player;
        });
        callback(playersMap);
    }, (error) => {
        console.error("Error subscribing to players:", error);
    });
};

export const addPlayer = async (player: Omit<Player, "id">) => {
    return await addDoc(collection(db, "players"), player);
};

export const updatePlayer = async (player: Player) => {
    const { id, ...data } = player;
    const playerRef = doc(db, "players", id);
    return await updateDoc(playerRef, data);
};

export const deletePlayer = async (id: string) => {
    return await deleteDoc(doc(db, "players", id));
};

export const updatePlayerStats = async (playerId: string, won: boolean) => {
    // We need to read the player first to increment stats safely
    // Transaction would be better, but for now standard read-write
    // Note: We use the 'updatePlayer' logic but specifically for stats
    // Ideally we subscribe, but here we just want a one-off update.
    // We can use 'getDoc' here (need to import it if not available, or use a helper)
    // db.ts currently exports 'updatePlayer'.
    // We'll trust the UI to pass the current player object context if possible?
    // No, 'AdminLayout' doesn't necessarily have the latest snapshot of *every* player in a reliable way for atomic updates?
    // Actually, Firestore 'increment' is best.
    // Let's use Firestore 'increment' operator for atomicity.
    const { increment } = await import("firebase/firestore");

    const playerRef = doc(db, "players", playerId);
    await updateDoc(playerRef, {
        "stats.pj": increment(1),
        "stats.pg": increment(won ? 1 : 0),
        "stats.pp": increment(won ? 0 : 1),
        // Winrate needs to be recalculated. Firestore can't calc winrate in DB.
        // We will just update counters. A Cloud Function is best for WinRate, 
        // OR we just accept WinRate might be calculated on read (client side).
        // But `stats` field has `winrate`. We should try to update it.
        // If we only increment, we can't update winrate atomically.
        // For MVP: Just increment counters. Client calculates winrate on display?
        // Existing code expects `stats.winrate` in DB.
        // Let's just do a Read-Modify-Write.
    });

    // Read-Modify-Write for Winrate (Separate Step, slight race condition risk but acceptable for MVP)
    // We can't easily import 'getDoc' if not top-level imported.
    // We can rely on 'App.tsx' to update full object? No, AdminLayout calls this.
    // Let's stick to simple increment for now. Winrate might drift if we don't recalculate.
    // User asked for stats persistence.
    // Let's import getDoc to do it right.
};

// Enhanced updatePlayerStats with GetDoc


export const updatePlayerStatsFull = async (playerId: string, won: boolean) => {
    const playerRef = doc(db, "players", playerId);

    try {
        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(playerRef);
            if (!sfDoc.exists()) {
                throw "Player does not exist!";
            }

            const data = sfDoc.data() as Player;
            // Initialize stats if missing (defensive)
            const stats = data.stats || { pj: 0, pg: 0, pp: 0, winrate: 0 };

            stats.pj += 1;
            if (won) stats.pg += 1;
            else stats.pp += 1;

            // Recalculate winrate safely
            stats.winrate = stats.pj > 0 ? Math.round((stats.pg / stats.pj) * 100) : 0;

            transaction.update(playerRef, { stats });
        });
        console.log("Stats updated successfully via transaction.");
    } catch (e) {
        console.error("Transaction failed: ", e);
    }
};

export const importPlayersBatch = async (players: Omit<Player, "id">[]) => {
    const batch = writeBatch(db);
    players.forEach(p => {
        const ref = doc(collection(db, "players"));
        batch.set(ref, p);
    });
    await batch.commit();
};


// --- RANKINGS (TOURNAMENTS) ---

export const subscribeToRankings = (callback: (rankings: Ranking[]) => void, ownerId?: string) => {
    let q;
    if (ownerId) {
        q = query(collection(db, "rankings"), where("ownerId", "==", ownerId));
    } else {
        q = query(collection(db, "rankings"), orderBy("nombre"));
    }

    return onSnapshot(q, (snapshot) => {
        const rankingsList: Ranking[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as Ranking;
            // Exclude soft-deleted rankings from the main list
            if (!data.deletedAt) {
                rankingsList.push({ id: doc.id, ...data });
            }
        });

        // Sort on client if we couldn't orderBy due to missing composite index
        if (ownerId) {
            rankingsList.sort((a, b) => a.nombre.localeCompare(b.nombre));
        }

        callback(rankingsList);
    }, (error) => {
        console.error("Error subscribing to rankings:", error);
    });
};

export const subscribeToDeletedRankings = (callback: (rankings: Ranking[]) => void, ownerId?: string) => {
    let q;
    if (ownerId) {
        q = query(collection(db, "rankings"), where("ownerId", "==", ownerId));
    } else {
        q = query(collection(db, "rankings"), orderBy("nombre"));
    }

    return onSnapshot(q, (snapshot) => {
        const deleted: Ranking[] = [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        snapshot.forEach((doc) => {
            const data = doc.data() as Ranking;
            if (data.deletedAt) {
                const deletedDate = new Date(data.deletedAt);
                if (deletedDate > thirtyDaysAgo) {
                    deleted.push({ id: doc.id, ...data });
                } else {
                    // Auto-purge after 30 days
                    deleteDoc(doc.ref).catch(() => {});
                }
            }
        });

        deleted.sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
        callback(deleted);
    }, (error) => {
        console.error("Error subscribing to deleted rankings:", error);
    });
};

export const addRanking = async (ranking: Omit<Ranking, "id">) => {
    // Sanitize data to remove undefined values before adding
    const sanitizedData = sanitizeForFirestore(ranking);
    const result = await addDoc(collection(db, "rankings"), sanitizedData);
    
    // Log activity
    if (ranking.ownerId) {
        await logActivity(ranking.ownerId, `Creó el torneo: ${ranking.nombre}`);
    }
    
    return result;
};

// Helper function to remove undefined values from objects (Firestore doesn't accept undefined)
const sanitizeForFirestore = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeForFirestore(item));
    }
    if (typeof obj === 'object') {
        const sanitized: any = {};
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            if (value !== undefined) {
                sanitized[key] = sanitizeForFirestore(value);
            }
        });
        return sanitized;
    }
    return obj;
};

export const updateRanking = async (ranking: Ranking) => {
    const { id, ...data } = ranking;
    const rankingRef = doc(db, "rankings", id);
    // Sanitize data to remove undefined values
    const sanitizedData = sanitizeForFirestore(data);
    return await updateDoc(rankingRef, sanitizedData);
};

/**
 * Phase 3 write: Writes a ranking update while extracting all matches into
 * the `rankings/{rankingId}/matches` subcollection. Keeps `divisions[].matches`
 * as empty arrays in the root document, breaking the 1MB limit problem.
 *
 * UI components continue to receive the full Ranking object (with matches populated)
 * because reads go through `subscribeToRankingWithMatches` which merges them back.
 *
 * Use this instead of `updateRanking` once migration is complete.
 */
export const updateRankingWithMatches = async (ranking: Ranking) => {
    const { id, ...data } = ranking;
    const rankingRef = doc(db, "rankings", id);
    const batch = writeBatch(db);

    // Extract matches into subcollection, clear from root divisions
    const divisionsWithoutMatches = (data.divisions || []).map((division) => {
        const matches = division.matches || [];
        
        // Write each match as its own document in the subcollection
        matches.forEach((match) => {
            const matchRef = doc(collection(db, "rankings", id, "matches"), match.id);
            batch.set(matchRef, sanitizeForFirestore({
                ...match,
                divisionId: division.id,
                rankingId: id,
            }));
        });

        // Return division with empty matches array
        return { ...division, matches: [] };
    });

    // Update root ranking document (no matches embedded)
    const sanitizedData = sanitizeForFirestore({
        ...data,
        divisions: divisionsWithoutMatches,
        _matchesMigrated: true,
    });
    batch.update(rankingRef, sanitizedData);

    return await batch.commit();
};

/**
 * Phase 3 read: Subscribes to a single ranking and its matches subcollection,
 * then merges matches back into `division.matches[]` before calling the callback.
 * The UI receives a complete Ranking object with matches populated as usual.
 */
export const subscribeToRankingWithMatches = (
    rankingId: string,
    callback: (ranking: Ranking | null) => void
) => {
    let currentRanking: Ranking | null = null;
    let currentMatchDocs: any[] = [];

    const mergeAndEmit = () => {
        if (!currentRanking) return callback(null);

        // Group matches by divisionId
        const matchesByDiv: Record<string, any[]> = {};
        currentMatchDocs.forEach((m) => {
            if (!matchesByDiv[m.divisionId]) matchesByDiv[m.divisionId] = [];
            matchesByDiv[m.divisionId].push(m);
        });

        // Merge matches back into divisions
        const mergedDivisions = (currentRanking.divisions || []).map((div) => ({
            ...div,
            matches: matchesByDiv[div.id] || [],
        }));

        callback({ ...currentRanking, divisions: mergedDivisions });
    };

    // Subscribe to the root ranking document
    const unsubRanking = onSnapshot(doc(db, "rankings", rankingId), (snap) => {
        if (snap.exists()) {
            currentRanking = { id: snap.id, ...snap.data() } as Ranking;
        } else {
            currentRanking = null;
        }
        mergeAndEmit();
    }, (error) => console.error("Error subscribing to ranking:", error));

    // Subscribe to the matches subcollection
    const unsubMatches = onSnapshot(
        collection(db, "rankings", rankingId, "matches"),
        (snap) => {
            currentMatchDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            mergeAndEmit();
        },
        (error) => console.error("Error subscribing to matches subcollection:", error)
    );

    return () => {
        unsubRanking();
        unsubMatches();
    };
};


export const softDeleteRanking = async (id: string) => {
    const rankingRef = doc(db, "rankings", id);
    return await updateDoc(rankingRef, { deletedAt: new Date().toISOString() });
};

export const restoreRanking = async (id: string) => {
    const rankingRef = doc(db, "rankings", id);
    const { deleteField } = await import("firebase/firestore");
    return await updateDoc(rankingRef, { deletedAt: deleteField() });
};

export const deleteRanking = async (id: string) => {
    return await deleteDoc(doc(db, "rankings", id));
};

export const duplicateRanking = async (rankingId: string, ownerId: string) => {
    const rankingRef = doc(db, "rankings", rankingId);
    const snap = await getDoc(rankingRef);

    if (!snap.exists()) {
        throw new Error("Tournament not found");
    }

    const data = snap.data() as Ranking;

    // Create copy with safe defaults
    const newRanking: any = {
        ...data,
        nombre: `${data.nombre} (Copia)`,
        ownerId: ownerId,
        // Ensure status allows editing if needed, but keeping original state is usually expected for full clone
        // We'll keep everything as is.
    };

    // Remove ID if it was stored in the doc (it shouldn't be for addDoc, but good practice)
    delete newRanking.id;

    const sanitized = sanitizeForFirestore(newRanking);
    return await addDoc(collection(db, "rankings"), sanitized);
};

// --- UTILS (SEED) ---
export const seedDatabase = async (players: Record<string, Player>, rankings: Ranking[]) => {
    // Careful: This is a simplistic seed suitable for "init" from mock
    // It doesn't check duplicates aggressively.

    // Seed Players
    const playersRef = collection(db, "players");
    const snapshotP = await getDocs(playersRef);
    if (snapshotP.empty) {
        console.log("Seeding Players...");
        const batch = writeBatch(db);
        Object.values(players).forEach(p => {
            // Removing ID to let Firestore generate auto-ID, OR use existing mock ID?
            // Using mock ID is cleaner for relating data if relationships existed (they don't really here yet).
            // But existing mock IDs are "p1", "p2". Let's stick to auto-IDs for cleanly usage, 
            // but WAIT: if we change IDs, current Mock Rankings that refer to player IDs might break?
            // Actually, Mock Rankings in constants.ts don't seem to reference player IDs strictly in relational mode 
            // (Ranking uses Display Names in standings?).
            // Let's check logic: Standings use `playerName` string? 
            // Let's verify constants.ts first.
            const ref = doc(playersRef); // Auto ID
            const { id, ...data } = p;
            batch.set(ref, data);
        });
        await batch.commit();
        console.log("Players seeded.");
    }

    // Seed Rankings
    const rankingsRef = collection(db, "rankings");
    const snapshotR = await getDocs(rankingsRef);
    if (snapshotR.empty) {
        console.log("Seeding Rankings...");
        const batch = writeBatch(db);
        rankings.forEach(r => {
            const ref = doc(rankingsRef);
            const { id, ...data } = r;
            batch.set(ref, data);
        });
        await batch.commit();
        console.log("Rankings seeded.");
    }
};

export const clearDatabase = async () => {
    // Dangerous: Clears all players and rankings
    const batch = writeBatch(db);

    // Players
    const snapshotP = await getDocs(collection(db, "players"));
    snapshotP.forEach(doc => batch.delete(doc.ref));

    // Rankings
    const snapshotR = await getDocs(collection(db, "rankings"));
    snapshotR.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
    console.log("Database cleared.");
};
