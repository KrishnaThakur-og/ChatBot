import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ theme, onToggle }) {
    return (
        <button className="theme-toggle" onClick={onToggle} aria-label="Toggle theme">
            <span>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
            <div className="theme-toggle-track">
                <div className="theme-toggle-thumb">
                    {theme === 'light' ? <Sun size={12} /> : <Moon size={12} />}
                </div>
            </div>
        </button>
    );
}
