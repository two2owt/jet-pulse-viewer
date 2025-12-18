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
  cityName?: string;
}

export const Header = ({ venues, deals, onVenueSelect, isLoading, lastUpdated, onRefresh, cityName }: HeaderProps) => {
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
      className="bg-card/98 backdrop-blur-xl border-b border-border/50 sticky top-0 z-40 header-contained"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        // Fixed height prevents CLS during load
        height: 'calc(48px + env(safe-area-inset-top, 0px))',
        minHeight: 'calc(48px + env(safe-area-inset-top, 0px))',
        contain: 'strict',
        transform: 'translateZ(0)',
      }}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3">
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
          {/* Logo */}
          <div 
            className="flex items-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
          >
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-foreground tracking-wider">
              JET
            </h1>
          </div>
          
          {/* Search Bar - Responsive width */}
          <div className="min-w-0 w-[80px] xs:w-[100px] sm:w-[120px] md:w-[160px] lg:w-[200px] xl:w-[240px] relative flex-shrink-0">
            <Search className="absolute left-1.5 sm:left-2 md:left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.trim() && setShowResults(true)}
              className="w-full pl-6 sm:pl-7 md:pl-8 pr-1.5 sm:pr-2 h-7 sm:h-8 md:h-9 rounded-full bg-secondary/50 border-border/50 focus:bg-secondary focus:border-primary/50 transition-all text-[10px] sm:text-xs md:text-sm text-foreground placeholder:text-muted-foreground"
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

          {/* Sync Status - Takes remaining width between search and avatar */}
          <div className="flex-1 min-w-0 px-0.5 sm:px-1 md:px-2">
            <SyncStatusIndicator
              isLoading={isLoading}
              lastUpdated={lastUpdated}
              onRefresh={onRefresh}
              showTimestamp={true}
              compact={true}
              cityName={cityName}
            />
          </div>

          {/* Avatar */}
          <Avatar 
            className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 border-2 border-primary/30 cursor-pointer hover:border-primary transition-all flex-shrink-0"
            onClick={() => navigate('/settings')}
          >
            <AvatarImage src={avatarUrl || ""} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold text-[9px] sm:text-[10px] md:text-xs">
              {displayName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};
