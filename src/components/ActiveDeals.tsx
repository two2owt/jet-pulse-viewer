import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MapPin, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface Deal {
  id: string;
  title: string;
  description: string;
  venue_name: string;
  deal_type: string;
  expires_at: string;
}

export const ActiveDeals = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveDeals();
    
    // Set up realtime subscription for new deals
    const channel = supabase
      .channel('deals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deals',
        },
        () => {
          loadActiveDeals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadActiveDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('active', true)
        .gte('expires_at', new Date().toISOString())
        .lte('starts_at', new Date().toISOString())
        .limit(5);

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
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
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  if (loading) {
    return null;
  }

  if (deals.length === 0) {
    return (
      <div className="bg-card/50 rounded-xl p-4 border border-border/50 text-center">
        <p className="text-sm text-muted-foreground">No active deals right now</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Active Deals</h3>
        <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
          {deals.length}
        </div>
      </div>

      <div className="space-y-2">
        {deals.map((deal) => (
          <div
            key={deal.id}
            className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-xl p-3 border border-primary/20"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{getDealIcon(deal.deal_type)}</div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-foreground mb-1 truncate">
                  {deal.title}
                </h4>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {deal.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{deal.venue_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-primary font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{getTimeRemaining(deal.expires_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
