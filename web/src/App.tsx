import { NavLink, Route, Routes } from "react-router";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { TasksPage } from "./pages/TasksPage.tsx";

export function App() {
  return (
    <div className="app">
      <header className="site-header">
        <p className="brand">Task Tracker</p>
        <nav aria-label="Main">
          <NavLink to="/" end>
            Tasks
          </NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<TasksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p className="empty">
        <NavLink to="/">Back to tasks</NavLink>
      </p>
    </>
  );
}
