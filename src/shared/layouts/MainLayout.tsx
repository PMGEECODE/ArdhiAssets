// // "use client";

// // import type React from "react";
// // import { useState, useEffect } from "react";
// // import { Outlet } from "react-router-dom";
// // import Header from "../../shared/layout/Header";
// // import Sidebar from "../../shared/layout/Sidebar";
// // import { useThemeStore } from "../../shared/store/themeStore";
// // import { useSessionMonitor } from "../hooks/useSessionMonitor";
// // import { InactivityWarningBanner } from "../components/ui/InactivityWarningBanner";
// // import { useActivityTracker } from "../hooks/useActivityTracker";

// // const MainLayout: React.FC = () => {
// //   useSessionMonitor({
// //     checkIntervalMs: 60000, // Check every 60 seconds
// //   });

// //   const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
// //   const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
// //   const { theme } = useThemeStore();

// //   useEffect(() => {
// //     const handleResize = () => {
// //       setIsMobile(window.innerWidth < 768);
// //     };

// //     window.addEventListener("resize", handleResize);
// //     return () => window.removeEventListener("resize", handleResize);
// //   }, []);

// //   return (
// //     <div
// //       className={`flex overflow-hidden h-screen ${
// //         theme === "dark" ? "bg-slate-950" : "bg-primary-50"
// //       } transition-colors`}
// //     >
// //       <InactivityWarningBanner warningThresholdMs={5 * 60 * 1000} />

// //       <Sidebar
// //         isMobile={isMobile}
// //         isOpen={isMobileSidebarOpen || !isMobile}
// //         onToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
// //       />
// //       <div className="flex overflow-hidden flex-col flex-1">
// //         <Header />

// //         <main
// //           className={`overflow-y-auto flex-1 p-0 md:p-0 mainWrapper ${
// //             theme === "dark" ? "bg-slate-950" : "bg-primary-50"
// //           }`}
// //         >
// //           <Outlet />
// //         </main>
// //       </div>
// //     </div>
// //   );
// // };

// // export default MainLayout;

// "use client";

// import type React from "react";
// import { useState, useEffect } from "react";
// import { Outlet, useNavigate } from "react-router-dom";
// import Header from "../../shared/layout/Header";
// import Sidebar from "../../shared/layout/Sidebar";
// import { useThemeStore } from "../../shared/store/themeStore";
// import { useSessionMonitor } from "../hooks/useSessionMonitor";
// import { InactivityWarningBanner } from "../components/ui/InactivityWarningBanner";
// import PasswordExpirationBanner from "../components/ui/PasswordExpirationBanner";

// const MainLayout: React.FC = () => {
//   useSessionMonitor({
//     checkIntervalMs: 60000, // Check every 60 seconds
//   });

//   const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
//   const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
//   const navigate = useNavigate();
//   const { theme } = useThemeStore();

//   useEffect(() => {
//     const handleResize = () => {
//       setIsMobile(window.innerWidth < 768);
//     };

//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   return (
//     <>
//       <PasswordExpirationBanner
//         onNavigateToChange={() => navigate("/change-password")}
//       />

//       <div
//         className={`flex overflow-hidden h-screen ${
//           theme === "dark" ? "bg-slate-950" : "bg-primary-50"
//         } transition-colors`}
//       >
//         <InactivityWarningBanner warningThresholdMs={5 * 60 * 1000} />

//         <Sidebar
//           isMobile={isMobile}
//           isOpen={isMobileSidebarOpen || !isMobile}
//           onToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
//         />
//         <div className="flex overflow-hidden flex-col flex-1">
//           <Header />

//           <main
//             className={`overflow-y-auto flex-1 p-0 md:p-0 mainWrapper ${
//               theme === "dark" ? "bg-slate-950" : "bg-primary-50"
//             }`}
//           >
//             <Outlet />
//           </main>
//         </div>
//       </div>
//     </>
//   );
// };

// export default MainLayout;

"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Header from "../../shared/layout/Header";
import Sidebar from "../../shared/layout/Sidebar";
import { useThemeStore } from "../../shared/store/themeStore";
import { useSessionMonitor } from "../hooks/useSessionMonitor";
import { InactivityWarningBanner } from "../components/ui/InactivityWarningBanner";
import PasswordExpirationBanner from "../components/ui/PasswordExpirationBanner";
import { useActivitySync } from "../hooks/useActivitySync";

const MainLayout: React.FC = () => {
  useActivitySync({
    syncIntervalMs: 30000,
    debounceMs: 5000,
  });

  useSessionMonitor({
    checkIntervalMs: 60000, // Check every 60 seconds
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const { theme } = useThemeStore();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <PasswordExpirationBanner
        onNavigateToChange={() => navigate("/change-password")}
      />

      <div
        className={`flex overflow-hidden h-screen ${
          theme === "dark" ? "bg-slate-950" : "bg-primary-50"
        } transition-colors`}
      >
        <InactivityWarningBanner warningThresholdMs={5 * 60 * 1000} />

        <Sidebar
          isMobile={isMobile}
          isOpen={isMobileSidebarOpen || !isMobile}
          onToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        <div className="flex overflow-hidden flex-col flex-1">
          <Header />

          <main
            className={`overflow-y-auto flex-1 p-0 md:p-0 mainWrapper ${
              theme === "dark" ? "bg-slate-950" : "bg-primary-50"
            }`}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
};

export default MainLayout;
