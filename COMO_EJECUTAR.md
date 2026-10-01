# Cómo ejecutar el Lab P4 — BluePrints en Tiempo Real

Guía operativa para levantar el proyecto completo en local, en **Linux/macOS** y en **Windows**.
No hace falta leer el código para seguirla. Si algo falla, la sección
[Troubleshooting](#troubleshooting) documenta los errores reales que aparecieron durante la puesta
en marcha.

> **Sobre los comandos.** Los bloques sin etiqueta funcionan igual en bash y en PowerShell. Cuando
> la sintaxis cambia, hay un bloque **Linux / macOS** (bash; también sirve en Git Bash y WSL) y otro
> **Windows** (PowerShell). Cada bloque indica desde qué carpeta se ejecuta; si no dice nada, es la
> raíz del repositorio.
>
> En PowerShell usa siempre `curl.exe`: `curl` a secas es un alias de `Invoke-WebRequest` y no
> acepta las mismas opciones.

---

## Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Java (JDK) | 21 | Backend |
| Maven | 3.9+ | Compilar y ejecutar el backend |
| Node.js | 18+ | Frontend y servidor Socket.IO |
| Docker (con Compose v2) **o** Podman | — | Solo para PostgreSQL |

Verifica antes de empezar:

```bash
java -version      # debe decir 21
mvn -version
node -v
docker --version   # o: podman --version
docker compose version
```

Notas por sistema:

- **Linux:** si `docker` pide permisos, antepón `sudo` o agrega tu usuario al grupo `docker`. Si
  `docker compose` no existe, instala el plugin Compose v2 (el binario antiguo `docker-compose`
  también sirve con los mismos argumentos).
- **Windows:** Docker Desktop debe estar abierto antes de ejecutar cualquier comando `docker`.

---

## Arquitectura

```
┌──────────────────┐         ┌──────────────────────┐
│  Front (Vite)    │  REST   │  Back (Spring Boot)  │
│  localhost:5173  │────────▶│  localhost:8080      │
│                  │         │                      │
│  navegador ──┬───┘         │  ├─ /api/blueprints  │
│              │  WebSocket  │  ├─ /api/auth/login  │
│              ├────────────▶│  └─ /ws-blueprints   │
│              │  (STOMP)    └──────────┬───────────┘
│              │                        │
│              │             ┌──────────▼───────────┐
│              │             │  PostgreSQL          │
│              │             │  localhost:5432      │
│              │             │  base: lab4_arsw     │
│              │             └──────────────────────┘
│              │  WebSocket  ┌──────────────────────┐
│              └────────────▶│  Socket.IO (Node)    │
│               (Socket.IO)  │  localhost:3001      │
└──────────────────┘         └──────────────────────┘
```

**Los WebSocket no pasan por el proxy de Vite**: van directo del navegador al backend (8080) o al
servidor Socket.IO (3001). El proxy solo reenvía las rutas `/api`.

Se usan cuatro terminales: base de datos (queda libre tras arrancar), backend, servidor Socket.IO
y frontend.

---

## Paso 1 — Base de datos

Desde `back/`:

```bash
docker compose up -d
```

`back/compose.yaml` publica el puerto `5432` y ejecuta `init.sql` la primera vez, que crea las
tablas y dos planos de ejemplo del autor `juan` (`plano-1` y `casa-de-campo`).

Comprueba que está lista:

```bash
docker exec LAB4_ARSW-POSTGRES pg_isready -U postgres -d lab4_arsw
docker exec LAB4_ARSW-POSTGRES psql -U postgres -d lab4_arsw -c "select author, name from blueprints"
```

Si la base ya existía de un laboratorio anterior, `init.sql` no se vuelve a ejecutar solo. Para
cargar los planos de ejemplo (es idempotente, no duplica), desde la raíz del repositorio:

**Linux / macOS**

```bash
docker exec -i LAB4_ARSW-POSTGRES psql -U postgres -d lab4_arsw < back/init.sql
```

**Windows (PowerShell)** — no admite la redirección `<`:

```powershell
Get-Content back/init.sql | docker exec -i LAB4_ARSW-POSTGRES psql -U postgres -d lab4_arsw
```

<details>
<summary>Con Podman en vez de Docker</summary>

Desde `back/`.

**Linux / macOS**

```bash
podman run -d --name lab4-postgres \
  -e POSTGRES_DB=lab4_arsw \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD='chefai?' \
  -p 5432:5432 \
  -v "$PWD/init.sql:/docker-entrypoint-initdb.d/init.sql:Z" \
  docker.io/library/postgres:17-alpine
```

**Windows (PowerShell)**

```powershell
podman run -d --name lab4-postgres `
  -e POSTGRES_DB=lab4_arsw `
  -e POSTGRES_USER=postgres `
  -e "POSTGRES_PASSWORD=chefai?" `
  -p 5432:5432 `
  -v "${PWD}/init.sql:/docker-entrypoint-initdb.d/init.sql" `
  docker.io/library/postgres:17-alpine
```

En los comandos de comprobación, cambia `docker` por `podman` y `LAB4_ARSW-POSTGRES` por
`lab4-postgres`.

</details>

<details>
<summary>La base está en otro puerto u otro host</summary>

No hace falta tocar `application.yml`: Spring acepta la URL por variable de entorno. Reemplaza el
comando del [paso 3](#paso-3--backend) por uno de estos, desde `back/`.

**Linux / macOS**

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/lab4_arsw mvn spring-boot:run
```

**Windows (PowerShell)**

```powershell
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5433/lab4_arsw"; mvn spring-boot:run
```

En PowerShell la variable queda definida para el resto de esa terminal; se borra con
`Remove-Item Env:SPRING_DATASOURCE_URL`.

</details>

---

## Paso 2 — Variables de entorno del front

`front/.env.local` **no está en el repositorio** (git lo ignora). Créalo a partir de la plantilla;
el comando es el mismo en bash y en PowerShell:

```bash
cp front/.env.example front/.env.local
```

Contenido:

```bash
# REST — el proxy de Vite reenvía /api al backend, así que es una ruta relativa
VITE_API_BASE_URL=/api

# Tiempo real: solo el host; el front agrega /ws-blueprints y convierte http -> ws
VITE_STOMP_BASE=http://localhost:8080
VITE_IO_BASE=http://localhost:3001

# false = API real, true = apimock (datos en memoria, sin backend)
VITE_USE_MOCK=false
```

Sin el archivo, el front usa esos mismos valores por defecto.

---

## Paso 3 — Backend

Desde `back/`:

```bash
mvn spring-boot:run
```

Espera a ver esta línea (tarda unos 15 segundos):

```
Started BlueprintsApiApplication
```

Si falla, lee el error: casi siempre es la base de datos (ver [Troubleshooting](#troubleshooting)).

Comprobación, en otra terminal — debe responder `{"status":"UP"}`:

| Linux / macOS | Windows (PowerShell) |
|---|---|
| `curl http://localhost:8080/actuator/health` | `curl.exe http://localhost:8080/actuator/health` |

---

## Paso 3b — Servidor Socket.IO

Solo hace falta para usar **Socket.IO** en el selector. En **otra terminal**, desde
`back-rt-socketio/`:

```bash
npm install     # solo la primera vez
npm start
```

Comprobación — responde el estado, los clientes conectados y las salas activas:

| Linux / macOS | Windows (PowerShell) |
|---|---|
| `curl http://localhost:3001/health` | `curl.exe http://localhost:3001/health` |

---

## Paso 4 — Frontend

En **otra terminal**, desde `front/`:

```bash
npm install     # solo la primera vez
npm run dev
```

Abre `http://localhost:5173`.

---

## Paso 5 — Entrar

| Usuario | Contraseña |
|---|---|
| `student` | `student123` |
| `assistant` | `assistant123` |

---

## Paso 6 — Probar la colaboración en tiempo real

1. Entra a la pestaña **Tiempo real** (`/p4`) en el menú superior.
2. En la tarjeta **Tecnología de tiempo real** selecciona **STOMP** (o **Socket.IO** si levantaste
   el paso 3b).
3. Escribe `juan` en el campo de autor y pulsa **Get blueprints**.
4. Pulsa **Open** en un plano (`plano-1` o `casa-de-campo`).
5. Abre una **segunda pestaña** (clic derecho sobre la pestaña → Duplicar) y repite en ella los
   pasos 2 a 4 con el mismo plano: la tecnología y el plano abierto no se conservan al duplicar.
6. En **una** de las dos pestañas, haz clic sobre el lienzo.

**Lo que debes ver:** el badge junto al selector pasa a `connected`, y el punto que dibujaste
aparece en la otra pestaña al instante.

Prueba también que **dos planos distintos no se mezclan**: abre `plano-1` en una pestaña y
`casa-de-campo` en otra, y dibuja en una. La otra no debe cambiar.

### Detener todo

- Front, back y Socket.IO: `Ctrl+C` en cada terminal.
- Base de datos (solo si no la vas a volver a usar), desde la raíz del repositorio:

```bash
docker compose -f back/compose.yaml stop
```

---

## Verificación rápida por terminal

Para confirmar que el backend responde sin abrir el navegador.

**Linux / macOS**

```bash
# Login (debe dar 200 y un access_token)
curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"student","password":"student123"}'

# Listar planos (reemplaza TOKEN por el access_token del login anterior)
curl -s http://localhost:8080/api/blueprints/juan \
  -H 'Authorization: Bearer TOKEN'

# Sin token el API responde 401
curl -i http://localhost:8080/api/blueprints
```

**Windows (PowerShell)**

```powershell
# Login (devuelve access_token, token_type y expires_in)
$login = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/login `
  -ContentType 'application/json' `
  -Body '{"username":"student","password":"student123"}'

# Listar planos con el token recibido
Invoke-RestMethod -Uri http://localhost:8080/api/blueprints/juan `
  -Headers @{ Authorization = "Bearer $($login.access_token)" } | ConvertTo-Json -Depth 5

# Sin token el API responde 401
curl.exe -i http://localhost:8080/api/blueprints
```

En `back/api.http` están las peticiones listas para la extensión *REST Client* de VS Code.

---

## Pruebas

Cada comando se ejecuta desde la carpeta indicada. Ninguna suite necesita la base de datos ni los
servidores levantados: las del back son unitarias y las de Socket.IO arrancan su propio servidor
en un puerto libre.

| Carpeta | Comando | Resultado esperado |
|---|---|---|
| `front/` | `npm test` | 66 pruebas |
| `front/` | `npm run lint` | Sin errores |
| `front/` | `npm run build` | Build de producción en `dist/` |
| `back/` | `mvn test` | 4 pruebas |
| `back-rt-socketio/` | `npm test` | 5 pruebas |

---

## Troubleshooting

### `404` al hacer login o al cargar planos

Casi siempre es una de estas dos causas:

1. **`VITE_API_BASE_URL` sin `/api`.** `apiClient.js` construye rutas como `/blueprints/juan` y el
   controlador está en `/api/blueprints`: el valor debe ser `/api` (o `http://localhost:8080/api`).
2. **El proxy de Vite quita el prefijo `/api`.** En `front/vite.config.js`, el bloque `proxy` de
   `/api` solo debe tener `target` y `changeOrigin`. Si tiene una clave `rewrite`, el front pide
   `/api/blueprints`, Vite lo convierte en `/blueprints` y el backend responde 404.

### `401` aunque acabas de hacer login

El backend genera las llaves RSA **en cada arranque** (`JwtKeyProvider`). Si reinicias el back,
los tokens emitidos antes dejan de servir. Vuelve a iniciar sesión.

### `Connection to localhost:5432 refused`

La base de datos no está corriendo:

```bash
docker ps                            # debe aparecer LAB4_ARSW-POSTGRES con 0.0.0.0:5432->5432
docker start LAB4_ARSW-POSTGRES      # si existe pero está detenida
```

Si el contenedor aparece arriba pero la columna de puertos muestra solo `5432/tcp` (sin
`0.0.0.0:5432->`), el puerto no quedó publicado: `docker restart LAB4_ARSW-POSTGRES`.

### El puerto `5432` ya está en uso

Ocurre si hay un PostgreSQL instalado en el sistema (frecuente en Linux) u otro contenedor. Detén
ese servicio, o levanta la base en otro puerto y pásale la URL al backend como se explica en
«La base está en otro puerto u otro host» del [paso 1](#paso-1--base-de-datos).

### `Port 8080 was already in use`

Hay otro proceso en el 8080. Lo más común es el stack de Docker de la Parte 3
(`docker compose down` desde `front/`) o un backend que quedó corriendo. Para ver quién lo tiene:

| Linux | Windows |
|---|---|
| `ss -ltnp \| grep 8080` | `netstat -ano \| findstr :8080` |

### El badge se queda en `disconnected`

1. ¿El backend está arriba? Este comando debe imprimir **400** (no 404: el 400 significa que el
   endpoint existe y solo espera un handshake WebSocket).

   | Linux / macOS | Windows (PowerShell) |
   |---|---|
   | `curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/ws-blueprints` | `curl.exe -s -o NUL -w "%{http_code}" http://localhost:8080/ws-blueprints` |

2. Revisa `VITE_STOMP_BASE`. Debe ser el host del back (`http://localhost:8080` o
   `ws://localhost:8080`); el front le agrega `/ws-blueprints`.
3. Revisa que el origen esté permitido en `back/src/main/resources/application.yml`:

   ```yaml
   blueprints:
     realtime:
       allowed-origins: "http://localhost:5173"
   ```

   Si cambiaste el puerto del front, actualiza este valor y reinicia el back.

### El badge muestra `error` con Socket.IO

El servidor del paso 3b no está arriba (revisa su `/health`) o el front corre en un origen distinto
de `http://localhost:5173`. En ese caso arranca el servidor indicando el origen, desde
`back-rt-socketio/`:

**Linux / macOS**

```bash
ALLOWED_ORIGINS=http://localhost:5174 npm start
```

**Windows (PowerShell)**

```powershell
$env:ALLOWED_ORIGINS="http://localhost:5174"; npm start
```

### El autor `juan` no tiene planos (`404`)

La base está vacía. Carga los datos de ejemplo (paso 1) o crea un plano desde **Crear Blueprint**.

### Los cambios en `.env.local` no se aplican

Vite lee las variables **al arrancar**; no hay recarga en caliente para esto. `Ctrl+C` y
`npm run dev` otra vez.

### Cambié el código del back y no se refleja

Detén el backend y vuelve a ejecutar `mvn spring-boot:run`, que recompila al arrancar. Si tocaste
`pom.xml` (por ejemplo, agregaste una dependencia), ejecuta antes `mvn clean compile`.

---

## Comandos útiles

| Carpeta | Comando | Para qué |
|---|---|---|
| `back/` | `mvn spring-boot:run` | Levanta el backend |
| `back/` | `mvn clean compile` | Recompila desde cero |
| `back/` | `mvn test` | Pruebas del back |
| `back-rt-socketio/` | `npm start` | Levanta el servidor Socket.IO |
| `back-rt-socketio/` | `npm run dev` | Igual, reiniciando al cambiar el código |
| `back-rt-socketio/` | `npm test` | Pruebas del servidor Socket.IO |
| `front/` | `npm run dev` | Levanta el frontend |
| `front/` | `npm test` | Pruebas del front |
| `front/` | `npm run lint` | ESLint |
| `front/` | `npm run build` | Build de producción |
| cualquiera | `docker logs -f LAB4_ARSW-POSTGRES` | Ver el log de la base de datos |
| cualquiera | `docker exec -it LAB4_ARSW-POSTGRES psql -U postgres -d lab4_arsw` | Consola SQL |
