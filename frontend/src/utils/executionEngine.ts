import { DSLDocument, DSLExecutable, ConditionDSL, LoopDSL } from './dslParser'

export type ExecutionResult = 'completed' | 'stopped'

type ExecutionStageEvent = {
  kind: 'start' | 'action' | 'condition' | 'loop' | 'finish'
  label: string
  detail?: string
}

type ExecutionCallbacks = {
  onNodeEnter?: (nodeId: string) => void
  onNodeExit?: (nodeId: string) => void
  onStageEvent?: (event: ExecutionStageEvent) => void
  onLog?: (entry: string) => void
  shouldStop?: () => boolean
  stepDelayMs?: number
  evaluateCondition?: (condition: string, node: ConditionDSL) => boolean
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

const defaultEvaluateCondition = (condition: string, _node: ConditionDSL) => {
  const lower = condition.trim().toLowerCase()

  if (!lower) return true
  if (['不足', '小于', 'less', 'below', 'not enough', '<'].some((token) => lower.includes(token))) return true
  if (['已满', '满', 'enough', 'complete', '>=', '大于'].some((token) => lower.includes(token))) return false

  return true
}

const getLoopIterations = (node: LoopDSL) => {
  const raw = Number(node.iterations ?? node.params?.iterations)
  if (Number.isFinite(raw) && raw > 0) return raw
  return 3
}

async function runSequence(sequence: DSLExecutable[], callbacks: Required<ExecutionCallbacks>): Promise<ExecutionResult> {
  for (const node of sequence) {
    if (callbacks.shouldStop()) return 'stopped'

    if (node.type === 'action') {
      callbacks.onNodeEnter(node.id)
      callbacks.onStageEvent({
        kind: 'action',
        label: `正在执行 ${node.action ?? 'tap'}`,
        detail: node.target ? `目标：${node.target}` : undefined,
      })
      callbacks.onLog(`🎯 ${node.action ?? 'tap'} -> ${node.target ?? 'button'}`)
      await wait(callbacks.stepDelayMs)
      callbacks.onNodeExit(node.id)
      continue
    }

    if (node.type === 'condition') {
      const passed = callbacks.evaluateCondition(node.condition ?? '', node)
      callbacks.onNodeEnter(node.id)
      callbacks.onStageEvent({
        kind: 'condition',
        label: `判断：${node.condition || '条件表达式'}`,
        detail: passed ? '结果：true，进入真分支' : '结果：false，进入假分支',
      })
      callbacks.onLog(`❓ ${node.condition || 'condition'} => ${passed ? 'true' : 'false'}`)
      await wait(callbacks.stepDelayMs)
      callbacks.onNodeExit(node.id)

      const branchResult = await runSequence(passed ? node.trueBranch : node.falseBranch, callbacks)
      if (branchResult === 'stopped') return 'stopped'
      continue
    }

    if (node.type === 'loop') {
      const iterations = getLoopIterations(node)

      for (let index = 0; index < iterations; index += 1) {
        if (callbacks.shouldStop()) return 'stopped'

        callbacks.onNodeEnter(node.id)
        callbacks.onStageEvent({
          kind: 'loop',
          label: `循环第 ${index + 1} 次`,
          detail: node.condition ? `条件：${node.condition}` : `预计共 ${iterations} 次`,
        })
        callbacks.onLog(`🔁 ${node.id} 第 ${index + 1}/${iterations} 次`)
        await wait(callbacks.stepDelayMs)
        callbacks.onNodeExit(node.id)

        const childResult = await runSequence(node.children, callbacks)
        if (childResult === 'stopped') return 'stopped'
      }
    }
  }

  return 'completed'
}

export async function simulateDSLExecution(
  document: DSLDocument,
  callbacks: ExecutionCallbacks = {}
): Promise<ExecutionResult> {
  const resolvedCallbacks: Required<ExecutionCallbacks> = {
    onNodeEnter: callbacks.onNodeEnter ?? (() => undefined),
    onNodeExit: callbacks.onNodeExit ?? (() => undefined),
    onStageEvent: callbacks.onStageEvent ?? (() => undefined),
    onLog: callbacks.onLog ?? (() => undefined),
    shouldStop: callbacks.shouldStop ?? (() => false),
    stepDelayMs: callbacks.stepDelayMs ?? 650,
    evaluateCondition: callbacks.evaluateCondition ?? defaultEvaluateCondition,
  }

  for (const startNode of document) {
    if (resolvedCallbacks.shouldStop()) return 'stopped'

    resolvedCallbacks.onNodeEnter(startNode.id)
    resolvedCallbacks.onStageEvent({
      kind: 'start',
      label: '开始执行流程',
      detail: `入口：${startNode.id}`,
    })
    resolvedCallbacks.onLog(`🚀 开始执行 ${startNode.id}`)
    await wait(resolvedCallbacks.stepDelayMs)
    resolvedCallbacks.onNodeExit(startNode.id)

    const result = await runSequence(startNode.children, resolvedCallbacks)
    if (result === 'stopped') return 'stopped'
  }

  resolvedCallbacks.onStageEvent({
    kind: 'finish',
    label: '执行完成',
    detail: '流程已顺序模拟完成',
  })
  resolvedCallbacks.onLog('✅ 执行完成')
  return 'completed'
}