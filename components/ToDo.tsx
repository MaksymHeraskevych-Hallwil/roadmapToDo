'use client'

import { useMemo, useState } from 'react'

type Todo = {
  id: number
  text: string
  completed: boolean
  important: boolean
}

type Filter = 'all' | 'active' | 'completed' | 'important'

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'Learn useState', completed: false, important: true },
    { id: 2, text: 'Build first Todo app', completed: true, important: false },
    { id: 3, text: 'Practice Next.js components', completed: false, important: false },
  ])

  const [newTodo, setNewTodo] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const addTodo = () => {
    const trimmed = newTodo.trim()

    if (!trimmed) return

    const todo: Todo = {
      id: Date.now(),
      text: trimmed,
      completed: false,
      important: false,
    }

    setTodos((prev) => [todo, ...prev])
    setNewTodo('')
  }

  const deleteTodo = (id: number) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id))
  }

  const toggleCompleted = (id: number) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }

  const toggleImportant = (id: number) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, important: !todo.important } : todo
      )
    )
  }

  const filteredTodos = useMemo(() => {
    let result = todos

    if (filter === 'active') {
      result = result.filter((todo) => !todo.completed)
    }

    if (filter === 'completed') {
      result = result.filter((todo) => todo.completed)
    }

    if (filter === 'important') {
      result = result.filter((todo) => todo.important)
    }

    if (search.trim()) {
      result = result.filter((todo) =>
        todo.text.toLowerCase().includes(search.toLowerCase())
      )
    }

    return result
  }, [todos, filter, search])

  const activeCount = todos.filter((todo) => !todo.completed).length
  const completedCount = todos.filter((todo) => todo.completed).length
  const importantCount = todos.filter((todo) => todo.important).length

  return (
    <section className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Todo List</h2>
        <p className="mt-2 text-sm text-gray-600">
          Add, search, filter, mark important, and delete tasks.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTodo()
          }}
          placeholder="Enter a new task..."
          className="flex-1 rounded-lg text-black border border-gray-300 px-4 py-2 outline-none focus:border-blue-500"
        />

        <button
          onClick={addTodo}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Add task
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="flex-1 rounded-lg text-black border border-gray-300 px-4 py-2 outline-none focus:border-blue-500"
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-2 text-sm font-medium cursor-pointer ${
              filter === 'all'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            All
          </button>

          <button
            onClick={() => setFilter('active')}
            className={`rounded-lg px-3 py-2 text-sm font-medium cursor-pointer ${
              filter === 'active'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Active
          </button>

          <button
            onClick={() => setFilter('completed')}
            className={`rounded-lg px-3 py-2 text-sm font-medium cursor-pointer ${
              filter === 'completed'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Completed
          </button>

          <button
            onClick={() => setFilter('important')}
            className={`rounded-lg px-3 py-2 text-sm font-medium cursor-pointer ${
              filter === 'important'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Important
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-sm text-gray-600">
        <span>All: {todos.length}</span>
        <span>Active: {activeCount}</span>
        <span>Completed: {completedCount}</span>
        <span>Important: {importantCount}</span>
      </div>

      <ul className="space-y-3">
        {filteredTodos.length > 0 ? (
          filteredTodos.map((todo) => (
            <li
              key={todo.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleCompleted(todo.id)}
                  className="h-5 w-5"
                />

                <span
                  className={`text-base ${
                    todo.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                  }`}
                >
                  {todo.text}
                </span>

                {todo.important && (
                  <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                    Important
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleImportant(todo.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    todo.important
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {todo.important ? 'Unmark' : 'Mark important'}
                </button>

                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        ) : (
          <li className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
            No tasks found.
          </li>
        )}
      </ul>
    </section>
  )
}