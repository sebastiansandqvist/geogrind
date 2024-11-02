import { createSignal } from 'solid-js';

function App() {
  const [count, setCount] = createSignal(0);
  return <h1 class="">hi {count()}</h1>;
}

export default App;
