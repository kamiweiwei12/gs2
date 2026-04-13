import React from 'react'

type ToolbarProps = {
  isRunning: boolean
  statusText?: string | null
  onRun: () => void
  onStop: () => void
  onExport: () => void
  onClear: () => void
}

const actionButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: 'none',
  borderRadius: 6,
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const Toolbar: React.FC<ToolbarProps> = ({ isRunning, statusText, onRun, onStop, onExport, onClear }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
    <button onClick={onRun} disabled={isRunning} style={{ ...actionButtonStyle, background: isRunning ? '#94a3b8' : '#10b981' }}>
      ▶ Run
    </button>
    <button onClick={onStop} disabled={!isRunning} style={{ ...actionButtonStyle, background: !isRunning ? '#cbd5e1' : '#ef4444' }}>
      ■ Stop
    </button>
    <button onClick={onExport} style={{ ...actionButtonStyle, background: '#6366f1' }}>
      ⤓ Export DSL
    </button>
    <button onClick={onClear} style={{ ...actionButtonStyle, background: '#64748b' }}>
      ↺ Clear
    </button>
    <div style={{ fontSize: 12, color: '#64748b', minWidth: 120, textAlign: 'right' }}>{statusText || (isRunning ? '模拟执行中…' : '准备就绪')}</div>
  </div>
)

export default Toolbar
