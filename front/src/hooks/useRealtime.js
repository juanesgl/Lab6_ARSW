import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createRealtimeClient } from '../features/realtime/realtimeClients.js'
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
    const client = createRealtimeClient(tech, {
      onStatus: (status) => dispatch(statusChanged(status)),
      onUpdate: (payload) =>
        dispatch(addRemotePointToCurrent({ ...room, point: payload.point })),
    })

    if (!client) return undefined

    clientRef.current = client
    client.connect(room)

    return () => {
      client.disconnect()
      clientRef.current = null
      dispatch(realtimeDisconnected())
    }
  }, [tech, author, name, enabled, dispatch])

  return {
    tech,
    enabled,
    broadcast: (point) =>
      clientRef.current?.sendPoint({ author, name, point }) ?? false,
  }
}