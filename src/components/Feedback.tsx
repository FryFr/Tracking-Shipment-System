import React, { useState } from 'react';
import { Smile, Frown, Send, CheckCircle2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface FeedbackProps {
    userEmail: string;
}

const Feedback: React.FC<FeedbackProps> = ({ userEmail }) => {
    const [rating, setRating] = useState<'promoter' | 'detractor' | null>(null);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rating) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'feedback'), {
                email: userEmail,
                rating,
                comment,
                timestamp: serverTimestamp(),
            });
            setSubmitted(true);
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Failed to submit feedback. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-green-500/10 backdrop-blur-xl border border-green-500/20 rounded-3xl p-6 shadow-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                        <p className="text-white font-semibold">Thanks for your feedback!</p>
                        <p className="text-green-400/70 text-sm">We appreciate your help.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 group">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-2xl w-[320px] transition-all duration-300 hover:bg-white/10">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    How's your experience?
                </h3>

                <div className="flex justify-center gap-6 mb-6">
                    <button
                        onClick={() => setRating('promoter')}
                        className={`flex flex-col items-center gap-2 transition-all duration-300 ${rating === 'promoter' ? 'scale-110' : 'opacity-40 hover:opacity-100 hover:scale-105'
                            }`}
                    >
                        <div className={`p-3 rounded-2xl ${rating === 'promoter' ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/50'}`}>
                            <Smile className="w-8 h-8" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/50">Promoter</span>
                    </button>

                    <button
                        onClick={() => setRating('detractor')}
                        className={`flex flex-col items-center gap-2 transition-all duration-300 ${rating === 'detractor' ? 'scale-110' : 'opacity-40 hover:opacity-100 hover:scale-105'
                            }`}
                    >
                        <div className={`p-3 rounded-2xl ${rating === 'detractor' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/50'}`}>
                            <Frown className="w-8 h-8" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/50">Detractor</span>
                    </button>
                </div>

                {rating && (
                    <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-top-4">
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Any suggestions for us?"
                            className="w-full bg-black/20 border border-white/5 rounded-2xl p-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all resize-none mb-4"
                            rows={3}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Submit Feedback
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Feedback;
