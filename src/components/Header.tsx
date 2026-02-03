
import logo from '../assets/logo-vector.png';

export const Header = () => {
    return (
        <header className="w-full py-6 px-4 md:px-8 flex items-center justify-between z-10 relative bg-gradient-to-b from-blue-950 to-transparent">
            <div className="flex items-center gap-3">
                <img src={logo} alt="Dynapro Logo" className="h-16 w-auto object-contain drop-shadow-lg" />
            </div>
        </header>
    );
};
