import { TransitionEvent } from './TransitionEvent';
import { State } from './State';
import {atom, Atom} from "data0";


export type MiddlewareNext = (value?: boolean, detail?: any) => void
/**
 * 定义一个 Guard 函数类型，可以是同步或异步
 */
export type Middleware = (
    next: MiddlewareNext,
  event: TransitionEvent,
  currentState: State,
  nextState: State,

) => any | Promise<any>;


/**
 * Transition 用来定义状态之间的流转规则
 * from: 当前状态名
 * event: 触发流转的事件名称
 * to: 目标状态名
 * guard: 判断是否允许流转的函数，可选
 */
interface Transition {
  name?:string;
  from: string;
  event: string;
  to: string;
  middlewares?: Middleware[];
}

/**
 * Machine 类，用来控制所有的状态流转逻辑
 */
export class Machine {
  public currentState: Atom<State> = atom(null) as Atom<State>;
  public rejection: Atom<{middleware:Middleware, detail:any} | null> = atom(null);
  private states= new Map<string, State|null>();
  public transitioning: Atom<boolean> = atom(false);
  private middlewaresByTransitionName: Map<string, Middleware[]> = new Map<string, Middleware[]>();

  constructor(public initialState: string, public transitions: Transition[], initialStates: State[] = []) {
    initialStates.forEach((state) => {
      this.addState(state);
    });
    transitions.forEach((transition) => {
        if (!this.states.has(transition.from)) {
          this.states.set(transition.from, null);
        }
        if (!this.states.has(transition.to)) {
          this.states.set(transition.to, null);
        }

        if(transition.middlewares) {
          this.addMiddleware(transition.name!, ...transition.middlewares)
        }
    })
  }

  /**
   * 向 Machine 注册一个新的 State
   */
  addState(state: State) {
    if (!this.currentState.raw && state.name === this.initialState) {
        this.currentState(state);
    }
    this.states.set(state.name, state);
  }

  addMiddleware(transitionName:string, ...middlewares:Middleware[]) {
    if(!this.middlewaresByTransitionName.has(transitionName)) {
      this.middlewaresByTransitionName.set(transitionName, [])
    }
    this.middlewaresByTransitionName.get(transitionName)!.push(...middlewares)
  }

  /**
   * 主动接收到一个事件时，尝试进行状态流转
   */
  public async receive(event: TransitionEvent): Promise<void> {
    if (this.transitioning()) {
      return;
    }

    const possibleTransitions = this.transitions.filter((t) => {
      return t.from === this.currentState.raw!.name && t.event === event.type;
    });

    if (possibleTransitions.length === 0) {
      return;
    }

    const transition = possibleTransitions[0];
    if (!this.states.has(transition.to)) {
      return
    }

    // lazy create next state
    let nextState = this.states.get(transition.to);
    if (!nextState) {
        nextState = new State(transition.to);
        this.addState(nextState);
    }

    this.rejection(null);
    this.transitioning(true);

    const completeTransition = () => {
      this.currentState.raw!.leave(event);

      const prevState = this.currentState.raw;
      this.currentState(nextState);
      nextState.enter(prevState, event);
    }

    const middlewares = this.middlewaresByTransitionName.get(transition.name!)

    if (!middlewares || middlewares.length === 0) {
      completeTransition()
    } else {
      const reject = (middleware:Middleware, detail:any) => this.rejection({ middleware, detail })
      const chainedMiddleware = this.chainedMiddleware(middlewares, 0, completeTransition, reject)
      await chainedMiddleware(event, this.currentState.raw!, nextState)
    }

    this.transitioning(false);
    return
  }

  chainedMiddleware(middlewares:Middleware[], index:number, complete:()=>void, reject:(middleware:Middleware, detail?: any)=>void) {
      return async (event: TransitionEvent, currentState: State, nextState: State) => {
        return middlewares[index](async (value:any, detail:any) => {
          if(value!==false) {
            if (index < middlewares.length - 1 ) {
              await this.chainedMiddleware(middlewares, index + 1, complete, reject)(event, currentState, nextState)
            } else {
                complete()
            }
          } else {
            reject(middlewares[index], detail)
          }
        },event, currentState, nextState)
      }
  }
}