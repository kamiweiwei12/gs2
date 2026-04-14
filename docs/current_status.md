# Current Status

## 1. 目前工作目標

目前 frontend 正在進行「流程編輯器資料模型收斂」重構，核心方向是：

- React Flow 節點的業務資料統一放到 `node.data.params`
- `node.data` 本身只保留偏 UI / 編輯器狀態欄位，例如：`label`、`highlighted`、`loopParent`
- Inspector、節點 renderer、ChatPanel、DSL parser、FlowEditor、executionEngine 的資料流都要對齊這個模型

這份文件是之後每個小功能完成後的 checkpoint。**新開對話時，請先讀這份文件，再繼續下一個原子任務。**

---

## 2. 本輪已完成的架構收斂

### 2.1 統一的節點資料模型

檔案：`frontend/src/utils/dslParser.ts`

已建立並導出下列型別 / helper：

- `FlowNodeType`
- `FlowNodeParams`
- `FlowNodeData`
- `getFlowNodeParams()`
- `createFlowNodeData()`

目前約定：

- `node.data.label`：節點顯示名稱
- `node.data.highlighted`：執行高亮狀態
- `node.data.loopParent`：loop scope 關聯
- `node.data.params`：節點業務參數（action / target / condition / iterations 等）

### 2.2 DSL → Flow 的轉換已統一映射到 `data.params`

檔案：`frontend/src/utils/dslParser.ts`

新增 `dslExecutableToParams()`，讓 `dslToFlow()` 在建立 React Flow node 時，統一把 DSL 欄位映射進 `data.params`。

目前行為：

- action 節點：寫入 `params.action`、`params.target`
- condition 節點：寫入 `params.condition`
- loop 節點：寫入 `params.condition`、`params.iterations`

### 2.3 Flow → DSL 的輸出改為從 `node.data.params` 讀值

檔案：`frontend/src/utils/dslParser.ts`

`flowToDSL()` 已改為從 `node.data.params` 組 DSL，輸出的 DSL 比之前更乾淨，不再重複把 `params` 內的資料再塞回 DSL node。

### 2.4 Store 已統一負責節點資料同步

檔案：`frontend/src/store/flowStore.ts`

已新增：

- `mergeNodeData()`
- `mergeNodeParams()`
- `updateNodeParams(id, params)`

目前規則：

- Inspector 不再自己手動同步 `selectedNode`
- 所有節點更新後，都由 store 透過 `syncSelectedNode()` 回填目前選中節點
- 若是業務欄位更新，優先走 `updateNodeParams()`

### 2.5 Inspector 三個 editor 都已切到統一參數接口

檔案：

- `frontend/src/components/InspectorPanel/ActionEditor.tsx`
- `frontend/src/components/InspectorPanel/ConditionEditor.tsx`
- `frontend/src/components/InspectorPanel/LoopEditor.tsx`

目前規則：

- `ActionEditor` / `ConditionEditor` / `LoopEditor` 的讀值都使用 `getFlowNodeParams(selected.data)`
- Inspector editor 的寫值統一使用 `updateNodeParams(selected.id, patch)`
- 對 `unknown` 值做明確 narrowing，避免 strict TS 報錯

### 2.6 Node renderer 已補齊型別 narrowing

檔案：

- `frontend/src/nodes/ActionNode.tsx`
- `frontend/src/nodes/ConditionNode.tsx`
- `frontend/src/nodes/LoopNode.tsx`

目前 renderer 不會直接把 `unknown` 值渲染到 React tree，而是先做：

- `typeof value === 'string'`
- `Number(value)`
- `Number.isFinite(...)`

### 2.7 FlowEditor 建立新節點時已走統一工廠

檔案：`frontend/src/components/FlowEditor/FlowEditor.tsx`

目前初始節點與新增節點都使用 `createFlowNodeData(type)`，避免新節點出現不一致的 `data` 結構。

### 2.8 ChatPanel 的 DSL builder 已整理

檔案：`frontend/src/components/ChatPanel/ChatPanel.tsx`

已新增 helper：

- `wrapStart`
- `createActionNode`
- `createLoopNode`
- `createConditionNode`
- `extractSegment`
- `describeGeneratedDsl`

目前自然語言規則已簡化為較乾淨的 DSL 建構方式，不再在多處重複手寫 `params` 結構。

### 2.9 executionEngine 已兼容新的 loop 欄位位置

檔案：`frontend/src/utils/executionEngine.ts`

`getLoopIterations()` 目前會優先讀：

1. `node.iterations`
2. `node.params?.iterations`（相容舊資料）

### 2.10 Vite 型別宣告已補齊

檔案：`frontend/src/vite-env.d.ts`

已加入：

```ts
/// <reference types="vite/client" />
```

用來解掉 CSS side-effect import 相關型別問題。

### 2.11 Checkpoint 文件流程已落地

本輪已正式建立 checkpoint 機制，並處理了文件路徑衝突：

- 原本專案根目錄的 `docs` 其實是單一檔案
- 已依照決策將它改名為 `docs_legacy.md`
- 已建立真正的 `docs/` 資料夾
- 已新增 `docs/current_status.md` 作為後續 checkpoint 文件

### 2.12 frontend 已固化 typecheck 指令

檔案：`frontend/package.json`

已新增：

- `typecheck`: `tsc --noEmit`

目前規則：

- 後續每個原子任務完成後，都可以固定使用 `npm run typecheck` 做 frontend 型別檢查
- 型別驗證入口從原本手動執行 `tsc --noEmit`，收斂為 package script，方便 checkpoint 流程一致化

### 2.13 FlowEditor 的 loop scope 存取已收斂到 helper

檔案：

- `frontend/src/utils/dslParser.ts`
- `frontend/src/components/FlowEditor/FlowEditor.tsx`

本輪先針對 `FlowEditor` / `Stage` / `Toolbar` 做最小盤點，結果如下：

- `Stage` / `Toolbar` 沒有直接讀寫 `node.data` 的業務欄位
- `FlowEditor` 也沒有直接讀寫 `action` / `target` / `condition` / `iterations`
- `FlowEditor` 剩餘的直接存取點是 `loopParent`，而它屬於 UI / loop scope 狀態，不是業務參數

已新增 helper：

- `getFlowNodeLoopParent()`
- `setFlowNodeLoopParent()`

目前規則：

- `FlowEditor` 判斷 loop scope 時，不再直接使用 `(node.data as any)?.loopParent`
- `FlowEditor` 回寫 loop scope 時，也改成透過 helper 產生一致的 `FlowNodeData`
- 這一輪盤點已確認 `FlowEditor` / `Stage` / `Toolbar` 周邊沒有殘留直接讀寫 `node.data` 業務欄位的使用點

### 2.14 StartNode 的 highlighted 存取已收斂到 typed helper

檔案：

- `frontend/src/utils/dslParser.ts`
- `frontend/src/nodes/StartNode.tsx`

本輪先從 node renderer 中最小的 `as any` 使用點開始處理，結果如下：

- `dslParser.ts` 新增 `getFlowNodeHighlighted()`
- `StartNode` 改成使用 `NodeProps<FlowNodeData>`
- `StartNode` 不再直接使用 `(data as any)?.highlighted`
- `highlighted` 改由 typed helper 統一讀取

目前規則：

- 如果 renderer 只是要讀取 `node.data` 上的 UI 狀態欄位，優先透過 typed helper 存取
- `StartNode` 已成為後續清理 `ActionNode` / `ConditionNode` / `LoopNode` 類似存取點的最小範例

### 2.15 ActionNode 的 highlighted / params 存取已改成 typed data 存取

檔案：

- `frontend/src/nodes/ActionNode.tsx`

本輪延續 `StartNode` 的做法，先處理 node renderer 中另一個最小的 `as any` 使用點，結果如下：

- `ActionNode` 改成使用 `NodeProps<FlowNodeData>`
- `highlighted` 改成透過 `getFlowNodeHighlighted()` 讀取
- `params` 改成直接透過 `getFlowNodeParams(data)` 讀取
- 已移除 `ActionNode` 內 `(data as any)?.highlighted` 與 `getFlowNodeParams(data as any)`

目前規則：

- node renderer 若已切到 `NodeProps<FlowNodeData>`，就不再需要用 `as any` 讀取 `highlighted` / `params`
- `ActionNode` 現在與 `StartNode` 一樣，成為後續收斂 `ConditionNode` / `LoopNode` 的對齊範例

### 2.16 ConditionNode 的 highlighted / params 存取已改成 typed data 存取

檔案：

- `frontend/src/nodes/ConditionNode.tsx`

本輪延續前兩個 renderer 的收斂方式，繼續處理另一個最小的 `as any` 使用點，結果如下：

- `ConditionNode` 改成使用 `NodeProps<FlowNodeData>`
- `highlighted` 改成透過 `getFlowNodeHighlighted()` 讀取
- `params` 改成直接透過 `getFlowNodeParams(data)` 讀取
- 已移除 `ConditionNode` 內 `(data as any)?.highlighted` 與 `getFlowNodeParams(data as any)`

目前規則：

- `ConditionNode` 現在與 `StartNode`、`ActionNode` 使用相同的 typed renderer 讀值模式
- 後續若要清理其餘 renderer，可直接延用 `NodeProps<FlowNodeData>` + typed helper / typed data 存取的模板

### 2.17 LoopNode 的 highlighted / params 存取已改成 typed data 存取

檔案：

- `frontend/src/nodes/LoopNode.tsx`

本輪延續前三個 renderer 的收斂方式，完成最後一個 node renderer 內最小的 `as any` 使用點清理，結果如下：

- `LoopNode` 改成使用 `NodeProps<FlowNodeData>`
- `highlighted` 改成透過 `getFlowNodeHighlighted()` 讀取
- `params` 改成直接透過 `getFlowNodeParams(data)` 讀取
- 已移除 `LoopNode` 內 `(data as any)?.highlighted` 與 `getFlowNodeParams(data as any)`

目前規則：

- 四個 node renderer (`StartNode` / `ActionNode` / `ConditionNode` / `LoopNode`) 現在都已對齊到相同的 typed data 存取模式
- 後續清理剩餘 `as any` 時，可把重點轉移到 InspectorPanel 與 `flowStore`

### 2.18 ActionEditor 的 params 讀值已改成 typed data 存取

檔案：

- `frontend/src/components/InspectorPanel/ActionEditor.tsx`

本輪開始把 InspectorPanel 內剩餘最小的 `selected.data as any` 使用點逐一收斂，先處理 `ActionEditor`，結果如下：

- `ActionEditor` 的 `useEffect` 讀值改成直接使用 `getFlowNodeParams(selected.data)`
- 已移除 `ActionEditor` 內 `getFlowNodeParams(selected.data as any)`
- 本輪完成後重新執行 `npm run typecheck`，確認型別檢查仍然通過
- 重新盤點 `frontend/src/**/*.ts*` 的 `as any` 後，剩餘使用點為 `ConditionEditor`、`LoopEditor` 與 `flowStore`

目前規則：

- InspectorPanel 若只是從 `selected.data` 讀取節點業務參數，優先直接傳入 `getFlowNodeParams(selected.data)`
- InspectorPanel 的 `selected.data as any` 清理可依 editor 分開做，維持每輪只處理一個最小原子任務

### 2.19 ConditionEditor 的 params 讀值已改成 typed data 存取

檔案：

- `frontend/src/components/InspectorPanel/ConditionEditor.tsx`

本輪延續 `ActionEditor` 的做法，繼續處理 InspectorPanel 中另一個最小的 `selected.data as any` 使用點，結果如下：

- `ConditionEditor` 的 `useEffect` 讀值改成直接使用 `getFlowNodeParams(selected.data)`
- 已移除 `ConditionEditor` 內 `getFlowNodeParams(selected.data as any)`
- 本輪完成後重新執行 `npm run typecheck`，確認型別檢查仍然通過
- 重新盤點 `frontend/src/**/*.ts*` 的 `as any` 後，剩餘使用點為 `LoopEditor` 與 `flowStore`

目前規則：

- InspectorPanel 若只是從 `selected.data` 讀取節點業務參數，優先直接傳入 `getFlowNodeParams(selected.data)`
- InspectorPanel 目前只剩 `LoopEditor` 還有最後一個同型態的 `selected.data as any` 使用點

### 2.20 LoopEditor 的 params 讀值已改成 typed data 存取

檔案：

- `frontend/src/components/InspectorPanel/LoopEditor.tsx`

本輪延續 `ActionEditor` / `ConditionEditor` 的做法，完成 InspectorPanel 內最後一個 `selected.data as any` 使用點清理，結果如下：

- `LoopEditor` 的 `useEffect` 讀值改成直接使用 `getFlowNodeParams(selected.data)`
- 已移除 `LoopEditor` 內 `getFlowNodeParams(selected.data as any)`
- 本輪完成後重新執行 `npm run typecheck`，確認型別檢查仍然通過
- 重新盤點 `frontend/src/**/*.ts*` 的 `as any` 後，剩餘使用點只剩 `flowStore`

目前規則：

- InspectorPanel 三個 editor 現在都已完成 `selected.data as any` → typed data 存取收斂
- 後續剩餘的 `as any` 清理重點可集中到 `flowStore` 內的資料合併邏輯

### 2.21 flowStore 的 highlighted UI state 合併已收斂到 typed helper

檔案：

- `frontend/src/utils/dslParser.ts`
- `frontend/src/store/flowStore.ts`

本輪開始處理 `flowStore` 內剩餘較小的 `as any` 使用點，先收斂 execution highlight 的 UI state 合併邏輯，結果如下：

- `dslParser.ts` 新增 `setFlowNodeHighlighted()` helper
- `flowStore` 的 `setHighlightedNode()` 改成透過 `setFlowNodeHighlighted(node.data, highlighted)` 回寫資料
- 已移除 `setHighlightedNode()` 內 `(node.data as any)` 的直接展開
- 本輪完成後重新執行 `npm run typecheck`，確認型別檢查仍然通過
- 重新盤點 `frontend/src/**/*.ts*` 的 `as any` 後，剩餘使用點只剩 `flowStore.ts` 的 `mergeNodeParams()`

目前規則：

- 若只是更新 `node.data` 上的 UI 狀態欄位，優先透過 typed helper 產生一致的 `FlowNodeData`
- `flowStore` 目前只剩 `mergeNodeParams()` 內最後一個 `params` 合併的 `as any` 待清理

### 2.22 flowStore 的 params 合併已改成 typed helper 存取

檔案：

- `frontend/src/store/flowStore.ts`

本輪延續 `flowStore` 的收斂方式，處理 `mergeNodeParams()` 內最後一個 `params` 合併 `as any`，結果如下：

- `flowStore` 改成透過 `getFlowNodeParams(node.data)` 讀取既有 `params`
- 已移除 `mergeNodeParams()` 內最後一個 `(node.data as any)?.params`
- 本輪完成後重新執行 `npm run typecheck`，確認型別檢查仍然通過
- 重新盤點 `frontend/src/**/*.ts*` 的 `as any` 後，結果為 0 筆

目前規則：

- 若只是合併節點業務參數，優先透過 `getFlowNodeParams()` 讀取既有 `params`
- `mergeNodeParams()` 不再直接以 `any` 方式從 `node.data` 讀取 `params`
- 目前 `frontend/src/**/*.ts*` 已無 `as any` 使用點

### 2.23 FlowEditor 的拖曳連線預覽已加入即時合法 / 不合法高亮

檔案：

- `frontend/src/components/FlowEditor/FlowEditor.tsx`
- `frontend/src/utils/validateConnection.ts`
- `frontend/src/nodes/StartNode.tsx`
- `frontend/src/nodes/ActionNode.tsx`
- `frontend/src/nodes/ConditionNode.tsx`
- `frontend/src/nodes/LoopNode.tsx`
- `frontend/src/styles/flow.css`

本輪以一個最小 atomic task 實作 React Flow 拖曳連線時的即時驗證回饋，結果如下：

- 已把 `FlowEditor` 既有連線規則抽成 `validateConnection()` 共用 validator
- `onConnect`、`isValidConnection` 與拖曳中的 preview 都改成共用同一套驗證結果，避免預覽與實際建立 edge 規則不一致
- `FlowEditor` 新增 local `connectionPreview` state，只保存暫時的 UI preview 狀態，不寫回 `node.data`、不改 store 資料模型
- 拖曳 source handle 時，hover 到合法 target node / handle 會套用 `connection-preview-valid` 綠色高亮
- hover 到不合法 target node / handle 會套用 `connection-preview-invalid` 紅色高亮
- 放開拖曳、取消拖曳、連線失敗或移出 target node 時，preview highlight 會清除
- node renderer 只補上最小的 className（`node-highlight` / `node-target-handle`），未改 DSL / execution logic，也維持業務資料仍集中於 `node.data.params` 的約定

目前規則：

- business data 仍放在 `node.data.params`
- connection preview / hover feedback 屬於暫時 UI state，維持在 `FlowEditor` local state，不污染 store
- 連線規則若後續需要調整，優先修改 `validateConnection()`，避免 `onConnect`、`isValidConnection` 與 preview 分別維護不同版本

### 2.24 FlowEditor 的 invalid connection preview 已補上即時 reason 文案

檔案：

- `frontend/src/components/FlowEditor/FlowEditor.tsx`

本輪延續上一個 connection preview atomic task，只補一個最小 UX 細節，結果如下：

- 拖曳連線中若 hover 到不合法 target，除了紅色高亮外，右上角也會即時顯示簡短 invalid reason 文案
- preview reason 直接重用 `validateConnection()` 回傳的 `reason`，避免拖曳中的提示與實際落下時的錯誤訊息不一致
- 這段文案只在 `connectionPreview.active && valid === false` 時顯示，拖曳結束、移出 target 或取消拖曳時會一起清除
- 實作仍維持 local UI state，沒有新增 store 欄位，也沒有改 DSL / execution logic / business data model

目前規則：

- preview 的說明文案屬於暫時 UI feedback，應跟隨 `connectionPreview` 一起建立與清除
- invalid preview message 與落下後的 invalid toast 優先共用同一個 validator reason，避免兩套文案來源分叉

### 2.25 FlowEditor 的 invalid feedback overlay 已統一 preview / submit 顯示規則

檔案：

- `frontend/src/components/FlowEditor/FlowEditor.tsx`

本輪延續上一個 UX 一致性檢查，只做最小顯示收斂，結果如下：

- `FlowEditor` 新增單一的 `activeInvalidFeedback` 計算值，統一決定目前畫面上要顯示的 invalid feedback 文案
- 拖曳中的 invalid preview reason 與 `onConnect` 失敗後的 invalid message，現在共用同一個右上角 overlay 呈現，不再分成兩種位置 / 色階 / icon 樣式
- 若拖曳失敗後同時存在 submit invalid message，會優先顯示 submit 後的訊息；preview state 清掉後 UI 不會出現雙層錯誤框疊加
- 實作仍維持 local UI state，沒有新增 store 欄位，也沒有改 DSL / execution logic / business data model

目前規則：

- invalid feedback UI 應優先由單一計算後的訊息來源驅動，避免 preview 與 submit 後提示各自維護不同樣式
- submit 後的 invalid message 優先級高於拖曳中的 preview reason，避免同時顯示兩個錯誤提示

### 2.26 Condition node 的 continuation handle 語義已明確化

檔案：

- `frontend/src/utils/dslParser.ts`
- `frontend/src/utils/validateConnection.ts`
- `frontend/src/nodes/ConditionNode.tsx`

本輪依照「先做語義 contract 清楚化，再做最小 UI 配合」的節奏，先補齊 condition 節點 continuation edge 的明確 handle 約定，結果如下：

- `ConditionNode` 新增底部 `out` source handle，condition 節點不再只有 `true` / `false` 兩個分支出口
- `dslParser.ts` 新增 `createContinuationEdge()`，讓 DSL → Flow 建立的順序 / continuation 邊統一寫入 `sourceHandle: 'out'`
- `validateConnection()` 對 condition 節點改為接受 `true` / `false` / `out` 三種 source handle
- condition 的 `out` continuation 與 `true` / `false` 分支一樣，現在都會檢查「同一個 source handle 只能連一次」
- `flowToDSL()` 仍保留 `!edge.sourceHandle || edge.sourceHandle === 'out'` 視為 continuation 的相容讀法，避免舊資料立即失效

目前規則：

- continuation edge 的語義 contract 收斂為顯式 `sourceHandle: 'out'`
- condition 節點現在有三種合法輸出：`true`、`false`、`out`
- validator / renderer / DSL conversion 對 condition continuation handle 已對齊，但 Flow → DSL 仍保留對舊的 `undefined` handle 邊的相容讀取
- 本輪 UI 手動驗證路徑應為：建立 `Condition -> Action`，分別從 `true` / `false` / `out` 拖曳，確認 `out` 可作為 continuation，且同一個 handle 不能重複連線

### 2.27 Start / Action / Loop node 的 continuation handle contract 已在 validator 顯式化

檔案：

- `frontend/src/utils/validateConnection.ts`

本輪延續上一個「先補語義 contract，再做最小配套」的節奏，只收斂 `start` / `action` / `loop` 這三種單一路徑節點的 continuation source handle 規則，結果如下：

- `validateConnection()` 現在會要求 `start` / `action` / `loop` 節點只能透過 `sourceHandle: 'out'` 建立連線
- 原本的單一出口限制仍保留：`start` / `action` 仍只能有一條 outgoing connection
- `loop` 節點原本的 child target 限制仍保留：target 若已有 incoming edge 仍會被擋下
- 目前內建節點的 source handle contract 已更完整閉合：`start` / `action` / `loop` 使用 `out`，`condition` 使用 `true` / `false` / `out`
- 本輪沒有改 store、execution logic、`node.data.params`、FlowEditor 架構，也沒有調整 DSL 格式

目前規則：

- 對於單一路徑 continuation 節點，validator 不應只靠 outgoing count 判斷，還要顯式檢查 `sourceHandle === 'out'`
- `start` / `action` / `loop` 的 continuation edge contract 現在由 renderer handle、DSL 建邊與 validator 三方共同約束
- `condition` 維持三出口語義，未與單一路徑節點共用模糊的 fallback 規則
- 本輪 UI 手動驗證路徑應為：在 FlowEditor 內分別建立 `Start -> Action`、`Action -> Loop`、`Loop -> Action`，確認從底部 `out` handle 拖曳可成功連線，且既有單一出口 / loop child 限制仍照常生效

### 2.28 Flow → DSL 的 continuation edge 判定已收斂到單一 helper

檔案：

- `frontend/src/utils/dslParser.ts`

本輪延續 continuation handle contract 的語義收斂，只處理 `flowToDSL()` 內 continuation edge 的判定入口，結果如下：

- `dslParser.ts` 新增 `isContinuationEdge()` helper，集中判定 edge 是否屬於 continuation
- `flowToDSL()` 內原本分散的 `!edge.sourceHandle || edge.sourceHandle === 'out'` 判定，現在改成統一使用 `isContinuationEdge()`
- `buildSequence()` 與 start node 的 first child 解析，現在共用同一個 continuation 判定來源，避免同義條件在多處分叉
- helper 仍保留對舊資料 `undefined sourceHandle` 的相容讀法，沒有改動 DSL 格式、store 架構、execution logic 或 `node.data.params` 約定
- 本輪沒有 UI 行為改動，因此不需要新增手動驗證路徑

目前規則：

- Flow → DSL 若要判定 continuation edge，優先透過 `isContinuationEdge()`，不要在多處重寫 `!edge.sourceHandle || edge.sourceHandle === 'out'`
- validator 端維持顯式 `sourceHandle: 'out'` 的新資料契約；Flow → DSL 端則透過 helper 集中保留舊 `undefined` handle 的相容讀取
- continuation edge 的相容規則現在已從 scattered inline condition 收斂為單一 helper，後續若要收緊或調整相容策略，只需改一個入口

### 2.29 source handle 命名來源已收斂到共用常數

檔案：

- `frontend/src/utils/dslParser.ts`
- `frontend/src/utils/validateConnection.ts`
- `frontend/src/nodes/ConditionNode.tsx`

本輪延續 continuation / branch handle contract 的收斂方式，只做最小命名來源一致化，結果如下：

- `dslParser.ts` 已導出 `CONTINUATION_HANDLE`、`CONDITION_TRUE_HANDLE`、`CONDITION_FALSE_HANDLE`
- `dslParser.ts` 內 continuation edge 建立、condition branch edge 建立，以及 `flowToDSL()` 的 handle 判定都改為共用上述常數
- `validateConnection.ts` 內 `start` / `action` / `loop` / `condition` 的 handle 驗證與 condition continuation fallback，都改為使用共用常數
- `ConditionNode` 的 `true` / `false` / `out` source handle `id` 已改為共用常數，讓 renderer / validator / DSL helper 的命名來源一致
- 本輪完成後重新執行 `npm run typecheck`、`npm run build`，確認皆通過
- 重新盤點 `frontend/src/**/*.ts*` 的 `as any` 後，結果仍為 0 筆

目前規則：

- 若程式碼需要引用 continuation / branch handle，優先從 `dslParser.ts` 導入共用常數，不要再直接散落寫 `'out'` / `'true'` / `'false'`
- source handle contract 現在除了規則一致外，命名來源也已一致；後續若要調整 handle 命名，應優先從共用常數出發

### 2.30 單一路徑 renderer 的 continuation handle 命名來源已收斂到共用常數

檔案：

- `frontend/src/nodes/StartNode.tsx`
- `frontend/src/nodes/ActionNode.tsx`
- `frontend/src/nodes/LoopNode.tsx`

本輪延續上一輪的 source handle 命名來源收斂，只處理 renderer 端剩餘的單一路徑 continuation handle 硬編碼，結果如下：

- `StartNode` / `ActionNode` / `LoopNode` 內原本散落的 `id="out"`，現在都改為引用 `CONTINUATION_HANDLE`
- 已順手盤點 `frontend/src/nodes/**/*.tsx` 與 `frontend/src/components/**/*.tsx`，本輪範圍內未再發現 UI renderer / editor 端殘留硬編碼 `'out'` / `'true'` / `'false'`
- 本輪沒有修改 store、execution logic、`node.data.params` 約定、FlowEditor 架構、DSL 格式，也沒有新增 UI state 或行為分支
- 本輪完成後重新執行 `npm run typecheck`、`npm run build`，確認皆通過
- 重新盤點 `frontend/src/**/*.ts*` 的 `as any` 後，結果仍為 0 筆

目前規則：

- 單一路徑 renderer 若需要 continuation source handle，一律從 `dslParser.ts` 導入 `CONTINUATION_HANDLE`，不要再直接寫 `id="out"`
- 目前 continuation handle 的命名來源已對齊到 DSL helper / validator / condition renderer / start-action-loop renderer；後續若要調整命名，應只從共用常數出發

### 2.31 branch handle 硬編碼殘留盤點已完成，命名來源確認全數收口

檔案：

- `docs/current_status.md`

本輪依照上一輪 checkpoint 的建議，只做一個最小 atomic task：盤點 UI / editor / parser / validator 中是否仍有 branch handle 硬編碼殘留，結果如下：

- 重新搜尋 `frontend/src/**/*.ts*` 後，`'out'` / `'true'` / `'false'` raw string 只剩 `dslParser.ts` 內的共用常數定義，以及 `executionEngine.ts` 內與 handle contract 無關的執行 log 文案
- `ConditionNode`、`validateConnection.ts`、`dslParser.ts` 與單一路徑 renderer 的 source handle 命名來源已確認全數對齊到 `CONTINUATION_HANDLE` / `CONDITION_TRUE_HANDLE` / `CONDITION_FALSE_HANDLE`
- 本輪沒有修改 frontend 程式碼，因為 branch handle 命名來源在目前範圍內已沒有殘留硬編碼需要再收斂
- 盤點時順手確認到 `id="in"` 只出現在 `ActionNode` / `ConditionNode` / `LoopNode` 的 target handle；這屬於另一個 target handle contract 議題，不納入本輪 branch handle atomic task
- 本輪完成後重新執行 `npm run typecheck`、`npm run build`，並再次確認 `frontend/src/**/*.ts*` 的 `as any` 仍為 0 筆

目前規則：

- 若本輪目標是 source / branch handle 命名來源盤點，`'out'` / `'true'` / `'false'` 只要仍侷限於共用常數定義，就視為命名來源已收口，不需要為了消除常數值本身再做額外改動
- `executionEngine.ts` 內的 `'true'` / `'false'` 字串屬執行結果 log，不屬於 handle contract，不應與 source handle 命名來源收斂混為同一個任務
- `id="in"` 屬 target handle contract；若後續要處理，應另開新的一個原子任務，不要和 branch handle 收斂混做一輪

### 2.32 target handle 命名來源已收斂到共用常數

檔案：

- `frontend/src/utils/dslParser.ts`
- `frontend/src/nodes/ActionNode.tsx`
- `frontend/src/nodes/ConditionNode.tsx`
- `frontend/src/nodes/LoopNode.tsx`

本輪延續前幾輪對 source handle contract 的收斂方式，只處理 target handle 的命名來源一致化，結果如下：

- 重新盤點 `frontend/src/nodes/**/*.tsx`、`frontend/src/components/**/*.tsx`、`frontend/src/utils/validateConnection.ts`、`frontend/src/utils/dslParser.ts` 後，`id="in"` 只出現在 `ActionNode` / `ConditionNode` / `LoopNode` 的 target handle renderer
- `dslParser.ts` 已新增並導出 `TARGET_HANDLE`，作為目前 target handle contract 的共用命名來源
- `ActionNode` / `ConditionNode` / `LoopNode` 內原本的 `id="in"` 已改為引用 `TARGET_HANDLE`
- 盤點確認目前 `validateConnection.ts`、`dslParser.ts` 的 DSL 轉換邏輯，以及 `FlowEditor` 的 connection preview / `onConnect` 都沒有依賴 `connection.targetHandle` 或 raw `'in'`；因此本輪不擴大為 validator / parser 重構，只做 renderer 命名來源收斂
- `StartNode` 沒有 target handle，本輪不為了「對稱」額外新增規則或行為
- 本輪沒有修改 store 架構、UI state、`node.data.params` 約定、FlowEditor 架構、execution logic、DSL 格式，也沒有調整 validator 規則本身
- 本輪完成後重新執行 `npm run typecheck`、`npm run build`，並再次確認 `frontend/src/**/*.ts*` 的 `as any` 仍為 0 筆

目前規則：

- 若 renderer 需要節點輸入 target handle，一律從 `dslParser.ts` 導入 `TARGET_HANDLE`，不要再直接寫 `id="in"`
- 目前 target handle contract 已形成 renderer 端的穩定命名來源；但 validator / parser / FlowEditor 尚未依賴 `targetHandle` 值，後續若要擴大契約，應另開新的原子任務，不要和本輪命名來源一致化混做

### 2.33 專案協作規則與新對話模板已文件化

檔案：

- `.clinerules`
- `ARCH.md`
- `docs/cline_prompt_templates.md`
- `docs/current_status.md`

本輪依照「把對話要求外部化」的方向，只處理協作規則與新對話起手模板的文件化，結果如下：

- 已新增根目錄 `.clinerules`，將這個專案固定遵守的協作規則收斂成單一入口
- `.clinerules` 已明確要求新對話先讀 `.clinerules`、`ARCH.md`、`docs/current_status.md`，再分析、再規劃、最後才改碼
- 已新增 `ARCH.md`，摘要化整理目前流程編輯器的核心資料分層、handle contract、主要檔案與不可破壞的 invariants
- 已新增 `docs/cline_prompt_templates.md`，提供通用起手模板、方案確認後實作模板，以及連續修不好時的中止模板
- 本輪沒有修改 frontend 執行邏輯、validator 規則、store、DSL 格式或 `node.data.params` / `node.data` 的資料模型，只是把既有約束正式文件化

目前規則：

- 每次新對話開始時，優先閱讀 `.clinerules`、`ARCH.md`、`docs/current_status.md`
- 若任務不是 trivial，先輸出繁體中文理解與最小 implementation plan，再等待確認
- 協作規則、架構摘要與提示模板現在都已有獨立文件，不需要每次從零重新描述

### 2.34 target handle 的 runtime 依賴盤點已完成，契約維持 renderer 命名來源層級

檔案：

- `frontend/src/components/FlowEditor/FlowEditor.tsx`
- `frontend/src/utils/validateConnection.ts`
- `frontend/src/utils/dslParser.ts`
- `docs/current_status.md`

本輪依照上一個 checkpoint 的建議，只做一個最小 atomic task：盤點 `FlowEditor` / `validateConnection.ts` / `dslParser.ts` 是否真的對 `connection.targetHandle` 有 runtime 行為依賴，結果如下：

- 重新搜尋 `targetHandle` / `TARGET_HANDLE` 後，確認 `TARGET_HANDLE` 目前只在 node renderer 端作為 target handle `id` 的共用命名來源
- `FlowEditor` 目前只是在 `isValidConnection()` 中把 `candidate.targetHandle` 原樣帶進 `Connection` 物件；拖曳 hover preview 路徑仍固定以 `targetHandle: null` 做驗證
- `validateConnection()` 目前完全沒有讀取 `connection.targetHandle`，實際連線合法性仍只由 source handle、node type、incoming / outgoing 限制、loop scope 與 cycle detection 決定
- `dslParser.ts` 目前只導出 `TARGET_HANDLE` 常數，DSL → Flow 與 Flow → DSL 都沒有依賴 `targetHandle` 值
- 因此本輪不擴大修改 validator 規則、FlowEditor 行為、DSL 格式或 execution semantics，只補上一則最小註解與 checkpoint 澄清，維持 target handle 契約目前停留在 renderer 命名來源層級

目前規則：

- 若 renderer 需要 target handle 命名，仍一律從 `dslParser.ts` 導入 `TARGET_HANDLE`
- 在目前架構下，`connection.targetHandle` 不是 runtime 驗證或 DSL 轉換的真相來源；不要誤以為 renderer 已導入 `TARGET_HANDLE` 就代表 validator / parser 已依賴它
- 若後續真的要把 target handle 納入連線契約，應另開新的原子任務，同步盤點並對齊 `FlowEditor`、`validateConnection.ts`、`dslParser.ts`、自訂 node renderer 與驗證路徑，不要在小任務中順手擴大

### 2.35 loop 控制流語義閉合度盤點已完成，結論先文件化、不動程式碼

檔案：

- `docs/current_status.md`

本輪依照「先做語義盤點、不要急著改碼」的要求，只盤點 loop 在 parser / validator / editor / executionEngine 之間的控制流契約是否已完整閉合，結果如下：

- 已確認 loop 在 DSL / execution 層的主語義是 structured control node，而不是 graph 上的回邊：`LoopDSL` 以 `children` 表示 body，`executionEngine` 以 `iterations` 重複執行 `children`
- 已確認目前 editor graph 仍全域禁止 cycle，因此 loop 的重複不是靠 edge 回圈，而是靠 `simulateDSLExecution()` 在 DSL 層重跑 body
- 已確認 `dslToFlow()` 目前會把 loop body entry 與 loop 後續 continuation 都建立成 `sourceHandle: out` 的 continuation edge，沒有額外 body / exit handle 區分
- 已確認 `flowToDSL()` 目前會從 loop 的 plain outgoing edges 中，用 `target.position.x > source.position.x` 的幾何規則推定哪一條是 body edge，剩下那條才視為 continuation edge
- 已確認 `validateConnection()` 對 loop 目前只有最小限制：source handle 必須是 `out`、target 不能已有 incoming edge、不可跨 loop scope、不可形成 cycle；但它不知道哪條是 body、哪條是 exit，也沒有顯式限制「最多一條 body + 一條 continuation」
- 已確認 `FlowEditor` 的 `computeLoopParents()` 目前是從 loop 節點沿所有可達邊做 BFS，因此 `loopParent` 比較接近 downstream reachability，而不是只沿 loop body edge 計算的 body-only scope
- 已確認 `LoopNode` renderer 目前只暴露一個 `out` source handle；和 `ConditionNode` 已顯式區分 `true` / `false` / `out` 相比，loop 的不同 outgoing role 仍未顯式化
- 已確認 `executionEngine` 與 DSL loop semantics 一致：真正控制重複的是 `iterations`；`condition` 目前只用於顯示 stage event / log，不參與 loop 是否繼續

目前結論可分成三層：

1. 已明確成立的 contract
   - loop 在 DSL 層是 structured node：`children` 表 body，`iterations` 表重複次數
   - editor graph 不使用 loop back-edge；cycle detection 仍是全域禁止
   - runtime execution semantics 與 DSL 一致，都是 repeat N times，而不是依賴 graph cycle
   - loop source handle 目前唯一合法輸出仍是 `CONTINUATION_HANDLE`

2. 仍屬隱含行為、尚未完整閉合的部分
   - loop body edge 與 continuation edge 沒有顯式 contract，兩者目前都共用 `out`
   - Flow → DSL 仍依賴節點幾何位置推定 body edge，語義不夠穩定
   - validator 尚未把 loop outgoing role 顯式化，因此無法單獨限制 body / continuation 的數量
   - `computeLoopParents()` 目前採 reachability 模型，不是精確的 body-only loop scope
   - nested loop 的 `loopParent` 仍偏向 first-write-wins，而不是嚴格 innermost scope semantics

3. 是否需要下一輪實作
   - 若 2.35 的目標只是「盤點並文件化」，本輪已完成
   - 若目標是讓 loop 控制流語義「完整閉合」，目前答案是否；仍需要後續獨立原子任務收斂 body edge / continuation edge 契約

本輪沒有修改 frontend 程式碼、validator 規則、DSL 格式、execution semantics 或 UI state，只把既有 loop contract、隱含行為與缺口正式寫進 checkpoint，避免後續把 parser heuristics 誤當成已明確設計的語義契約。

目前規則：

- 在目前架構下，loop 的真正執行語義以 DSL structured node 為準，不應把 editor graph 的無回邊結構誤解為「loop 不存在」
- 在目前架構下，loop 的 body edge / continuation edge 尚未有顯式 handle contract；`flowToDSL()` 仍只是用幾何位置做還原 heuristic
- 若後續要補齊 loop 控制流契約，應另開新的原子任務，同步對齊 `LoopNode.tsx`、`validateConnection.ts`、`dslParser.ts`、`FlowEditor.tsx` 與手動驗證路徑；不要在小任務中順手擴大

### 2.36 loop body / exit handle contract 已在 renderer / parser / validator / scope 計算中顯式閉合

檔案：

- `frontend/src/utils/dslParser.ts`
- `frontend/src/nodes/LoopNode.tsx`
- `frontend/src/utils/validateConnection.ts`
- `frontend/src/components/FlowEditor/FlowEditor.tsx`

本輪延續 2.35 的缺口盤點，將 loop body edge 與 continuation / exit edge 的角色用最小改動正式落地，結果如下：

- `dslParser.ts` 已新增 `LOOP_BODY_HANDLE`、`createLoopBodyEdge()` 與 `classifyLoopOutgoingEdges()`，讓 DSL → Flow 以顯式 `sourceHandle: 'body'` 建立 loop body edge，Flow → DSL 則優先讀取顯式 body handle，只有舊資料才 fallback 到原本的幾何判定
- `LoopNode.tsx` 現在除了底部的 `CONTINUATION_HANDLE` 外，也新增右側 `LOOP_BODY_HANDLE` source handle，讓 editor UI 能直接畫出 loop body 與 loop exit 兩種不同 outgoing role
- `validateConnection.ts` 現在已知道 loop 有 `body` / `out` 兩種合法 source handle，並透過 `classifyLoopOutgoingEdges()` 對既有 outgoing edges 做角色判定，因此無論是新資料或舊資料，都會限制「body 最多一條、continuation 最多一條」
- `validateConnection.ts` 仍保留 body entry 的最小結構限制：loop body target 不能已經有其他 incoming edge；但 loop continuation 不再被誤當成 body child 一起套用這條限制
- `FlowEditor.tsx` 的 `computeLoopParents()` 已改為先用 `classifyLoopOutgoingEdges()` 找出每個 loop 的 body entry，再只沿 body subtree 做 BFS；因此 loop exit downstream 不會再被誤標成同一個 `loopParent`
- 這一輪沒有改動 `executionEngine.ts` 的 runtime semantics，也沒有修改 cycle detection 的全域規則；loop 仍然是 DSL structured control node，graph 端只是把 body / exit role 顯式化

目前規則：

- loop 節點現在有兩個顯式合法輸出：`LOOP_BODY_HANDLE`（body）與 `CONTINUATION_HANDLE`（exit / continuation）
- parser、validator、FlowEditor loop scope 計算現在共用同一個 loop outgoing role 分類來源：`classifyLoopOutgoingEdges()`
- 新資料優先使用顯式 `body` handle；舊資料若尚未帶 `sourceHandle: 'body'`，仍可透過分類 helper 保留相容讀取
- `loopParent` 現在只代表 body subtree scope，不再包含 loop 自身的 exit downstream

### 2.37 nested loop 的 `loopParent` 已從 first-write-wins 收斂為 innermost scope semantics

檔案：

- `frontend/src/components/FlowEditor/FlowEditor.tsx`

本輪延續 2.36 完成後留下的 nested loop scope 議題，只做一個最小 atomic task：讓 `computeLoopParents()` 對巢狀 loop 採用「內層覆蓋外層」的 innermost semantics，結果如下：

- `FlowEditor.tsx` 的 `computeLoopParents()` 不再在掃描 loop 時直接 first-write-wins 寫入 `mapping`
- 現在會先為每個 loop 分別計算 body subtree 節點集合，再根據「某個 loop 是否落在其他 loop 的 body subtree 中」推得 loop nesting depth
- loop scopes 會先依 depth 由外到內排序，再把 body subtree 節點寫回 `mapping`；因此外層 loop 會先標記 scope，內層 loop 會在同一批節點上覆寫成更接近的 loop parent
- 結果是 nested loop body 內的節點，`loopParent` 現在會指向最近的內層 loop，而不是沿用先前的外層 loop
- `validateConnection.ts` 本輪不需要新增規則；既有的 `targetLoopParent !== sourceLoopParent` 比較在 innermost scope 更精確後，仍能維持「不能直接跨 loop scope 連線」的限制，同時允許同一 innermost scope 內的合法連線
- 本輪完成後已重新執行 `npm run typecheck` 與 `npm run build`，兩者皆成功；`vite build` 過程只有既有的 Vite CJS Node API deprecation warning，未影響 `dist/` 產物輸出

目前規則：

- `loopParent` 的語義現在是「最近的 body-owner loop」，不是「第一個掃描到的外層 loop」
- 對 nested loop body 節點而言，scope 判定應優先反映 innermost loop，而不是 outer loop reachability
- 既有 validator 仍以 `loopParent` 是否相等作為 loop scope 邊界判定；因此若後續再調整 scope 模型，必須同步重新檢查 `validateConnection.ts`

### 2.38 FlowEditor 已新增 dev-only 自動驗證器，用固定 fixture 批量比對 preview / submit 一致性

檔案：

- `frontend/src/components/FlowEditor/FlowEditor.tsx`
- `frontend/src/styles/flow.css`

本輪延續 2.37 後的 scope UX 驗證需求，但刻意不改 validator / DSL semantics，只新增一個 dev-only 的自動驗證入口，結果如下：

- `FlowEditor.tsx` 已新增 `import.meta.env.DEV` 條件下才顯示的 `Run Auto-Verify` 按鈕，正式環境不會看到這組工具 UI
- auto verify 會在 `FlowEditor` local state / function scope 內建立固定的 `nested loop × condition` fixture，案例同時覆蓋 inner / outer loop、condition branch / continuation，以及跨 scope target
- 每個案例都會跑兩次 `validateConnection()`：一次模擬拖曳 preview（`targetHandle: null`），一次模擬實際 `onConnect` submit（帶 `TARGET_HANDLE`），然後比對 `valid` 與 `reason` 是否一致
- 驗證過程會暫時把 fixture 塞進目前畫布，等待 `computeLoopParents()` 的 effect 收斂後再批量檢查，結束後自動還原原本的 `nodes`、`edges` 與 `selectedNode`，避免污染使用者編輯狀態
- `frontend/src/styles/flow.css` 已補上 `flow-dev-verify-*` 樣式，包含 dev-only button、running / error / report overlay、result list 與 match / mismatch badge，沿用既有 CSS 檔，不另外引入 UI library
- 本輪仍維持單一真相來源：連線是否合法只由既有 `validateConnection()` 決定；auto verify 只做批量呼叫與結果呈現，不修改規則本身，也不改 DSL / execution semantics

目前規則：

- preview vs submit 一致性驗證屬於開發期工具，只能存在於 `FlowEditor` local state / function scope，不寫入 store 或 `node.data`
- 自動驗證若需要引用 handle 命名，一律從 `dslParser.ts` 導入 `CONTINUATION_HANDLE`、`CONDITION_TRUE_HANDLE`、`CONDITION_FALSE_HANDLE`、`TARGET_HANDLE`、`LOOP_BODY_HANDLE`
- auto verify 執行前後都必須自動還原原畫布與選取狀態，避免 fixture 污染真實編輯資料

---

## 3. 目前已確認解掉的問題

### 已解決

- 節點業務資料來源分散
- Inspector / `selectedNode` / `nodes[]` 更新邏輯重複
- `unknown` / `Record<string, unknown>` 導致的 strict TS narrowing 問題
- `flowStore.ts` 內最後一個 `params` 合併 `as any` 殘留點
- Vite/CSS 型別宣告缺失
- FlowEditor 拖曳連線時缺少合法 / 不合法 target 的即時視覺回饋
- FlowEditor 拖曳到不合法 target 時，缺少同步的即時原因提示
- FlowEditor 拖曳中的 invalid preview 與落下後的 invalid 提示樣式 / 位置不一致
- Condition 節點 continuation edge 原本缺少顯式 source handle 契約，導致 renderer / validator / DSL conversion 的語義不夠清楚
- Start / Action / Loop 節點 continuation edge 原本只在 renderer / DSL 邊隱含使用 `out` handle，但 validator 尚未把這個 source handle contract 顯式化
- Flow → DSL 內 continuation edge 的相容判定原本分散在多處 inline condition，後續調整時容易出現規則分叉
- source handle 的命名來源原本仍散落硬編碼 `'out'` / `'true'` / `'false'`，後續若調整契約名稱容易漏改
- Start / Action / Loop renderer 端原本仍殘留 `id="out"` 硬編碼，導致 continuation handle 的命名來源尚未完全收斂
- UI / editor / parser / validator 中是否仍有 branch handle 硬編碼殘留，現在已完成盤點並確認 source / branch handle 命名來源已收口
- Action / Condition / Loop renderer 端原本仍散落 `id="in"` target handle 硬編碼，導致 target handle 的命名來源尚未統一
- target handle 的 renderer 命名來源現已收斂到 `TARGET_HANDLE`
- `connection.targetHandle` 目前在 `FlowEditor` / `validateConnection.ts` / `dslParser.ts` 中是否具有 runtime 行為依賴，現在已完成盤點並確認仍為 0；`TARGET_HANDLE` 目前只屬於 renderer 命名來源契約
- 新對話缺少固定規則檔、架構摘要與可重用提示模板，現在已完成文件化
- loop 控制流語義目前哪些 contract 已成立、哪些仍只是 parser / editor 隱含行為，現在已完成盤點並文件化
- loop body edge / continuation edge 原本未顯式區分，現在 renderer / parser / validator 已對齊到 `body` / `out` contract
- `computeLoopParents()` 原本會把 loop exit downstream 一起算進 loop scope，現在已改成只沿 loop body subtree 計算 `loopParent`
- nested loop body 節點原本仍沿用 first-write-wins 的外層 `loopParent`，現在已收斂為 innermost scope semantics
- nested loop × condition 跨 scope 連線原本缺少可重複執行的 preview / submit 一致性檢查工具，現在已補上 dev-only auto verify 入口與固定 fixture

### 已驗證

- `npm run build` 成功
- `npm run typecheck` 成功
- `tsc --noEmit` 成功（以 `frontend/node_modules/.bin/tsc.cmd --noEmit` 驗證）
- `FlowEditor` loop scope helper 收斂後，`npm run typecheck` 再次成功
- `StartNode` highlighted helper 收斂後，`npm run typecheck` 再次成功
- `ActionNode` typed data 存取收斂後，`npm run typecheck` 再次成功
- `ConditionNode` typed data 存取收斂後，`npm run typecheck` 再次成功
- `LoopNode` typed data 存取收斂後，`npm run typecheck` 再次成功
- `ActionEditor` typed data 存取收斂後，`npm run typecheck` 再次成功
- `ConditionEditor` typed data 存取收斂後，`npm run typecheck` 再次成功
- `LoopEditor` typed data 存取收斂後，`npm run typecheck` 再次成功
- `flowStore` highlighted helper 收斂後，`npm run typecheck` 再次成功
- `flowStore` `mergeNodeParams()` helper 收斂後，`npm run typecheck` 再次成功
- 重新盤點 `frontend/src/**/*.ts*` 後，`as any` 搜尋結果為 0 筆
- FlowEditor connection preview 驗證回饋接入共用 validator 後，`npm run typecheck` 再次成功
- 本輪完成後再次搜尋 `frontend/src/**/*.ts*`，`as any` 仍為 0 筆
- FlowEditor invalid preview reason 文案補強後，`npm run typecheck` 再次成功
- FlowEditor invalid feedback overlay 收斂後，`npm run typecheck` 再次成功
- Condition continuation handle contract 收斂後，`npm run typecheck` 再次成功
- Condition continuation handle contract 收斂後，`npm run build` 再次成功
- 本輪完成後再次搜尋 `frontend/src/**/*.ts*`，`as any` 仍為 0 筆
- Start / Action / Loop continuation handle contract 收斂後，`npm run typecheck` 再次成功
- Start / Action / Loop continuation handle contract 收斂後，`npm run build` 再次成功
- 本輪完成後再次搜尋 `frontend/src/**/*.ts*`，`as any` 仍為 0 筆
- Flow → DSL continuation helper 收斂後，`npm run typecheck` 再次成功
- Flow → DSL continuation helper 收斂後，`npm run build` 再次成功
- 本輪完成後再次搜尋 `frontend/src/**/*.ts*`，`as any` 仍為 0 筆
- source handle 共用常數收斂後，`npm run typecheck` 再次成功
- source handle 共用常數收斂後，`npm run build` 再次成功
- 本輪完成後再次搜尋 `frontend/src/**/*.ts*`，`as any` 仍為 0 筆
- 單一路徑 renderer continuation handle 常數收斂後，`npm run typecheck` 再次成功
- 單一路徑 renderer continuation handle 常數收斂後，`npm run build` 再次成功
- 本輪完成後再次搜尋 `frontend/src/**/*.ts*`，`as any` 仍為 0 筆
- branch handle 殘留盤點完成後，再次確認 `frontend/src/**/*.ts*` 中 `out` / `true` / `false` raw string 只剩共用常數定義與非 contract log 文案
- branch handle 殘留盤點完成後，`npm run typecheck` 再次成功
- branch handle 殘留盤點完成後，`npm run build` 再次成功
- branch handle 殘留盤點完成後，再次搜尋 `frontend/src/**/*.ts*`，`as any` 仍為 0 筆
- target handle 命名來源收斂後，`npm run typecheck` 再次成功
- target handle 命名來源收斂後，`npm run build` 再次成功
- target handle 命名來源收斂後，再次搜尋 `frontend/src/**/*.ts*`，`as any` 仍為 0 筆
- 重新搜尋 `frontend/src/**/*.ts*` 的 `targetHandle|TARGET_HANDLE` 後，確認 runtime 依賴點仍只包含 `FlowEditor` 的 pass-through、`dslParser.ts` 的常數定義，以及 node renderer 的 target handle `id`
- 透過讀碼盤點確認 loop 在 `dslParser.ts`、`validateConnection.ts`、`FlowEditor.tsx`、`LoopNode.tsx`、`executionEngine.ts` 之間的語義現況：DSL / execution 已一致，但 editor 端的 body edge / continuation edge 契約仍未顯式閉合
- loop body / exit handle contract 落地後，`npm run typecheck` 再次成功
- loop body / exit handle contract 落地後，`npm run build` 再次成功
- nested loop `loopParent` 收斂為 innermost semantics 後，`npm run typecheck` 再次成功
- nested loop `loopParent` 收斂為 innermost semantics 後，`npm run build` 再次成功
- dev-only auto verify 入口補齊後，`npm run typecheck` 再次成功
- dev-only auto verify 入口補齊後，`npm run build` 再次成功
- Vite production build 可產出 `dist/` 結果
- 開發伺服器可啟動（原本 5173 被占用，實際跑在 5174）

---

## 4. 目前重要檔案

- `frontend/src/utils/dslParser.ts`
- `frontend/src/utils/validateConnection.ts`
- `frontend/src/store/flowStore.ts`
- `frontend/src/components/FlowEditor/FlowEditor.tsx`
- `.clinerules`
- `ARCH.md`
- `docs/cline_prompt_templates.md`
- `frontend/src/components/ChatPanel/ChatPanel.tsx`
- `frontend/src/utils/executionEngine.ts`
- `frontend/src/components/InspectorPanel/ActionEditor.tsx`
- `frontend/src/components/InspectorPanel/ConditionEditor.tsx`
- `frontend/src/components/InspectorPanel/LoopEditor.tsx`
- `frontend/src/nodes/ActionNode.tsx`
- `frontend/src/nodes/ConditionNode.tsx`
- `frontend/src/nodes/LoopNode.tsx`
- `frontend/src/nodes/StartNode.tsx`
- `frontend/src/styles/flow.css`
- `frontend/src/vite-env.d.ts`

---

## 5. 後續工作方式（固定遵守）

### 階段式 / 原子化工作法

之後請不要一次塞很多功能，改成以下節奏：

1. 先選一個小功能 / 小修正
2. 只做那一個原子任務
3. 完成後更新本文件
4. 再決定下一個小步驟

### Checkpoint 更新規則

每完成一個小功能後，請至少更新：

- 本輪做了什麼
- 改到哪些檔案
- 架構上新增了什麼規則 / 約定
- 驗證方式與結果
- 下一個建議原子任務

### Git / GitHub 版本記錄規則

之後每完成一個原子任務，除了更新 `docs/current_status.md`，也要同步做 git 版本記錄，方便回撤：

1. 先確認本輪 checkpoint 已寫清楚變動內容
2. 以單一原子任務為單位建立一次 commit，不要把多個不相關任務混在同一個版本
3. commit message 需能清楚描述本輪變更，最好帶上 checkpoint 編號，例如：`checkpoint 2.30: unify renderer continuation handle constant`
4. commit 後推到 GitHub 遠端，讓每一輪小改動都有可回退的版本點

目前固定要求：

- 文件與程式碼的變更摘要要能互相對照
- 每一輪只保留一個明確主題，避免 commit scope 失焦
- 若只是提出建議但未實作，應記錄在 checkpoint，不要混成已完成版本

### 新對話規則

未來如果重開新對話，請先讀：

- `.clinerules`
- `ARCH.md`
- `docs/current_status.md`

再開始後續分析與實作，避免上下文遺失。

---

## 6. 下一個建議原子任務

最合理的下一步是：

1. 先在 dev mode 實際點擊 `Run Auto-Verify`，確認目前 fixture 下 preview / submit 是否全數 match，並記錄是否出現真實 mismatch case
2. 若 auto verify 發現 mismatch，再另開新的原子任務，最小範圍收斂 `FlowEditor.tsx`、`validateConnection.ts` 與 `dslParser.ts` 的 preview / submit 路徑，不直接擴大到 DSL runtime semantics
3. 若要讓這組驗證更可回歸，再另開新的原子任務補第二組 fixture（例如 occupied handle / cycle / nested exit downstream），但仍維持 dev-only 與 local-state 實作

---

## 7. 本次 checkpoint 摘要

目前 frontend 的流程編輯器資料模型已大致完成第一輪收斂：**業務資料集中到 `node.data.params`，UI 狀態保留在 `node.data` 本體**。Inspector、FlowEditor、ChatPanel、DSL parser、executionEngine 已完成第一輪對齊，且 build、`tsc --noEmit`、`npm run typecheck` 都已成功；最新幾輪先把 `start` / `action` / `loop` 的 continuation edge 顯式 `out` handle 契約補進 validator，再把 `flowToDSL()` 內 continuation edge 的相容判定收斂到單一 `isContinuationEdge()` helper，接著導出 `CONTINUATION_HANDLE` / `CONDITION_TRUE_HANDLE` / `CONDITION_FALSE_HANDLE` 共用常數，最後把 `StartNode` / `ActionNode` / `LoopNode` 內剩餘的 `id="out"` 也統一改成引用 `CONTINUATION_HANDLE`，讓 continuation handle 的命名來源進一步完整對齊到 DSL helper / validator / condition renderer / 單一路徑 renderer。

此外，`FlowEditor` / `Stage` / `Toolbar` 周邊的盤點也已完成：目前沒有直接讀寫 `node.data` 業務欄位的殘留點。四個 node renderer、InspectorPanel 三個 editor，以及 `flowStore.ts` 內最後一個 `params` 合併 `as any` 都已清理完成；目前 `frontend/src/**/*.ts*` 已沒有 `as any` 使用點。最新幾輪也已補上 FlowEditor 的拖曳連線即時驗證回饋：合法 target 會顯示綠色高亮、不合法 target 會顯示紅色高亮，拖曳到不合法 target 時右上角會顯示 validator reason，且這個 preview reason 與實際 `onConnect` 失敗後的錯誤提示現在已統一為同一個 overlay 呈現；preview 狀態會在拖曳結束時清除，同時維持 DSL / execution logic 與既有資料模型不變。

本輪先依照 2.35 的建議，把 loop body / exit contract 做成一個獨立原子任務正式落地：`dslParser.ts` 已以 `LOOP_BODY_HANDLE` 顯式建立與還原 loop body edge，`LoopNode.tsx` 已暴露 body / exit 兩個不同 source handle，`validateConnection.ts` 已可辨識並限制 body / continuation 各最多一條，`FlowEditor.tsx` 的 `computeLoopParents()` 也已改成只沿 body subtree 計算 scope。接著又補上第二個最小原子任務：nested loop body 節點的 `loopParent` 現在會指向最近的 innermost loop，而不再停留在 first-write-wins 的外層 loop 標記。這一輪再往前補上一個純開發期的最小驗證工具：`FlowEditor` 現在可用固定 `nested loop × condition` fixture 批量比對 preview / submit 的 `validateConnection()` 結果，並在結束後自動還原原畫布，讓 scope UX 分叉問題之後可以更穩定回歸。runtime execution semantics、cycle detection 與 `node.data.params` / `node.data` 的資料分層則維持不變；目前下一步較合理的方向，已收斂為實際跑一次 auto verify，確認是否出現真實 mismatch case。