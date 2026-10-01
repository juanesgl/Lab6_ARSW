import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CLIENT_ID, createRealtimeClient } from '../features/realtime/realtimeClients.js'
import {
  realtimeDisconnected,
  selectRealtimeTech,
  statusChanged,
} from '../features/realtime/realtimeSlice.js'
import { addRemotePointToCurrent } from '../features/blueprints/blueprintsSlice.js'

export default function useRealtime({ author, name }) {
  const dispatch = useDispatch()
  const tech = useSelector(selectRealtimeTech)
  const clientRef = useRef(null)

  const enabled = tech !== 'none' && Boolean(author && name)

  useEffect(() => {
    if (!enabled) return undefined

    const room = { author, name }
    // Un cliente ya descartado sigue notificando su cierre de forma asíncrona; sin este
    // filtro pisaría con `disconnected` el estado del cliente que lo reemplazó.
    let active = true
    const client = createRealtimeClient(tech, {
      onStatus: (status) => {
        if (!active) return
        console.info(`[rt:${tech}] ${status.state} · blueprints.${author}.${name}`, status.detail ?? '')
        dispatch(statusChanged(status))
      },
      onUpdate: (payload) => {
        if (!active || payload.clientId === CLIENT_ID) return
        dispatch(
          addRemotePointToCurrent({ ...room, point: payload.point, clientId: payload.clientId }),
        )
      },
    })

    if (!client) return undefined

    clientRef.current = client
    client.connect(room)

    return () => {
      active = false
      client.disconnect()
      clientRef.current = null
      dispatch(realtimeDisconnected())
    }
  }, [tech, author, name, enabled, dispatch])

  return {
    tech,
    enabled,
    broadcast: (point) =>
      clientRef.current?.sendPoint({ author, name, point, clientId: CLIENT_ID }) ?? false,
  }
}
