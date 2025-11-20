import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        duration: 2000,
        style: {
          background: "white",
          color: "#0f172a",
          border: "1px solid #e2e8f0",
        },
      }}
      visibleToasts={2}
      closeButton
    />
  );
}