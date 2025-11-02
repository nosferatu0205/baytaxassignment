import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import EntityList from "../components/EntityList";

function App() {
  return (
    <div>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/entities">Entities</Link>
          </li>
        </ul>
      </nav>

      <hr />

      {/* This is where the "page" content will be rendered */}
      <Routes>
        <Route path="/" element={<h2>Home Page</h2>} />
        <Route path="/entities" element={<EntityList />} />
      </Routes>
    </div>
  );
}

export default App;
