import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

type Neighborhood = Database['public']['Tables']['neighborhoods']['Row'];

const neighborhoodSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180),
});

interface NeighborhoodFormProps {
  neighborhood?: Neighborhood | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const NeighborhoodForm = ({ neighborhood, onClose, onSuccess }: NeighborhoodFormProps) => {
  const [formData, setFormData] = useState({
    name: neighborhood?.name || '',
    slug: neighborhood?.slug || '',
    description: neighborhood?.description || '',
    center_lat: neighborhood ? Number(neighborhood.center_lat) : 0,
    center_lng: neighborhood ? Number(neighborhood.center_lng) : 0,
    active: neighborhood?.active ?? true,
    boundary_points: neighborhood?.boundary_points || [],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const validatedData = neighborhoodSchema.parse(data);
      
      if (neighborhood) {
        const { error } = await supabase
          .from('neighborhoods')
          .update({
            name: validatedData.name,
            slug: validatedData.slug,
            description: validatedData.description || null,
            center_lat: validatedData.center_lat,
            center_lng: validatedData.center_lng,
            boundary_points: data.boundary_points,
            active: data.active,
          })
          .eq('id', neighborhood.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('neighborhoods')
          .insert([{
            name: validatedData.name,
            slug: validatedData.slug,
            description: validatedData.description || null,
            center_lat: validatedData.center_lat,
            center_lng: validatedData.center_lng,
            boundary_points: data.boundary_points,
            active: data.active,
          }]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(neighborhood ? 'Neighborhood updated' : 'Neighborhood created');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Failed to save neighborhood');
      console.error('Save error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Card className="mx-1 sm:mx-0">
      <CardHeader className="pb-3 sm:pb-6 px-4 sm:px-6">
        <CardTitle className="text-lg sm:text-xl">{neighborhood ? 'Edit Neighborhood' : 'Create Neighborhood'}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="name" className="text-sm">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="slug" className="text-sm">Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              maxLength={200}
              placeholder="lowercase-with-dashes"
              required
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="description" className="text-sm">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={1000}
              className="min-h-[80px] sm:min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="center_lat" className="text-sm">Center Latitude</Label>
              <Input
                id="center_lat"
                type="number"
                step="0.000001"
                value={formData.center_lat}
                onChange={(e) => setFormData({ ...formData, center_lat: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="center_lng" className="text-sm">Center Longitude</Label>
              <Input
                id="center_lng"
                type="number"
                step="0.000001"
                value={formData.center_lng}
                onChange={(e) => setFormData({ ...formData, center_lng: parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 py-1">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
            <Label htmlFor="active" className="text-sm">Active</Label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-3 sm:pt-4">
            <Button type="submit" disabled={saveMutation.isPending} className="w-full sm:w-auto">
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
