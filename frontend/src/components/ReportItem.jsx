
import { useState } from "react";

const API_URL = "http://localhost:5000/api/items";

const createInitialForm = () => ({
  title: "",
  description: "",
  category: "Electronics",
  status: "Found",
  location: "",
  dateLostOrFound: "",
  imageUrl: "",
  contactName: "",
  contactEmail: "",
  privateQuestions: Array.from({ length: 5 }, () => ({
    question: "",
    answer: "",
  })),
});

const categories = [
  "Electronics",
  "Accessories",
  "Books",
  "Clothing",
  "ID Cards",
  "Keys",
  "Bags",
  "Other",
];

function ReportItem({ onSuccess, onCancel }) {
  const [form, setForm] = useState(createInitialForm);
  const [questionCount, setQuestionCount] = useState(5);
  const [allowDirectContact, setAllowDirectContact] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleQuestionCountChange = (event) => {
    const count = Number(event.target.value);

    setQuestionCount(count);
    setAllowDirectContact(false);

    setForm((current) => ({
      ...current,
      privateQuestions: Array.from(
        { length: count },
        (_, index) =>
          current.privateQuestions[index] || {
            question: "",
            answer: "",
          }
      ),
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      privateQuestions: current.privateQuestions.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const questions = form.privateQuestions.slice(0, questionCount);

    const incompleteQuestion = questions.some(
      (item) => !item.question.trim() || !item.answer.trim()
    );

    if (incompleteQuestion) {
      setError(
        "Please fill in both the question and answer for each verification question."
      );
      setSubmitting(false);
      return;
    }

    if (questionCount === 0 && !allowDirectContact) {
      setError(
        "Please confirm that you agree to share your contact details with logged-in claimants."
      );
      setSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem("finditToken");

      if (!token) {
        throw new Error("Please log in before reporting an item.");
      }

      
const formData = new FormData();

formData.append("title", form.title);
formData.append("description", form.description);
formData.append("category", form.category);
formData.append("location", form.location);
formData.append(
  "dateLostOrFound",
  new Date(form.dateLostOrFound).toISOString()
);
formData.append("contactName", form.contactName);
formData.append("contactEmail", form.contactEmail);
formData.append("status", "Found");
formData.append(
  "privateQuestions",
  JSON.stringify(
    questions.map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
  )
);
formData.append(
  "allowDirectContact",
  String(questionCount === 0 && allowDirectContact)
);

if (imageFile) {
  formData.append("image", imageFile);
}

const response = await fetch(API_URL, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});


      const result = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("finditToken");
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to report this item."
        );
      }

      setSuccess("Your item has been reported successfully.");
      setForm(createInitialForm());
      setQuestionCount(5);
      setAllowDirectContact(false);

      if (onSuccess) {
        onSuccess(result.data);
      }
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Couldn't connect to the server. Make sure the backend is running."
          : err.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="report-form-section"
      aria-labelledby="report-heading"
    >
      <div className="report-form-heading">
        <p className="eyebrow">
          HELP SOMETHING FIND ITS WAY HOME
        </p>

        <h2 id="report-heading">
          Report an <em>item.</em>
        </h2>

        <p>
          Share a few details to help reunite an item with its owner.
        </p>
      </div>

      <form className="report-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="title">Item name</label>
          <input
            id="title"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Black wireless earbuds"
            maxLength={100}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={form.category}
            onChange={handleChange}
            required
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="location">Campus location</label>
          <input
            id="location"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="e.g. Library, Block B"
            maxLength={150}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="dateLostOrFound">
            Date found
          </label>
          <input
            id="dateLostOrFound"
            name="dateLostOrFound"
            type="date"
            value={form.dateLostOrFound}
            onChange={handleChange}
            max={new Date().toLocaleDateString("en-CA")}
            required
          />
        </div>

        <div className="form-field form-field-full">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe the item and any details that could help identify it..."
            maxLength={1000}
            rows={4}
            required
          />
        </div>

        
<div className="form-field form-field-full">
  <label htmlFor="image">Upload item image (optional)</label>
  <input
    id="image"
    type="file"
    accept="image/*"
    onChange={(event) => {
      const file = event.target.files[0];
      setImageFile(file || null);
      setImagePreview(
        file ? URL.createObjectURL(file) : ""
      );
    }}
  />

  {imagePreview && (
    <img
      src={imagePreview}
      alt="Selected item preview"
      style={{
        width: "160px",
        height: "120px",
        objectFit: "cover",
        borderRadius: "8px",
        marginTop: "10px",
      }}
    />
  )}
</div>


        <div className="form-field">
          <label htmlFor="contactName">Your name</label>
          <input
            id="contactName"
            name="contactName"
            value={form.contactName}
            onChange={handleChange}
            maxLength={100}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="contactEmail">Contact email</label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            value={form.contactEmail}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-field-full verification-section">
          <div className="verification-heading">
            <p className="eyebrow">KEEP THESE PRIVATE</p>
            <h3>Private verification questions</h3>
            <p>
              Add up to five questions about details only the real
              owner is likely to know. Keep the answers secret.
              You can also choose not to use questions.
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="questionCount">
              Number of verification questions
            </label>
            <select
              id="questionCount"
              value={questionCount}
              onChange={handleQuestionCountChange}
            >
              {[0, 1, 2, 3, 4, 5].map((count) => (
                <option key={count} value={count}>
                  {count === 0
                    ? "No questions"
                    : `${count} question${count === 1 ? "" : "s"}`}
                </option>
              ))}
            </select>
          </div>

          {questionCount > 0 &&
            form.privateQuestions.map((item, index) => (
              <div
                className="verification-question"
                key={index}
              >
                <h4>Question {index + 1}</h4>

                <div className="form-field">
                  <label htmlFor={`private-question-${index}`}>
                    Verification question
                  </label>
                  <input
                    id={`private-question-${index}`}
                    value={item.question}
                    onChange={(event) =>
                      handleQuestionChange(
                        index,
                        "question",
                        event.target.value
                      )
                    }
                    placeholder={
                      index === 0
                        ? "e.g. What sticker is on the laptop?"
                        : "Enter a question only the owner should know"
                    }
                    maxLength={250}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor={`private-answer-${index}`}>
                    Correct answer (private)
                  </label>
                  <input
                    id={`private-answer-${index}`}
                    value={item.answer}
                    onChange={(event) =>
                      handleQuestionChange(
                        index,
                        "answer",
                        event.target.value
                      )
                    }
                    placeholder="Enter the correct answer"
                    maxLength={250}
                    required
                  />
                </div>
              </div>
            ))}

          {questionCount === 0 && (
            <div className="form-field form-field-full">
              <p className="form-message form-error">
                Without verification questions, your name and
                contact email will be shared with logged-in
                claimants who choose to claim this item. Your
                contact details should remain hidden from public
                item listings.
              </p>

              <label>
                <input
                  type="checkbox"
                  checked={allowDirectContact}
                  onChange={(event) =>
                    setAllowDirectContact(event.target.checked)
                  }
                />{" "}
                I understand and agree to share my contact details
                with logged-in claimants without verification
                questions.
              </label>
            </div>
          )}
        </div>

        {error && (
          <p
            className="form-message form-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            className="form-message form-success"
            role="status"
          >
            {success}
          </p>
        )}

        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              className="outline-button"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            className="closing-button"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit report"}
            {!submitting && <span>↗</span>}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ReportItem;
