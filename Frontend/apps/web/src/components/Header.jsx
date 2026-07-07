
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Menu, X, User, LogOut, History, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext.jsx';
import AuthModal from './AuthModal.jsx';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const navLinks = [
    { name: 'Platform Overview', path: '/' },
    { name: 'Threat Analysis Engine', path: '/predict' },
    { name: 'Technical Architecture', path: '/how-it-works' },
    { name: 'Dataset Intelligence', path: '/dataset-intelligence' },
    { name: 'Legal Recourse', path: '/legal-recourse' }
  ];

  const isActive = (path) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20 group-hover:border-primary/50 transition-colors">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">Audio Forensics</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.path) ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Auth Controls & Mobile Menu Toggle */}
          <div className="flex items-center gap-4">
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="hidden sm:flex items-center gap-2 bg-card/50 border-border/50">
                    <User className="h-4 w-4 text-primary" />
                    <span className="max-w-[120px] truncate text-xs">{currentUser.email}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border/50">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Authenticated User</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">{currentUser.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/40" />
                  <DropdownMenuItem asChild className="cursor-pointer focus:bg-primary/10 focus:text-primary">
                    <Link to="/analysis-history" className="flex items-center w-full">
                      <History className="mr-2 h-4 w-4" />
                      <span>Analysis History</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/40" />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={() => setIsAuthModalOpen(true)}
                className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm transition-all shadow-[0_0_15px_rgba(0,217,255,0.2)]"
              >
                Log In / Sign Up
              </Button>
            )}

            <button
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-border/40 bg-background">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            {currentUser && (
              <div className="mb-2 pb-4 border-b border-border/40">
                <p className="text-xs text-muted-foreground mb-1">Signed in as</p>
                <p className="text-sm font-medium truncate">{currentUser.email}</p>
              </div>
            )}
            
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium p-2 rounded-md transition-colors ${
                  isActive(link.path)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}

            {currentUser ? (
              <>
                <Link
                  to="/analysis-history"
                  className="text-sm font-medium p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <History className="h-4 w-4" /> Analysis History
                </Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-sm font-medium p-2 rounded-md text-destructive hover:bg-destructive/10 flex items-center gap-2 text-left"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </>
            ) : (
              <Button 
                onClick={() => {
                  setIsAuthModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full mt-2"
              >
                Log In / Sign Up
              </Button>
            )}
          </div>
        </div>
      )}

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </header>
  );
};

export default Header;
