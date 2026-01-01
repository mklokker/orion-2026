import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Trophy, Star, Award, Video, FileQuestion, CheckCircle2,
  GraduationCap, Brain, Zap, Coins, Crown, Sparkles, Flame,
  Medal, Play
} from "lucide-react";
import confetti from "canvas-confetti";

const ICON_MAP = {
  Play, Trophy, Award, Star, Video, FileQuestion, CheckCircle2,
  GraduationCap, Brain, Zap, Coins, Crown, Sparkles, Flame, Medal
};

export default function BadgeNotification({ badge, onClose }) {
  React.useEffect(() => {
    if (badge) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [badge]);

  if (!badge) return null;

  const IconComponent = ICON_MAP[badge.badge_icon] || Star;

  return (
    <Dialog open={!!badge} onOpenChange={onClose}>
      <DialogContent className="max-w-sm text-center">
        <div className="py-6">
          <div className="relative inline-block">
            <div className={`w-24 h-24 rounded-full ${badge.badge_color} flex items-center justify-center mx-auto animate-bounce`}>
              <IconComponent className="w-12 h-12 text-white" />
            </div>
            <Sparkles className="w-6 h-6 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          
          <h2 className="text-2xl font-bold mt-6 text-gray-900">
            Nova Conquista!
          </h2>
          
          <h3 className="text-xl font-semibold text-blue-600 mt-2">
            {badge.badge_name}
          </h3>
          
          <p className="text-gray-600 mt-2">
            {badge.badge_description}
          </p>

          <Button onClick={onClose} className="mt-6 w-full">
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}