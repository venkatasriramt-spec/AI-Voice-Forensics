
import React from 'react';
import { Users, Mail } from 'lucide-react';
const Footer = () => {
  return <footer className="border-t border-border/40 bg-card text-card-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          
          {/* Contributors Section */}
          <div>
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-primary">
              <Users className="h-5 w-5" />
              Contributors
            </h3>
            <ul className="space-y-3">
              <li className="text-sm text-muted-foreground font-medium">
                Ayush M Singh
              </li>
              <li className="text-sm text-muted-foreground font-medium">
                Venkata Sriram Topalli
              </li>
            </ul>
          </div>

          {/* Email Section */}
          <div>
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-primary">
              <Mail className="h-5 w-5" />
              Electronic Mail
            </h3>
            <ul className="space-y-4">
              <li>
                <p className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-1">Primary</p>
                <a href="mailto:your-primary-email@example.com" className="text-sm text-muted-foreground hover:text-primary transition-colors font-mono">
                  ayushmsingh2004@gmail.com
                </a>
              </li>
              <li>
                <p className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-1">Alternate</p>
                <a href="mailto:your-alternate-email@example.com" className="text-sm text-muted-foreground hover:text-primary transition-colors font-mono">
                  venkatasriramt@gmail.com
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 Audio Forensics. All rights reserved.
          </p>
        </div>
      </div>
    </footer>;
};
export default Footer;
