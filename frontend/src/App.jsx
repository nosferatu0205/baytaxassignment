import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import EntityList from "../components/EntityList";
// Import the new component
import PdfUpload from "../components/PdfUpload";

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
          {/* Add link to the new page */}
          <li>
            <Link to="/forms">Manage Forms</Link>
          </li>
        </ul>
      </nav>

      <hr />

      {/* This is where the "page" content will be rendered */}
      <Routes>
        <Route path="/" element={<h2>Home Page</h2>} />
        <Route path="/entities" element={<EntityList />} />
        {/* Add route for the new page */}
        <Route path="/forms" element={<PdfUpload />} />
      </Routes>
    </div>
  );
}

export default App;
