import TodoApp from "@/components/ToDo";

export default function ToDoPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 gap-2">
      <h1 className="text-4xl font-bold my-4">ToDo List</h1>
        <TodoApp />
    </div>
  );
}
