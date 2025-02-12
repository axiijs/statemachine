import { TransferEvent } from './TransferEvent';
import { State } from './State';
import {atom, Atom} from "data0";

/**
 * 定义一个 Guard 函数类型，可以是同步或异步
 */
export type GuardFunction = (
  event: TransferEvent,
  currentState: State,
  nextState: State
) => boolean | Promise<boolean>;

/**
 * Transition 用来定义状态之间的流转规则
 * from: 当前状态名
 * eventName: 触发流转的事件名称
 * to: 目标状态名
 * guard: 判断是否允许流转的函数，可选
 */
interface Transition {
  from: string;
  eventName: string;
  to: string;
  guard?: GuardFunction;
}

/**
 * Machine 类，用来控制所有的状态流转逻辑
 */
export class Machine {
  public currentState: Atom<State>;
  private states: Map<string, State>;
  private transitions: Transition[];
  public transitioning: Atom<boolean>;

  constructor(initialState: State, transitions: Transition[]) {
    this.currentState = atom(initialState);
    this.states = new Map<string, State>();
    this.transitions = transitions;
    this.transitioning = atom(false);

    // 用目录的方式，方便在后续扩展中自动注册更多状态
    this.states.set(initialState.name, initialState);
  }

  /**
   * 向 Machine 注册一个新的 State
   */
  addState(state: State) {
    this.states.set(state.name, state);
  }


  /**
   * 主动接收到一个事件时，尝试进行状态流转
   */
  public async receive(event: TransferEvent): Promise<void> {
    if (this.transitioning()) {
      return;
    }

    this.transitioning(true);
    try {
      const possibleTransitions = this.transitions.filter((t) => {
        return t.from === this.currentState.raw.name && t.eventName === event.type;
      });

      if (possibleTransitions.length === 0) {
        return;
      }

      const transition = possibleTransitions[0];
      const nextState = this.states.get(transition.to);
      if (!nextState) {
        return;
      }

      const guardPassed = transition.guard
        ? await transition.guard(
            event,
            this.currentState.raw,
            nextState
          )
        : true;

      if (guardPassed) {
        this.currentState.raw.leave(event);

        const prevState = this.currentState.raw;
        this.currentState(nextState);
        nextState.enter(prevState, event);
      }
    } finally {
      this.transitioning(false);
    }
  }
}