import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent dark:bg-[#121212] dark:border-[#2e2e2e] dark:text-white px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground dark:placeholder:text-[#6b6b6b] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:focus-visible:ring-[#65F51D] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Textarea.displayName = "Textarea"

export { Textarea }