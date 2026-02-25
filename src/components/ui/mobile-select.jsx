import React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Hook to detect mobile
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Mobile-friendly Select that opens as a drawer on mobile
export function MobileSelect({ 
  value, 
  onValueChange, 
  placeholder = "Selecione...",
  title = "Selecione uma opção",
  options = [], // Array of { value, label }
  className = "",
  triggerClassName = "",
}) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue) => {
    onValueChange?.(optionValue);
    setOpen(false);
  };

  // On mobile, use Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-between ${triggerClassName}`}
          >
            <span className={selectedOption ? "" : "text-muted-foreground"}>
              {selectedOption?.label || placeholder}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 space-y-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    value === option.value 
                      ? "bg-blue-50 text-blue-700" 
                      : "hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium">{option.label}</span>
                  {value === option.value && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  // On desktop, use native select or render children
  return (
    <select
      value={value || ""}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className}`}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}