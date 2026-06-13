import React, { useState } from "react";

export default function Counter({ label = "remote counter" }) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h2>Counter (MF remote)</h2>
      <p>{label}</p>
      <p>count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}
