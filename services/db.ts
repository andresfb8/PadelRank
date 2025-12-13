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
    setDoc, // Kept from original, not in user's example but not explicitly removed
    getDocs // Kept from original, not in user's example but not explicitly removed
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

// --- PLAYERS ---

export const subscribeToPlayers = (callback: (players: Record<string, Player>) => void, ownerId?: string) => {
    // Hybrid Approach: Always fetch ALL players (ordered by name)
    // We will filter them on the client side (App.tsx) to show Own + Unowned.
    const q = query(collection(db, "players"), orderBy("nombre"));

    return onSnapshot(q, (snapshot) => {
        const playersMap: Record<string, Player> = {};
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Defensive: ensure stats exists for backward compatibility
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
    // Always fetch all, filter on client (like players) to support Legacy/Mixed views
    const q = query(collection(db, "rankings"), orderBy("nombre"));

    return onSnapshot(q, (snapshot) => {
        const rankingsList: Ranking[] = [];
        snapshot.forEach((doc) => {
            rankingsList.push({ id: doc.id, ...doc.data() } as Ranking);
        });
        callback(rankingsList);
    }, (error) => {
        console.error("Error subscribing to rankings:", error);
    });
};

export const addRanking = async (ranking: Omit<Ranking, "id">) => {
    return await addDoc(collection(db, "rankings"), ranking);
};

export const updateRanking = async (ranking: Ranking) => {
    const { id, ...data } = ranking;
    const rankingRef = doc(db, "rankings", id);
    return await updateDoc(rankingRef, data);
};

export const deleteRanking = async (id: string) => {
    return await deleteDoc(doc(db, "rankings", id));
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
