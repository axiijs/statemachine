import { describe, it, expect, beforeEach } from 'vitest';
import {Machine, Middleware, MiddlewareNext} from '../src/Machine';
import { State } from '../src/State';
import { createTransitionEvent, TransitionEvent } from '../src/TransitionEvent';

class TestState extends State {
  public enterCount = 0;
  public leaveCount = 0;

  enter(prevState: State | null, event: TransitionEvent) {
    super.enter(prevState, event);
    this.enterCount++;
  }

  leave(event: TransitionEvent) {
    super.leave(event);
    this.leaveCount++;
  }
}

describe('Machine', () => {
  let s1: TestState;
  let s2: TestState;
  let s3: TestState;

  beforeEach(() => {
    s1 = new TestState('state1');
    s2 = new TestState('state2');
    s3 = new TestState('state3');
  });

  it('should switch state when receive an event without guard', async () => {
    const transitions = [
      { from: 'state1', event: 'go', to: 'state2' },
    ];

    const machine = new Machine('state1', transitions);
    machine.addState(s1);
    machine.addState(s2);

    expect(machine.currentState().name).toBe('state1');
    await machine.receive(createTransitionEvent('go'));
    expect(machine.currentState().name).toBe('state2');
    expect(s1.leaveCount).toBe(1);
    expect(s2.enterCount).toBe(1);
  });

  it('should switch state when guard is fulfilled', async () => {
    const guardForGo: Middleware = (next:MiddlewareNext, event: TransitionEvent) => {
      next(event.detail?.allow === true);
    };

    const transitions = [
      { from: 'state1', event: 'go', to: 'state2', name:'t1'},
    ];
    const machine = new Machine('state1', transitions);
    machine.addState(s1);
    machine.addState(s2);
    machine.addMiddleware('t1', guardForGo);

    await machine.receive(createTransitionEvent('go', { allow: false }));
    // guard 未通过，不应变更状态
    expect(machine.currentState().name).toBe('state1');
    expect(s1.leaveCount).toBe(0);

    await machine.receive(createTransitionEvent('go', { allow: true }));
    // guard 通过，应该变为 state2
    expect(machine.currentState().name).toBe('state2');
    expect(s1.leaveCount).toBe(1);
    expect(s2.enterCount).toBe(1);
  });

  it('should handle async guard correctly', async () => {
    // 模拟异步 guard
    const asyncGuard: Middleware = async (next: MiddlewareNext,event: TransitionEvent) => {
      const {allow, reason} = await new Promise<{allow:boolean, reason:any}>((resolve) => {
        setTimeout(() => {
          const allow = event.detail?.allow === true;
          resolve({allow, reason: allow?null:'not allowed'});
        }, 50);
      });
      return next(allow, reason)
    };

    const transitions = [
      { from: 'state1', event: 'asyncGo', to: 'state3', name: 't1' },
    ];
    const machine = new Machine('state1', transitions);
    machine.addState(s1);
    machine.addState(s3);
    machine.addMiddleware('t1', asyncGuard);

    await machine.receive(createTransitionEvent('asyncGo', { allow: false }));
    expect(machine.currentState().name).toBe('state1');
    expect(machine.rejection()?.middleware).toBe(asyncGuard);
    expect(machine.rejection()?.detail).toBe('not allowed');
    expect(s1.leaveCount).toBe(0);

    await machine.receive(createTransitionEvent('asyncGo', { allow: true }));
    expect(machine.currentState().name).toBe('state3');
    expect(s1.leaveCount).toBe(1);
    expect(s3.enterCount).toBe(1);
    expect(machine.rejection()).toBe(null);

  });

  it('should set transitioning when in progress', async () => {
    // 模拟异步 guard
    const asyncGuard: Middleware = async (next: MiddlewareNext,event: TransitionEvent) => {
      const shouldGo = await new Promise<boolean>((resolve) => {
        setTimeout(() => {
          resolve(event.detail?.allow === true);
        }, 50);
      });
      return next(shouldGo)
    };
    const transitions = [
      { from: 'state1', event: 'go', to: 'state2', name: 't1' },
    ];
    const machine = new Machine('state1', transitions);
    machine.addState(s1);
    machine.addState(s2);
    machine.addMiddleware('t1', asyncGuard);

    expect(machine.transitioning()).toBe(false);
    const receivePromise = machine.receive(createTransitionEvent('go'));
    expect(machine.transitioning()).toBe(true);
    await receivePromise;
    expect(machine.transitioning()).toBe(false);
  });

  it('multiple middlewares should be executed in order', async () => {
    const expectOrder: number[] = [];
    const middlewares: Middleware[] = [
      (next: MiddlewareNext, event: TransitionEvent) => {
        expectOrder.push(1);
        next()
        expectOrder.push(4);
      },
      (next: MiddlewareNext, event: TransitionEvent) => {
        expectOrder.push(2);
        next();
      },
      (next: MiddlewareNext, event: TransitionEvent) => {
        expectOrder.push(3);
        next();
      },
    ];

    const transitions = [
      { from: 'state1', event: 'go', to: 'state2', name: 't1' },
    ];
    const machine = new Machine('state1', transitions);
    machine.addState(s1);
    machine.addState(s2);
    machine.addMiddleware('t1', ...middlewares);

    await machine.receive(createTransitionEvent('go', { step: 1 }));
    expect(expectOrder).toEqual([1, 2, 3, 4]);
  })

  it('should not switch state when receive wrong event', async () => {
    const transitions = [
      { from: 'state1', event: 'go', to: 'state2' },
    ];
    const machine = new Machine('state1', transitions);
    machine.addState(s1);
    machine.addState(s2);

    await machine.receive(createTransitionEvent('wrong'));
    expect(machine.currentState().name).toBe('state1');
    expect(s1.leaveCount).toBe(0);

    // 匹配到正确还能继续
    await machine.receive(createTransitionEvent('go'));
    expect(machine.currentState().name).toBe('state2');
    expect(s1.leaveCount).toBe(1);
  })

}); 