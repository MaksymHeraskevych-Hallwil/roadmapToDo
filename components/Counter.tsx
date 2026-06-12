'use client'

import { useCounterStore } from '@/store/counter-store'

export default function Count() {
  const count = useCounterStore((state) => state.count)
  const increment = useCounterStore((state) => state.increment)
  const decrement = useCounterStore((state) => state.decrement)
  const reset = useCounterStore((state) => state.reset)

  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      <button
        onClick={decrement}
        className="bg-gray-200 px-4 py-2 rounded text-black"
      >
        -
      </button>

      <span className="text-2xl font-semibold">{count}</span>

      <button
        onClick={increment}
        className="bg-green-500 text-black px-4 py-2 rounded"
      >
        +
      </button>

      <button
        onClick={reset}
        className="bg-red-500 text-white px-4 py-2 rounded"
      >
        reset
      </button>
    </div>
  )
}
