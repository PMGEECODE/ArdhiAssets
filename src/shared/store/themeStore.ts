import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initializeTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: "light",

  setTheme: (theme: Theme) => {
    set({ theme });

    // Update localStorage
    localStorage.setItem("theme-preference", theme);

    // Update DOM - ensure dark class is added/removed
    const htmlElement = document.documentElement;
    if (theme === "dark") {
      htmlElement.classList.add("dark");
      htmlElement.setAttribute("data-theme", "dark");
    } else {
      htmlElement.classList.remove("dark");
      htmlElement.setAttribute("data-theme", "light");
    }
  },

  toggleTheme: () => {
    const currentTheme = get().theme;
    const newTheme = currentTheme === "light" ? "dark" : "light";
    get().setTheme(newTheme);
  },

  initializeTheme: () => {
    const saved = localStorage.getItem("theme-preference") as Theme | null;
    const theme = saved || "light";

    // Update store
    set({ theme });

    // Update DOM
    const htmlElement = document.documentElement;
    if (theme === "dark") {
      htmlElement.classList.add("dark");
      htmlElement.setAttribute("data-theme", "dark");
    } else {
      htmlElement.classList.remove("dark");
      htmlElement.setAttribute("data-theme", "light");
    }
  },
}));
