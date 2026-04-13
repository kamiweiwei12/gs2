import React from 'react'
import FlowEditor from './components/FlowEditor/FlowEditor'
import Stage from './components/Stage/Stage'
import ChatPanel from './components/ChatPanel/ChatPanel'
import InspectorPanel from './components/InspectorPanel/InspectorPanel'
import { useFlowStore } from './store/flowStore'

const App: React.FC = () => {
  const stageEvent = useFlowStore((s) => s.stageEvent)
  const isRunning = useFlowStore((s) => s.isRunning)
  const runLog = useFlowStore((s) => s.runLog)

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#f3f4f6'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 20px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          🧩 GameScript Studio (GS²)
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>
          零代码游戏自动化脚本生成系统
        </p>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.95 }}>
          当前状态：<strong>{isRunning ? '模拟执行中' : '待命中'}</strong>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div style={{ 
        flex: 1, 
        display: 'grid',
        gridTemplateColumns: '280px 1fr 320px',
        gap: 12,
        padding: 12,
        overflow: 'hidden'
      }}>
        {/* Left Panel - Stage + AI Chat */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 12,
          overflow: 'hidden'
        }}>
          <div style={{ 
            background: '#fff', 
            borderRadius: 8, 
            padding: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <Stage event={stageEvent} isRunning={isRunning} runLog={runLog} />
          </div>
          
          <div style={{ 
            flex: 1,
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <ChatPanel />
          </div>
        </div>

        {/* Center Panel - Flow Editor */}
        <div style={{ 
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <FlowEditor />
        </div>

        {/* Right Panel - Inspector */}
        <div style={{ 
          background: '#fff',
          borderRadius: 8,
          padding: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'auto'
        }}>
          <InspectorPanel />
        </div>
      </div>
    </div>
  )
}

export default App
