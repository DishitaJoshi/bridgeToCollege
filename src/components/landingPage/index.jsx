import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from '../../contexts/authContext'
import { doSignOut } from '../../firebase/auth'
import "./Landing.css";
import { Map, BrainCircuit, ListOrdered, Lock, Compass, BookText } from 'lucide-react';
import logo from '../../assets/newLogo.png';

const Landing = () => {
  const { userLoggedIn } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="landing-container">
      {/* Navbar */}
      <header className="navbar-header">
        {/* Home Symbol */}
        <Link to="/" className="logo-link">
          <img src={logo} alt="My Logo" />
        </Link>

        {/* Auth Buttons */}
        <div className="auth-buttons">
          <Link to="/home" className="login-btn">
            Ask Anything
          </Link>

          {!userLoggedIn && (
            <>
              <Link to="/login" className="login-btn">
                Log In
              </Link>
              <Link to="/register" className="signup-btn">
                Sign Up
              </Link>
            </>
          )}
          {/* Show Logout button only when user IS logged in */}
          {userLoggedIn && (
            <Link
              to="#"
              onClick={(e) => {
                e.preventDefault();
                doSignOut().then(() => navigate('/'));
              }}
              className="login-btn"
            >
              Log Out
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="hero-section">
        <div className="hero-content">
          <h1 className="hero-heading">Your Personal College Counselor</h1>
          <p className="hero-subheading">
            Get personalized guidance on essays, applications, and more.
          </p>

          {/* New Modern Action Cards */}
          <div className="action-cards-container">

            <Link to="/beginner" className="action-card">
              <div className="card-icon-wrapper bg-blue-50 text-blue-600">
                <Map size={28} strokeWidth={2.5} />
              </div>
              <h3 className="card-title">Beginner's Guide</h3>
              <p className="card-desc">Find your starting point and plan your journey.</p>
            </Link>

            <Link to="/brainstorm" className="action-card">
              <div className="card-icon-wrapper bg-purple-50 text-purple-600">
                <BrainCircuit size={28} strokeWidth={2.5} />
              </div>
              <h3 className="card-title">Brainstorm Essays</h3>
              <p className="card-desc">Generate and refine your personal statement ideas.</p>
            </Link>

            <Link to="/collegeList" className="action-card">
              <div className="card-icon-wrapper bg-green-50 text-green-600">
                <ListOrdered size={28} strokeWidth={2.5} />
              </div>
              <h3 className="card-title">Custom List</h3>
              <p className="card-desc">Build and manage your target college list.</p>
            </Link>

            <Link to="/findMajor" className="action-card">
              <div className="card-icon-wrapper bg-yellow-50 text-yellow-600">
                <Compass size={28} strokeWidth={2.5} />
              </div>
              <h3 className="card-title">Find Your Major</h3>
              <p className="card-desc">Discover paths that fit you.</p>
            </Link>

            <Link to="/essay" className="action-card">
              <div className="card-icon-wrapper bg-orange-50 text-orange-600">
                <BookText size={28} strokeWidth={2.5} />
              </div>
              <h3 className="card-title">Essay Editor</h3>
              <p className="card-desc">Write and refine your essays with AI.</p>
            </Link>

          </div>
        </div>
      </main>

      {/* Streamlined Footer */}
      <footer className="landing-footer">
        <Link to="/terms" className="footer-link">Terms Of Use</Link>
        <Link to="/feedback" className="footer-link">Feedback</Link>
      </footer>
    </div>
  );
};

export default Landing;