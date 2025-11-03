import React, { useState } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:5001/api";

function EntityForm({ onEntityAdded }) {
  const [name, setName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const newEntityData = {
      name: name,
      street_address: streetAddress,
      city: city,
      state: state,
      zip_code: zipCode,
    };

    try {
      await axios.post(`${API_URL}/entities`, newEntityData);
      // Clear form
      setName("");
      setStreetAddress("");
      setCity("");
      setState("");
      setZipCode("");

      // Notify parent component to refresh
      if (onEntityAdded) {
        onEntityAdded();
      }
    } catch (e) {
      console.error("Error: ", e);
      setError("Failed to add entity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-section">
      <h3>Add New Entity</h3>
      <form onSubmit={handleSubmit}>
        <div className="entity-form-grid">
          {/* Spans 2 columns */}
          <div className="form-group span-2">
            <label htmlFor="entityName">Name:</label>
            <input
              type="text"
              id="entityName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="form-input"
            />
          </div>

          {/* Spans 2 columns */}
          <div className="form-group span-2">
            <label htmlFor="streetAddress">Street Address:</label>
            <input
              type="text"
              id="streetAddress"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              className="form-input"
            />
          </div>

          {/* 3 fields in a row */}
          <div className="form-group">
            <label htmlFor="city">City:</label>
            <input
              type="text"
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="state">State:</label>
            <input
              type="text"
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="zipCode">Zip Code:</label>
            <input
              type="text"
              id="zipCode"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <button type="submit" className="button mt-4" disabled={loading}>
          {loading ? "Adding..." : "Add Entity"}
        </button>

        {error && <div className="message-error mt-4">{error}</div>}
      </form>
    </div>
  );
}

export default EntityForm;
