# PLAN: Configuración de Dominio y Multitenencia (Subdominios)

> **Task Slug:** configuracion-dominio
> **Tipo de Proyecto:** WEB (Firebase Hosting)
> **Agente Principal:** project-planner / devops-engineer

## 📋 Resumen
El objetivo es vincular un dominio personalizado comprado en **Hostinger** al proyecto de Firebase de PadelRank e implementar una arquitectura multitenant donde los clubes/administradores puedan tener sus propios subdominios (ej., `club-central.padelrank.com`).

---

## 🎯 Criterios de Éxito
1.  El dominio principal (`padelrank.com`) sirve la página de aterrizaje (Landing Page).
2.  Los subdominios personalizados (`*.padelrank.com`) se enrutan dinámicamente a la lógica de la aplicación.
3.  SSL/TLS (HTTPS) está activo tanto para el dominio principal como para los subdominios.
4.  Sin interrupciones en los servicios existentes de Firebase.

---

## 🛠️ Stack Tecnológico
- **Proveedor DNS:** Hostinger.
- **Hosting:** Firebase Hosting.
- **Enrutamiento Frontend:** React (Detección dinámica de hostname).
- **SSL:** Automático a través de Firebase (Let's Encrypt).

---

## 🏗️ Diseño de Arquitectura: Subdominios Dinámicos
Dado que queremos escalar dinámicamente sin añadir manualmente registros CNAME para cada club:

1.  **Dominio Personalizado Wildcard:** Configuraremos `*.tudominio.com` en Firebase Hosting.
2.  **Lógica de la App:** La aplicación React detectará el `window.location.hostname`.
    - Si `hostname === 'tudominio.com'`, mostrar Landing Page.
    - Si `hostname === 'nombreclub.tudominio.com'`, buscar los datos de `nombreclub` en Firestore y mostrar el Dashboard del Club.

---

## 📝 Desglose de Tareas

### Fase 1: DNS y Enlace con Firebase (P0)
- **Tarea 1.1:** Añadir Dominio Personalizado en la Consola de Firebase.
    - *Agente:* devops-engineer
    - *Entrada:* Credenciales de Hostinger, ID del Proyecto Firebase.
    - *Salida:* Valores TXT para verificación de propiedad del dominio.
    - *Verificación:* Estado del dominio "Verificado" en la Consola de Firebase.
- **Tarea 1.2:** Configurar Registros DNS en Hostinger.
    - *Agente:* devops-engineer
    - *Entrada:* Registros A/CNAME proporcionados por Firebase.
    - *Salida:* Zona DNS actualizada en Hostinger.
    - *Verificación:* `dig tudominio.com` apunta a las IPs de Firebase.

### Fase 2: Configuración de Subdominio Wildcard (P1)
- **Tarea 2.1:** Configurar Dominio Comodín (Wildcard) en Firebase.
    - *Agente:* devops-engineer
    - *Entrada:* Dominio principal verificado.
    - *Salida:* Añadido `*.tudominio.com` en la configuración de Firebase Hosting.
    - *Verificación:* Cualquier subdominio resuelve a la misma app de Firebase.

### Fase 3: Implementación de Multitenencia en Frontend (P2)
- **Tarea 3.1:** Crear utilidad `SubdomainManager`.
    - *Agente:* frontend-specialist
    - *Entrada:* `window.location.hostname`.
    - *Salida:* Un helper que retorna el `clubId` actual o `null` para la landing.
    - *Verificación:* La herramienta analiza correctamente `club-x.dominio.com` vs `dominio.com`.
- **Tarea 3.2:** Actualizar lógica de enrutamiento de la App.
    - *Agente:* frontend-specialist
    - *Entrada:* Salida de `SubdomainManager`.
    - *Salida:* Renderizado condicional de `LandingPage` vs `AppContainer` basado en el hostname.
    - *Verificación:* Visitar un subdominio muestra "Club No Encontrado" o la UI del Club.

---

## 🏁 Fase X: Lista de Verificación Final
- [ ] **DNS Propagado:** Verificar globalmente vía `dnschecker.org`.
- [ ] **SSL Activo:** Iconos de candado HTTPS en el dominio principal y subdominios.
- [ ] **Prueba de Enrutamiento:**
    - `ejemplo.com` -> Muestra Landing.
    - `club1.ejemplo.com` -> Muestra instancia de la aplicación.
- [ ] **Seguridad:** Asegurar que las reglas de Firestore protejan los datos basados en `clubId`.

---

## ⚠️ Notas y Riesgos
- **Propagación DNS:** Puede tardar de 24 a 48 horas (aunque suele ser más rápido).
- **Límites de Firebase:** Firebase Hosting soporta hasta 20 dominios/subdominios por sitio por defecto. Para subdominios dinámicos "infinitos", el uso de **Wildcard** es obligatorio.
- **Desarrollo Local:** Necesitaremos actualizar el archivo `hosts` para probar subdominios localmente (ej. `127.0.0.1 club1.localhost`).
