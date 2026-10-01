# Lab P4 — BluePrints en Tiempo Real

La documentación de la Parte 4 (setup, endpoints, decisiones de diseño, comparativa
Socket.IO vs STOMP, pruebas y evidencias) está en el **[README de la raíz](../README.md)**, y la
guía paso a paso en **[COMO_EJECUTAR.md](../COMO_EJECUTAR.md)**.

La documentación de la Parte 3 (Redux + Axios + JWT) sigue en [README.md](./README.md).

## Qué añade la Parte 4 en este front

```
src/
├─ services/
│  ├─ stompService.js        cliente STOMP (reconexión 3 s, heartbeat 10 s)
│  └─ socketService.js       cliente Socket.IO (transporte websocket forzado)
├─ features/realtime/
│  ├─ realtimeClients.js     fábrica común, lista del selector e identificador de pestaña
│  └─ realtimeSlice.js       tech, status, error
├─ hooks/
│  └─ useRealtime.js         conecta, entra al plano y limpia al desmontar
└─ AppP4.jsx                 vista de tiempo real (ruta /p4)
```

`BlueprintCanvas.jsx` no necesitó cambios: ya recibe `points` desde Redux, y los puntos remotos
entran al mismo arreglo, así que se repintan solos.

Variables de entorno: copia [`.env.example`](./.env.example) como `.env.local`.
