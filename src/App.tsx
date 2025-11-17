"use client";

import { RouterProvider } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./features/auth/contexts/AuthContext";
import { useThemeStore } from "./shared/store/themeStore";
import { router } from "./router";

function App() {
  useEffect(() => {
    const { initializeTheme } = useThemeStore.getState();
    initializeTheme();
  }, []);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
