import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    if (theme === "system") {
      // If currently on system, go to light
      setTheme("light");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="w-10 h-10 min-w-[44px] min-h-[44px]">
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="w-10 h-10 min-w-[44px] min-h-[44px]"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun className="h-5 w-5 transition-all" />
      ) : (
        <Moon className="h-5 w-5 transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};
