import { useState } from "react";
import "../styles/home.css";

function PlaneIcon() {
  return (
    <svg
      className="plane-svg"
      viewBox="0 0 100 70"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 32 L94 5 L57 65 L43 42 Z"
        fill="white"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="1.5"
      />
      <path
        d="M43 42 L94 5 L51 48 Z"
        fill="#e9eef0"
      />
      <path
        d="M43 42 L51 48 L57 65 Z"
        fill="#d5dfe2"
      />
    </svg>
  );
}

function GlobeLogo() {
  return (
    <div className="globe-logo">
      <svg
        viewBox="0 0 60 60"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="30" cy="30" r="25" />
        <path d="M30 5 C20 15 20 45 30 55" />
        <path d="M30 5 C40 15 40 45 30 55" />
        <path d="M6 30 H54" />
        <path d="M11 18 H49" />
        <path d="M11 42 H49" />

        <path
          className="logo-plane"
          d="M20 34 L42 18 L29 40 L27 32 Z"
        />
      </svg>
    </div>
  );
}

function FeatureIcon({ type }) {
  if (type === "discover") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 37 C20 37 8 25 8 16 A12 12 0 0 1 32 16 C32 25 20 37 20 37Z" />
        <circle cx="20" cy="16" r="4" />
      </svg>
    );
  }

  if (type === "plan") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <rect x="9" y="11" width="22" height="22" rx="3" />
        <path d="M14 11 V7 M26 11 V7" />
        <path d="M14 17 H26 M14 23 H26 M14 29 H22" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 33 C17 30 7 24 7 16 A7 7 0 0 1 20 13 A7 7 0 0 1 33 16 C33 24 23 30 20 33Z" />
    </svg>
  );
}

function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const switchMode = (loginMode) => {
    setIsLogin(loginMode);
    setShowPassword(false);
  };

  return (
    <div className="home">

      {/* Dark scenic overlay */}
      <div className="home-overlay" />

      {/* TOP NAVIGATION */}
      <header className="navbar">

        <div className="nav-logo">
          <GlobeLogo />
          <span>GlobeTrotter</span>
        </div>

        <nav className="nav-links">
          <a href="#destinations">Destinations</a>
          <a href="#plan">Plan Trip</a>
          <a href="#about">About Us</a>
          <a href="#contact">Contact</a>
        </nav>

        <button className="mobile-menu" aria-label="Open menu">
          <span />
          <span />
          <span />
        </button>

      </header>


      {/* MAIN HERO */}
      <main className="hero">

        {/* LEFT CONTENT */}
        <section className="hero-content">

          <h1>
            Build your
            <br />
            own
            <em>adventure</em>
          </h1>

          <p className="hero-tagline">
            Plan. Personalize. Explore.
          </p>

          <p className="hero-subtitle">
            Your dream trip, your way.
          </p>


          {/* PAPER PLANE */}
          <div className="flight-path">

            <svg
              className="dotted-path"
              viewBox="0 0 420 180"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M8 130
                   C70 165, 115 158, 150 125
                   C185 92, 210 105, 245 125
                   C285 150, 330 92, 390 48"
              />
            </svg>

            <div className="hero-plane">
              <PlaneIcon />
            </div>

          </div>

        </section>


        {/* AUTH CARD */}
        <section className="auth-card">

          <div className="auth-heading">
            <GlobeLogo />

            <div>
              <h2>GlobeTrotter</h2>
              <p>Your Journey, Your Story.</p>
            </div>
          </div>


          {/* LOGIN / SIGNUP TABS */}
          <div className="tabs">

            <button
              type="button"
              className={isLogin ? "active" : ""}
              onClick={() => switchMode(true)}
            >
              Login
            </button>

            <button
              type="button"
              className={!isLogin ? "active" : ""}
              onClick={() => switchMode(false)}
            >
              Sign Up
            </button>

          </div>


          {/* FORM */}
          <form
            className={`auth-form ${isLogin ? "login-form" : "signup-form"}`}
            onSubmit={(event) => event.preventDefault()}
          >

            {!isLogin && (
              <label className="input-group">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21 C4 16 8 14 12 14 C16 14 20 16 20 21" />
                  </svg>
                </span>

                <input
                  type="text"
                  placeholder="Full Name"
                />
              </label>
            )}


            <label className="input-group">
              <span className="input-icon">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M4 7 L12 13 L20 7" />
                </svg>
              </span>

              <input
                type="email"
                placeholder="Email"
              />
            </label>


            <label className="input-group">
              <span className="input-icon">
                <svg viewBox="0 0 24 24">
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8 10 V7 A4 4 0 0 1 16 7 V10" />
                </svg>
              </span>

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
              />

              <button
                type="button"
                className="eye-button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Show or hide password"
              >
                {showPassword ? "◉" : "◉"}
              </button>

            </label>


            {!isLogin && (
              <label className="input-group">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24">
                    <rect x="5" y="10" width="14" height="10" rx="2" />
                    <path d="M8 10 V7 A4 4 0 0 1 16 7 V10" />
                  </svg>
                </span>

                <input
                  type="password"
                  placeholder="Confirm Password"
                />
              </label>
            )}


            {isLogin && (
              <div className="forgot-password">
                Forgot Password?
              </div>
            )}


            <button
              type="submit"
              className="login-button"
            >
              {isLogin ? "Login" : "Create Account"}
              <span>→</span>
            </button>


            {isLogin && (
              <>
                <div className="divider">
                  <span />
                  <p>or</p>
                  <span />
                </div>

                <button
                  type="button"
                  className="google-button"
                >
                  <span className="google-g">G</span>
                  Continue with Google
                </button>
              </>
            )}


            <p className="switch-account">

              {isLogin
                ? "Don't have an account?"
                : "Already have an account?"
              }

              <button
                type="button"
                onClick={() => switchMode(!isLogin)}
              >
                {isLogin ? "Sign Up" : "Login"}
              </button>

            </p>

          </form>

        </section>

      </main>


      {/* BOTTOM FEATURES */}
      <section className="feature-bar">

        <div className="feature">

          <div className="feature-icon">
            <FeatureIcon type="discover" />
          </div>

          <div>
            <h3>Discover</h3>
            <p>Amazing destinations</p>
          </div>

        </div>


        <div className="feature-divider" />


        <div className="feature">

          <div className="feature-icon">
            <FeatureIcon type="plan" />
          </div>

          <div>
            <h3>Plan</h3>
            <p>Your perfect itinerary</p>
          </div>

        </div>


        <div className="feature-divider" />


        <div className="feature">

          <div className="feature-icon experience">
            <FeatureIcon type="experience" />
          </div>

          <div>
            <h3>Experience</h3>
            <p>Unforgettable moments</p>
          </div>

        </div>

      </section>

    </div>
  );
}

export default Home;