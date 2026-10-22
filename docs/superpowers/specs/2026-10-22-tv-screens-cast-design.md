# Pantallas del club y Google Cast — diseño

Fecha: 2026-10-22

## Problema

El modo TV (`/?tv=<rankingId>`) obliga a conectar un PC a la tele o a teclear la URL del torneo
en el navegador de la tele cada vez. Los clubes tienen teles variadas: Chromecast, Samsung, LG, Fire TV.

## Objetivo

1. **Pantallas del club** (cualquier tele con navegador): la tele abre una vez `/tv`, se empareja
   con un código y queda vinculada al club. Desde la app se elige qué torneo enseña, se renombra
   o se desvincula, sin tocar la tele.
2. **Google Cast** (Chromecast / Google TV): botón Cast en el torneo que abre el modo TV en el
   Chromecast, que sigue en directo aunque el móvil se apague.

## Fuera de alcance

- Varios torneos rotando en una misma pantalla.
- Control remoto de diapositivas desde el móvil.
- Apps nativas para Samsung/LG/Fire TV (se usa su navegador).

---

## Parte 1 — Pantallas del club

### Flujo en la tele

1. `https://<dominio>/tv` (la app usa `window.location.origin`; no se fija ningún dominio).
2. Primera vez: la tele entra en Firebase **anónimamente** con una instancia de Firebase
   propia (`screenApp`), para no cerrar la sesión de un administrador que abra `/tv` en su
   propio navegador. Crea su documento `screens/{screenId}` y un código.
3. Muestra el código (6 caracteres sin ambiguos: sin 0/O/1/I/L) en grande y un QR que abre
   `https://<dominio>/?vincular=<código>`. El código caduca a los 15 min y se renueva solo.
4. Al vincularse, pasa a mostrar el torneo asignado con el `TVLayout` actual, o «En espera»
   (logo y nombre del club) si no hay torneo.
5. Guarda `screenId` en `localStorage`: tras apagar/reiniciar vuelve directamente a su estado.
6. Envía una señal de vida (`lastSeenAt`) cada 5 minutos.
7. Si la desvinculan, lo nota al instante (escucha su documento) y vuelve a mostrar un código nuevo.
8. Si el acceso anónimo no está disponible (proveedor desactivado), muestra
   «No se puede conectar esta pantalla» con una explicación corta, sin romper nada más.

### Flujo en la app (administrador o staff del club)

- Nueva entrada de menú **Pantallas** (vista `screens` en `AdminLayout`):
  - Lista de pantallas: nombre, torneo que enseña, estado «Conectada» (señal < 10 min) o
    «Sin señal desde hace X».
  - **Añadir pantalla**: campo de código + nombre. Si la app se abre con `?vincular=<código>`,
    tras iniciar sesión se abre este diálogo con el código ya puesto.
  - Por pantalla: selector de torneo (torneos activos del club + «En espera»), renombrar, desvincular.
- En la cabecera de cada torneo, junto a Modo TV: **Enseñar en una pantalla** (menú con las
  pantallas del club).

### Datos

`screens/{screenId}` (`screenId`: id aleatorio de Firestore):

```ts
interface Screen {
  id: string;
  deviceUid: string;          // uid anónimo de la tele
  ownerId: string | null;     // club (uid del admin dueño); null = sin vincular
  name?: string;
  rankingId: string | null;   // torneo que enseña; null = en espera
  clubName?: string;          // copiados al vincular: la tele no puede leer users/
  clubLogoUrl?: string;
  pairingCode: string | null;
  codeExpiresAt: number | null; // epoch ms
  lastSeenAt: number;
  pairedAt?: number;
}
```

`screenCodes/{code}` → `{ screenId: string; deviceUid: string; expiresAt: number }`.
Permite al administrador encontrar la pantalla por código sin poder listar pantallas ajenas.

### Reglas de Firestore

- `screenCodes/{code}`
  - `create`: la tele (`request.auth.uid == request.resource.data.deviceUid`). Como `create`
    solo aplica a documentos nuevos, un código repetido falla y la tele genera otro.
  - `get`: cualquier usuario con sesión no anónima.
  - `delete`: la tele que lo creó.
  - Nada de `list` ni `update`.
- `screens/{screenId}`
  - `create`: la tele, con `ownerId == null`, `rankingId == null`, `deviceUid == auth.uid`.
  - `get`: la tele (`deviceUid`), el dueño o su staff.
  - `list`: dueño o staff, filtrando por `ownerId`.
  - `update` por la tele: solo `pairingCode`, `codeExpiresAt`, `lastSeenAt`.
  - `update` para vincular: usuario no anónimo, `resource.ownerId == null`,
    `request.ownerId == auth.uid` (o el admin del que es staff), `codeExpiresAt > request.time`,
    y solo cambian `ownerId`, `name`, `rankingId`, `clubName`, `clubLogoUrl`, `pairedAt`,
    `pairingCode`, `codeExpiresAt` (el código se anula al vincular).
  - `update` por el dueño o staff: `name`, `rankingId`, `clubName`, `clubLogoUrl`, y
    desvincular (`ownerId → null`, `rankingId → null`).
  - `delete`: nadie (desvincular deja el documento libre para volver a emparejar).
- «Usuario no anónimo»: `request.auth.token.firebase.sign_in_provider != 'anonymous'`.
  Las reglas existentes que usan `isSignedIn()` para escribir (rankings, players, feedback…)
  pasan a exigir usuario no anónimo, para que una tele no pueda crear nada.

### Unidades

| Archivo | Responsabilidad |
|---|---|
| `services/screens/pairingCode.ts` | Generar y normalizar códigos (puro, con pruebas) |
| `services/screens/screenStatus.ts` | «Conectada / sin señal desde…» a partir de `lastSeenAt` (puro, con pruebas) |
| `services/screens/screenFirebase.ts` | Instancia `screenApp` + auth anónima (conecta a emuladores si toca) |
| `services/screens/deviceScreen.ts` | Lado tele: crear/recuperar pantalla, renovar código, señal de vida, escuchar cambios |
| `services/screens/clubScreens.ts` | Lado app: vincular por código, listar, asignar torneo, renombrar, desvincular |
| `pages/ScreenPage.tsx` | Página `/tv`: código + QR, en espera, o `TVLayout` del torneo |
| `components/screens/ScreensView.tsx` | Vista «Pantallas» del administrador |
| `components/screens/PairScreenModal.tsx` | Diálogo «Añadir pantalla» |
| `components/screens/SendToScreenMenu.tsx` | Menú «Enseñar en una pantalla» del torneo |
| `firestore.rules` | Reglas descritas arriba |

`pages/TVPage.tsx` se reutiliza: `ScreenPage` lo renderiza con el `rankingId` asignado.

### Pruebas

- Unitarias: códigos (alfabeto, longitud, normalización de minúsculas/espacios), estado de señal.
- Reglas: pruebas con `@firebase/rules-unit-testing` contra el emulador si ya está instalado;
  si no, comprobación manual con el emulador documentada en el plan.
- Navegador (emuladores): abrir `/tv` en una pestaña, vincular desde otra con sesión de admin,
  asignar torneo, ver que la tele cambia sola; desvincular y ver el código de nuevo; recargar la
  tele y ver que recuerda su estado; abrir `/tv` en la pestaña con sesión de admin y comprobar que
  la sesión del admin sigue abierta.

---

## Parte 2 — Google Cast

- **Receptor** `/?cast=1` (`pages/CastReceiverPage.tsx`): carga el Cast Web Receiver SDK
  (`//www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js`), escucha el
  espacio de mensajes `urn:x-cast:racketgrid.tv` con `{ rankingId }` y renderiza `TVPage`.
  Sin mensaje todavía: pantalla «Esperando torneo…». Desactiva el apagado por inactividad
  (`disableIdleTimeout`).
- **Emisor**: `components/screens/CastButton.tsx` en la cabecera del torneo. Carga el Cast Sender
  SDK solo si existe `VITE_CAST_APP_ID`; si no existe, o el navegador no soporta Cast (Safari,
  Firefox, iPhone), el botón no se muestra. Al iniciar sesión de Cast envía `{ rankingId }`.
- Sin `VITE_CAST_APP_ID` todo lo demás funciona igual.
- No se puede probar sin la app registrada y un Chromecast: queda como prueba manual pendiente.

---

## Pendiente del usuario (no bloquea el desarrollo)

1. **Antes de publicar la Parte 1**: activar *Authentication → Proveedores → Anónimo* en la consola
   de Firebase, y desplegar las reglas nuevas (`firebase deploy --only firestore:rules`).
   Si no, las teles muestran «No se puede conectar esta pantalla»; el resto de la app no cambia.
2. **Para activar la Parte 2**: registrar la app en la Google Cast SDK Developer Console (5 $),
   receptor `https://<dominio>/?cast=1`, y poner el App ID en `VITE_CAST_APP_ID`. Mientras Google
   no la publique, solo funciona en los Chromecast registrados como dispositivos de prueba.
