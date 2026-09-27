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
  const [chat, setChat] = useState([{ role: 'model', text: 'Hello! I am here to help you get started with your college application journey. Think of me as your personal beginners guide, designed to help you navigate this process step-by-step. We can begin with any topic you have in mind. Do you have a topic you would like to start with, such as your extracurricular activities, your academic record and classes, or maybe something else?' }]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [recommendedQuestions, setRecommendedQuestions] = useState([
    "I don't know what I want to study or do after high school - where do I start?",
    "How do I figure out what I'm actually good at or interested in?",
    "Is college the right path for me, or are there other options?"
  ]);
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

  // System prompt for the chatbot
  const systemPrompt = `You are a warm, patient college counselor specializing in helping complete beginners who know absolutely nothing about college, careers, or what they want to do with their lives. Many students come to you feeling overwhelmed, confused, or completely lost about their future.

Your approach:
- Start from absolute zero - assume they know nothing about college admissions, majors, careers, or even what questions to ask
- Help them discover their interests, values, and strengths through gentle exploration and self-reflection exercises
- Break everything into tiny, manageable steps that won't overwhelm them
- Always provide 2-3 concrete, specific next steps they can take immediately
- Ask thoughtful follow-up questions that help them think deeper about themselves
- Validate their feelings of uncertainty - it's completely normal to feel lost at their age
- Use simple, non-jargon language and explain any college terms you mention
- Focus on self-discovery before diving into college specifics

Key areas to explore with beginners:
1. Personal interests and hobbies (what do they enjoy doing?)
2. Academic subjects they find engaging or easy
3. Values and what matters to them in life
4. Work environment preferences (creative, structured, helping people, etc.)
5. Basic understanding of college vs. other paths
6. Family expectations and financial considerations
7. Timeline awareness (when do they graduate high school?)

Remember: Your goal is to help them gain clarity about themselves first, then gradually introduce college and career concepts. Make them feel supported and less alone in this journey. Always end responses with encouragement and clear next steps.`;

  // New prompt specifically for generating recommended questions
  const recommendedQuestionsPrompt = `Based on the ongoing conversation above, suggest 2-3 NEW and dynamic follow-up questions the student could ask next to continue exploring their college journey. Make sure these questions are distinct, engaging, and directly relevant to the advice or topic just discussed. Format your response strictly as a JSON array of strings, like this: ["Question 1", "Question 2"]. Do not include markdown code fences or any other text.`;

  const welcomeMessage = {
    role: 'model',
    text: 'Hello! I am here to help you get started with your college application journey. Think of me as your personal beginners guide, designed to help you navigate this process step-by-step. We can begin with any topic you have in mind. Do you have a topic you would like to start with, such as your extracurricular activities, your academic record and classes, or maybe something else?'
  };
  // Load conversation history from Firebase on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!userId) return;

      try {
        const chatDocRef = doc(db, 'artifacts/default-app-id/public/data/beginner-chats', userId);
        const chatDoc = await getDoc(chatDocRef);

        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          // Check if this document matches the current user AND tool
          if (chatData.userId === userId && chatData.tool === 'Beginner') {
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
            tool: 'Beginner',
            timestamp: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        // Fallback to welcome message on error
        setChat([{
          role: 'model',
          text: 'Error loading chat history! Hi there! I am your personal college counselor. How can I help you get started with your college application today?'
        }]);
      }
    };

    loadChatHistory();
  }, [userId]);

  // Function to save chat to Firebase
  const saveChatToFirebase = async (updatedChat) => {
    if (!userId) return;

    try {
      const chatDocRef = doc(db, 'artifacts/default-app-id/public/data/beginner-chats', userId);

      await setDoc(chatDocRef, {
        userId: userId,
        messages: updatedChat,
        tool: 'Beginner',
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
            console.log('✅ Beginner questions updated:', parsedQuestions);
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
      <div className="beginner-title">Beginner's Starting Point</div>
      {/* Conditionally displays a login message if the user is not logged in */}
      {!isLoggedIn && (
        <div className="under-beginner-title">
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
          <div key={recommendedQuestions.join('|')} className="chat-suggested-container">
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