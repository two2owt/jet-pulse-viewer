import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { OptimizedImage } from "./ui/optimized-image";
import { Search, MapPin, Clock, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface Deal {
  id: string;
  title: string;
  description: string;
  venue_name: string;
  deal_type: string;
  expires_at: string;
  image_url: string | null;
  website_url: string | null;
}

interface ExploreTabProps {
  onVenueSelect?: (venueName: string) => void;
}

export const ExploreTab = ({ onVenueSelect }: ExploreTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDeals();
  }, []);

  useEffect(() => {
    filterDeals();
  }, [searchQuery, deals]);

  const loadDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('active', true)
        .gte('expires_at', new Date().toISOString())
        .lte('starts_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
      setFilteredDeals(data || []);
    } catch (error) {
      console.error('Error loading deals:', error);
      toast.error('Failed to load deals');
    } finally {
      setIsLoading(false);
    }
  };

  const filterDeals = () => {
    if (!searchQuery.trim()) {
      setFilteredDeals(deals);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = deals.filter(
      (deal) =>
        deal.title.toLowerCase().includes(query) ||
        deal.description.toLowerCase().includes(query) ||
        deal.venue_name.toLowerCase().includes(query) ||
        deal.deal_type.toLowerCase().includes(query)
    );
    setFilteredDeals(filtered);
  };

  const getDealIcon = (dealType: string) => {
    switch (dealType) {
      case 'offer':
        return '🎉';
      case 'event':
        return '🎵';
      case 'special':
        return '⭐';
      default:
        return '💎';
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d left`;
    }
    if (hours > 0) {
      return `${hours}h left`;
    }
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes}m left`;
  };

  const handleDealClick = (deal: Deal) => {
    if (onVenueSelect) {
      onVenueSelect(deal.venue_name);
    }
    toast.success(`Selected ${deal.venue_name}`, {
      description: deal.title
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Explore Deals</h2>
        <p className="text-sm text-muted-foreground">Discover trending spots and exclusive offers</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search venues, deals, or categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card/90 backdrop-blur-sm border-border focus:border-primary transition-colors"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center bg-card/90 backdrop-blur-sm hover-scale shadow-none">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold text-foreground">{deals.length}</p>
          <p className="text-xs text-muted-foreground">Active Deals</p>
        </Card>
        <Card className="p-4 text-center bg-card/90 backdrop-blur-sm hover-scale shadow-none">
          <MapPin className="w-6 h-6 mx-auto mb-2 text-accent" />
          <p className="text-2xl font-bold text-foreground">{new Set(deals.map(d => d.venue_name)).size}</p>
          <p className="text-xs text-muted-foreground">Venues</p>
        </Card>
        <Card className="p-4 text-center bg-card/90 backdrop-blur-sm hover-scale shadow-none">
          <Clock className="w-6 h-6 mx-auto mb-2 text-secondary" />
          <p className="text-2xl font-bold text-foreground">{filteredDeals.length}</p>
          <p className="text-xs text-muted-foreground">Results</p>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* No Results */}
      {!isLoading && filteredDeals.length === 0 && searchQuery && (
        <Card className="p-8 text-center bg-card/90 backdrop-blur-sm shadow-none">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">No deals found</p>
          <p className="text-sm text-muted-foreground">Try searching for something else</p>
        </Card>
      )}

      {/* No Deals */}
      {!isLoading && deals.length === 0 && (
        <Card className="p-8 text-center bg-card/90 backdrop-blur-sm shadow-none">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">No active deals right now</p>
          <p className="text-sm text-muted-foreground">Check back soon for new offers</p>
        </Card>
      )}

      {/* Deals Grid */}
      {!isLoading && filteredDeals.length > 0 && (
        <div className="space-y-3">
          {filteredDeals.map((deal, index) => (
            <Card
              key={deal.id}
              className="overflow-hidden bg-card/90 backdrop-blur-sm hover-scale cursor-pointer transition-all animate-scale-in shadow-none"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => handleDealClick(deal)}
            >
              <div className="flex gap-4 p-4">
                {/* Image or Icon */}
                {deal.image_url ? (
                  <OptimizedImage
                    src={deal.image_url}
                    alt={deal.venue_name}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    responsive={true}
                    responsiveSizes={['thumbnail', 'small']}
                    sizesConfig={{ mobile: '80px', tablet: '80px', desktop: '80px' }}
                    fallback={
                      <div className="w-20 h-20 flex items-center justify-center bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 rounded-lg flex-shrink-0">
                        <span className="text-3xl">{getDealIcon(deal.deal_type)}</span>
                      </div>
                    }
                  />
                ) : (
                  <div className="w-20 h-20 flex items-center justify-center bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 rounded-lg flex-shrink-0">
                    <span className="text-3xl">{getDealIcon(deal.deal_type)}</span>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-foreground line-clamp-1">
                      {deal.title}
                    </h3>
                    <Badge variant="secondary" className="flex-shrink-0">
                      {deal.deal_type}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {deal.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{deal.venue_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-primary font-medium flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {getTimeRemaining(deal.expires_at)}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
