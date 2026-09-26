import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './findMajor.css';
import { useNavigate } from "react-router-dom";



const questions = [
  {
    id: 1,
    text: "When given a free afternoon, what are you most likely doing?",
    options: [
      "Tinkering with gadgets, coding, or solving puzzles.",
      "Reading a book, writing, or exploring history.",
      "Organizing an event, trading items, or leading a group.",
      "Drawing, making music, or decorating a space."
    ]
  },
  {
    id: 2,
    text: "Which of these subjects do you find most interesting or easiest to grasp?",
    options: [
      "Math and Science.",
      "English and Social Studies.",
      "Economics and Accounting.",
      "Art, Drama, or Music."
    ]
  },
  {
    id: 3,
    text: "How do you prefer to solve problems?",
    options: [
      "By analyzing data and using logic.",
      "By understanding people and exploring different perspectives.",
      "By looking at the bottom line and maximizing efficiency.",
      "By thinking outside the box and being creative."
    ]
  },
  {
    id: 4,
    text: "What type of work environment excites you the most?",
    options: [
      "A lab or tech company with cutting-edge tools.",
      "A non-profit, school, or community organization.",
      "A fast-paced corporate office or startup.",
      "A studio, theater, or design agency."
    ]
  },
  {
    id: 5,
    text: "What impact do you want to have on the world?",
    options: [
      "Inventing new technologies or discovering scientific breakthroughs.",
      "Advocating for social justice or educating the next generation.",
      "Building successful companies and driving the economy.",
      "Creating art or media that inspires and entertains people."
    ]
  },
  {
    id: 6,
    text: "What is your favorite way to learn a new skill?",
    options: [
      "Building it myself through hands-on practice.",
      "Reading deep into the theory and history.",
      "Discussing it with others in a group.",
      "Watching visual tutorials or experimenting creatively."
    ]
  },
  {
    id: 7,
    text: "Which of these words best describes you?",
    options: [
      "Analytical",
      "Empathetic",
      "Ambitious",
      "Imaginative"
    ]
  },
  {
    id: 8,
    type: "free_response",
    text: "Is there anything else you want to share about your interests, hobbies, or dream career? (Optional)",
  }
];

const FindMajor = () => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [freeResponseText, setFreeResponseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const navigate = useNavigate();

  const handleOptionSelect = async (option) => {
    const newAnswers = [...answers, { question: questions[currentQuestionIndex].text, answer: option }];
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Completed, get results
      await fetchResults(newAnswers);
    }
  };

  const fetchResults = async (finalAnswers) => {
    setLoading(true);
    const systemPrompt = "You are an expert college counselor. Based on the following questionnaire answers from a student, suggest the top 3 best college majors for them. For each major, provide a short paragraph explaining WHY it is a good fit, what typical career paths look like, and what kind of courses they would take. Format your response clearly in Markdown. Be encouraging and insightful. Do not include any greeting or conversational filler, just go straight into the recommendations.";

    let userPrompt = "Here are my answers:\\n";
    finalAnswers.forEach((ans, idx) => {
      userPrompt += `Q${idx + 1}: ${ans.question}\\nA: ${ans.answer}\\n\\n`;
    });

    try {
      const res = await fetch(
        `/api/gemini`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: systemPrompt + "\\n\\n" + userPrompt }] }
            ]
          }),
        }
      );

      const data = await res.json();
      const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      setResults(botReply || "Sorry, we couldn't generate a recommendation at this time. Please try again.");
    } catch (err) {
      console.error('Gemini error:', err);
      setResults("Sorry, there was an error connecting to our server. Please try again later.");
    }
    setLoading(false);
  };

  const restartQuiz = () => {
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setResults(null);
  };

  const backHome = () => {
    navigate("/");
  };

  // Progress Bar
  const progressPercent = ((currentQuestionIndex) / questions.length) * 100;

  return (
    <div className="find-major-container">
      {/* Home button top-left like other pages */}
      {!results && !loading && (
        <>
          <h1 className="find-major-title">
            Find Your Major
          </h1>
          <div className="question-card">
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <h2 className="question-text">{questions[currentQuestionIndex].text}</h2>

            {questions[currentQuestionIndex].type === "free_response" ? (
              <div className="free-response-container">
                <textarea
                  className="free-response-textarea"
                  placeholder="Tell us about any specific careers you've dreamed of, hobbies you love, or anything else..."
                  value={freeResponseText}
                  onChange={(e) => setFreeResponseText(e.target.value)}
                />
                <button
                  className="restart-btn complete-btn"
                  onClick={() => handleOptionSelect(freeResponseText || "Nothing additional")}
                >
                  Complete Questionnaire
                </button>
              </div>
            ) : (
              <div className="options-grid">
                {questions[currentQuestionIndex].options.map((option, idx) => (
                  <button
                    key={idx}
                    className="option-btn"
                    onClick={() => handleOptionSelect(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 text-sm text-gray-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="flex flex-col items-center">
          <div className="loading-spinner"></div>
          <h2 className="text-xl text-blue-400 font-semibold mt-4">Analyzing your interests...</h2>
          <p className="text-gray-400 mt-2">Discovering the best paths for you</p>
        </div>
      )}

      {results && !loading && (
        <div className="results-card">
          <h1 className="results-title">Your Recommended Majors</h1>
          <div className="results-content markdown-body">
            <ReactMarkdown>{results}</ReactMarkdown>
          </div>
          <button className="restart-btn" onClick={restartQuiz}>Retake Questionnaire</button>
        </div>
      )}
    </div>
  );
};

export default FindMajor;
