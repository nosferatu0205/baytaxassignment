import React, { useState, useEffect } from "react";
import axios from "axios";
import EntityForm from "./EntityForm";
//import "./EntityList.css";

const API_URL = "http://127.0.0.1:5001/api";

// Enhanced component for the generation logic
function EntityPdfGenerator({ entity, formList }) {
  const [selectedFormId, setSelectedFormId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mappingStatus, setMappingStatus] = useState(null);

  // Check if the selected form has mappings
  useEffect(() => {
    const checkFormMappings = async () => {
      if (!selectedFormId) {
        setMappingStatus(null);
        return;
      }

      try {
        const response = await axios.get(
          `${API_URL}/mappings/form/${selectedFormId}`
        );

        if (response.data.length === 0) {
          setMappingStatus({
            hasMappings: false,
            message: "This form doesn't have any field mappings configured.",
          });
        } else {
          setMappingStatus({
            hasMappings: true,
            count: response.data.length,
            message: `This form has ${response.data.length} field mappings configured.`,
          });
        }
      } catch (err) {
        console.error("Error checking form mappings:", err);
        setMappingStatus({
          hasMappings: false,
          message: "Could not verify form mappings.",
        });
      }
    };

    if (selectedFormId) {
      checkFormMappings();
    }
  }, [selectedFormId]);

  const handleGenerate = async () => {
    if (!selectedFormId) {
      setError("Please select a form to generate.");
      return;
    }

    // Clear any previous errors
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
      // Handle error response
      if (err.response) {
        if (err.response.data instanceof Blob) {
          // Try to read blob error as JSON
          const reader = new FileReader();
          reader.onload = function () {
            try {
              const errorData = JSON.parse(this.result);
              setError(errorData.error || "Failed to generate PDF.");
            } catch (e) {
              setError("Failed to generate PDF. Unknown error format.", e);
            }
          };
          reader.readAsText(err.response.data);
        } else {
          setError(err.response.data?.error || "Failed to generate PDF.");
        }
      } else {
        setError(
          "Failed to generate PDF. Check mappings or network connection."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (formList.length === 0) {
    return (
      <div className="form-notice">
        No forms uploaded. Go to "Manage Forms" to add one.
      </div>
    );
  }

  return (
    <div className="pdf-generator">
      <div className="form-selector">
        <select
          value={selectedFormId}
          onChange={(e) => {
            setSelectedFormId(e.target.value);
            setError("");
          }}
          className="form-select"
          disabled={loading}
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
          disabled={loading || !selectedFormId}
          className="generate-button"
        >
          {loading ? "Generating..." : "Generate PDF"}
        </button>
      </div>

      {mappingStatus && (
        <div
          className={`mapping-status ${
            mappingStatus.hasMappings ? "has-mappings" : "no-mappings"
          }`}
        >
          {mappingStatus.message}
          {!mappingStatus.hasMappings && (
            <a href="/mapping" className="setup-link">
              Set up mappings
            </a>
          )}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

function EntityList() {
  const [entities, setEntities] = useState([]);
  const [formList, setFormList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const [entitiesRes, formsRes] = await Promise.all([
        axios.get(`${API_URL}/entities`),
        axios.get(`${API_URL}/forms`),
      ]);

      setEntities(entitiesRes.data);
      setFormList(formsRes.data);
      setError(null);
    } catch (err) {
      console.error("Error:", err);
      setError("Failed loading entities or forms");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (idToDelete) => {
    if (!window.confirm("Are you sure you want to delete this entity?")) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/entities/${idToDelete}`);
      // Refresh entities list
      setEntities(entities.filter((entity) => entity.id !== idToDelete));
    } catch (e) {
      console.error("Error: ", e);
      setError("Failed to delete entity.");
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  if (loading && entities.length === 0) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="entity-management">
      <h2>Entity Management</h2>

      <div className="entity-list">
        {entities.length === 0 ? (
          <div className="no-entities">No entities found. Add one below.</div>
        ) : (
          <ul>
            {entities.map((entity) => (
              <li key={entity.id} className="entity-item">
                <div className="entity-info">
                  <h3>{entity.name}</h3>
                  <div className="entity-address">
                    {entity.street_address && (
                      <div>{entity.street_address}</div>
                    )}
                    {(entity.city || entity.state || entity.zip_code) && (
                      <div>
                        {entity.city && <span>{entity.city}</span>}
                        {entity.state && <span>, {entity.state}</span>}
                        {entity.zip_code && <span> {entity.zip_code}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="entity-actions">
                  <button
                    onClick={() => handleDelete(entity.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>

                  <EntityPdfGenerator entity={entity} formList={formList} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <hr />

      <div className="entity-form-section">
        <EntityForm onEntityAdded={fetchEntities} />
      </div>
    </div>
  );
}

export default EntityList;
