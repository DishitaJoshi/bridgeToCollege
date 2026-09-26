import React, { useState, useEffect, useRef } from 'react';
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
  const [chat, setChat] = useState([{ role: 'model', text: 'Hey there! Im here to help you with the most creative part of your application: brainstorming your college essay ideas. This is your chance to tell a story that goes beyond your grades and showcases what makes you, well, you. To get started, do u have any essay ideas or a prompt in mind?' }]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, recommendedQuestions, loading]);

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
    "What's the best way to start brainstorming if I feel like I have no interesting experiences?",
    "Should I write about a major accomplishment or a personal challenge I've overcome?",
    "How can I tell if a topic is too cliche or overused?"
  ]);

  // System prompt for the chatbot
  const systemPrompt = `You are an expert college counselor and writing tutor who specializes in helping students brainstorm essay ideas. Whenever a student sends a message, respond with creative, specific, and relevant suggestions for essay topics, themes, or approaches. Ask guiding questions to spark their thinking, and provide examples of how an idea could be developed into a strong essay. Be friendly, supportive, and encouraging. If the student already has a topic in mind, help them explore different angles, stories, or structures they could use. Always respond with actionable advice that helps them generate and refine ideas.`;

  // New prompt specifically for generating recommended questions
  const recommendedQuestionsPrompt = `Based on our ongoing conversation, provide 2-3 short, actionable follow-up questions the student might want to ask next to continue brainstorming and developing their college essay. Format your response strictly as a JSON array of strings, like this: ["Question 1", "Question 2"]. Do not include any other text or markdown fences, just the JSON array.`;

  const welcomeMessage = {
    role: 'model',
    text: 'Hey there! Im here to help you with the most creative part of your application: brainstorming your college essay ideas. This is your chance to tell a story that goes beyond your grades and showcases what makes you, well, you. To get started, do u have any essay ideas or a prompt in mind?'
  };
  // Load conversation history from Firebase on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!userId) return;

      try {
        const chatDocRef = doc(db, 'artifacts/default-app-id/public/data/brainstorm-chats', userId);
        const chatDoc = await getDoc(chatDocRef);

        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          // Check if this document matches the current user AND tool
          if (chatData.userId === userId && chatData.tool === 'Brainstorm') {
            console.log('✅ Match found - loading existing messages for userId:', userId, 'tool: Beginner');
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
            tool: 'Brainstorm',
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
      const chatDocRef = doc(db, 'artifacts/default-app-id/public/data/brainstorm-chats', userId);

      await setDoc(chatDocRef, {
        userId: userId,
        messages: updatedChat,
        tool: 'Brainstorm',
        timestamp: serverTimestamp()
      }, { merge: true });

    } catch (error) {
      console.error('Error saving chat to Firebase:', error);
    }
  };

  // Function to fetch recommended questions from the Gemini API
  const fetchRecommendedQuestions = async (chatHistory = chat) => {
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
              ...chatHistory.map(msg => ({
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
          const cleanedText = rawQuestions.replace(/```(?:json)?/gi, '').trim();
          const parsedQuestions = JSON.parse(cleanedText);
          if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
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
      await fetchRecommendedQuestions(finalChat);

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
      <div className="brainstorm-title">Brainstorm Essay Ideas</div>
      {/* Conditionally displays a login message if the user is not logged in */}
      {!isLoggedIn && (
        <div className="under-brainstorm-title">
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
        <div ref={messagesEndRef} />
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