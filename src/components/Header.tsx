import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { AuthButton } from "./AuthButton";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useNavigate } from "react-router-dom";
import { SearchResults } from "./SearchResults";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { Skeleton } from "./ui/skeleton";
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
  const [displayName, setDisplayName] = useState<string>("JT");
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const { addToSearchHistory } = useSearchHistory(userId);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsProfileLoading(true);
      try {
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
      } finally {
        setIsProfileLoading(false);
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
      className="bg-card/98 backdrop-blur-xl border-b border-border/50 sticky top-0 z-[60] header-contained"
      role="banner"
      style={{
        paddingTop: 'var(--safe-area-inset-top)',
        // Use CSS variable for responsive height
        height: 'var(--header-total-height)',
        minHeight: 'var(--header-total-height)',
        transform: 'translateZ(0)',
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-5 lg:px-6 h-full flex items-center">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full">
          {/* Logo */}
          <a 
            href="/"
            className="flex items-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            aria-label="JET - Go to home"
          >
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-foreground tracking-wider">
              JET
            </h1>
          </a>
          
          {/* Search Bar - Consistent sizing across breakpoints */}
          <div className="flex-1 min-w-0 max-w-[160px] sm:max-w-[180px] md:max-w-[220px] lg:max-w-[280px] xl:max-w-[340px] relative py-1 sm:py-1.5">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.trim() && setShowResults(true)}
              className="w-full pl-8 sm:pl-9 pr-3 h-7 sm:h-8 md:h-8 rounded-full bg-secondary/50 border-border/50 focus:bg-secondary focus:border-primary/50 transition-all text-xs sm:text-sm text-foreground placeholder:text-muted-foreground"
              maxLength={100}
              aria-label="Search venues and deals"
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
          <div className="flex-1 min-w-0 px-1 sm:px-2 md:px-3">
            <SyncStatusIndicator
              isLoading={isLoading}
              lastUpdated={lastUpdated}
              onRefresh={onRefresh}
              showTimestamp={true}
              compact={true}
              cityName={cityName}
              isInitializing={!lastUpdated && !isLoading}
            />
          </div>

          {/* Avatar - Show skeleton while loading to prevent CLS */}
          {isProfileLoading ? (
            <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full flex-shrink-0" />
          ) : (
            <button
              onClick={() => navigate('/settings')}
              className="flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full"
              aria-label="Open settings"
            >
              <Avatar 
                className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 border-2 border-primary/30 cursor-pointer hover:border-primary transition-all"
              >
                <AvatarImage src={avatarUrl || ""} alt="Your profile picture" />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold text-xs sm:text-sm md:text-base">
                  {displayName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
