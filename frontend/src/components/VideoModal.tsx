import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from "./ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog@1.1.6";
import { XIcon } from "lucide-react@0.487.0";
import { cn } from "./ui/utils";

interface VideoModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function VideoModal({ open, onOpenChange, children }: VideoModalProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Auto-play when modal opens, pause when it closes
  React.useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current.play().catch((error) => {
        // Auto-play may be blocked by browser, that's okay
        console.log("Auto-play prevented:", error);
      });
    } else if (!open && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0; // Reset to beginning
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogPortal>
        <DialogOverlay className="bg-black/80" />
        <DialogPrimitive.Content
          className={cn(
            "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] rounded-[var(--radius-card)] border shadow-[var(--elevation-sm)] duration-300 sm:max-w-6xl",
          )}
        >
          {/* Close button */}
          <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 z-10 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 bg-black/50 p-2 hover:bg-black/70">
            <XIcon className="text-white" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          {/* Video container with 16:9 aspect ratio */}
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <video
              ref={videoRef}
              className="absolute top-0 left-0 w-full h-full rounded-[var(--radius-card)]"
              controls
              playsInline
              preload="metadata"
            >
              <source src="/video/ship-faster.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
