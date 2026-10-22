/** A club TV: a browser that opened /tv and was paired with a code */
export interface Screen {
    id: string;
    /** Anonymous uid of the TV's browser */
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
    /** epoch ms */
    codeExpiresAt: number | null;
    lastSeenAt: number;
    pairedAt: number | null;
}

/** screenCodes/{code}: lets the club find a TV by its code without listing other clubs' TVs */
export interface ScreenCode {
    screenId: string;
    deviceUid: string;
    expiresAt: number;
}
