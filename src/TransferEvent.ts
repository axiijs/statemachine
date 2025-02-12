/**
 * TransferEvent 接口与 DOM Event 兼容，使用 event.type 获取事件类型，
 * 使用 event.detail 获取自定义的数据字段。
 */
export interface TransferEvent {
  type: string,
    detail?: Record<string, unknown>
}

/**
 * 工厂函数，用于创建真正的 CustomEvent，并将其断言为我们的 TransferEvent。
 */
export function createTransferEvent(
  type: string,
  detail?: Record<string, unknown>
): TransferEvent {
  return { type, detail }
} 