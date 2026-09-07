import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Layout from "./components/Layout";
import Inbox from "./pages/Inbox";
import TodoList from "./pages/TodoList";
import Board from "./pages/Board";
import Projects from "./pages/Projects";
import Teams from "./pages/Teams";
import Tickets from "./pages/Tickets";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Board />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="todos" element={<TodoList />} />
            <Route path="todo-list" element={<TodoList />} />
            <Route path="projects" element={<Projects />} />
            <Route path="teams" element={<Teams />} />
            <Route path="tickets" element={<Tickets />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
