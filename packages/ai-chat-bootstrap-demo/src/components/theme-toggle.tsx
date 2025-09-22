"use client";

import { Monitor, Moon, Palette, Sparkles, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="gap-2">
        <Monitor className="h-4 w-4" />
        <span className="hidden sm:inline">Theme</span>
      </Button>
    );
  }
  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />;
      case "dark":
        return <Moon className="h-4 w-4" />;
      case "solar-dusk":
      case "solar-dusk-dark":
        return <Palette className="h-4 w-4" />;
      case "claymorphism":
      case "claymorphism-dark":
        return <Palette className="h-4 w-4" />;
      case "alt":
        return <Sparkles className="h-4 w-4" />;
      case "system":
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "solar-dusk":
        return "Solar Dusk";
      case "solar-dusk-dark":
        return "Solar Dusk Dark";
      case "claymorphism":
        return "Claymorphism";
      case "claymorphism-dark":
        return "Claymorphism Dark";
      case "alt":
        return "Alt";
      case "system":
      default:
        return "System";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {getThemeIcon()}
          <span className="hidden sm:inline">{getThemeLabel()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme("solar-dusk")}>
          <Palette className="mr-2 h-4 w-4" />
          Solar Dusk Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("solar-dusk-dark")}>
          <Palette className="mr-2 h-4 w-4" />
          Solar Dusk Dark
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme("claymorphism")}>
          <Palette className="mr-2 h-4 w-4" />
          Claymorphism Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("claymorphism-dark")}>
          <Palette className="mr-2 h-4 w-4" />
          Claymorphism Dark
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme("alt")}>
          <Sparkles className="mr-2 h-4 w-4" />
          Alt
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
