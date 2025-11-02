import React, { useState, useEffect } from "react";
import axios from "axios";
//import "./PdfUpload.css";

const API_URL = "http://127.0.0.1:5001/api";

function PdfUpload() {
  const [file, setFile] = useState(null);
  const [formName, setFormName] = useState("");
  const [formList, setFormList] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [showFields, setShowFields] = useState(false);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/forms`);
      setFormList(response.data);
    } catch (err) {
      console.error("Error fetching forms:", err);
      setError("Failed to load existing forms.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch existing forms on component mount
  useEffect(() => {
    fetchForms();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (selectedFile && !selectedFile.name.endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      setFile(null);
      e.target.value = null; // Reset the file input
      return;
    }

    setFile(selectedFile);
    setError("");

    // If user selected a file, suggest a form name based on filename
    if (selectedFile && !formName) {
      // Remove extension and convert to title case
      let suggestedName = selectedFile.name
        .replace(".pdf", "")
        .replace(/_/g, " ")
        .replace(/-/g, " ");

      // Convert to title case (capitalize first letter of each word)
      suggestedName = suggestedName
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      setFormName(suggestedName);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!file || !formName) {
      setError("Please provide both a form name and a PDF file.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("form_name", formName);

    try {
      await axios.post(`${API_URL}/forms/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setMessage(`Form '${formName}' uploaded successfully!`);
      // Reset form
      setFormName("");
      setFile(null);
      e.target.reset(); // Resets the file input
      // Refresh the list of forms
      fetchForms();
    } catch (err) {
      console.error("Error uploading file:", err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Failed to upload form.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async (formId, formName) => {
    if (
      !window.confirm(`Are you sure you want to delete the form '${formName}'?`)
    ) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await axios.delete(`${API_URL}/forms/${formId}`);
      setMessage(`Form '${formName}' deleted successfully.`);
      // Refresh the form list
      fetchForms();
      // Reset field display if the deleted form was selected
      if (selectedFormId === formId) {
        setSelectedFormId(null);
        setFormFields([]);
        setShowFields(false);
      }
    } catch (err) {
      console.error("Error deleting form:", err);
      setError(err.response?.data?.error || "Failed to delete form.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewFields = async (formId) => {
    if (selectedFormId === formId && showFields) {
      // Toggle off if already showing fields for this form
      setShowFields(false);
      return;
    }

    setSelectedFormId(formId);
    setShowFields(true);
    setFormFields([]);
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${API_URL}/forms/${formId}/fields`);
      setFormFields(response.data.fields || []);
    } catch (err) {
      console.error("Error fetching form fields:", err);
      setError("Failed to load form fields.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-form-management">
      <h2>PDF Form Management</h2>

      <div className="form-section">
        <h3>Uploaded Forms</h3>
        {loading && formList.length === 0 ? (
          <p className="loading-text">Loading forms...</p>
        ) : formList.length === 0 ? (
          <p className="no-forms-text">No forms uploaded yet.</p>
        ) : (
          <div className="form-list">
            {formList.map((form) => (
              <div key={form.id} className="form-item">
                <div className="form-details">
                  <h4>{form.form_name}</h4>
                  <div className="form-meta">
                    <span>
                      Uploaded: {new Date(form.uploaded_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    className="view-fields-button"
                    onClick={() => handleViewFields(form.id)}
                  >
                    {selectedFormId === form.id && showFields
                      ? "Hide Fields"
                      : "View Fields"}
                  </button>
                  <button
                    className="delete-form-button"
                    onClick={() => handleDeleteForm(form.id, form.form_name)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>

                {selectedFormId === form.id && showFields && (
                  <div className="form-fields">
                    {loading ? (
                      <p>Loading fields...</p>
                    ) : formFields.length === 0 ? (
                      <p className="no-fields-text">
                        No fillable fields found in this form.
                      </p>
                    ) : (
                      <div className="fields-table-container">
                        <table className="fields-table">
                          <thead>
                            <tr>
                              <th>Field Name</th>
                              <th>Field Type</th>
                              <th>Tooltip/Alternate Name</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formFields.map((field, index) => (
                              <tr key={index}>
                                <td>{field.name}</td>
                                <td>{field.type || "text"}</td>
                                <td>{field.alternate_name || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="field-count">
                          {formFields.length} fillable{" "}
                          {formFields.length === 1 ? "field" : "fields"} found
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <hr />

      <div className="upload-section">
        <h3>Upload New Form Template</h3>
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label>Form Name:</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Enter a descriptive name for the form"
              required
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>PDF File:</label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              required
              className="file-input"
            />
            <div className="file-requirements">
              Only PDF files with fillable form fields are supported.
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !file || !formName}
            className="upload-button"
          >
            {loading ? "Uploading..." : "Upload Form"}
          </button>
        </form>
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </div>

      <div className="info-section">
        <h3>About PDF Forms</h3>
        <p>
          Upload fillable PDF forms to use with your entities. The system will
          extract form fields that can be mapped to entity data. Once mapped,
          you can generate pre-filled PDFs for any entity.
        </p>
        <div className="tips">
          <h4>Tips for PDF Forms</h4>
          <ul>
            <li>
              Use PDF forms with fillable form fields (created in Adobe Acrobat
              or similar tools).
            </li>
            <li>
              Fields with descriptive names or tooltips will be easier to map.
            </li>
            <li>
              After uploading, go to the "Field Mapping" page to map form fields
              to entity data.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PdfUpload;
