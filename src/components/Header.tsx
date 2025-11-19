import { useState } from "react";
import { Search, Settings } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { AuthButton } from "./AuthButton";
import jetLogo from "@/assets/jet-logo.png";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useNavigate } from "react-router-dom";
import { SearchResults } from "./SearchResults";
import type { Venue } from "./Heatmap";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

type Deal = Database['public']['Tables']['deals']['Row'];

const searchSchema = z.string().trim().max(100, { message: "Search query too long" });

interface HeaderProps {
  venues: Venue[];
  deals: Deal[];
  onVenueSelect: (venue: Venue) => void;
}

export const Header = ({ venues, deals, onVenueSelect }: HeaderProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Validate input
    try {
      searchSchema.parse(value);
      setSearchQuery(value);
      setShowResults(value.trim().length > 0);
    } catch (error) {
      // Keep the previous valid value if validation fails
      if (value.length <= 100) {
        setSearchQuery(value);
        setShowResults(value.trim().length > 0);
      }
    }
  };

  const handleCloseResults = () => {
    setShowResults(false);
  };

  return (
    <header className="bg-card/98 backdrop-blur-xl border-b border-border/50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <img 
            src={jetLogo} 
            alt="JET Social" 
            className="h-10 w-auto flex-shrink-0" 
          />
          
          {/* Search Bar */}
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search venues, events..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.trim() && setShowResults(true)}
              className="w-full pl-12 pr-4 h-12 rounded-full bg-secondary/50 border-border/50 focus:bg-secondary focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground"
              maxLength={100}
            />
            
            <SearchResults
              query={searchQuery}
              venues={venues}
              deals={deals}
              onVenueSelect={onVenueSelect}
              onClose={handleCloseResults}
              isVisible={showResults}
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <ThemeToggle />
            
            <button 
              onClick={() => navigate("/settings")}
              className="w-10 h-10 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-all"
            >
              <Settings className="w-5 h-5 text-foreground" />
            </button>

            <Avatar className="w-10 h-10 border-2 border-primary/30 cursor-pointer hover:border-primary transition-all">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                JT
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
};
