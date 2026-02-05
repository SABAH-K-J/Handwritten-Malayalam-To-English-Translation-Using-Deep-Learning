import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, Scan, Home, Menu, X, BookOpen, Languages } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "./ThemeProvider";
import { useState } from "react";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const navLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/scanner", label: "Scanner", icon: Scan },
    { to: "/translation", label: "Translation", icon: Languages },
    { to: "/learn-more", label: "Learn More", icon: BookOpen },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-elevated border-b border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img 
                src="/1000161394.png" 
                alt="Malayalam OCR Logo" 
                className="w-10 h-10 rounded-xl object-contain transition-all duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <span className="font-display font-bold text-xl text-foreground transition-all duration-300 group-hover:translate-x-0.5">
              മലയാളം<span className="text-primary">OCR</span>
            </span>
          </Link>

          {/* Desktop Navigation & Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to}>
                  <Button
                    variant={isActive(link.to) ? "secondary" : "ghost"}
                    size="sm"
                    className={`gap-2 glass-button transition-all duration-300 ${
                      isActive(link.to) 
                        ? 'bg-secondary/80 backdrop-blur-md' 
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Button>
                </Link>
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full glass-button liquid-glow hover:bg-accent/50 transition-all duration-300"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 transition-transform duration-300 hover:rotate-45" />
              ) : (
                <Moon className="w-5 h-5 transition-transform duration-300 hover:-rotate-12" />
              )}
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full glass-button hover:bg-accent/50 transition-all duration-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 transition-transform duration-300" />
              ) : (
                <Menu className="w-5 h-5 transition-transform duration-300" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/30 animate-slide-up glass-panel">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive(link.to) ? "default" : "ghost"}
                    className={`w-full justify-start gap-2 glass-button transition-all duration-300 ${
                      isActive(link.to) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
