import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { db, auth, initializeAuth } from '../../firebase/firebase'; // Import from firebase folder when in components/feedback/
import {
  collection,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';


const Home = () => {
  const [userInput, setUserInput] = useState('');
  const [chat, setChat] = useState([{ role: 'model', text: 'Hi there! I’m your personal college counselor. How can I help you get started with your college application today?' }]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid); // Get actual user ID from auth
        setIsLoggedIn(true);
      } else {
        setUserId(null); // User not logged in
      }
    });
    return unsubscribe;
  }, []);
  const [recommendedQuestions, setRecommendedQuestions] = useState([
    "What should I be looking for when I'm just starting to explore colleges?",
    "How do we figure out what kind of colleges would be a good fit for me?",
    "What are some initial steps to building my personalized college list?"
  ]);

  // System prompt for the chatbot
  const systemPrompt = `You are an expert college counselor who helps students who are beginners in the college application process. Many of these students don't know where to start, so whenever a student sends a message, respond with simple, encouraging, and actionable advice. Break big tasks (like essays, resumes, and applications) into manageable steps. Ask guiding questions to help them reflect on their experiences and goals. If they feel stuck, suggest concrete first steps or brainstorming exercises. Always respond — never return empty responses. Be friendly, supportive, and specific so that students feel confident beginning their application journey.`;

  // New prompt specifically for generating recommended questions
  const recommendedQuestionsPrompt = `Based on our conversation so far, predict 2-3 short, actionable questions that this student would most likely want to ask me next as their college counselor. Think about what natural follow-up questions would come to their mind given what we've discussed. The questions should represent what the student would actually say or ask to continue getting help with their college application journey. If this is the beginning of our conversation, focus on common first questions students ask when getting started. Format your response as a JSON array of strings, like this: ["What specific majors should I consider based on my interests?", "How do I research colleges that fit my criteria?", "What should I focus on first in my application timeline?"]. Do not include any other text, just the JSON.`;

  // Load conversation history from Firebase on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!userId) return;

      try {
        const chatDocRef = doc(db, 'artifacts/default-app-id/public/data/chats', userId);
        const chatDoc = await getDoc(chatDocRef);

        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          // Check if this document matches the current user AND tool
          if (chatData.userId === userId && chatData.tool === 'Home') {
            console.log('✅ Match found - loading existing messages for userId:', userId, 'tool: Home');
            const loadedMessages = chatData.messages || [welcomeMessage];
            console.log('📝 Loading', loadedMessages.length, 'messages from Firebase');
            setChat(loadedMessages);
          } else {
            console.log('❌ No match - Document userId:', chatData.userId, 'Document tool:', chatData.tool);
            console.log('🔄 Starting fresh with welcome message');
            // Document exists but doesn't match current user/tool - start fresh
            setChat([welcomeMessage]);
          }
        } else {
          // Initialize with welcome message for new users
          const welcomeMessage = {
            role: 'model',
            text: 'Hi there! I am your personal college counselor. How can I help you get started with your college application today?'
          };
          setChat([welcomeMessage]);

          // Create initial document in Firebase
          await setDoc(chatDocRef, {
            userId: userId,
            messages: [welcomeMessage],
            tool: 'Home',
            timestamp: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        // Fallback to welcome message on error
        setChat([{
          role: 'model',
          text: 'Hi there! I am your personal college counselor. How can I help you get started with your college application today?'
        }]);
      }
    };

    loadChatHistory();
  }, [userId]);

  // Function to save chat to Firebase
  const saveChatToFirebase = async (updatedChat) => {
    if (!userId) return;

    try {
      const chatDocRef = doc(db, 'artifacts/default-app-id/public/data/chats', userId);

      await setDoc(chatDocRef, {
        userId: userId,
        messages: updatedChat,
        tool: 'Home',
        timestamp: serverTimestamp()
      }, { merge: true });

    } catch (error) {
      console.error('Error saving chat to Firebase:', error);
    }
  };

  // Function to fetch recommended questions from the Gemini API
  const fetchRecommendedQuestions = async () => {
    try {
      const res = await fetch(
        `/api/gemini`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Pass the entire chat history to get relevant questions
            contents: [
              ...chat.map(msg => ({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: [{ text: msg.text }]
              })),
              { role: 'user', parts: [{ text: recommendedQuestionsPrompt }] }
            ],
          }),
        }
      );

      const data = await res.json();
      const rawQuestions = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (rawQuestions) {
        try {
          const parsedQuestions = JSON.parse(rawQuestions);
          if (Array.isArray(parsedQuestions)) {
            setRecommendedQuestions(parsedQuestions);
          }
        } catch (parseError) {
          console.error("Failed to parse recommended questions JSON:", parseError);
        }
      }
    } catch (err) {
      console.error('Error fetching recommended questions:', err);
    }
  };

  // Initial fetch for questions when chat is loaded
  useEffect(() => {
    if (chat.length > 0) {
      fetchRecommendedQuestions();
    }
  }, [chat.length]);

  // Main function to handle user message and bot response
  const handleSend = async (message = null) => {
    console.log('handleSend called with message:', message); // Add this line
    console.log('userInput:', userInput); // Add this line
    const messageToSend = message || userInput;
    if (!messageToSend.trim()) return;

    setLoading(true);

    const newUserMessage = { role: 'user', text: messageToSend };
    const newChat = [...chat, newUserMessage];
    setChat(newChat);
    setUserInput('');

    // Save user message to Firebase
    await saveChatToFirebase(newChat);

    // Construct the contents array for the Gemini API call
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...newChat.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }))
    ];

    try {
      const res = await fetch(
        `/api/gemini`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contents }),
        }
      );

      const data = await res.json();
      const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      const botMessage = {
        role: 'model',
        text: botReply || '🤖 Gemini did not return a response.'
      };

      const finalChat = [...newChat, botMessage];
      setChat(finalChat);

      // Save complete conversation to Firebase
      await saveChatToFirebase(finalChat);

      // Fetch new recommended questions after a message is sent
      await fetchRecommendedQuestions();

    } catch (err) {
      console.error('Gemini error:', err);
      const errorMessage = { role: 'model', text: '❌ Error talking to Gemini.' };
      const finalChat = [...newChat, errorMessage];
      setChat(finalChat);
      await saveChatToFirebase(finalChat);
    }
    setLoading(false);
  };

  // Function to handle when a user clicks on a recommended question
  const handleRecommendedQuestionClick = (question) => {
    handleSend(question);
  };

  return (

    <div className="flex flex-col items-center justify-center min-h-screen p-2 bg-gray-900 font-sans text-gray-100">
      <div className="home-title">Start a Chat!</div>
      {/* Conditionally displays a login message if the user is not logged in */}
      {!isLoggedIn && (
        <div className="under-home-title">
          <a href="/login" className="text-blue-400 underline hover:text-blue-300">
            Log In
          </a>{' '}
          to save your chat!
        </div>
      )}

      <div className="overflow-y-auto h-96 border border-gray-300 rounded p-3 space-y-2">
        {chat.map((msg, index) => (
          <div key={index} className="chat-message-row">
            {msg.role === 'model' ? (
              <div className="chat-ai-message-wrapper">
                <span className="text-2xl pt-1">🎓</span>
                <div className="chat-ai-bubble">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="chat-user-message-wrapper">
                <div className="chat-user-bubble">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
                <span className="text-2xl pt-1">👤</span>
              </div>
            )}
          </div>
        ))}

        {/* Show recommended questions after all messages */}
        {recommendedQuestions.length > 0 && !loading && (
          <div className="chat-suggested-container">
            <div className="chat-suggested-heading">
              Suggested Questions
            </div>
            <div className="chat-suggested-list">
              {recommendedQuestions.map((question, index) => (
                <div
                  key={index}
                  className="chat-suggested-pill"
                  onClick={() => handleRecommendedQuestionClick(question)}
                >
                  {question}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conditional "Thinking..." message */}
        {loading && (
          <div className="flex justify-start mb-2">
            <div className="flex items-start space-x-2">
              <span className="text-2xl animate-pulse">🎓</span>
              <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-2xl max-w-m break-words">
                Thinking...
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="input-wrapper-spacer">
        <div className="gemini-input-container">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ask something..."
            rows="1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button type="button" className="send-button" onClick={() => handleSend()} disabled={loading}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;