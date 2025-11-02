import React, { useState, useEffect } from "react";
import axios from "axios";
import EntityForm from "./EntityForm";

const API_URL = "http://127.0.0.1:5001/api";

function EntityList() {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEntities = async () => {
    try {
      const response = await axios.get(`${API_URL}/entities`);
      setEntities(response.data);
    } catch (err) {
      console.error("Error:", err);
      setError("failed loading entities");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (idToDelete) => {
    if (!window.confirm("Sure to delete?")) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/entities/${idToDelete}`);
      fetchEntities();
    } catch (e) {
      console.error("Error: ", e);
      setError("Failed deletion.");
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  if (loading) {
    return <h1>Loading</h1>;
  }

  if (error) {
    return <>{error}</>;
  }

  return (
    <div>
      <h2>Entity Management</h2>
      <ul>
        {entities.length === 0 ? (
          <li>No entities found</li>
        ) : (
          entities.map((entity) => (
            <li key={entity.id}>
              {entity.name} - {entity.city} - {entity.state}
              <button
                onClick={() => handleDelete(entity.id)}
                style={{ marginLeft: "10px" }}
              >
                Delete
              </button>
            </li>
          ))
        )}
      </ul>

      <hr />
      <EntityForm onEntityAdded={fetchEntities} />
    </div>
  );
}

export default EntityList;
