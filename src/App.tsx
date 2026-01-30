import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TrackingInput } from './components/TrackingInput';
import { TrackingResult } from './components/TrackingResult';
import { useTracking } from './hooks/useTracking';
import { Truck, ChevronLeft, ChevronRight } from 'lucide-react';

function App() {
  const { data, loading, error, trackShipment } = useTracking();
  const [showResult, setShowResult] = useState(false);

  // Background style
  const backgroundStyle = {
    background: 'radial-gradient(circle at 50% 0%, #2a2a2a 0%, #111111 60%)',
  };

  const [isExiting, setIsExiting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleSearch = async (trackingNumber: string) => {
    await trackShipment(trackingNumber);
    setShowResult(true);
    setIsExiting(false);
    setActiveIndex(0);
  };

  const handleBack = () => {
    setIsExiting(true);
    setTimeout(() => {
      setShowResult(false);
      setIsExiting(false);
    }, 500); // Match animation duration
  };

  // Reset view if error occurs
  useEffect(() => {
    if (error) {
      alert(error); // Simple error handling for now
      setShowResult(false);
    }
  }, [error]);

  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans text-gray-900 selection:bg-primary/30" style={backgroundStyle}>
      {/* Dynamic background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[100px] mix-blend-screen opacity-40" />
      </div>

      <Header />

      <main className="container mx-auto pt-8 pb-20 relative z-10 flex flex-col items-center">
        {!showResult ? (
          <div className={`flex-1 flex flex-col justify-center items-center w-full min-h-[60vh] animate-in fade-in duration-700`}>
            <div className="mb-8 p-6 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 shadow-2xl">
              <Truck className="w-20 h-20 text-blue-600 opacity-90" strokeWidth={1.5} />
            </div>
            <TrackingInput onSearch={handleSearch} loading={loading} />
          </div>
        ) : (
          <div className={`w-full relative min-h-[80vh] flex justify-center pt-24 md:pt-32 ${isExiting ? 'animate-slide-down' : 'animate-slide-up'}`}>
            <button
              onClick={handleBack}
              className="absolute top-4 left-4 md:top-8 md:left-8 z-50 flex items-center gap-2 text-white/80 hover:text-white transition-colors group bg-black/20 hover:bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
            >
              <div className="p-1 rounded-lg">
                <Truck className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm">Track another</span>
            </button>

            <div className="relative w-full max-w-5xl h-full flex justify-center items-start perspective-1000">
              {data && data.map((item, index) => {
                const isSelected = index === activeIndex;

                // Stacked Cards Logic:
                // Cards are stacked horizontally. Clicking one makes it active.
                const offset = index - activeIndex;
                const xOffset = offset * 60; // Distance between cards headers

                // Visual tweaks for the stack
                const scale = isSelected ? 1 : Math.max(0.85, 1 - Math.abs(offset) * 0.05);
                const zIndex = isSelected ? 50 : 40 - Math.abs(offset);
                const opacity = isSelected ? 1 : Math.max(0.5, 1 - Math.abs(offset) * 0.2);
                const filter = isSelected ? 'none' : 'blur(1px) grayscale(30%)';

                // Transformation
                // If offset is positive (right), push right. If negative (left), push left.

                return (
                  <div
                    key={item.tracking_number + index}
                    onClick={() => setActiveIndex(index)}
                    className="absolute top-0 w-full flex justify-center transition-all duration-500 ease-out origin-top cursor-pointer"
                    style={{
                      transform: `translateX(${xOffset}px) scale(${scale})`,
                      zIndex: zIndex,
                      opacity: opacity,
                      filter: filter,
                      pointerEvents: 'auto' // ensure all are clickable to select
                    }}
                  >
                    <div className={`w-full max-w-3xl transition-shadow duration-300 ${isSelected ? 'shadow-2xl' : 'shadow-lg'}`}>
                      {/* Disable pointer events on the card contents if not active, to prevent interaction confusion, 
                                    BUT allow scrolling/interaction if active.
                                    Actually, for better UX, maybe always allow interaction but emphasize active.
                                    We'll wrap content in a div that blocks clicks if not active, so clicking the card selects it instead of interactive elements inside.
                                */}
                      <div className={isSelected ? 'pointer-events-auto' : 'pointer-events-none'}>
                        <TrackingResult
                          data={item}
                          showBackButton={false}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation Arrows for easier interaction */}
            {data && data.length > 1 && (
              <>
                <button
                  onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeIndex === 0}
                  className="fixed left-4 md:left-10 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setActiveIndex(prev => Math.min(data.length - 1, prev + 1))}
                  disabled={activeIndex === data.length - 1}
                  className="fixed right-4 md:right-10 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Carousel Indicators */}
            {data && data.length > 1 && (
              <div className="fixed bottom-8 flex gap-2 z-50">
                {data.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 shadow-md ${idx === activeIndex ? 'bg-blue-500 w-8' : 'bg-gray-600/50 hover:bg-gray-500 w-2'}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="w-full py-6 text-center text-white/30 text-sm relative z-10">
        &copy; {new Date().getFullYear()} Dynapro Tracking System. All rights reserved.
      </footer>
    </div>
  );
}

export default App;
