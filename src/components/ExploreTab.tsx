import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { OptimizedImage } from "./ui/optimized-image";
import { Search, MapPin, Clock, TrendingUp, Filter, X, Navigation } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { EmptyState } from "./EmptyState";
import { calculateDistance, getDynamicRadius, formatDistance } from "@/utils/geospatialUtils";

interface Deal {
  id: string;
  title: string;
  description: string;
  venue_name: string;
  deal_type: string;
  expires_at: string;
  image_url: string | null;
  website_url: string | null;
  neighborhood_id: string | null;
  neighborhoods?: {
    id: string;
    name: string;
    center_lat: number;
    center_lng: number;
  };
  distance?: number; // Distance from user in km
}

interface ExploreTabProps {
  onVenueSelect?: (venueName: string) => void;
}

export const ExploreTab = ({ onVenueSelect }: ExploreTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    // Load deals only after we have attempted to get location
    // This ensures we can calculate distances properly
    if (userLocation !== null || locationError !== null) {
      loadDeals();
    }
  }, [userLocation, locationError]);

  useEffect(() => {
    filterDeals();
  }, [searchQuery, deals, selectedCategories]);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(null);
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocationError("Unable to access your location");
        // Show warning but don't block - show all deals if location unavailable
        toast.error("Location access denied", {
          description: "Showing all deals. Enable location for personalized results.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  };

  const loadDeals = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          neighborhoods (
            id,
            name,
            center_lat,
            center_lng
          )
        `)
        .eq('active', true)
        .gte('expires_at', new Date().toISOString())
        .lte('starts_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('User location:', userLocation);
      console.log('Raw deals data:', data);
      
      // Calculate distances for deals with neighborhood data
      const dealsWithDistance = (data || []).map(deal => {
        if (userLocation && deal.neighborhoods) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            deal.neighborhoods.center_lat,
            deal.neighborhoods.center_lng
          );
          console.log(`Deal ${deal.title} distance: ${distance}km`);
          return { ...deal, distance };
        }
        console.log(`Deal ${deal.title} - no location data`);
        return deal;
      });

      console.log('Deals with distance:', dealsWithDistance);
      setDeals(dealsWithDistance);
      
      // Extract unique categories
      const categories = [...new Set((data || []).map(d => d.deal_type))].sort();
      setAvailableCategories(categories);
    } catch (error) {
      console.error('Error loading deals:', error);
      toast.error('Failed to load deals');
    } finally {
      setIsLoading(false);
    }
  };

  const filterDeals = () => {
    let filtered = [...deals];
    
    console.log('Starting filterDeals with', deals.length, 'deals');
    console.log('User location available:', !!userLocation);
    
    // Apply location-based filter if user location is available
    if (userLocation) {
      const beforeFilter = filtered.length;
      filtered = filtered.filter(deal => {
        // Only show deals with distance data
        if (deal.distance === undefined) {
          console.log(`Excluding ${deal.title} - no distance data`);
          return false;
        }
        
        // Get dynamic radius based on neighborhood
        const radius = getDynamicRadius(deal.neighborhoods?.name);
        const isWithinRadius = deal.distance <= radius;
        
        console.log(`${deal.title}: ${deal.distance.toFixed(2)}km (max: ${radius}km) - ${isWithinRadius ? 'INCLUDED' : 'EXCLUDED'}`);
        return isWithinRadius;
      });
      
      console.log(`Location filter: ${beforeFilter} -> ${filtered.length} deals`);

      // Sort by distance (closest first)
      filtered.sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
    } else {
      console.log('No user location - showing all deals');
    }
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      const beforeFilter = filtered.length;
      filtered = filtered.filter(deal => 
        selectedCategories.includes(deal.deal_type)
      );
      console.log(`Category filter: ${beforeFilter} -> ${filtered.length} deals`);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const beforeFilter = filtered.length;
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (deal) =>
          deal.title.toLowerCase().includes(query) ||
          deal.description.toLowerCase().includes(query) ||
          deal.venue_name.toLowerCase().includes(query) ||
          deal.deal_type.toLowerCase().includes(query)
      );
      console.log(`Search filter: ${beforeFilter} -> ${filtered.length} deals`);
    }
    
    console.log('Final filtered deals:', filtered.length);
    setFilteredDeals(filtered);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSearchQuery("");
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
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {userLocation 
              ? "Showing deals near you" 
              : "Showing all available deals"}
          </p>
          {userLocation && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              Location Active
            </Badge>
          )}
        </div>
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

      {/* Category Filters */}
      {availableCategories.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filter by Category</span>
            </div>
            {(selectedCategories.length > 0 || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategories.includes(category) ? "default" : "outline"}
                className="cursor-pointer hover-scale"
                onClick={() => toggleCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center bg-card/90 backdrop-blur-sm hover-scale shadow-none">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold text-foreground">{filteredDeals.length}</p>
          <p className="text-xs text-muted-foreground">
            {userLocation ? "Nearby Deals" : "Active Deals"}
          </p>
        </Card>
        <Card className="p-4 text-center bg-card/90 backdrop-blur-sm hover-scale shadow-none">
          <MapPin className="w-6 h-6 mx-auto mb-2 text-accent" />
          <p className="text-2xl font-bold text-foreground">
            {new Set(filteredDeals.map(d => d.venue_name)).size}
          </p>
          <p className="text-xs text-muted-foreground">
            {userLocation ? "Nearby Venues" : "Venues"}
          </p>
        </Card>
        <Card className="p-4 text-center bg-card/90 backdrop-blur-sm hover-scale shadow-none">
          <Clock className="w-6 h-6 mx-auto mb-2 text-secondary" />
          <p className="text-2xl font-bold text-foreground">{filteredDeals.length}</p>
          <p className="text-xs text-muted-foreground">
            {searchQuery || selectedCategories.length > 0 ? "Results" : "Available"}
          </p>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* No Results */}
      {!isLoading && filteredDeals.length === 0 && (searchQuery || selectedCategories.length > 0) && (
        <EmptyState
          icon={Search}
          title="No deals found"
          description="Try adjusting your search or filter criteria to find more deals"
          actionLabel="Clear Filters"
          onAction={clearFilters}
        />
      )}

      {/* No Deals */}
      {!isLoading && deals.length === 0 && !searchQuery && selectedCategories.length === 0 && (
        <EmptyState
          icon={TrendingUp}
          title="No active deals right now"
          description="Check back soon for new exclusive offers and trending spots in your area"
        />
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
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {deal.distance !== undefined && (
                        <span className="text-accent font-medium">
                          {formatDistance(deal.distance)}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-primary font-medium">
                        <Clock className="w-3 h-3" />
                        {getTimeRemaining(deal.expires_at)}
                      </div>
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
