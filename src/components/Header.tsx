import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { AuthButton } from "./AuthButton";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useNavigate } from "react-router-dom";
import { SearchResults } from "./SearchResults";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import type { Venue } from "./MapboxHeatmap";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSearchHistory } from "@/hooks/useSearchHistory";

type Deal = Database['public']['Tables']['deals']['Row'];

const searchSchema = z.string().trim().max(100, { message: "Search query too long" });

interface HeaderProps {
  venues: Venue[];
  deals: Deal[];
  onVenueSelect: (venue: Venue) => void;
  isLoading?: boolean;
  lastUpdated?: Date | null;
  onRefresh?: () => void;
}

export const Header = ({ venues, deals, onVenueSelect, isLoading, lastUpdated, onRefresh }: HeaderProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [userId, setUserId] = useState<string | undefined>(undefined);

  const { addToSearchHistory } = useSearchHistory(userId);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, display_name')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setAvatarUrl(profile.avatar_url);
          setDisplayName(profile.display_name || user.email?.substring(0, 2).toUpperCase() || "JT");
        }
      }
    };
    fetchProfile();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Validate input
    try {
      searchSchema.parse(value);
      setSearchQuery(value);
      setShowResults(value.trim().length > 0);
      
      // Track search after a short delay (debounced)
      if (value.trim().length > 2) {
        const timeoutId = setTimeout(() => {
          addToSearchHistory(value.trim());
        }, 1000);
        return () => clearTimeout(timeoutId);
      }
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
    <header 
      className="bg-card/98 backdrop-blur-xl border-b border-border/50 sticky top-0 z-40"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          {/* Logo */}
          <div 
            className="flex items-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
          >
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground tracking-wider">
              JET
            </h1>
          </div>
          
          {/* Search Bar - Responsive width */}
          <div className="flex-1 min-w-0 max-w-[120px] sm:max-w-[160px] md:max-w-[220px] lg:max-w-[280px] relative">
            <Search className="absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.trim() && setShowResults(true)}
              className="w-full pl-7 sm:pl-8 pr-2 h-8 sm:h-9 rounded-full bg-secondary/50 border-border/50 focus:bg-secondary focus:border-primary/50 transition-all text-xs sm:text-sm text-foreground placeholder:text-muted-foreground"
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

          {/* Sync Status - Compact mode with flexible width */}
          <div className="flex-1 flex justify-center min-w-0">
            <SyncStatusIndicator
              isLoading={isLoading}
              lastUpdated={lastUpdated}
              onRefresh={onRefresh}
              showTimestamp={false}
              compact={true}
            />
          </div>

          {/* Avatar */}
          <Avatar 
            className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 border-2 border-primary/30 cursor-pointer hover:border-primary transition-all flex-shrink-0"
            onClick={() => navigate('/settings')}
          >
            <AvatarImage src={avatarUrl || ""} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold text-[10px] sm:text-xs">
              {displayName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};
