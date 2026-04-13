import React, { useEffect, useMemo, useState } from 'react'
import type { StageEvent } from '../../store/flowStore'

type StageProps = {
  event?: StageEvent | null
  isRunning?: boolean
  runLog?: string[]
}

const Stage: React.FC<StageProps> = ({ event = null, isRunning = false, runLog = [] }) => {
  const [animate, setAnimate] = useState(false)
  const [message, setMessage] = useState('')

  const accentColor = useMemo(() => {
    switch (event?.kind) {
      case 'action':
        return '#60a5fa'
      case 'condition':
        return '#c084fc'
      case 'loop':
        return '#fbbf24'
      case 'finish':
        return '#34d399'
      case 'start':
      default:
        return '#22c55e'
    }
  }, [event])

  useEffect(() => {
    if (event && event.label) {
      setMessage(event.detail ? `${event.label} · ${event.detail}` : event.label)
      setAnimate(true)
      const t = setTimeout(() => setAnimate(false), 600)
      return () => clearTimeout(t)
    }
    setMessage(isRunning ? '正在等待下一步动作…' : '点击 Run Demo 后，这里会显示舞台反馈')
  }, [event])

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong>🎮 Stage Preview</strong>
        <span style={{ fontSize: 12, color: isRunning ? '#059669' : '#64748b', fontWeight: 600 }}>{isRunning ? 'RUNNING' : 'IDLE'}</span>
      </div>
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8', position: 'relative', borderRadius: 8 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 8,
            background: animate ? accentColor : '#ffffff',
            boxShadow: animate ? `0 0 18px ${accentColor}` : '0 0 6px rgba(0,0,0,0.05)',
            transition: 'all 180ms ease',
          }}
        />
      </div>
      <div style={{ marginTop: 8, minHeight: 26, textAlign: 'center', fontWeight: 500 }}>{message}</div>
      <div style={{ marginTop: 10, background: '#f8fafc', borderRadius: 8, padding: 10 }}>
        <div style={{ fontSize: 12, color: '#475569', fontWeight: 700, marginBottom: 6 }}>最近执行日志</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 90, overflowY: 'auto', fontSize: 12, color: '#334155' }}>
          {runLog.length === 0 ? <div>暂无日志，运行流程后会出现在这里。</div> : runLog.slice(-4).map((entry, index) => <div key={`${entry}-${index}`}>• {entry}</div>)}
        </div>
      </div>
    </div>
  )
}

export default Stage
