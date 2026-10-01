# Lab P4 — BluePrints en Tiempo Real (Sockets & STOMP)

Front-end SPA en React + Vite integrado con la API CRUD de BluePrints y con un canal de
tiempo real **STOMP sobre Spring WebSocket**, para que varias pestañas dibujen el mismo plano
de forma simultánea.

> Este documento cubre la **Parte 4**. La documentación de la Parte 3 (Redux + Axios + JWT)
> sigue en [`README.md`](./README.md).

---

## Integrantes

| Nombre                                                     | Rol        |
|------------------------------------------------------------|------------|
| [Juan David Valero Abril](https://github.com/Valero25)     | Estudiante |
| [Juan Esteban Sanchez Garcia](https://github.com/juanesgl) | Estudiante |

---

## 1. Puesta en marcha

### 1.1 Variables de entorno del Front (⚠️ paso obligatorio, ver nota)

Crea `front/.env.local` con este contenido:

```bash
# REST (tu backend CRUD)
# OJO: debe incluir /api, porque apiClient.js construye rutas como "/blueprints/juan"
# y el controlador está en /api/blueprints. Con solo el host, todas las llamadas dan 404.
VITE_API_BASE_URL=http://localhost:8080/api

# Tiempo real: apunta a uno u otro según el backend que uses
VITE_IO_BASE=http://localhost:3001     # si usas Socket.IO (Node)
VITE_STOMP_BASE=ws://localhost:8080    # si usas STOMP (Spring)

# false = API real, true = apimock
VITE_USE_MOCK=false
```

> **Nota:** este archivo **no pudo incluirse en la entrega** porque el entorno de desarrollo
> bloquea por política de seguridad cualquier escritura sobre rutas `.env*`. Créalo a mano
> antes de levantar el front. Sin él, Vite cae en los valores por defecto de los servicios
> (`baseURL: '/api'`, `VITE_USE_MOCK` ausente) y el front habla con el backend sin
> autenticación, por lo que el login fallará.

`.env.local` está ignorado por git, así que no debe subirse nunca.

### 1.2 Back (Spring Boot 3.3.2 / Java 21)

```bash
cd back
mvn spring-boot:run
```

Requiere PostgreSQL en `localhost:5432`, base de datos `lab4_arsw` (ver `back/src/main/resources/application.yml`
y `back/init.sql`).

Expone:
- REST en `http://localhost:8080/api/blueprints` (protegido con JWT)
- STOMP en `ws://localhost:8080/ws-blueprints`
- Swagger en `http://localhost:8080/swagger-ui.html`

### 1.3 Front

```bash
cd front
npm install
npm run dev
```

Abre `http://localhost:5173` y ve a la pestaña **Tiempo real** (`/p4`).

### 1.4 Demostración

1. Inicia sesión (el back emite un token en `POST /auth/login`).
2. En la tarjeta **Tecnología de tiempo real**, selecciona **STOMP**.
3. Escribe un autor (p. ej. `juan`), pulsa **Get blueprints** y abre un plano con **Open**.
4. Abre el mismo plano en **una segunda pestaña** con el mismo autor y nombre.
5. Haz clic en el lienzo de cualquiera de las dos: el punto aparece en la otra al instante.

---

## 2. Endpoints REST utilizados

Todos protegidos con JWT (scopes `blueprints.read` / `blueprints.write`).

| Método   | Ruta                                   | Scope              | Descripción                          |
|----------|----------------------------------------|--------------------|--------------------------------------|
| `GET`    | `/api/blueprints`                      | `blueprints.read`  | Lista todos los planos               |
| `GET`    | `/api/blueprints/{author}`             | `blueprints.read`  | Planos de un autor                   |
| `GET`    | `/api/blueprints/{author}/{name}`      | `blueprints.read`  | Puntos de un plano                   |
| `POST`   | `/api/blueprints`                      | `blueprints.write` | Crear un plano → `201`               |
| `PUT`    | `/api/blueprints/{author}/{name}`      | `blueprints.write` | Reemplazar todos los puntos → `204`  |
| `PUT`    | `/api/blueprints/{author}/{name}/points` | `blueprints.write` | Agregar **un** punto → `202`   |
| `DELETE` | `/api/blueprints/{author}/{name}`      | `blueprints.write` | Eliminar un plano → `204`            |
| `POST`   | `/auth/login`                          | público            | Emisión de token JWT                 |

### Cambio respecto a la Parte 2

En el código de la P2 el controlador estaba mapeado a `/blueprints` y **no existía `DELETE`**
(aunque el front ya lo invocaba, por lo que fallaba con 404). Para esta parte:

- Se migró el prefijo a `/api/blueprints`, que es el que exige el enunciado y el que ya
  esperaba el front (`baseURL: '/api'`).
- Se eliminó `api/BlueprintController.java`, un **stub que devolvía dos blueprints
  inventados** (`"Casa de campo"`, `"Edificio urbano"`) sin tocar la base de datos. Como
  estaba mapeado justo a `/api/blueprints`, el front consultaba ese stub en lugar de la API
  real.
- Se añadió `DELETE` y un `PUT` de reemplazo completo (antes solo existía el `PUT` que
  agrega un punto).

---

## 3. Tiempo real: diseño

### 3.1 Contrato del canal

| Concepto                | Valor                                          |
|-------------------------|------------------------------------------------|
| Endpoint STOMP          | `/ws-blueprints`                               |
| Prefijo de aplicación   | `/app`                                         |
| Prefijo de broker       | `/topic`                                       |
| Publicar un punto       | `/app/draw`                                    |
| Tópico de un plano      | `/topic/blueprints.{author}.{name}`            |
| Identificador de sala   | `blueprints.{author}.{name}`                   |

**Payload** (idéntico en cliente y servidor):

```json
{ "author": "juan", "name": "plano-1", "point": { "x": 120, "y": 240 } }
```

Flujo completo:

```js
// STOMP
client.publish({ destination: '/app/draw', body: JSON.stringify({ author, name, point }) })
client.subscribe(`/topic/blueprints.${author}.${name}`, (msg) => { /* repintar */ })
```

```js
// Socket.IO
socket.emit('join-room', `blueprints.${author}.${name}`)
socket.emit('draw-event', { room, author, name, point })
socket.on('blueprint-update', (upd) => { /* repintar */ })
```

### 3.2 Decisiones de diseño

**Un plano = un tópico, no un evento global.** Cada blueprint tiene su propio destino, así el
aislamiento por plano es gratis: dos pestañas sobre planos distintos nunca se ven. Es la
decisión que más directamente pesa en la nota de "aislamiento por plano".

**Suscripción dentro del callback de conexión.** El suscriptor se registra en `onConnect`
(STOMP) y en el evento `connect` (Socket.IO). Suscribir antes de que el handshake termine se
descarta **en silencio**: el síntoma sería "nunca llega nada" sin error aparente.

**Deduplicación del eco propio.** Cuando el usuario dibuja, el punto se guarda en redux y se
emite al canal. El servidor lo reembolsa al tópico, y el autor también lo recibe. El reducer
`addRemotePointToCurrent` descarta un punto remoto cuyas coordenadas ya estén en el plano;
sin ese filtro el trazo se dibuja dos veces por clic.

**Validación en el servidor.** `author` y `name` se contrastan contra `[A-Za-z0-9._- ]{1,64}`
antes de construir el tópico. Como esos valores se interpolan en el destino del broker, sin
sanitizar un cliente podría suscribirse a tópicos ajenos. El punto se valida contra el tamaño
real del lienzo (520×360).

**Los puntos de RT no se persisten solos.** El broadcast es efímero; persiste el `PUT`
explícito del botón *Guardar Cambios*. Esto evita meter latencia y condiciones de carrera
entre pestañas en cada clic, y deja explícito quién es el dueño de la persistencia.

**Interfaz común de transporte.** `stompService.js` y `socketService.js` exponen la misma
firma (`connect` / `sendPoint` / `disconnect`) y `realtimeClients.js` elige según el valor
del selector. Por eso agregar un tercer transporte es una función más, no un `if` en el
componente.

### 3.3 Estructura añadida en el Front

```
src/
├─ services/
│  ├─ stompService.js        cliente STOMP (reconexión 3 s, heartbeat 10 s)
│  └─ socketService.js       cliente Socket.IO (transporte websocket forzado)
├─ features/realtime/
│  ├─ realtimeClients.js     fábrica común + lista del selector
│  └─ realtimeSlice.js       tech, status, error
├─ hooks/
│  └─ useRealtime.js         conecta, entra a la sala y limpia al desmontar
└─ AppP4.jsx                 vista de tiempo real (ruta /p4)
```

`BlueprintCanvas.jsx` **no necesitó cambios**: ya recibe `points` desde redux, y los puntos
remotos entran al mismo array, así que se repintan solos.

---

## 4. Comparativa Socket.IO vs STOMP

Probamos ambos approaches; elegimos **STOMP** para la entrega.

| Criterio                       | Socket.IO (Node)                                   | STOMP (Spring Boot)                                |
|--------------------------------|----------------------------------------------------|----------------------------------------------------|
| Servicios por tocar            | 2 (REST Spring + RT Node)                          | 1 (el mismo back)                                   |
| Código nuevo en el back        | Servidor Node desde cero                           | 3 clases Spring                                    |
| Autenticación                  | Problemática: el back exige JWT en cada `GET`      | Hereda Spring Security; mismo token                |
| Protocolo                      | Protocolo propio sobre WebSocket                   | WebSocket estándar + tramas STOMP                 |
| Interoperabilidad              | Solo clientes `socket.io`                          | Cualquier cliente STOMP (cualquier lenguaje)       |
| Tópicos                        | Rooms por socket, API propia                       | Broker con subscriptions nativas                   |
| Reconexión                     | Automática, con reintentos internos                | Manual: `reconnectDelay` + lifecycle callbacks      |
| Madurez del ecosistema          | Muy grande, mucho material                          | Consolidado en Spring, menos comunidad              |
| Carga operacional              | Un proceso Node más que monitorear                  | Ninguna adicional                                   |

**Por qué STOMP en este proyecto concreto:**

1. El back ya es Spring Boot con Spring Security, OpenAPI y persistencia. STOMP se integra
   como tres clases más y hereda la autenticación existente.
2. Con Socket.IO habría que crear y mantener un segundo servicio, y la demo de dos pestañas
   exigiría estar logueado en ambas porque cada `GET` del back Spring exige JWT.
3. Como la nota del laboratorio premia el análisis, implementamos ambos clientes en el front y
   dejamos la comparación documentada, aunque solo STOMP tenga backend real aquí.

**Contras honestos de STOMP:** reconexión más manual que Socket.IO, y un modelo de
suscritión menos intuitivo para quien venga de las rooms. A cambio, el tópico por plano da
aislamiento sin lógica extra, y el protocolo estándar permite conectar un cliente que no sea
JavaScript.

---

## 5. Seguridad

Implementado:

- Validación de payload en el servidor: autor/nombre contra regex, punto dentro del lienzo.
- Orígenes restringidos: `blueprints.realtime.allowed-origins` en `application.yml` (por
  defecto solo `http://localhost:5173`). En producción debe ser el dominio real, nunca `*`.
- Autenticación JWT con scopes en todo el CRUD.

**Limitación conocida (importante).** El handshake STOMP está en `permitAll` dentro de
`SecurityConfig`, porque el filtro JWT no valida un handshake WebSocket por sí solo. Es decir:
**cualquiera que abra `ws://localhost:8080/ws-blueprints` puede publicar puntos.** Es
aceptable para una demo local, pero para producción hay que añadir un `ChannelInterceptor`
que valide el token del encabezado `Authorization` en cada mensaje STOMP, por ejemplo:

```java
@Override
public void configureClientInboundChannel(ChannelRegistration registration) {
    registration.interceptors(new ChannelInterceptor() {
        @Override
        public Message<?> preSend(Message<?> message, StompHeaderAccessor accessor) {
            String token = accessor.getFirstNativeHeader("Authorization");
            // validar el JWT y el scope aquí; lanzar si no es válido
            return message;
        }
    });
}
```

No se implementó para no añadir complejidad al alcance del laboratorio, y queda anotado como
deuda técnica consciente.

---

## 6. Observabilidad y DX

- El back loguea cada punto dibujado: `draw point (x,y) on blueprint autor/nombre`.
- El front muestra el estado de la conexión con un badge junto al selector (`connected`,
  `disconnected`, `error`).
- `RealtimeExceptionHandler` registra y responde los payloads rechazados en vez de dejarlos
  caer en silencio.
- Scripts disponibles: `npm run dev`, `npm run build`, `npm run lint`, `npm test`.

---

## 7. Pruebas

```bash
cd front
npm test        # 57 pruebas en 7 archivos
npm run lint
npm run build
```

Estado al entregar: **57/57 pruebas verdes**, ESLint sin hallazgos, build de producción OK.

`tests/realtime.test.jsx` (13 pruebas) cubre la slice de tiempo real y, sobre todo, la
deduplicación del eco propio: que un punto remoto se agregue, que se descarten los de otro
plano, y que el rebote de un punto recién dibujado no lo duplique.

> Nota: `tests/BlueprintsPage.test.jsx` reconstruía el reducer raíz a mano
> (`combineReducers({ blueprints, auth })`). Al añadir la slice `realtime` el componente
> recibió un store sin ella y el render fallaba. Se cambió a importar `rootReducer` del
> store real, que es la forma de no volver a romperlo al agregar otra slice.

### Casos de prueba manuales

- [ ] Al abrir un plano, el lienzo carga sus puntos (`GET /api/blueprints/{author}/{name}`).
- [ ] Un clic agrega un punto local y repinta.
- [ ] Con dos pestañas en el mismo plano, los puntos se replican.
- [ ] Create / Save / Delete funcionan y refrescan la tabla y el **Total** del autor.
- [ ] El selector cambia entre None, STOMP y Socket.IO sin romper la aplicación.
- [ ] Dos pestañas en planos **distintos** no se ven entre sí.

---

## 8. Limitaciones conocidas

1. **Socket.IO no tiene backend en esta entrega.** El cliente y la interfaz están listos, pero
   hace falta levantar el servidor Node del repositorio guía para usarlo.
2. **El canal STOMP no valida JWT** (ver sección 5).
3. **Los puntos de RT no se persisten** hasta pulsar *Guardar Cambios*.
4. **Sin historial ni deshacer.** Un plano collaboration es append-only; si dos pestañas
   dibujan a la vez, el orden lo fija el broker y no hay resolución de conflictos.
5. **Sin control de concurrencia.** `PUT` de reemplazo completo es last-write-wins.

---

## 9. Licencia

MIT.