import { useState } from "react";

function Register({ onBack, onLogin, onRegister }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (onRegister) {
      onRegister({
        name: name.trim(),
        email: email.trim(),
        password,
      });
    }
  };

  return (
    <div className="login-popup">
      <div className="login-popup-heading">
        <span className="login-popup-icon" aria-hidden="true">
          +
        </span>

        <h2>Create account</h2>

        <p>Join ReFound and help belongings find their way home.</p>
      </div>

      <form className="login-popup-form" onSubmit={handleSubmit}>
        <div className="login-popup-field">
          <label htmlFor="register-name">Full name</label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            placeholder="Enter your full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <div className="login-popup-field">
          <label htmlFor="register-email">Email address</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="login-popup-field">
          <label htmlFor="register-password">Password</label>

          <div className="login-popup-password">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />

            <button
              type="button"
              className="login-popup-toggle"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="login-popup-field">
          <label htmlFor="register-confirm-password">
            Confirm password
          </label>

          <div className="login-popup-password">
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
            />

            <button
              type="button"
              className="login-popup-toggle"
              onClick={() =>
                setShowConfirmPassword((current) => !current)
              }
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && (
          <p className="login-popup-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="login-popup-submit">
          Create account <span aria-hidden="true">↗</span>
        </button>
      </form>

      <div className="login-popup-footer">
        <p>
          Already have an account?{" "}
          <button type="button" onClick={onLogin}>
            Log in
          </button>
        </p>

        <button
          type="button"
          className="login-popup-back"
          onClick={onBack}
        >
          Back to browsing
        </button>
      </div>
    </div>
  );
}

export default Register;