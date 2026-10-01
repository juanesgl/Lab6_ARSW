# Cómo ejecutar el Lab P4 — BluePrints en Tiempo Real

Guía operativa para levantar el proyecto completo en local. **No necesitas leer el código** para
seguirla. Si algo falla, mira la sección [Troubleshooting](#troubleshooting) al final, que
documenta los errores reales que inglesa durante la puesta en marcha.

---

## Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Java | 21 | El backend |
| Maven | 3.9+ | Compilar y correr el backend |
| Node.js | 18+ | El frontend |
| Podman **o** Docker | — | Solo para PostgreSQL |

Verifica antes de empezar:

```bash
java -version    # debe decir 21
mvn -version
node -v
podman --version   # o docker --version
```

---

## Arquitectura en una imagen

```
┌──────────────────┐         ┌──────────────────────┐
│  Front (Vite)    │  REST   │  Back (Spring Boot)  │
│  localhost:5173  │────────▶│  localhost:8080      │
│                  │         │                      │
│  navegador ──┬───┘         │  ├─ /api/blueprints  │
│              │  WebSocket │  ├─ /api/auth/login   │
│              └────────────▶│  └─ /ws-blueprints   │
│         STOMP (tiempo real) │                      │
└──────────────────┘         └──────────┬───────────┘
                                        │
                             ┌──────────▼───────────┐
                             │  PostgreSQL          │
                             │  localhost:5432      │
                             │  base: lab4_arsw     │
                             └──────────────────────┘
```

Detalle importante: **el WebSocket no pasa por el proxy de Vite**, va directo del navegador al
backend en el 8080. El proxy solo intercepta rutas `/api`.

---

## Paso 1 — Base de datos

PostgreSQL guarda los planos. Si usas **podman** (recomendado, no pide sudo):

```bash
cd back
podman run -d --name lab4-postgres \
  -e POSTGRES_DB=lab4_arsw \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD='chefai?' \
  -p 5432:5432 \
  -v "$PWD/init.sql:/docker-entrypoint-initdb.d/init.sql:Z" \
  docker.io/library/postgres:17-alpine
```

Espera a que esté listo:

```bash
for i in $(seq 1 30); do
  podman exec lab4-postgres pg_isready -U postgres -d lab4_arsw && break
  sleep 1
done
```

Deberías ver las tablas `blueprints` y `points`:

```bash
podman exec lab4-postgres psql -U postgres -d lab4_arsw -c '\dt'
```

<details>
<summary>Usando Docker en vez de podman</summary>

```bash
cd back
sudo -n docker compose up -d
```

**Pero ojo:** ese compose (`front/docker-compose.yml`) levanta la base **sin publicar el puerto
5432 al host**, así que el backend corriendo en tu máquina no la alcanza. Si vas por esa vía,
agrega `ports: ['5432:5432']` al servicio `db` en `front/docker-compose.yml`, o usa el comando
de podman de arriba que ya funciona.

</details>

---

## Paso 2 — Variables de entorno del Front

Crea `front/.env.local`. **Este archivo no está en el repo** (a propósito, para no subir
configuración sensible), así que tienes que crearlo tú:

```bash
cat > front/.env.local << 'EOF'
# REST — el proxy de Vite reenvía /api al backend, así que es una ruta relativa
VITE_API_BASE_URL=/api

# WebSocket/STOMP — conexión directa al backend (el proxy de Vite no proxea WebSocket)
VITE_STOMP_BASE=ws://localhost:8080

# Socket.IO (opcional, solo si levantas el server de Node)
VITE_IO_BASE=http://localhost:3001

# false = API real, true = apimock (datos en memoria, sin backend)
VITE_USE_MOCK=false
EOF
```

---

## Paso 3 — Backend

```bash
cd back
mvn spring-boot:run
```

Espera a ver esta línea:

```
Started BlueprintsApiApplication
```

Tarda unos 10 segundos. Si falla, mira el error (casi siempre es la base de datos).

---

## Paso 4 — Frontend

En **otra terminal**:

```bash
cd front
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
2. En la tarjeta **Tecnología de tiempo real** selecciona **STOMP**.
3. Escribe `juan` en el campo de autor y pulsa **Get blueprints**.
4. Dale **Open** a un plano (`plano-1` o `casa-de-campo`).
5. **Duplica la pestaña** del navegador con el mismo plano abierto (Ctrl+Shift+T o clic derecho
   → Duplicate).
6. En **una** de las dos pestañas, haz clic sobre el lienzo.

**Lo que debes ver:** el badge junto al selector pasa a `connected`, y el punto que dibujaste
aparece en la otra pestaña al instante.

Prueba también que **dos planos distintos no se mezclan**: abre `plano-1` en una pestaña y
`casa-de-campo` en otra, y dibuja en una. La otra no debe cambiar.

### Detener todo

```bash
# Front: Ctrl+C en su terminal
# Back: Ctrl+C en su terminal

# Base de datos (solo si no la vas a volver a usar):
podman stop lab4-postgres
```

---

## Verificación rápida por terminal

Para confirmar que el backend responde sin abrir el navegador:

```bash
# Login (debe dar 200)
curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"student","password":"student123"}'

# Listar planos (reemplaza TOKEN con el access_token del login anterior)
curl -s http://localhost:8080/api/blueprints/juan \
  -H 'Authorization: Bearer TOKEN'
```

En `back/api.http` tienes las peticiones listas si usas la extensión *REST Client* de VS Code.

---

## Troubleshooting

### `404` al hacer login o al cargar planos

Casi siempre es una de estas dos:

1. **Falta el `.env.local`.** Si no existe, el front usa `/api` como base, y aunque debería
   funcionar, conviene crearlo para estar seguro.
2. **El proxy de Vite está quitando el prefijo `/api`.** En `front/vite.config.js`, el bloque
   `proxy` **no debe tener** `rewrite`. Si lo tiene, el front pide `/api/blueprints`, Vite lo
   convierte en `/blueprints`, y el backend responde 404.

```bash
grep -n "rewrite" front/vite.config.js   # no debe imprimir nada
```

### `401` aunque acabas de hacer login

El backend genera las llaves RSA **en cada arranque** (`JwtKeyProvider`). Si reinicias el back,
los tokens emitidos antes dejan de servir. Vuelve a hacer login.

### `Connection to localhost:5432 refused`

La base de datos no está corriendo:

```bash
podman ps                       # debe aparecer lab4-postgres
podman start lab4-postgres      # si existe pero está detenida
```

### `Port 8080 was already in use`

Hay otra cosa en el 8080. Lo más común es el stack de Docker de la P3:

```bash
sudo -n docker ps
sudo -n docker compose down     # desde front/
```

O mira quién lo tiene:

```bash
ss -ltnp | grep 8080
```

### El badge se queda en `disconnected`

1. ¿El backend está arriba? `curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/ws-blueprints`
   debe dar **400** (no 404: el 400 significa que el endpoint existe y solo espera un
   handshake WebSocket).
2. Revisa `VITE_STOMP_BASE`. Debe ser `ws://localhost:8080`, con **`ws://`**, no `http://`.
3. Revisa que el origen esté permitido en `back/src/main/resources/application.yml`:

   ```yaml
   blueprints:
     realtime:
       allowed-origins: "http://localhost:5173"
   ```

   Si cambiaste el puerto del front, hay que actualizar esto.

### Los cambios en `.env.local` no se aplican

Vite lee las variables **al arrancar**. No hay hot-reload para esto. Ctrl+C y `npm run dev`
otra vez.

### Cambié el código del back y no se refleja

`mvn spring-boot:run` recompila solo. Si tocaste `pom.xml` (por ejemplo, agregaste una
dependencia), corre `mvn clean compile` primero.

---

## Comandos útiles

| Comando | Para qué |
|---|---|
| `cd back && mvn spring-boot:run` | Levanta el backend |
| `cd back && mvn clean compile` | Recompila desde cero |
| `cd front && npm run dev` | Levanta el frontend |
| `cd front && npm test` | Corre las pruebas (57) |
| `cd front && npm run lint` | ESLint |
| `cd front && npm run build` | Build de producción |
| `podman logs -f lab4-postgres` | Ver la base de datos |
| `podman exec -it lab4-postgres psql -U postgres -d lab4_arsw` | Consola SQL |

---

## Notas para el video de demostración

- El badge `connected` es la prueba visual de que el tiempo real está activo: agrégalo al
  encuadre.
- Muestra el caso de **aislamiento**: dos pestañas con planos distintos que no se interfieren.
  Eso es lo que demuestra que cada plano tiene su propio tópico.
- El selector **None** vs **STOMP** sirve para mostrar el antes y después: en `None` los puntos
  no se replican.