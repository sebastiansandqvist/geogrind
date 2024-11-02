import { createSignal, For, Show } from 'solid-js';

const [message, setMessage] = createSignal<{ color: 'green' | 'red'; message: string } | null>();
const duration = 3000;

let timeout: ReturnType<typeof setTimeout>;
export function flashMessage(message: string, color: 'green' | 'red' = 'green') {
  clearTimeout(timeout);
  setMessage({ message, color });
  timeout = setTimeout(() => {
    setMessage(null);
  }, duration);
  return new Promise((resolve) => setTimeout(resolve, duration));
}

export function FlashMessageContainer() {
  return (
    <Show when={message()} keyed>
      {(data) => (
        <div
          class="animate-flash pointer-events-none fixed top-24 right-0 left-0 z-20 flex flex-col items-center justify-center text-center text-2xl"
          classList={{
            'text-emerald-400': data.color === 'green',
            'text-rose-400': data.color === 'red',
          }}
        >
          <For each={data.message.split('\n')}>{(line) => <div>{line}</div>}</For>
        </div>
      )}
    </Show>
  );
}
