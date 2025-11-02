import React, { useState, useEffect } from "react";
import axios from "axios";
//import "./FieldMapping.css";

const API_URL = "http://127.0.0.1:5001/api";

// Define the fields available on your Entity model
const ENTITY_FIELDS = [
  { id: "name", label: "Name" },
  { id: "street_address", label: "Street Address" },
  { id: "city", label: "City" },
  { id: "state", label: "State" },
  { id: "zip_code", label: "ZIP Code" },
];

function FieldMapping() {
  const [formList, setFormList] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [pdfFields, setPdfFields] = useState([]);
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filterText, setFilterText] = useState("");

  // 1. Fetch all available forms
  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await axios.get(`${API_URL}/forms`);
        setFormList(response.data);
      } catch (err) {
        console.error("Error fetching forms:", err);
        setError("Failed to load forms.");
      }
    };
    fetchForms();
  }, []);

  // 2. Fetch fields and mappings when a form is selected
  const handleFormSelect = async (formId) => {
    if (!formId) {
      setSelectedFormId("");
      setPdfFields([]);
      setMappings({});
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setPdfFields([]);
    setMappings({});
    setSelectedFormId(formId);

    try {
      // Fetch PDF fields
      const fieldsResponse = await axios.get(
        `${API_URL}/forms/${formId}/fields`
      );
      setPdfFields(fieldsResponse.data.fields || []);

      // Fetch saved mappings
      const mappingsResponse = await axios.get(
        `${API_URL}/mappings/form/${formId}`
      );

      // Convert saved mappings array to the state object format
      const savedMappings = {};
      for (const mapping of mappingsResponse.data) {
        savedMappings[mapping.pdf_field_name] = mapping.entity_field_name;
      }
      setMappings(savedMappings);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load fields or mappings for this form.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle a change in a mapping dropdown
  const handleMappingChange = (pdfField, entityField) => {
    setMappings((prev) => ({
      ...prev,
      [pdfField]: entityField,
    }));
  };

  // 4. Save all mappings for the current form
  const handleSaveMappings = async () => {
    if (!selectedFormId) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await axios.post(`${API_URL}/mappings`, {
        form_id: parseInt(selectedFormId),
        mappings: mappings,
      });
      setMessage("Mappings saved successfully!");
    } catch (err) {
      console.error("Error saving mappings:", err);
      setError("Failed to save mappings.");
    } finally {
      setLoading(false);
    }
  };

  // 5. Filter fields based on search text
  const filteredFields = pdfFields.filter((field) => {
    const searchText = filterText.toLowerCase();
    return (
      field.name.toLowerCase().includes(searchText) ||
      (field.alternate_name &&
        field.alternate_name.toLowerCase().includes(searchText))
    );
  });

  // 6. Auto-map fields based on name similarity
  const autoMapFields = () => {
    const newMappings = { ...mappings };

    pdfFields.forEach((field) => {
      const fieldName = field.name.toLowerCase();
      const alternateName = field.alternate_name
        ? field.alternate_name.toLowerCase()
        : "";

      // Try to match field names with entity fields
      ENTITY_FIELDS.forEach((entityField) => {
        const entityFieldId = entityField.id;
        const entityFieldLabel = entityField.label.toLowerCase();

        // Check if field name contains entity field name
        if (
          fieldName.includes(entityFieldId) ||
          fieldName.includes(entityFieldLabel) ||
          alternateName.includes(entityFieldId) ||
          alternateName.includes(entityFieldLabel)
        ) {
          newMappings[field.name] = entityFieldId;
        }

        // Special case for address fields
        if (
          entityFieldId === "street_address" &&
          (fieldName.includes("address") || alternateName.includes("address"))
        ) {
          newMappings[field.name] = "street_address";
        }
      });
    });

    setMappings(newMappings);
    setMessage("Auto-mapping applied. Please review and save your changes.");
  };

  // 7. Clear all mappings
  const clearAllMappings = () => {
    setMappings({});
    setMessage("All mappings cleared. Don't forget to save your changes.");
  };

  // 8. Test mappings with an entity
  const testMapping = async () => {
    if (!selectedFormId) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      // First, get all entities
      const entitiesResponse = await axios.get(`${API_URL}/entities`);

      if (entitiesResponse.data.length === 0) {
        setError(
          "No entities available for testing. Please create an entity first."
        );
        setLoading(false);
        return;
      }

      // Use the first entity for testing
      const testEntityId = entitiesResponse.data[0].id;

      // Call the debug endpoint to test mappings
      const testResponse = await axios.post(`${API_URL}/debug/test-mapping`, {
        entity_id: testEntityId,
        form_id: parseInt(selectedFormId),
      });

      // Show the test results
      setMessage(
        `Test successful with entity "${testResponse.data.entity.name}". ${testResponse.data.mapping_count} field mappings would be applied.`
      );
    } catch (err) {
      console.error("Error testing mappings:", err);
      setError("Failed to test mappings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="field-mapping-container">
      <h2>Field Mapping</h2>
      <p>Select a form to map its fields to your entity data.</p>

      <div className="form-selection">
        <select
          onChange={(e) => handleFormSelect(e.target.value)}
          value={selectedFormId}
          className="form-select"
        >
          <option value="">-- Select a Form --</option>
          {formList.map((form) => (
            <option key={form.id} value={form.id}>
              {form.form_name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      {selectedFormId && (
        <div className="mapping-section">
          <hr />
          <h3>
            Map Fields for:{" "}
            {formList.find((f) => f.id === parseInt(selectedFormId))?.form_name}
          </h3>

          <div className="mapping-actions">
            <button
              onClick={autoMapFields}
              disabled={loading || pdfFields.length === 0}
              className="action-button auto-map-button"
            >
              Auto-Map Fields
            </button>

            <button
              onClick={clearAllMappings}
              disabled={loading || Object.keys(mappings).length === 0}
              className="action-button clear-button"
            >
              Clear All
            </button>

            <button
              onClick={testMapping}
              disabled={loading || Object.keys(mappings).length === 0}
              className="action-button test-button"
            >
              Test Mapping
            </button>

            <button
              onClick={handleSaveMappings}
              disabled={loading}
              className="action-button save-button"
            >
              {loading ? "Saving..." : "Save Mappings"}
            </button>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="mapping-table-container">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Filter fields..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="search-input"
                />
                <span className="field-count">
                  {filteredFields.length} of {pdfFields.length} fields
                </span>
              </div>

              <table className="mapping-table">
                <thead>
                  <tr>
                    <th>PDF Field Name</th>
                    <th>PDF Tooltip</th>
                    <th>Entity Data Field</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFields.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="no-fields-message">
                        {pdfFields.length === 0
                          ? "No fillable fields found in this PDF."
                          : "No fields match your filter criteria."}
                      </td>
                    </tr>
                  ) : (
                    filteredFields.map((field) => (
                      <tr key={field.name} className="field-row">
                        <td className="field-name">
                          <strong>{field.name}</strong>
                          {field.type && (
                            <span className="field-type">{field.type}</span>
                          )}
                        </td>
                        <td className="field-tooltip">
                          {field.alternate_name}
                        </td>
                        <td className="field-mapping">
                          <select
                            value={mappings[field.name] || ""}
                            onChange={(e) =>
                              handleMappingChange(field.name, e.target.value)
                            }
                            className="mapping-select"
                          >
                            <option value="">-- Do not fill --</option>
                            {ENTITY_FIELDS.map((entityField) => (
                              <option
                                key={entityField.id}
                                value={entityField.id}
                              >
                                {entityField.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FieldMapping;
