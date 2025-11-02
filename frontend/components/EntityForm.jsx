import React, { useActionState, useState } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:5001/api";

function EntityForm({ onEntityAdded }) {
  const [name, setName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newEntityData = {
      name: name,
      street_address: streetAddress,
      city: city,
      state: state,
      zip_code: zipCode,
    };

    try {
      await axios.post(`${API_URL}/entities`, newEntityData);
      setName("");
      setStreetAddress("");
      setCity("");
      setState("");
      setZipCode("");

      if (onEntityAdded) {
        onEntityAdded();
      }
    } catch (e) {
      console.error("Error: ", e);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add New Entity</h3>
      <div>
        <label>Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Street Address:</label>
        <input
          type="text"
          value={streetAddress}
          onChange={(e) => setStreetAddress(e.target.value)}
        />
      </div>
      <div>
        <label>City:</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>
      <div>
        <label>State:</label>
        <input
          type="text"
          value={state}
          onChange={(e) => setState(e.target.value)}
        />
      </div>
      <div>
        <label>Zip Code:</label>
        <input
          type="text"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
        />
      </div>
      <button type="submit">Add Entity</button>
    </form>
  );
}

export default EntityForm;
