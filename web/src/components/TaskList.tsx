import type { Filter, Task, TaskPatch } from "../types.ts";
import { TaskItem } from "./TaskItem.tsx";

type Props = {
  tasks: Task[];
  filter: Filter;
  onUpdate: (id: string, patch: TaskPatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function TaskList({ tasks, filter, onUpdate, onDelete }: Props) {
  if (tasks.length === 0) {
    return <p className="empty">{filter === "all" ? "No tasks yet" : "No tasks match this filter"}</p>;
  }
  return (
    <ul aria-label="Tasks" className="task-list">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </ul>
  );
}
