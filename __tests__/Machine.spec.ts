import { describe, it, expect, beforeEach } from 'vitest';
import { Machine, GuardFunction } from '../src/Machine';
import { State } from '../src/State';
import { createTransferEvent, TransferEvent } from '../src/TransferEvent';

class TestState extends State {
  public enterCount = 0;
  public leaveCount = 0;

  enter(prevState: State | null, event: TransferEvent) {
    super.enter(prevState, event);
    this.enterCount++;
  }

  leave(event: TransferEvent) {
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
      { from: 'state1', eventName: 'go', to: 'state2' },
    ];

    const machine = new Machine(s1, transitions);
    machine.addState(s2);

    expect(machine.currentState().name).toBe('state1');
    await machine.receive(createTransferEvent('go'));
    expect(machine.currentState().name).toBe('state2');
    expect(s1.leaveCount).toBe(1);
    expect(s2.enterCount).toBe(1);
  });

  it('should switch state when guard is fulfilled', async () => {
    const guardForGo: GuardFunction = (event: TransferEvent) => {
      if (event.detail && event.detail.allow) {
        return true;
      }
      return false;
    };

    const transitions = [
      { from: 'state1', eventName: 'go', to: 'state2', guard: guardForGo },
    ];
    const machine = new Machine(s1, transitions);
    machine.addState(s2);

    await machine.receive(createTransferEvent('go', { allow: false }));
    // guard 未通过，不应变更状态
    expect(machine.currentState().name).toBe('state1');
    expect(s1.leaveCount).toBe(0);

    await machine.receive(createTransferEvent('go', { allow: true }));
    // guard 通过，应该变为 state2
    expect(machine.currentState().name).toBe('state2');
    expect(s1.leaveCount).toBe(1);
    expect(s2.enterCount).toBe(1);
  });

  it('should handle async guard correctly', async () => {
    // 模拟异步 guard
    const asyncGuard: GuardFunction = async (event: TransferEvent) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(event.detail?.allow === true);
        }, 50);
      });
    };

    const transitions = [
      { from: 'state1', eventName: 'asyncGo', to: 'state3', guard: asyncGuard },
    ];
    const machine = new Machine(s1, transitions);
    machine.addState(s3);

    await machine.receive(createTransferEvent('asyncGo', { allow: false }));
    expect(machine.currentState().name).toBe('state1');
    expect(s1.leaveCount).toBe(0);

    await machine.receive(createTransferEvent('asyncGo', { allow: true }));
    expect(machine.currentState().name).toBe('state3');
    expect(s1.leaveCount).toBe(1);
    expect(s3.enterCount).toBe(1);
  });

  it('should set transitioning when in progress', async () => {
    // 模拟异步 guard
    const asyncGuard: GuardFunction = async (event: TransferEvent) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(event.detail?.allow === true);
        }, 50);
      });
    };
    const transitions = [
      { from: 'state1', eventName: 'go', to: 'state2', guard: asyncGuard },
    ];
    const machine = new Machine(s1, transitions);
    machine.addState(s2);

    expect(machine.transitioning()).toBe(false);
    const receivePromise = machine.receive(createTransferEvent('go'));
    expect(machine.transitioning()).toBe(true);
    await receivePromise;
    expect(machine.transitioning()).toBe(false);
  });
}); 