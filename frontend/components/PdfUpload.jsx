import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:5001/api";

function PdfUpload() {
  const [file, setFile] = useState(null);
  const [formName, setFormName] = useState("");
  const [formList, setFormList] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchForms = async () => {
    try {
      const response = await axios.get(`${API_URL}/forms`);
      setFormList(response.data);
    } catch (err) {
      console.error("Error fetching forms:", err);
      setError("Failed to load existing forms.");
    }
  };

  // Fetch existing forms on component mount
  useEffect(() => {
    fetchForms();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!file || !formName) {
      setError("Please provide both a form name and a PDF file.");
      return;
    }

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
    }
  };

  return (
    <div>
      <h2>PDF Form Management</h2>

      <h3>Uploaded Forms</h3>
      {formList.length === 0 ? (
        <p>No forms uploaded yet.</p>
      ) : (
        <ul>
          {formList.map((form) => (
            <li key={form.id}>
              {form.form_name} (Uploaded:{" "}
              {new Date(form.uploaded_at).toLocaleString()})
            </li>
          ))}
        </ul>
      )}

      <hr />

      <h3>Upload New Form Template</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Form Name:</label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>PDF File:</label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            required
          />
        </div>
        <button type="submit">Upload Form</button>
      </form>
      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default PdfUpload;
