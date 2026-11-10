import { useEffect, useState } from "react";
import ReportItem from "./components/ReportItem";
import Login from "./components/Login";
import Register from "./components/Register";
import "./App.css";

const API_URL = "http://localhost:5000/api/items";

const categories = [
  "All items",
  "Electronics",
  "Accessories",
  "Books",
  "Clothing",
  "ID Cards",
  "Keys",
  "Bags",
  "Other",
];

// Small symbols used in the "Recently reported" panel.
const categoryIcons = {
  Electronics: "⌁",
  Accessories: "◇",
  Books: "▤",
  Clothing: "◈",
  "ID Cards": "▭",
  Keys: "⚿",
  Bags: "◧",
  Other: "✳",
};

function App() {
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [category, setCategory] = useState("All items");
  const [status, setStatus] = useState("All");
  const [activeNav, setActiveNav] = useState("Search Items");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Latest reports shown in the hero panel.
  const [recentItems, setRecentItems] = useState([]);
  const [recentRefresh, setRecentRefresh] = useState(0);

  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  const [pendingAction, setPendingAction] = useState(null);

  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    Boolean(localStorage.getItem("finditToken"))
  );

  // Verification interface state.
  const [selectedItem, setSelectedItem] = useState(null);
  const [verificationAnswers, setVerificationAnswers] = useState([
    "",
    "",
    "",
    "",
    "",
  ]);
  const [verificationSubmitting, setVerificationSubmitting] =
    useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [finderContact, setFinderContact] = useState(null);
  const [pendingClaims, setPendingClaims] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [myClaims, setMyClaims] = useState([]);
  const [myClaimsLoading, setMyClaimsLoading] = useState(false);
  const [myClaimsError, setMyClaimsError] = useState("");

  const loadItems = async (signal) => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();

    if (category !== "All items") {
      params.set("category", category);
    }

    if (status !== "All") {
      params.set("status", status);
    }

    if (submittedSearch) {
      params.set("search", submittedSearch);
    }

    try {
      const response = await fetch(
        `${API_URL}?${params.toString()}`,
        { signal }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load items.");
      }

      setItems(result.data);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(
          "Couldn't load items. Check that the backend is running."
        );
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    loadItems(controller.signal);

    return () => controller.abort();
  }, [category, status, submittedSearch]);

  // Load the three most recent reports for the hero panel.
  useEffect(() => {
    const controller = new AbortController();

    const loadRecentItems = async () => {
      try {
        const response = await fetch(API_URL, {
          signal: controller.signal,
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setRecentItems(result.data.slice(0, 3));
        }
      } catch (err) {
        // If this fails, the panel simply stays empty.
      }
    };

    loadRecentItems();

    return () => controller.abort();
  }, [recentRefresh]);

  const handleSearch = (event) => {
    event.preventDefault();

    setNotice("");
    setSubmittedSearch(search.trim());

    const section = document.getElementById("search-items");

    if (section) {
      const sectionPosition =
        section.getBoundingClientRect().top + window.scrollY;

      window.scrollTo({
        top: Math.max(0, sectionPosition + 100),
        behavior: "smooth",
      });
    }
  };

  // Existing navigation and scrolling behaviour.
  const goTo = (id, label) => {
    setActiveNav(label);

    const section = document.getElementById(id);

    if (section) {
      const top =
        section.getBoundingClientRect().top + window.scrollY;

      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
    }
  };

  const requireLogin = (action) => {
    setNotice("");
    setPendingAction(action);
    setShowRegister(false);
    setShowLogin(true);
  };

  const closeAuthModal = () => {
    setShowLogin(false);
    setShowRegister(false);
    setPendingAction(null);
  };

  // Preserve the existing report form scrolling behaviour.
  const showAndScrollToReportForm = () => {
    setShowReportForm(true);

    setTimeout(() => {
      const form = document.getElementById("report-form");

      if (form) {
        const top =
          form.getBoundingClientRect().top + window.scrollY;

        window.scrollTo({
          top: Math.max(0, top - 80),
          behavior: "smooth",
        });
      }
    }, 100);
  };

  const openReportForm = () => {
    if (isLoggedIn) {
      setNotice("");
      showAndScrollToReportForm();
    } else {
      requireLogin("report");
    }
  };

  const handleGetStarted = () => {
    if (isLoggedIn) {
      setNotice("");
      showAndScrollToReportForm();
    } else {
      requireLogin("getStarted");
    }
  };
  const loadPendingClaims = async () => {
    const token = localStorage.getItem("finditToken");

    if (!token) return;

    setReviewLoading(true);
    setReviewError("");

    try {
      const response = await fetch(`${API_URL}/review/pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not load pending claims.");
      }

      setPendingClaims(result.data || []);
    } catch (err) {
      setReviewError(err.message || "Could not load pending claims.");
    } finally {
      setReviewLoading(false);
    }
  };
  
const loadMyClaims = async () => {
  setMyClaimsLoading(true);
  setMyClaimsError("");

  try {
    const token = localStorage.getItem("finditToken");

    const response = await fetch(`${API_URL}/my-claims`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to load your claims.");
    }

    setMyClaims(result.data || []);
  } catch (error) {
    setMyClaimsError(error.message);
  } finally {
    setMyClaimsLoading(false);
  }
};


  const handleClaimReview = async (itemId, decision) => {
    const token = localStorage.getItem("finditToken");

    if (!token) {
      requireLogin("reviewClaims");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${itemId}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not review this claim.");
      }

      setNotice(
        decision === "approve"
          ? "Claim approved successfully."
          : "Claim rejected. The item is available to claim again."
      );

      await loadPendingClaims();
      await loadItems();
      setRecentRefresh((count) => count + 1);
    } catch (err) {
      setReviewError(err.message || "Could not review this claim.");
    }
  };
  const handleLogout = () => {
    localStorage.removeItem("finditToken");
    setIsLoggedIn(false);
    setShowReportForm(false);
    setSelectedItem(null);
    setFinderContact(null);
    setPendingAction(null);
    setNotice("You have been logged out.");
  };

  const handleReportSuccess = () => {
    setShowReportForm(false);
    setCategory("All items");
    setStatus("All");
    setSearch("");
    setSubmittedSearch("");
    setRecentRefresh((count) => count + 1);
    setNotice("Your report was submitted successfully.");
  };

  // Open verification for a selected found item.
  const openItemVerification = (item) => {
    setSelectedItem(item);
    setVerificationAnswers(["", "", "", "", ""]);
    setVerificationMessage("");
    setVerificationResult(null);
    setFinderContact(null);

    if (!localStorage.getItem("finditToken")) {
      setIsLoggedIn(false);
      requireLogin("verifyItem");
    }
  };

  // Submit all five answers to the backend.
  const handleVerificationSubmit = async (event) => {
    event.preventDefault();

    if (!selectedItem) return;

    const token = localStorage.getItem("finditToken");

    if (!token) {
      setIsLoggedIn(false);
      requireLogin("verifyItem");
      return;
    }

    setVerificationSubmitting(true);
    setVerificationMessage("");
    setVerificationResult(null);
    setFinderContact(null);

    try {
      const response = await fetch(
        `${API_URL}/${selectedItem._id}/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
  answers: verificationAnswers.slice(
    0,
    selectedItem.privateQuestions.length
  ),
}),
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("finditToken");
        setIsLoggedIn(false);
        requireLogin("verifyItem");

        throw new Error(
          "Your session expired. Please log in again."
        );
      }

      if (result.reviewRequired) {
  setError("");
  alert("Claim submitted for manual review.");
  return;

}

if (!response.ok || !result.success) {
  throw new Error(
    result.message || "Could not verify your answers."
  );
}

      const isVerified = Boolean(result.verified);

      setVerificationResult(isVerified);
      setFinderContact(isVerified ? result.contact || null : null);

      if (!isVerified) {
        setVerificationMessage("Verification unsuccessful. Please try again.");
        return;
      }

      // Remove the claimed item from the database first, so it stays removed
      // after refresh. This requires DELETE /api/items/:id on the backend.
      
      setVerificationMessage(
  "Claim submitted! The finder will review your request."
);

setItems((current) =>
  current.filter((entry) => entry._id !== selectedItem._id)
);

setRecentItems((current) =>
  current.filter((entry) => entry._id !== selectedItem._id)
);

      setVerificationMessage(
        "Verification successful! Please contact the finder."
      );

      // Only update the UI after the backend confirms deletion.
      setItems((current) =>
        current.filter((entry) => entry._id !== selectedItem._id)
      );

      setRecentItems((current) =>
        current.filter((entry) => entry._id !== selectedItem._id)
      );
    } catch (err) {
      setVerificationMessage(
        err.message === "Failed to fetch"
          ? "Couldn't connect to the server. Please try again."
          : err.message
      );
    } finally {
      setVerificationSubmitting(false);
    }
  };

  return (
    <div className="site-shell">
      <header className="topbar">
        <a
          className="wordmark"
          href="#home"
          aria-label="ReFound home"
        >
          ReFound<span>.</span>
        </a>

        
        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={activeNav === "Search Items" ? "nav-item selected" : "nav-item"}
            onClick={() => goTo("search-items", "Search Items")}
          >
            Search Items
          </button>

          <button
            className={activeNav === "Report an Item" ? "nav-item selected" : "nav-item"}
            onClick={() => goTo("closing-banner", "Report an Item")}
          >
            Report an Item
          </button>

          <button
            className={activeNav === "How It Works" ? "nav-item selected" : "nav-item"}
            onClick={() => goTo("how-it-works", "How It Works")}
          >
            How It Works
          </button>

          <button
            className={activeNav === "Contact" ? "nav-item selected" : "nav-item"}
            onClick={() => goTo("contact", "Contact")}
          >
            Contact
          </button>

          {isLoggedIn && (
            <button
              className={activeNav === "Pending Claims" ? "nav-item selected" : "nav-item"}
              onClick={() => {
                setActiveNav("Pending Claims");
                loadPendingClaims();
                document.getElementById("pending-claims")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              Pending Claims
            </button>
          )}
          
{isLoggedIn && (
  <button
    className={
      activeNav === "My Claims"
        ? "nav-item selected"
        : "nav-item"
    }
    onClick={() => {
      setActiveNav("My Claims");
      loadMyClaims();
      document.getElementById("my-claims")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }}
  >
    My Claims
  </button>
)}

        </nav>


        <div className="nav-actions">
          {isLoggedIn ? (
            <button
              className="login-link"
              onClick={handleLogout}
            >
              Log out
            </button>
          ) : (
            <button
              className="login-link"
              onClick={() => {
                setNotice("");
                setPendingAction(null);
                setShowRegister(false);
                setShowLogin(true);
              }}
            >
              Log in
            </button>
          )}

          <button
            className="get-started"
            onClick={handleGetStarted}
          >
            Get Started <span>↗</span>
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-layout">
            <div className="hero-content">

              <h1>Lost something? Let's bring it home.</h1>

              <p className="hero-copy">
                Lost objects. Found people. One campus community.
              </p>

              <div className="hero-actions">
                <button
                  type="button"
                  className="hero-btn hero-btn-primary"
                  onClick={() => goTo("search-items", "Search Items")}
                >
                  Find an item <span>↗</span>
                </button>

                <button
                  type="button"
                  className="hero-btn hero-btn-secondary"
                  onClick={openReportForm}
                >
                  Report an item <span>+</span>
                </button>
              </div>

              <form className="search-box" onSubmit={handleSearch}>
                <span className="search-symbol" aria-hidden="true">
                  ⌕
                </span>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="What did you lose?"
                  aria-label="Search for a lost item"
                />

                <button type="submit" aria-label="Search items">
                  →
                </button>
              </form>

              <p className="hero-hint">
                <span className="live-dot" />
                A little help goes a long way.
              </p>
            </div>

            <aside
              className="recent-panel"
              aria-label="Recently reported items"
            >
              <p className="recent-panel-title">
                RECENTLY REPORTED ON CAMPUS
              </p>

              {recentItems.length === 0 ? (
                <p className="recent-empty">
                  Nothing reported yet. Be the first to help someone
                  find their way back to their belongings.
                </p>
              ) : (
                recentItems.map((item) => (
                  <button
                    type="button"
                    className="recent-item"
                    key={item._id}
                    onClick={() => goTo("search-items", "Search Items")}
                  >
                    <span className="recent-icon" aria-hidden="true">
                      {categoryIcons[item.category] || "✳"}
                    </span>

                    <span className="recent-text">
                      <span className="recent-item-title">
                        {item.title}
                      </span>

                      <span className="recent-item-meta">
                        {item.location} · {item.status}
                      </span>
                    </span>

                    <span className="recent-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                ))
              )}
            </aside>
          </div>
        </section>

        <section className="community-section" id="search-items">
          <div className="section-topline">
            <div>
              <p className="eyebrow">THE COMMUNITY BOARD</p>

              <h2>
                
                <em>Hope isn't lost.</em>
              </h2>
            </div>

            <p className="section-description">
              From keys to notebooks, every item has a way home.
              Start with a category and find your way.
            </p>
          </div>

          <div
            className="category-list"
            aria-label="Filter item status"
          >
            {["All", "Lost", "Found"].map((item) => (
              <button
                key={item}
                className={
                  status === item
                    ? "category-chip active"
                    : "category-chip"
                }
                onClick={() => {
                  setStatus(item);
                  setNotice("");
                }}
              >
                {item === "All" ? "All items" : `${item} items`}
              </button>
            ))}
          </div>

          <div
            className="category-list"
            aria-label="Filter item categories"
          >
            {categories.map((item) => (
              <button
                key={item}
                className={
                  category === item
                    ? "category-chip active"
                    : "category-chip"
                }
                onClick={() => {
                  setCategory(item);
                  setNotice("");
                }}
              >
                {item}
              </button>
            ))}
          </div>

          {notice && (
            <p className="notice-message" role="status">
              {notice}
            </p>
          )}

          <div className="items-board">
            {loading ? (
              <div className="items-feedback">
                Looking for your items...
              </div>
            ) : error ? (
              <div
                className="items-feedback error-message"
                role="alert"
              >
                {error}

                <button
                  className="outline-button"
                  onClick={() => loadItems()}
                >
                  Try again
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="empty-board">
                <div className="empty-art" aria-hidden="true">
                  <span className="art-ring" />
                  <span className="art-spark">✳</span>
                  <span className="art-dot" />
                </div>

                <p className="eyebrow">A FRESH START</p>

                <h3>No items found just yet.</h3>

                <p>
                  {submittedSearch
                    ? `We couldn't find items matching "${submittedSearch}". Try another search.`
                    : "When someone reports a lost or found item, this is where the story begins."}
                </p>

                {submittedSearch && (
                  <button
                    className="outline-button"
                    onClick={() => {
                      setSearch("");
                      setSubmittedSearch("");
                    }}
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="item-grid">
                {items.map((item) => (
                  <article className="item-card" key={item._id}>
                    {item.imageUrl ? (
                      
<img
  className="item-image"
  src={
    item.imageUrl?.startsWith("/uploads/")
      ? `http://localhost:5000${item.imageUrl}`
      : item.imageUrl
  }
  alt={item.title}
/>

                    ) : (
                      <div className="item-image item-image-placeholder">
                        <span>
                          ReFound
                          <span className="placeholder-dot">.</span>
                        </span>
                      </div>
                    )}

                    <div className="item-card-content">
                      <div className="item-card-meta">
                        <span className="item-category">
                          {item.category}
                        </span>

                        <span
                          className={`item-status ${item.status.toLowerCase()}`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <h3>{item.title}</h3>

                      <p className="item-description">
                        {item.description}
                      </p>

                      <p className="item-location">
                        ⌖ {item.location}
                      </p>

                      <p className="item-date">
                        {new Date(
                          item.dateLostOrFound
                        ).toLocaleDateString()}
                      </p>

                      {item.status === "Found" && (
                        <button
                          type="button"
                          className="closing-button"
                          onClick={() => openItemVerification(item)}
                        >
                          Verify &amp; claim <span>↗</span>
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

{isLoggedIn && (
  <section
    id="pending-claims"
    className="community-section"
    style={{ scrollMarginTop: "100px" }}
  >
    <div className="section-topline">
      <div>
        <p className="eyebrow">FINDER DASHBOARD</p>
        <h2>Review <em>claims.</em></h2>
      </div>
      <button
        type="button"
        className="outline-button"
        onClick={loadPendingClaims}
        disabled={reviewLoading}
      >
        {reviewLoading ? "Loading..." : "Refresh claims"}
      </button>
    </div>

    {reviewError && (
      <p className="form-message form-error" role="alert">
        {reviewError}
      </p>
    )}

    {reviewLoading ? (
      <p>Loading pending claims...</p>
    ) : pendingClaims.length === 0 ? (
      <p>No claims are waiting for review.</p>
    ) : (
      <div className="item-grid">
        {pendingClaims.map((item) => (
          <article className="item-card" key={item._id}>
            <div className="item-card-content">
              <span className="item-category">{item.category}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <p className="item-location">⌖ {item.location}</p>

              <h4>Claimant's answers</h4>
              {(item.claimReview?.answers || []).map((answer, index) => (
                <p key={index}>
                  <strong>
                    {item.privateQuestions?.[index]?.question ||
                      `Answer ${index + 1}`}:
                  </strong>{" "}
                  {answer}
                </p>
              ))}

              <div className="form-actions">
                <button
                  type="button"
                  className="closing-button"
                  onClick={() => handleClaimReview(item._id, "approve")}
                >
                  Approve claim
                </button>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => handleClaimReview(item._id, "reject")}
                >
                  Reject
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    )}
  </section>
  
)}

{isLoggedIn && (
  <section
    id="my-claims"
    className="community-section"
    style={{ scrollMarginTop: "100px" }}
  >
    <div className="section-topline">
      <div>
        <p className="eyebrow">CLAIMANT DASHBOARD</p>
        <h2>My <em>claims.</em></h2>
      </div>

      <button
        type="button"
        className="outline-button"
        onClick={loadMyClaims}
        disabled={myClaimsLoading}
      >
        {myClaimsLoading ? "Loading..." : "Refresh claims"}
      </button>
    </div>

    {myClaimsError && (
      <p className="form-message form-error" role="alert">
        {myClaimsError}
      </p>
    )}

    {myClaimsLoading ? (
      <p>Loading your approved claims...</p>
    ) : myClaims.length === 0 ? (
      <p>No approved claims yet.</p>
    ) : (
      <div className="item-grid">
        {myClaims.map((item) => (
          <article className="item-card" key={item._id}>
            <div className="item-card-content">
              <span className="item-category">{item.category}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <p className="item-location">⌖ {item.location}</p>

              <p>
                <strong>Claim status:</strong> Approved
              </p>
              <p>
                <strong>Finder:</strong> {item.contactName || "Item finder"}
              </p>
              <p>
                <strong>Finder's email:</strong>{" "}
                {item.contactEmail ? (
                  <a href={`mailto:${item.contactEmail}`}>
                    {item.contactEmail}
                  </a>
                ) : (
                  "Email unavailable"
                )}
              </p>
            </div>
          </article>
        ))}
      </div>
    )}
  </section>
)}


        {showReportForm && (
          <div id="report-form">
            <ReportItem
              onSuccess={handleReportSuccess}
              onCancel={() => setShowReportForm(false)}
            />
          </div>
        )}

        <section className="steps-section" id="how-it-works">
          <div className="steps-heading">
            <p className="eyebrow">SIMPLE BY DESIGN</p>

            <h2>
              Three steps.
              <br />
              <em>One happy reunion.</em>
            </h2>
          </div>

          <div className="steps-grid">
            <article className="step-card">
              <span className="step-number">01</span>
              <span className="step-icon">⌕</span>
              <h3>Search around</h3>

              <p>
                Look through campus listings and see if your missing
                item has turned up.
              </p>
            </article>

            <article className="step-card">
              <span className="step-number">02</span>
              <span className="step-icon">↗</span>
              <h3>Share the details</h3>

              <p>
                Report what you've lost or found so the right person
                can recognise it.
              </p>
            </article>

            <article className="step-card">
              <span className="step-number">03</span>
              <span className="step-icon">♡</span>
              <h3>Make the reunion</h3>

              <p>
                Coordinate a safe handover and give a lost belonging
                its happy ending.
              </p>
            </article>
          </div>
        </section>

        <section className="closing-banner" id="closing-banner">
          <div>

            <h2>
              Found something
              <br />
              that isn't yours?
            </h2>

            <p>
              Report it  and help it find its owner.
            </p>
          </div>

          <button
            className="closing-button"
            onClick={openReportForm}
          >
            Report a found item <span>↗</span>
          </button>
        </section>
      </main>

      <footer className="site-footer" id="contact">
        <a className="wordmark footer-wordmark" href="#home">
          ReFound<span>.</span>
        </a>

        <p>Lost less. Find more. Be a good human.</p>

        <span>Made for campus life · ReFound</span>
      </footer>

      {/* Private verification modal */}
      {selectedItem &&
        isLoggedIn &&
        !showLogin &&
        !showRegister && (
          <div
            className="auth-modal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedItem(null);
              }
            }}
          >
            <div
  className="auth-modal-content verification-modal-content"
  role="dialog"
  aria-modal="true"
  aria-label="Verify item ownership"
>
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => setSelectedItem(null)}
                aria-label="Close verification"
              >
                ×
              </button>

              <section className="report-form-section">
                <div className="report-form-heading">
                  <p className="eyebrow">
                    A FEW DETAILS ONLY THE OWNER KNOWS
                  </p>

                  <h2>
                    Verify this <em>item.</em>
                  </h2>

                  <p>
  {selectedItem.privateQuestions?.length > 0
    ? "Answer the reporter's private questions about: "
    : "You can request the finder's contact details for: "}
  {selectedItem.title}
</p>
                </div>

                {Array.isArray(selectedItem.privateQuestions) ? (
                  <form
                    className="report-form"
                    onSubmit={handleVerificationSubmit}
                  >
                    {selectedItem.privateQuestions.length === 0 && (
                      <p className="form-message">
                        This item has no verification questions. If the finder
                        enabled direct contact, you can view their contact details
                        to arrange a handover. Please meet in a public place on
                        campus.
                      </p>
                    )}

                    {selectedItem.privateQuestions.map(
                      (item, index) => (
                        <div
                          className="form-field form-field-full"
                          key={`${selectedItem._id}-question-${index}`}
                        >
                          <label
                            htmlFor={`verification-answer-${index}`}
                          >
                            {index + 1}. {item.question}
                          </label>

                          <input
                            id={`verification-answer-${index}`}
                            value={verificationAnswers[index]}
                            onChange={(event) => {
                              const value = event.target.value;

                              setVerificationAnswers((current) =>
                                current.map((answer, answerIndex) =>
                                  answerIndex === index
                                    ? value
                                    : answer
                                )
                              );

                              setVerificationMessage("");
                              setVerificationResult(null);
                              setFinderContact(null);
                            }}
                            maxLength={250}
                            placeholder="Your answer"
                            required
                          />
                        </div>
                      )
                    )}

                    {verificationMessage && (
                      <p
                        className={`form-message ${
                          verificationResult
                            ? "form-success"
                            : "form-error"
                        }`}
                        role="status"
                      >
                        {verificationMessage}
                      </p>
                    )}

                    {verificationResult && finderContact && (
                      <div
                        className="form-message form-success"
                        role="status"
                      >
                        <p>
                          <strong>Get in touch with the finder</strong>
                        </p>

                        {finderContact.name && (
                          <p>Name: {finderContact.name}</p>
                        )}

                        {finderContact.email && (
                          <p>
                            Email:{" "}
                            <a
                              href={`mailto:${
                                finderContact.email
                              }?subject=${encodeURIComponent(
                                `Claiming my ${selectedItem.title} on ReFound`
                              )}`}
                            >
                              {finderContact.email}
                            </a>
                          </p>
                        )}

                        <p>
                          Please arrange the handover in a public
                          place on campus.
                        </p>
                      </div>
                    )}

                    <div className="form-actions">
                      <button
                        type="button"
                        className="outline-button"
                        onClick={() => setSelectedItem(null)}
                        disabled={verificationSubmitting}
                      >
                        Cancel
                      </button>

                      {verificationResult ? (
                        <button
                          type="button"
                          className="closing-button"
                          onClick={() => setSelectedItem(null)}
                        >
                          Done <span>✓</span>
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="closing-button"
                          disabled={verificationSubmitting}
                        >
                          {verificationSubmitting
                            ? "Checking..."
                            : selectedItem.privateQuestions.length === 0
                              ? "View contact details"
                              : "Verify answers"}
                          {!verificationSubmitting && <span>↗</span>}
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div>
                    Questions aren't available for this item.
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

      {/* Login and registration modal */}
      {(showLogin || showRegister) && (
        <div
          className="auth-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAuthModal();
            }
          }}
        >
          <div
            className="auth-modal-content"
            role="dialog"
            aria-modal="true"
            aria-label={showLogin ? "Log in" : "Create account"}
          >
            <button
              type="button"
              className="auth-modal-close"
              onClick={closeAuthModal}
              aria-label="Close authentication"
            >
              ×
            </button>

            {showLogin ? (
              <Login
                onBack={closeAuthModal}
                onCreateAccount={() => {
                  setShowLogin(false);
                  setShowRegister(true);
                }}
                onLogin={async (formData) => {
                  try {
                    const response = await fetch(
                      "http://localhost:5000/api/auth/login",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(formData),
                      }
                    );

                    const data = await response.json();

                    if (!response.ok || !data.success) {
                      throw new Error(
                        data.message || "Login failed."
                      );
                    }

                    if (!data.token) {
                      throw new Error(
                        "Login succeeded, but no authentication token was returned."
                      );
                    }

                    localStorage.setItem("finditToken", data.token);
                    setIsLoggedIn(true);

                    setShowLogin(false);

                    setNotice(
                      `Welcome back${
                        data.user?.name ? `, ${data.user.name}` : ""
                      }!`
                    );

                    if (
                      pendingAction === "report" ||
                      pendingAction === "getStarted"
                    ) {
                      showAndScrollToReportForm();
                    }

                    // For verification, selectedItem remains selected.
                    // Once the login modal closes, the verification
                    // modal becomes visible automatically.
                    setPendingAction(null);
                  } catch (error) {
                    console.error("Login error:", error);
                    throw error;
                  }
                }}
              />
            ) : (
              <Register
                onBack={closeAuthModal}
                onLogin={() => {
                  setShowRegister(false);
                  setShowLogin(true);
                }}
                onRegister={async (formData) => {
                  try {
                    const response = await fetch(
                      "http://localhost:5000/api/auth/register",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(formData),
                      }
                    );

                    const data = await response.json();

                    if (!response.ok || !data.success) {
                      alert(data.message || "Registration failed.");
                      return;
                    }

                    alert("Account created successfully!");

                    setShowRegister(false);
                    setShowLogin(true);
                  } catch (error) {
                    console.error("Registration error:", error);

                    alert(
                      "Could not connect to the server. Please try again."
                    );
                  }
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;