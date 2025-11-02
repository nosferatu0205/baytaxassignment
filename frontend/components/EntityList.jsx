import React, { useState, useEffect } from "react";
import axios from "axios";
import EntityForm from "./EntityForm";

const API_URL = "http://127.0.0.1:5001/api";

// This is a new component for the generation logic
function EntityPdfGenerator({ entity, formList }) {
  const [selectedFormId, setSelectedFormId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!selectedFormId) {
      setError("Please select a form to generate.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/generate-pdf`,
        {
          entity_id: entity.id,
          form_id: parseInt(selectedFormId),
        },
        {
          responseType: "blob", // Important: We expect binary data
        }
      );

      // Create a URL for the blob
      const file = new Blob([response.data], { type: "application/pdf" });
      const fileURL = URL.createObjectURL(file);

      // Create a link to trigger the download
      const link = document.createElement("a");
      link.href = fileURL;

      // Try to get filename from response headers, fallback to a default
      const contentDisposition = response.headers["content-disposition"];
      let filename = `${entity.name}_form.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(fileURL);
    } catch (err) {
      console.error("Error generating PDF:", err);
      // Need to handle blob error response
      if (err.response && err.response.data.type === "application/json") {
        const reader = new FileReader();
        reader.onload = function () {
          const errorData = JSON.parse(this.result);
          setError(errorData.error || "Failed to generate PDF.");
        };
        reader.readAsText(err.response.data);
      } else {
        setError("Failed to generate PDF. Check mappings.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (formList.length === 0) {
    return <small>No forms uploaded. Go to "Manage Forms" to add one.</small>;
  }

  return (
    <div style={{ marginLeft: "10px", display: "inline-block" }}>
      <select
        value={selectedFormId}
        onChange={(e) => setSelectedFormId(e.target.value)}
      >
        <option value="">-- Select Form --</option>
        {formList.map((form) => (
          <option key={form.id} value={form.id}>
            {form.form_name}
          </option>
        ))}
      </select>
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{ marginLeft: "5px" }}
      >
        {loading ? "Generating..." : "Generate PDF"}
      </button>
      {error && (
        <small style={{ color: "red", display: "block" }}>{error}</small>
      )}
    </div>
  );
}

function EntityList() {
  const [entities, setEntities] = useState([]);
  const [formList, setFormList] = useState([]); // <-- Add state for forms
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEntities = async () => {
    try {
      const [entitiesRes, formsRes] = await Promise.all([
        axios.get(`${API_URL}/entities`),
        axios.get(`${API_URL}/forms`),
      ]);

      setEntities(entitiesRes.data);
      setFormList(formsRes.data);
    } catch (err) {
      console.error("Error:", err);
      setError("failed loading entities or forms");
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
      // Refetch entities, no need to refetch forms
      const response = await axios.get(`${API_URL}/entities`);
      setEntities(response.data);
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
            <li key={entity.id} style={{ marginBottom: "15px" }}>
              <strong>{entity.name}</strong> - {entity.city}, {entity.state}
              <button
                onClick={() => handleDelete(entity.id)}
                style={{ marginLeft: "10px" }}
              >
                Delete
              </button>
              {/* --- ADDED GENERATOR COMPONENT --- */}
              <EntityPdfGenerator entity={entity} formList={formList} />
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
