import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import "./feedback.css";
import { auth, db, initializeAuth} from '../../firebase/firebase'; // Import from firebase folder when in components/feedback/

// Main App component
export default function App() {
  const [feedback, setFeedback] = useState({
    rating: 0,
    competitorApp: '',
    improvements: '',
    recommendation: '',
    recommendationOther: '',
    submitted: false,
    loading: false,
    error: null,
  });

  const [isAuthReady, setIsAuthReady] = useState(false);
  //const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  
  useEffect(() => {
    const setupAuth = async () => {
      try {
        // Initialize authentication using the centralized helper
        await initializeAuth();

        // Set up auth state listener
        const unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) {
            setUserId(user.uid);
          } else {
            setUserId(null);
          }
          setIsAuthReady(true);
        });

        return () => unsubscribe();
      } catch (e) {
        console.error("Authentication setup failed:", e);
        setFeedback(prev => ({ ...prev, error: `Failed to connect to the database: ${e.message}` }));
        setIsAuthReady(true); // Set to true even on error to allow UI to show
      }
    };

    setupAuth();
  }, []);

  // Add this function to check if form is valid (for real-time validation)
const isFormValid = () => {
    return feedback.rating > 0 && 
           feedback.competitorApp && 
           feedback.competitorApp.trim() !== '' &&
           feedback.improvements && 
           feedback.improvements.trim() !== '' &&
           feedback.recommendation &&
           (feedback.recommendation !== 'other' || 
            (feedback.recommendationOther && feedback.recommendationOther.trim() !== ''));
  };
  
  const handleSubmit = async (e) => {
      e.preventDefault();
      setFeedback((prev) => ({ ...prev, loading: true, error: null }));
  
      if (!isAuthReady || !userId) {
        setFeedback(prev => ({ ...prev, loading: false, error: "Database not ready. Please wait." }));
        return;
      }
  
      // Validation - check if all required fields are filled
      const validationErrors = [];
      
      if (feedback.rating === 0) {
        validationErrors.push("star rating");
      }
      
      if (!feedback.competitorApp || feedback.competitorApp.trim() === '') {
        validationErrors.push("competitor app question");
      }
      
      if (!feedback.improvements || feedback.improvements.trim() === '') {
        validationErrors.push("improvement suggestions");
      }
      
      if (!feedback.recommendation) {
        validationErrors.push("recommendation question");
      }
      
      // If "Other" is selected for recommendation, check if the text field is filled
      if (feedback.recommendation === 'other' && (!feedback.recommendationOther || feedback.recommendationOther.trim() === '')) {
        validationErrors.push("recommendation details");
      }
  
      // If there are validation errors, show them and stop submission
      if (validationErrors.length > 0) {
        setFeedback(prev => ({ 
          ...prev, 
          loading: false, 
          error: `Please complete: ${validationErrors.join(', ')}`
        }));
        return;
      }
  
      try {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const feedbacksCollectionRef = collection(db, `artifacts/${appId}/public/data/feedbacks`);
  
        const docRef = await addDoc(feedbacksCollectionRef, {
          rating: feedback.rating,
          competitorApp: feedback.competitorApp.trim(),
          improvements: feedback.improvements.trim(),
          recommendation: feedback.recommendation === 'other' ? feedback.recommendationOther.trim() : feedback.recommendation,
          timestamp: new Date(),
          userId: userId
        });
  
        console.log('Feedback submitted with ID:', docRef.id);
        setFeedback((prev) => ({ ...prev, submitted: true, loading: false, error: null }));
      } catch (error) {
        console.error("Error submitting feedback:", error);
        setFeedback((prev) => ({ ...prev, error: `Submission failed: ${error.message}`, loading: false }));
      }
  };
  // CHANGED: handleRatingChange now takes a number
  const handleRatingChange = (rating) => {
    setFeedback((prev) => ({ ...prev, rating }));
  };

  // ADDED: New handler for the recommendation buttons
  const handleRecommendationChange = (recommendation) => {
    setFeedback((prev) => ({ ...prev, recommendation }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFeedback((prev) => ({ ...prev, [name]: value }));
  };

  const MessageBox = ({ message, type }) => {
    if (!message) return null;
    const boxClass = type === 'error' ? 'error-message' : 'success-message';
    return (
      <div className={`message-box ${boxClass}`}>
        <p>{message}</p>
      </div>
    );
  };

  if (feedback.submitted) {
    return (
      <div className="feedback-container">
        <div className="feedback-card thank-you-card">
          <div className="icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" className="rating-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="thank-you-title">Thank you for your feedback!</h1>
          <p className="thank-you-message">Your input is invaluable and helps us improve. We appreciate you taking the time to share your thoughts with us.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-container">
      <div className="feedback-card">
        <h1 className="form-title">How was your experience?</h1>
        <p className="form-subtitle">Share your thoughts to help us improve.</p>

        {feedback.error && <MessageBox message={feedback.error} type="error" />}

        <form onSubmit={handleSubmit}>
          {/* CHANGED: Star Rating Section */}
          <div className="form-section">
            <label className="form-label">Overall Satisfaction</label>
            <div className="star-rating-container">
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  size={30}
                  onClick={() => handleRatingChange(index + 1)}
                  // The star's color changes based on the selected rating
                  className={`star-icon ${index < feedback.rating ? 'star-filled' : 'star-unfilled'}`}
                />
              ))}
            </div>
          </div>

          {/* ADDED: New feedback question sections */}
          <div className="form-section">
            <label htmlFor="competitorApp" className="form-label">Have you used a competitor app? If yes, which one?</label>
            <textarea
              id="competitorApp"
              name="competitorApp"
              value={feedback.competitorApp}
              onChange={handleChange}
              rows="2"
              className="textarea-input"
              placeholder="e.g., other AI based counselling tools.."
            ></textarea>
          </div>

          <div className="form-section">
            <label htmlFor="improvements" className="form-label">What can we improve?</label>
            <textarea
              id="improvements"
              name="improvements"
              value={feedback.improvements}
              onChange={handleChange}
              rows="4"
              className="textarea-input"
              placeholder="Your suggestions here..."
            ></textarea>
          </div>

          {/* ADDED: Recommendation buttons */}
          <div className="form-section">
            <label className="form-label">Would you recommend this app to a friend?</label>
            <div className="recommendation-buttons-container">
              {['Yes', 'No', 'Maybe', 'Other'].map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => handleRecommendationChange(option.toLowerCase())}
                  className={`recommendation-button ${feedback.recommendation === option.toLowerCase() ? 'selected' : ''}`}
                >
                  {option}
                </button>
              ))}
            </div>
            {/* Show 'Other' input field only if 'Other' is selected */}
            {feedback.recommendation === 'other' && (
              <input
                type="text"
                name="recommendationOther"
                value={feedback.recommendationOther}
                onChange={handleChange}
                className="text-input other-input"
                placeholder="Please specify..."
              />
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="submit-button"
            disabled={feedback.loading || feedback.rating === 0}
          >
            {feedback.loading ? (
              <>
                <div className="spinner"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Feedback</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
