import { Timestamp } from 'firebase/firestore';

/** A club TV: a browser that opened /tv and was paired with a code. Its id is the TV's anonymous uid. */
export interface Screen {
    id: string;
    /** Anonymous uid of the TV's browser (same as id) */
    deviceUid: string;
    /** Club that owns it (uid of the owning admin); null while unpaired */
    ownerId: string | null;
    name: string | null;
    /** Tournament on screen; null = waiting with the club's logo */
    rankingId: string | null;
    /** Copied when pairing: the TV cannot read users/ */
    clubName: string | null;
    clubLogoUrl: string | null;
    pairingCode: string | null;
    /** Server time the code was issued; it lasts CODE_TTL_MS */
    codeIssuedAt: Timestamp | null;
    /** The code the club typed when pairing; the rules check it against pairingCode */
    claimCode?: string | null;
    /** Server time of the TV's last signal */
    lastSeenAt: Timestamp;
    pairedAt: number | null;
}

/** screenCodes/{code}: lets the club find a TV by its code without listing other clubs' TVs */
export interface ScreenCode {
    screenId: string;
    deviceUid: string;
    issuedAt: Timestamp;
}
