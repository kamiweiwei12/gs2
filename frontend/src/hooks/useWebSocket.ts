import { useEffect, useRef } from 'react'

export default function useWebSocket(url?: string) {
  const wsRef = useRef<WebSocket | null>(null)
  useEffect(() => {
    if (!url) return
    wsRef.current = new WebSocket(url)
    wsRef.current.onopen = () => {
      // placeholder
    }
    return () => {
      wsRef.current && wsRef.current.close()
    }
  }, [url])
  return wsRef
}
