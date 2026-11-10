import React, { useState } from "react";
import axios from "axios";

const initialForm = { to: "", subject: "", message: "" };
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function App() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSending, setIsSending] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setStatus({ type: "", message: "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSending) return;

    const to = form.to.trim();
    const subject = form.subject.trim();
    const message = form.message.trim();

    if (!emailPattern.test(to)) {
      setStatus({ type: "error", message: "Enter a valid recipient email." });
      return;
    }
    if (!subject) {
      setStatus({ type: "error", message: "Subject is required." });
      return;
    }
    if (!message) {
      setStatus({ type: "error", message: "Message is required." });
      return;
    }

    setIsSending(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await axios.post(`${apiUrl}/api/email/send`, {
        to,
        subject,
        message,
      });

      if (response.data.success !== true) {
        throw new Error(response.data.message || "Unable to send email.");
      }

      setForm(initialForm);
      setStatus({ type: "success", message: response.data.message });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          !error.response
            ? "Could not reach the server. Check that the backend is running."
            : error.response.data?.message || error.message || "Unable to send email.",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Mail App home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4.5 6.75h15v10.5h-15z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="m5 7.5 7 5.25 7-5.25"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>Mail App</span>
        </a>
        <span className="secure-label">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M10 2.5 4 5v4.75c0 3.8 2.55 6.5 6 7.75 3.45-1.25 6-3.95 6-7.75V5l-6-2.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="m7.5 10 1.65 1.65L13 7.8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Simple &amp; secure
        </span>
      </header>

      <section className="compose-layout">
        <div className="intro">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            YOUR INBOX, MADE SIMPLE
          </div>
          <h1>Say it clearly.<br />Send it simply.</h1>
          <p>
            A quiet space to write what matters and send it on its way.
          </p>
          <div className="intro-note">
            <span className="note-icon" aria-hidden="true">✳</span>
            <span>No clutter. Just a good message.</span>
          </div>
        </div>

        <section className="compose-card" aria-labelledby="compose-title">
          <div className="card-heading">
            <div>
              <span className="card-kicker">NEW MESSAGE</span>
              <h2 id="compose-title">Compose email</h2>
            </div>
            <span className="compose-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M20.5 3.5 10.8 13.2M20.5 3.5l-6.2 17-3.5-7.3-7.3-3.5 17-6.2Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="to">To</label>
            <div className="input-wrap">
              <span className="field-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="6.25" r="3" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M4.5 16c.5-2.5 2.4-3.75 5.5-3.75s5 1.25 5.5 3.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <input
                id="to"
                name="to"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={form.to}
                onChange={handleChange}
                required
              />
            </div>

            <label htmlFor="subject">Subject</label>
            <div className="input-wrap">
              <span className="field-icon subject-icon" aria-hidden="true">Aa</span>
              <input
                id="subject"
                name="subject"
                type="text"
                placeholder="What's this about?"
                value={form.subject}
                onChange={handleChange}
                required
              />
            </div>

            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              placeholder="Write your message here..."
              value={form.message}
              onChange={handleChange}
              rows="6"
              required
            />

            <div className="form-footer">
              <span className="plain-text-note">
                <span aria-hidden="true">↳</span> Sent as plain text
              </span>
              <button type="submit" disabled={isSending}>
                {isSending ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send email
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M3.5 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          {status.message && (
            <div
              className={`feedback ${status.type}`}
              role={status.type === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              <span className="feedback-mark" aria-hidden="true">
                {status.type === "success" ? "✓" : "!"}
              </span>
              {status.message}
            </div>
          )}
        </section>
      </section>

      <footer className="page-footer">
        <span>Thoughtful messages, delivered.</span>
        <span className="footer-dot" aria-hidden="true">·</span>
        <span>Made for the moments that matter</span>
      </footer>
    </main>
  );
}

export default App;
