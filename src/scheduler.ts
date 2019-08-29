import { unstable_IdlePriority as IdlePriority, unstable_scheduleCallback as scheduleCallback } from 'scheduler';

/**
 * use scheduler from react as a polyfill for requestIdleCallback
 */
class Scheduler {
  private scheduled = false;

  constructor(private readonly callback: () => void) {}

  task = () => {
    this.scheduled = false;
    const { callback } = this;
    callback();
  };

  schedule() {
    if (this.scheduled) {
      return;
    }
    this.scheduled = true;
    scheduleCallback(IdlePriority, this.task);
  }
}

export default Scheduler;
