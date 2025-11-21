// Sticky header with logo and auth button

import { AuthButton } from "./AuthButton";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-6">
        <div className="mr-4 flex flex-1">
          <a href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl text-foreground">EvalPRD</span>
          </a>
        </div>
        <div className="flex items-center justify-end space-x-4">
          <AuthButton />
        </div>
      </div>
    </header>
  );
}

