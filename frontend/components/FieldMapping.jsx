import React, { useState, useEffect } from "react";
import axios from "axios";
// We are not using this CSS file, we are using the global index.css
// import "./FieldMapping.css";

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

  // 6. Auto-map fields
  const autoMapFields = () => {
    const ENTITY_FIELD_RULES = {
      name: [/full_name/i, /entity_name/i, /^name$/i, /name/i],
      street_address: [
        /street_address/i,
        /address_line_1/i,
        /^street$/i,
        /^address$/i,
        /addr/i,
        /address/i,
      ],
      city: [/^city$/i, /city/i],
      state: [/^state$/i, /state_province/i, /state/i],
      zip_code: [/zip_code/i, /postal_code/i, /^zip$/i, /zip/i],
    };

    const entityFieldKeys = ENTITY_FIELDS.map((f) => f.id);
    const newMappings = { ...mappings };
    let fieldsMapped = 0;

    pdfFields.forEach((field) => {
      if (newMappings[field.name]) {
        return;
      }
      const fieldName = field.name.toLowerCase();
      const alternateName = field.alternate_name
        ? field.alternate_name.toLowerCase()
        : "";
      const fullTextToSearch = `${fieldName} ${alternateName}`;
      let matchFound = false;

      for (const entityFieldId of entityFieldKeys) {
        if (matchFound) break;
        const rules = ENTITY_FIELD_RULES[entityFieldId] || [];
        for (const rule of rules) {
          if (rule.test(fullTextToSearch)) {
            newMappings[field.name] = entityFieldId;
            fieldsMapped++;
            matchFound = true;
            break;
          }
        }
      }
    });

    setMappings(newMappings);
    if (fieldsMapped > 0) {
      setMessage(
        `Auto-mapped ${fieldsMapped} new field(s). Please review and save.`
      );
    } else {
      setMessage("No new auto-mappings found.");
    }
  };

  // 7. Clear all mappings
  const clearAllMappings = () => {
    setMappings({});
    setMessage("All mappings cleared. Don't forget to save.");
  };

  // 8. Test mappings with an entity
  const testMapping = async () => {
    if (!selectedFormId) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const entitiesResponse = await axios.get(`${API_URL}/entities`);
      if (entitiesResponse.data.length === 0) {
        setError(
          "No entities available for testing. Please create an entity first."
        );
        setLoading(false);
        return;
      }

      const testEntityId = entitiesResponse.data[0].id;

      const testResponse = await axios.post(`${API_URL}/debug/test-mapping`, {
        entity_id: testEntityId,
        form_id: parseInt(selectedFormId),
      });

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
    <div>
      <h2 className="home-title">Field Mapping</h2>
      <p className="text-gray-500" style={{ marginBottom: "1.5rem" }}>
        Select a form to map its fields to your entity data.
      </p>

      <div className="mapping-header">
        <div className="form-group">
          <select
            onChange={(e) => handleFormSelect(e.target.value)}
            value={selectedFormId}
            className="form-input"
          >
            <option value="">-- Select a Form --</option>
            {formList.map((form) => (
              <option key={form.id} value={form.id}>
                {form.form_name}
              </option>
            ))}
          </select>
        </div>

        {selectedFormId && (
          <div className="form-group">
            <input
              type="text"
              placeholder="Filter fields..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="form-input"
            />
          </div>
        )}
      </div>

      {error && <div className="message-error">{error}</div>}
      {message && <div className="message-success">{message}</div>}

      {selectedFormId && (
        <div className="page-section">
          <h3>
            Map Fields for:{" "}
            <span className="font-medium">
              {
                formList.find((f) => f.id === parseInt(selectedFormId))
                  ?.form_name
              }
            </span>
          </h3>

          <div className="mapping-actions">
            <button
              onClick={handleSaveMappings}
              disabled={loading}
              className="button"
            >
              {loading ? "Saving..." : "Save Mappings"}
            </button>
            <button
              onClick={autoMapFields}
              disabled={loading || pdfFields.length === 0}
              className="button button-secondary"
            >
              Auto-Map Fields
            </button>

            <button
              onClick={testMapping}
              disabled={loading || Object.keys(mappings).length === 0}
              className="button button-secondary"
            >
              Test Mapping
            </button>

            <button
              onClick={clearAllMappings}
              disabled={loading || Object.keys(mappings).length === 0}
              className="button button-delete"
            >
              Clear All
            </button>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="mapping-table-container">
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
                      <tr key={field.name}>
                        <td>
                          <span className="field-name">{field.name}</span>
                          {field.type && (
                            <span className="field-type">{field.type}</span>
                          )}
                        </td>
                        <td className="field-tooltip">
                          {field.alternate_name || "-"}
                        </td>
                        <td>
                          <select
                            value={mappings[field.name] || ""}
                            onChange={(e) =>
                              handleMappingChange(field.name, e.target.value)
                            }
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
