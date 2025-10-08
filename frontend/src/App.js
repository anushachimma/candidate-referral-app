// src/App.js
import React, { useEffect, useState, useRef } from "react";
import "./styles.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(phone);
}

export default function App() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    jobTitle: "",
  });
  const resumeInputRef = useRef(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  async function fetchCandidates() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/candidates`);
      if (!res.ok) throw new Error("Failed to fetch candidates");
      const data = await res.json();
      setCandidates(data);
    } catch (err) {
      console.error(err);
      setError("Could not load candidates. Check backend.");
    } finally {
      setLoading(false);
    }
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) {
      setResumeFile(null);
      return;
    }
    const isPdf =
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setMessage(null);
      setError("Please upload PDF files only.");
      e.target.value = null;
      setResumeFile(null);
      return;
    }
    setError(null);
    setResumeFile(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!form.name || !form.email || !form.phone || !form.jobTitle) {
      setError("Please fill all required fields.");
      return;
    }
    if (!isValidEmail(form.email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!isValidPhone(form.phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("email", form.email);
    fd.append("phone", form.phone);
    fd.append("jobTitle", form.jobTitle);
    if (resumeFile) fd.append("resume", resumeFile);

    try {
      const res = await fetch(`${API_BASE}/candidates`, {
        method: "POST",
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Failed to refer candidate");
        return;
      }
      setCandidates((p) => [body, ...p]);
      setMessage("Candidate referred successfully!");
      setForm({ name: "", email: "", phone: "", jobTitle: "" });
      setResumeFile(null);
      if (resumeInputRef.current) resumeInputRef.current.value = null;
    } catch (err) {
      console.error(err);
      setError("Server error while referring candidate.");
    }
  }

  async function updateStatus(id, newStatus) {
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/candidates/${encodeURIComponent(id)}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) throw new Error("Failed to update status");
      const updated = await res.json();
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? updated : c))
      );
      setMessage("Status updated.");
    } catch (err) {
      console.error(err);
      setError("Could not update status.");
    }
  }

  const filtered = candidates.filter((c) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      (c.jobTitle || "").toLowerCase().includes(s) ||
      (c.status || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="app-container">
      <h1 className="app-title">Candidate Referral Dashboard</h1>

      <div className="app-layout">
        <aside className="form-card">
          <h2>Refer a Candidate</h2>
          <form onSubmit={handleSubmit} className="referral-form">
            <label>
              Name *
              <input
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="Candidate name"
              />
            </label>

            <label>Email *</label>
            <input
              name="email"
              value={form.email}
              onChange={handleFormChange}
              placeholder="email@example.com"
            />

            <label>Phone *</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleFormChange}
              placeholder="10 digit phone"
            />

            <label>Job Title *</label>
            <input
              name="jobTitle"
              value={form.jobTitle}
              onChange={handleFormChange}
              placeholder="Frontend / Backend / Fullstack"
            />

            <label>Resume (optional, PDF only)</label>
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
            />

            <button type="submit">Refer Candidate</button>
          </form>

          {message && <div className="message">{message}</div>}
          {error && <div className="error">{error}</div>}
        </aside>

        <main className="list-card">
          <div className="list-header">
            <h2>Referrals</h2>
            <input
              placeholder="Search by job title or status"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : filtered.length === 0 ? (
            <p>No candidates found.</p>
          ) : (
            filtered.map((c) => (
              <div key={c.id} className="candidate-card">
                <div className="candidate-info">
                  <div>
                    <div className="candidate-name">{c.name}</div>
                    <div className="candidate-job">{c.jobTitle}</div>
                    <div className="candidate-contact">
                      {c.email} • {c.phone}
                    </div>
                  </div>

                  <div className="candidate-actions">
                    <label>Status</label>
                    <select
                      value={c.status || "Pending"}
                      onChange={(e) => updateStatus(c.id, e.target.value)}
                    >
                      <option>Pending</option>
                      <option>Reviewed</option>
                      <option>Hired</option>
                    </select>

                    {c.resumeUrl && (
                      <a
                        href={`${API_BASE}${c.resumeUrl}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Resume
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
