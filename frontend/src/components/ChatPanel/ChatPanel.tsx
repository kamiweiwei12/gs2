import React, { useState } from 'react'
import { useFlowStore } from '../../store/flowStore'
import { dslToFlow, type StartDSL } from '../../utils/dslParser'

type Message = { role: 'user' | 'ai'; text: string }

const wrapStart = (children: StartDSL['children']): StartDSL[] => [
  {
    id: 'start_ai',
    type: 'start',
    children,
  },
]

const createActionNode = (id: string, target: string, action = 'tap') => ({
  id,
  type: 'action' as const,
  action,
  target,
})

const createLoopNode = (id: string, children: StartDSL['children'], condition = '', iterations = 3) => ({
  id,
  type: 'loop' as const,
  condition,
  iterations,
  children,
})

const createConditionNode = (
  id: string,
  condition: string,
  trueBranch: StartDSL['children'],
  falseBranch: StartDSL['children'] = []
) => ({
  id,
  type: 'condition' as const,
  condition,
  trueBranch,
  falseBranch,
})

const extractSegment = (text: string, pattern: RegExp, fallback: string) => pattern.exec(text)?.[1]?.trim() || fallback

const describeGeneratedDsl = (dsl: StartDSL[]) => {
  const firstNode = dsl[0]?.children[0]

  switch (firstNode?.type) {
    case 'loop':
      return '循环结构积木'
    case 'condition':
      return '条件结构积木'
    case 'action':
      return '动作积木'
    default:
      return '流程积木'
  }
}

const ChatPanel: React.FC = () => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const setNodes = useFlowStore((s) => s.setNodes)
  const setEdges = useFlowStore((s) => s.setEdges)

  const parseNaturalLanguage = (text: string): StartDSL[] | null => {
    const lower = text.toLowerCase().trim()
    
    // 模式1: "点击加号直到金币满"
    if (lower.includes('点击') && lower.includes('直到')) {
      const target = extractSegment(text, /点击[【\[]?(.+?)(?:[】\]]|直到|就|$)/, 'plus_button')
      const condition = extractSegment(text, /直到[【\[]?(.+?)(?:[】\]]|$)/, 'gold < max')

      return wrapStart([
        createLoopNode('loop_ai', [createActionNode('action_ai', target)], condition, 10),
      ])
    }
    
    // 模式2: "循环点击X"
    if (lower.includes('循环') && lower.includes('点击')) {
      const target = extractSegment(text, /点击[【\[]?(.+?)(?:[】\]]|$)/, 'button')

      return wrapStart([
        createLoopNode('loop_ai', [createActionNode('action_ai', target)], 'repeat', 5),
      ])
    }
    
    // 模式3: "如果金币不足就点击加号"
    if (lower.includes('如果') || lower.includes('判断')) {
      const condition = extractSegment(text, /如果[【\[]?(.+?)(?:[】\]]|就|则|，|,|$)/, 'gold < 100')
      const target = extractSegment(text, /点击[【\[]?(.+?)(?:[】\]]|$)/, 'button')

      return wrapStart([
        createConditionNode('cond_ai', condition, [createActionNode('action_ai', target)]),
      ])
    }
    
    // 模式4: 简单点击
    if (lower.includes('点击')) {
      const target = extractSegment(text, /点击[【\[]?(.+?)(?:[】\]]|$)/, 'button')

      return wrapStart([createActionNode('action_ai', target)])
    }
    
    return null
  }

  const handleSend = () => {
    if (!input.trim()) return
    
    setMessages((prev) => [...prev, { role: 'user', text: input }])
    
    const dsl = parseNaturalLanguage(input)
    
    if (dsl) {
      const flow = dslToFlow(dsl)
      setNodes(flow.nodes)
      setEdges(flow.edges)
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: `✨ 已为你生成${describeGeneratedDsl(dsl)}！点击画布查看。`
      }])
    } else {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: '🤔 试试这样说：\n• "点击加号直到金币满"\n• "循环点击开始按钮"\n• "如果金币不足就点击加号"' 
      }])
    }
    
    setInput('')
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      background: '#f9fafb',
      borderRadius: 8,
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: 12, 
        background: '#6366f1', 
        color: '#fff', 
        fontWeight: 700,
        fontSize: 15
      }}>
        🤖 AI 助手
      </div>
      
      <div style={{ 
        flex: 1, 
        padding: 12, 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        {messages.length === 0 && (
          <div style={{ 
            padding: 16, 
            background: '#fff', 
            borderRadius: 8,
            fontSize: 13,
            color: '#666',
            lineHeight: 1.6
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#333' }}>💡 试试这样说：</div>
            <div>• "点击加号直到金币满"</div>
            <div>• "循环点击开始按钮"</div>
            <div>• "如果金币不足就点击加号"</div>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} style={{ 
            padding: 10, 
            background: msg.role === 'user' ? '#e0e7ff' : '#fff',
            borderRadius: 8,
            fontSize: 13,
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            whiteSpace: 'pre-line'
          }}>
            {msg.text}
          </div>
        ))}
      </div>
      
      <div style={{ 
        padding: 12, 
        borderTop: '1px solid #e5e7eb',
        background: '#fff',
        display: 'flex',
        gap: 8
      }}>
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="告诉我你想做什么..."
          style={{ 
            flex: 1, 
            padding: '8px 12px', 
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13
          }}
        />
        <button 
          onClick={handleSend}
          style={{ 
            padding: '8px 16px', 
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 13
          }}
        >
          发送
        </button>
      </div>
    </div>
  )
}

export default ChatPanel
