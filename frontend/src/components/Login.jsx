
import { useState } from "react";

function Login({ onBack, onCreateAccount, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (onLogin) {
      setIsLoading(true);

      try {
        await onLogin({
          email: email.trim(),
          password,
        });
      } catch (err) {
        setError(err.message || "Login failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="login-popup">
      <div className="login-popup-heading">
        <span className="login-popup-icon" aria-hidden="true">
          ↗
        </span>

        <h2>Welcome back</h2>

        <p>Log in to continue to ReFound.</p>
      </div>

      <form className="login-popup-form" onSubmit={handleSubmit}>
        <div className="login-popup-field">
          <label htmlFor="login-email">Email address</label>

          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="login-popup-field">
          <label htmlFor="login-password">Password</label>

          <div className="login-popup-password">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button
              type="button"
              className="login-popup-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && (
          <p className="login-popup-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="login-popup-submit"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Log in"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
      </form>

      <div className="login-popup-footer">
        <p>
          New to ReFound?{" "}
          <button type="button" onClick={onCreateAccount}>
            Create account
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

export default Login;
