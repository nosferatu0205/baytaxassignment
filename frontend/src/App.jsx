import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import EntityList from "../components/EntityList";
import PdfUpload from "../components/PdfUpload";
// Import the mapping component
import FieldMapping from "../components/FieldMapping";

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
          <li>
            <Link to="/forms">Manage Forms</Link>
          </li>
          {/* Add link to the mapping page */}
          <li>
            <Link to="/mapping">Field Mapping</Link>
          </li>
        </ul>
      </nav>

      <hr />

      {/* This is where the "page" content will be rendered */}
      <Routes>
        <Route path="/" element={<h2>Home Page</h2>} />
        <Route path="/entities" element={<EntityList />} />
        <Route path="/forms" element={<PdfUpload />} />
        {/* Add route for the mapping page */}
        <Route path="/mapping" element={<FieldMapping />} />
      </Routes>
    </div>
  );
}

export default App;
