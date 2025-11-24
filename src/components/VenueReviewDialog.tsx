import { useState } from "react";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VenueReviewDialogProps {
  venueName: string;
  onSubmit: (rating: number, reviewText?: string) => Promise<{ success: boolean }>;
  existingRating?: number;
  existingReview?: string;
  trigger?: React.ReactNode;
}

export const VenueReviewDialog = ({
  venueName,
  onSubmit,
  existingRating,
  existingReview,
  trigger,
}: VenueReviewDialogProps) => {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existingRating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState(existingReview || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    const result = await onSubmit(rating, reviewText.trim() || undefined);
    setSubmitting(false);

    if (result.success) {
      toast.success(existingRating ? "Review updated!" : "Review submitted!");
      setOpen(false);
    } else {
      toast.error("Failed to submit review");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Star className="w-4 h-4 mr-2" />
            {existingRating ? "Edit Review" : "Write Review"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {existingRating ? "Edit Your Review" : "Write a Review"}
          </DialogTitle>
          <DialogDescription>
            Share your experience at {venueName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Star Rating */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-8 h-8 transition-colors",
                      (hoveredRating || rating) >= star
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Review Text */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Review (Optional)
            </label>
            <Textarea
              placeholder="Share more about your experience..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : existingRating ? "Update" : "Submit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
