# back-rt-socketio — Servidor Socket.IO de BluePrints (Lab P4)

Canal de tiempo real alternativo a STOMP. Solo retransmite puntos entre las pestañas que están en
el mismo plano; el CRUD y el estado inicial los sirve la API de Spring (`../back`).

## Uso

```bash
npm install
npm start        # http://localhost:3001
npm run dev      # igual, reiniciando al cambiar el código
npm test         # 5 pruebas contra el servidor real
```

| Variable          | Por defecto             | Uso                                      |
|-------------------|-------------------------|------------------------------------------|
| `PORT`            | `3001`                  | Puerto HTTP y Socket.IO                  |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Orígenes permitidos, separados por comas |

## Contrato

Sala: `blueprints.{author}.{name}`.

| Dirección          | Evento             | Payload                                                     |
|--------------------|--------------------|-------------------------------------------------------------|
| cliente → servidor | `join-room`        | `"blueprints.juan.plano-1"` (deja la sala anterior)         |
| cliente → servidor | `leave-room`       | —                                                           |
| cliente → servidor | `draw-event`       | `{ author, name, point: { x, y }, clientId? }`              |
| servidor → sala    | `blueprint-update` | `{ author, name, point, points: [point], clientId }`        |
| servidor → emisor  | `rt-error`         | `{ event, error }` cuando se rechaza un mensaje             |

`blueprint-update` se emite con `socket.to(room)`, así que el emisor no recibe su propio punto.
Incluye `points: [point]` para ser compatible con el formato del
[repo guía](https://github.com/DECSIS-ECI/example-backend-socketio-node-).

`GET /health` responde `{ status, uptime, clients, rooms }`.

## Validación

Los mensajes se validan con **zod**: `author` y `name` contra `[A-Za-z0-9._- ]{1,64}` y el punto
dentro del lienzo (`0..520 × 0..360`, enteros). La sala se calcula en el servidor a partir del
autor y el nombre ya validados —el campo `room` del cliente se ignora— y solo se acepta un
`draw-event` de un socket que esté unido a esa sala.
