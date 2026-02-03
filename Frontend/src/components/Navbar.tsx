import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, Scan, Home, Menu, X, BookOpen } from "lucide-react";
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
    { to: "/learn-more", label: "Learn More", icon: BookOpen },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/1000161394.png" 
              alt="Malayalam OCR Logo" 
              className="w-10 h-10 rounded-xl object-contain group-hover:opacity-80 transition-opacity"
            />
            <span className="font-display font-bold text-xl text-foreground">
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
                    className="gap-2"
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
              className="rounded-full"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-slide-up">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive(link.to) ? "default" : "ghost"}
                    className="w-full justify-start gap-2"
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
