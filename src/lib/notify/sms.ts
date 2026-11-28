import "server-only";

// SMS behind an interface (AGENT.md §6). With no SMS provider account yet (PROJECT-STATE §4), the demo
// provider (D039) records the message as handled without sending anything to a real phone. A real
// provider plugs in here when its account exists.

export interface SmsSender {
  readonly demo: boolean;
  send(to: string, text: string, id: string): Promise<string>;
}

export function demoSmsSender(): SmsSender {
  return {
    demo: true,
    // Nothing leaves our system: development and the demo never message real people (AGENT.md §4).
    async send(_to, _text, id) {
      return `demo-sms-${id}`;
    },
  };
}

export function smsSender(): SmsSender {
  return demoSmsSender();
}
