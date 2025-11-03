import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import EntityList from "../components/EntityList";
import PdfUpload from "../components/PdfUpload";
import FieldMapping from "../components/FieldMapping";

// Helper component for navigation links
function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  // Combine base class with active class if needed
  const className = `nav-link ${isActive ? "nav-link-active" : ""}`;

  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

function App() {
  return (
    // Main container
    <div className="app-container">
      {/* Navigation Bar */}
      <nav className="main-nav">
        <div className="main-nav-content">
          <div className="nav-title">BayTax PDF Filler</div>

          <div className="nav-links">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/entities">Entities</NavLink>
            <NavLink to="/forms">Manage Forms</NavLink>
            <NavLink to="/mapping">Field Mapping</NavLink>
          </div>
        </div>
      </nav>

      {/* Page Content Area */}
      <main className="page-content">
        <div className="content-card">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/entities" element={<EntityList />} />
            <Route path="/forms" element={<PdfUpload />} />
            <Route path="/mapping" element={<FieldMapping />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

// Simple Home Page Component
function HomePage() {
  return (
    <div>
      <h2 className="home-title">Welcome to the BayTax PDF Filler</h2>
      <p className="home-text">
        Use the navigation bar above to manage your entities, upload new PDF
        forms, or map entity fields to your forms.
      </p>
    </div>
  );
}

export default App;
