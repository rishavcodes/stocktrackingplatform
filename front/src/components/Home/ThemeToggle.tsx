import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useState } from "react";

const ThemeToggle = () => {
  const { setTheme, theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        className="text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-300 border border-border/20 hover:border-border/40 bg-background/50 backdrop-blur-sm"
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 text-amber-500" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 text-blue-400" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      {/* Tooltip */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-background/95 backdrop-blur-sm border border-border/20 rounded-lg px-3 py-2 text-xs font-medium text-foreground shadow-lg z-50 whitespace-nowrap"
        >
          Switch to {theme === "light" ? "dark" : "light"} mode
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-background border-l border-t border-border/20 rotate-45" />
        </motion.div>
      )}
    </motion.div>
  );
};

export default ThemeToggle;
