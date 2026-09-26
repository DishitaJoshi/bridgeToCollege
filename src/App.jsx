import Login from "./components/auth/login";
import Register from "./components/auth/register";
import Header from "./components/header";
import Home from "./components/home";
import { AuthProvider } from "./contexts/authContext";
import { Routes, Route, useLocation } from "react-router-dom";
import Landing from "./components/landingPage";
import CollegeList from "./components/collegeList/collegeList";
import  "./components/collegeList/collegeList.css";
//brainstorm
import Brainstorm from "./components/brainstorm/brainstorm";
import  "./components/brainstorm/brainstorm.css";
//beginner
import Beginner from "./components/beginner/beginner";
import  "./components/beginner/beginner.css";
//home.css
import './components/home/home.css';
//login.css
import './components/auth/login/login.css';
//feedback
import Feedback from "./components/feedback/feedback";
import './components/feedback/feedback.css';
//findMajor
import FindMajor from "./components/findMajor";
import "./components/findMajor/findMajor.css";
//terms
import TermsOfUse from "./components/terms/TermsOfUse";
import "./components/terms/terms.css";
//essay
import EssayEditor from "./components/essayEditor/EssayEditor";
import "./components/essayEditor/essayEditor.css";
import React, { useEffect } from "react";
import { auth, db } from "./firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

function App() {
  const location = useLocation();
    // ✅ Log page view on route change
    useEffect(() => {
      // ✅ Track Google Analytics page view
      if (typeof window.gtag !== "undefined") {
        window.gtag("event", "page_view", {
          page_path: location.pathname + location.search,
        });
      }

      if (location.pathname !== "/") return;
      const logPageView = async () => {
        try {
        
          const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
          const pageViewsCollectionRef = collection(db, `artifacts/${appId}/public/data/pageView`);
    
          const user = auth.currentUser;
    
          const docRef = await addDoc(pageViewsCollectionRef, {
            path: location.pathname,
            userId: user ? user.uid : "anonymous",
            timestamp: new Date(),
          });
    
          console.log("Page view logged with ID:", docRef.id);
        } catch (err) {
          console.error("Failed to log page view:", err);
        }
      };
    
      logPageView();
    }, [location]);
    
    
  
  return (
    <AuthProvider>
     {/* Only show Header if NOT on Landing or FindMajor */}
     {location.pathname !== "/" && <Header />}
      <div className="w-full">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/collegeList" element={<CollegeList />} />
          <Route path="/brainstorm" element={<Brainstorm />} />
          <Route path="/beginner" element={<Beginner />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/findMajor" element={<FindMajor />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route path="/essay" element={<EssayEditor />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </div>
       
    </AuthProvider>
  );
}

export default App;