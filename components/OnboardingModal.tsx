import React, { useState, useEffect } from 'react';

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FeedbackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);


interface OnboardingModalProps {
  onComplete: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [feedback, setFeedback] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // For fade-in effect
    setIsVisible(true);
  }, []);

  const feedbackOptions = ["Social Media", "A Friend or Colleague", "Google Search", "Article or Blog", "Other"];
  
  const handleFinish = () => {
    // Add a fade-out effect
    setIsVisible(false);
    setTimeout(() => {
        onComplete();
    }, 300); // match transition duration
  }

  return (
    <div 
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className={`bg-white text-gray-800 rounded-3xl shadow-2xl w-11/12 max-w-2xl transform transition-all duration-300 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {step === 1 && (
            <div className="p-12 text-center">
                <div className="flex justify-center mb-6">
                    <CheckIcon />
                </div>
                <h2 className="text-3xl font-bold mb-4">Welcome & Securely Connected</h2>
                <p className="text-gray-600 mb-8">
                    Your application is ready to go! We've securely connected to the Google AI services using the API key from your environment. You don't need to enter it manually.
                </p>
                <button 
                    onClick={() => setStep(2)}
                    className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300"
                >
                    Next
                </button>
            </div>
        )}
        {step === 2 && (
            <div className="p-12 text-center">
                 <div className="flex justify-center mb-6">
                    <FeedbackIcon />
                </div>
                <h2 className="text-3xl font-bold mb-4">One Last Thing...</h2>
                <p className="text-gray-600 mb-8">
                    To help us improve, please let us know how you heard about this app.
                </p>
                <div className="space-y-3 mb-8">
                    {feedbackOptions.map(option => (
                        <button
                            key={option}
                            onClick={() => setFeedback(option)}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${feedback === option ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'}`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleFinish}
                    disabled={!feedback}
                    className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-300"
                >
                    Get Started
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingModal;