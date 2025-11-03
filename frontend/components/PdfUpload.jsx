import React, { useState, useEffect } from "react";
import axios from "axios";

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

    if (selectedFile && !formName) {
      let suggestedName = selectedFile.name
        .replace(".pdf", "")
        .replace(/_/g, " ")
        .replace(/-/g, " ");

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
      setFormName("");
      setFile(null);
      e.target.reset();
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
      //delete
      await axios.delete(`${API_URL}/forms/${formId}`);

      setMessage(`Form '${formName}' deleted successfully.`);
      // Refresh the form list from the server
      fetchForms();

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
    <div>
      <h2 className="home-title">PDF Form Management</h2>

      <div className="page-section">
        <h3>Uploaded Forms</h3>
        {loading && formList.length === 0 ? (
          <p>Loading forms...</p>
        ) : formList.length === 0 ? (
          <p>No forms uploaded yet.</p>
        ) : (
          <div className="form-list">
            {formList.map((form) => (
              <div key={form.id} className="form-item">
                <div className="form-item-header">
                  <div>
                    <h4>{form.form_name}</h4>
                    <div className="form-item-meta">
                      <span>
                        Uploaded: {new Date(form.uploaded_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      className="button button-secondary"
                      onClick={() => handleViewFields(form.id)}
                    >
                      {selectedFormId === form.id && showFields
                        ? "Hide Fields"
                        : "View Fields"}
                    </button>
                    <button
                      className="button button-delete"
                      onClick={() => handleDeleteForm(form.id, form.form_name)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {selectedFormId === form.id && showFields && (
                  <div className="fields-table-container">
                    {loading ? (
                      <p>Loading fields...</p>
                    ) : formFields.length === 0 ? (
                      <p>No fillable fields found in this form.</p>
                    ) : (
                      <>
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
                                <td className="font-medium">{field.name}</td>
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
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <hr />

      <div className="page-section">
        <h3>Upload New Form Template</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="formName">Form Name:</label>
            <input
              type="text"
              id="formName"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Enter a descriptive name for the form"
              required
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="fileUpload">PDF File:</label>
            <input
              type="file"
              id="fileUpload"
              accept=".pdf"
              onChange={handleFileChange}
              required
              className="form-input"
            />
            <p className="file-input-label mt-4">
              Only PDF files with fillable form fields are supported.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading || !file || !formName}
            className="button"
          >
            {loading ? "Uploading..." : "Upload Form"}
          </button>
        </form>
        {message && <div className="message-success">{message}</div>}
        {error && <div className="message-error">{error}</div>}
      </div>

      <div className="page-section info-box">
        <h4>About PDF Forms</h4>
        <p>
          Upload fillable PDF forms to use with your entities. The system will
          extract form fields that can be mapped to entity data. Once mapped,
          you can generate pre-filled PDFs for any entity.
        </p>
        <div className="mt-4">
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
