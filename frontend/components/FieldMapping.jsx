import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:5001/api";

// Define the fields available on your Entity model
const ENTITY_FIELDS = ["name", "street_address", "city", "state", "zip_code"];

function FieldMapping() {
  const [formList, setFormList] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [pdfFields, setPdfFields] = useState([]);

  // This state holds the mapping, e.g., { "pdf_field_name_1": "name", "pdf_field_name_2": "city" }
  const [mappings, setMappings] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  return (
    <div>
      <h2>Field Mapping</h2>
      <p>Select a form to map its fields to your entity data.</p>

      <select
        onChange={(e) => handleFormSelect(e.target.value)}
        value={selectedFormId}
      >
        <option value="">-- Select a Form --</option>
        {formList.map((form) => (
          <option key={form.id} value={form.id}>
            {form.form_name}
          </option>
        ))}
      </select>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {message && <p style={{ color: "green" }}>{message}</p>}

      {selectedFormId && (
        <div>
          <hr />
          <h3>
            Map Fields for:{" "}
            {formList.find((f) => f.id === parseInt(selectedFormId))?.form_name}
          </h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div>
              <table>
                <thead>
                  <tr>
                    <th>PDF Field Name</th>
                    {/* --- ADDED COLUMN --- */}
                    <th>PDF Tooltip (if any)</th>
                    <th>Entity Data Field</th>
                  </tr>
                </thead>
                <tbody>
                  {pdfFields.length === 0 ? (
                    <tr>
                      {/* --- Updated colSpan --- */}
                      <td colSpan="3">No fillable fields found in this PDF.</td>
                    </tr>
                  ) : (
                    // --- MODIFICATION ---
                    pdfFields.map((field) => (
                      <tr key={field.name}>
                        <td>
                          {/* Use field.name for the mapping key */}
                          <strong>{field.name}</strong>
                        </td>
                        <td>
                          {/* Display the alternate name */}
                          {field.alternate_name}
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
                              <option key={entityField} value={entityField}>
                                {entityField}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                    // --- END MODIFICATION ---
                  )}
                </tbody>
              </table>
              <button
                onClick={handleSaveMappings}
                disabled={loading}
                style={{ marginTop: "15px" }}
              >
                {loading ? "Saving..." : "Save Mappings"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FieldMapping;
