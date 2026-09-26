import React from 'react';
import { Link } from 'react-router-dom';
import './terms.css';

const TermsOfUse = () => {
    return (
        <div className="terms-container">
            <div className="terms-card">
                <h1 className="terms-title">Terms of Use</h1>
                <p className="terms-last-updated">Last Updated: March 24, 2026</p>
                
                <section className="terms-section">
                    <h2>1. Acceptance of Terms</h2>
                    <p>By accessing and using My College Quest, you clarify that you have read, understood, and agree to be bound by these Terms of Use.</p>
                </section>

                <section className="terms-section">
                    <h2>2. Description of Service</h2>
                    <p>My College Quest provides AI-driven tools to assist students in their college application process, including major recommendations, essay brainstorming, and college list management.</p>
                </section>

                <section className="terms-section">
                    <h2>3. Use of AI Technology</h2>
                    <p>Our services utilize artificial intelligence to provide recommendations. While we strive for accuracy, these suggestions are for informational purposes only and should not be the sole basis for your academic or career decisions.</p>
                </section>

                <section className="terms-section">
                    <h2>4. User Responsibilities</h2>
                    <p>You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.</p>
                </section>

                <section className="terms-section">
                    <h2>5. Privacy Policy</h2>
                    <p>Your use of our service is also governed by our Privacy Policy, which is incorporated into these terms by reference.</p>
                </section>

                <section className="terms-section">
                    <h2>6. Limitation of Liability</h2>
                    <p>My College Quest shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use our services.</p>
                </section>

                <div className="terms-footer-actions">
                    <Link to="/" className="back-home-btn">Back to Home</Link>
                </div>
            </div>
        </div>
    );
};

export default TermsOfUse;
