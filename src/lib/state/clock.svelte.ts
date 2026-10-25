// A shared "now" that ticks every 20 seconds, for relative times like "5 min ago".

class Clock {
  now = $state(Date.now());

  constructor() {
    setInterval(() => (this.now = Date.now()), 20_000);
  }
}

export const clock = new Clock();
