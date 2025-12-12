// Migration utility to fix existing players without stats
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "./firebase";

export const migratePlayersStats = async () => {
    console.log("Starting player stats migration...");

    const playersRef = collection(db, "players");
    const snapshot = await getDocs(playersRef);

    const batch = writeBatch(db);
    let count = 0;

    snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();

        // Check if stats field is missing or incomplete
        if (!data.stats || typeof data.stats.pj === 'undefined') {
            const playerRef = doc(db, "players", docSnapshot.id);
            batch.update(playerRef, {
                stats: { pj: 0, pg: 0, pp: 0, winrate: 0 }
            });
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`✅ Migrated ${count} players with missing stats`);
        return count;
    } else {
        console.log("✅ All players already have stats - no migration needed");
        return 0;
    }
};
