import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { db, auth } from '../../firebase/firebase'; // Import from firebase folder when in components/feedback/
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Link } from 'react-router-dom';



const Home = () => {
  const [userInput, setUserInput] = useState('');
  const [chat, setChat] = useState([{
    role: 'model',
    text: 'Hello! I can help you build a personalized college list of schools that are a great fit for you. To get started, what are some of the most important things you are looking for in a college? For example, are you focused on a specific major, a certain location, or the size and feel of the campus?'
  }]);
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
    "Where should I even begin with building my college list?",
    "What factors are most important for me to consider when looking at colleges?",
    "What kind of information do you need from me to start suggesting personalized options?"
  ]);

  // System prompt for the chatbot
  const systemPrompt = `You are an expert college counselor who helps students build a personalized college list. Start by asking the student short, focused questions to understand their academic profile, interests, and preferences (e.g., GPA/test scores, intended major, location, size of school, extracurriculars, financial considerations, campus culture). Based on their answers, recommend a balanced list of reach, match, and safety schools. Always explain why each college might be a good fit. Be supportive, specific, and encouraging in your responses.`;

  // New prompt specifically for generating recommended questions
  const recommendedQuestionsPrompt = `Using your role as an expert college counselor, provide 2-3 short, actionable questions a student might want to **ask you** to get started with building a personalized college list. The questions should be relevant to the ongoing conversation and a beginner's stage in the process. Ask questions that student might ask like "could you create me a personalized college list?" or "what should I look for in a college I want to go to?". If the conversation is just starting, ask general questions. If the conversation has already touched on a topic (like academic interests), ask a follow-up question on the student's behalf to dig deeper (e.g., "What specific colleges are good for me?"). Format your response as a JSON array of strings, like this: ["What kind of colleges do you suggest?", "Which colleges are the best for my major?", "Which colleges are in my budget?"]. Do not include any other text, just the JSON.`;

  //welcome message
  const welcomeMessage = {
    role: 'model',
    text: 'Hello! I can help you build a personalized college list of schools that are a great fit for you. To get started, what are some of the most important things you are looking for in a college? For example, are you focused on a specific major, a certain location, or the size and feel of the campus?'
  };


  // Load conversation history from Firebase on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!userId) return;

      try {
        const chatDocRef = doc(db, 'artifacts/default-app-id/public/data/college-list-chats', userId);
        const chatDoc = await getDoc(chatDocRef);

        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          // Check if this document matches the current user AND tool
          if (chatData.userId === userId && chatData.tool === 'College-list') {
            console.log('✅ Match found - loading existing messages for userId:', userId, 'tool: College-list');
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
          setChat([welcomeMessage]);

          // Create initial document in Firebase
          await setDoc(chatDocRef, {
            userId: userId,
            messages: [welcomeMessage],
            tool: 'College-list',
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
      const chatDocRef = doc(db, 'artifacts/default-app-id/public/data/college-list-chats', userId);

      await setDoc(chatDocRef, {
        userId: userId,
        messages: updatedChat,
        tool: 'College-list',
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
      <div className="college-list-title">Get Your Personalized College List</div>
      {/* Conditionally displays a login message if the user is not logged in */}
      {!isLoggedIn && (
        <div className="under-college-list-title">
          <Link to="/login" className="text-blue-400 underline hover:text-blue-300">
            Log In
          </Link>{' '}
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
              <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-2xl max-w-xs break-words">
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