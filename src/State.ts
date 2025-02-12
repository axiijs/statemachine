import { TransferEvent } from './TransferEvent';

/**
 * State 类作为基类，提供 enter/leave 等方法，以便用户在继承时实现自己的业务逻辑
 */
export class State {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * 当状态被进入时，会调用该方法
   * @param prevState 上一个状态
   * @param event 触发流转的事件
   */
  enter(prevState: State | null, event: TransferEvent): void {
    // 继承后可自定义业务逻辑
  }

  /**
   * 当状态被离开时，会调用该方法
   * @param event 触发流转的事件
   */
  leave(event: TransferEvent): void {
    // 继承后可自定义业务逻辑
  }
} 