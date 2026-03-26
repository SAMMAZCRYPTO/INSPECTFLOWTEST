
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { auth } from "@/api/entities";
import { LayoutGrid, FileText, Users, Building2, Menu, UserCircle, Shield, FileStack, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ProjectProvider } from "@/components/context/ProjectContext";
import ProjectSelector from "@/components/layout/ProjectSelector";

function LayoutContent({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
        // If not authenticated, user will stay null and layout will show loading...
        // You might want to redirect to a login page here
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const isAdmin = user?.role === "admin" || user?.inspection_role === "admin";
  const isInspectionEngineer = user?.inspection_role === "inspection_engineer";
  const isQCManager = user?.inspection_role === "qc_manager";
  const isInspector = user?.inspection_role === "inspector";
  const isInspectionAgency = user?.inspection_role === "inspection_agency";

  const canAccessDashboard = isAdmin || isInspectionEngineer || isQCManager || isInspector;
  const canAccessReports = isAdmin || isInspectionEngineer || isQCManager || isInspector;
  const canAccessInspectors = isAdmin || isInspectionEngineer || isQCManager || isInspectionAgency;
  const canAccessAgencies = isAdmin;
  const canAccessUserManagement = isAdmin;

  const navigationItems = [
    {
      title: isInspector ? "My Inspections" : "Dashboard",
      url: createPageUrl("Dashboard"),
      icon: LayoutGrid,
      show: canAccessDashboard,
    },
    {
      title: "IR & IRC",
      url: createPageUrl("Reports"),
      icon: FileStack,
      show: canAccessReports,
    },
    {
      title: "Inspectors",
      url: createPageUrl("Inspectors"),
      icon: Users,
      show: canAccessInspectors,
    },
    {
      title: "Agencies",
      url: createPageUrl("TPIAgencies"),
      icon: Building2,
      show: canAccessAgencies,
    },
    {
      title: "Performance",
      url: createPageUrl("TPIPerformance"),
      icon: TrendingUp,
      show: isAdmin || isQCManager,
    },
    {
      title: "Admin",
      url: createPageUrl("UserManagement"),
      icon: Shield,
      show: canAccessUserManagement,
    },
    {
      title: "My Profile",
      url: createPageUrl("Profile"),
      icon: UserCircle,
      show: isInspector,
    },
  ];

  const visibleNavItems = navigationItems.filter(item => item.show);

  const getRoleBadge = () => {
    const roleColors = {
      admin: "bg-red-100 text-red-800",
      inspection_engineer: "bg-blue-100 text-blue-800",
      qc_manager: "bg-green-100 text-green-800",
      inspector: "bg-purple-100 text-purple-800",
      inspection_agency: "bg-amber-100 text-amber-800",
    };

    const roleLabels = {
      admin: "Admin",
      inspection_engineer: "Inspection Engineer",
      qc_manager: "QC Manager",
      inspector: "Inspector",
      inspection_agency: "Inspection Agency",
    };

    const role = user?.inspection_role || user?.role;
    return (
      <Badge className={`${roleColors[role]} border font-medium`}>
        {roleLabels[role] || "User"}
      </Badge>
    );
  };

  function NavLinks({ pathname, mobile = false }) {
    return (
      <>
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.url;
          return (
            <Link
              key={item.title}
              to={item.url}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-gray-700 hover:bg-gray-100"
                } ${mobile ? "text-base" : ""}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.title}</span>
            </Link>
          );
        })}
      </>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  // If no user is authenticated, show a message
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg mx-auto mb-6">
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">InspectFlow</h1>
          <p className="text-gray-600 mb-6">
            Sign in to access your inspection management system
          </p>
          <div className="bg-white rounded-lg p-6 shadow-md text-left">
            <h2 className="font-semibold text-gray-900 mb-3">Quick Start:</h2>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="font-bold text-indigo-600">1.</span>
                <span>Click "Sign In" below to access your account</span>
              </li>
            </ol>
            <a href="/login" className="block mt-6">
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-lg">
                Sign In
              </button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top App Bar - Material Design */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">InspectFlow</h1>
              </div>
            </div>

            {/* User Info & Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <ProjectSelector />
              <div className="h-8 w-px bg-gray-200 mx-2" />
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                {getRoleBadge()}
              </div>
              <nav className="flex items-center gap-2">
                <NavLinks pathname={location.pathname} />
              </nav>
            </div>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-6 mt-8">
                  <div className="px-4 py-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 mb-1">{user?.full_name}</p>
                    <p className="text-xs text-gray-500 mb-2">{user?.email}</p>
                    {getRoleBadge()}
                  </div>
                  <div className="px-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Project</p>
                    <ProjectSelector mobile />
                  </div>
                  <div className="flex flex-col gap-2">
                    <NavLinks pathname={location.pathname} mobile />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-12 py-8">
        <div className="max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © 2025 InspectFlow. Streamline your inspection notifications.
          </p>
        </div>
      </footer>

      {/* Material Design CSS Variables */}
      <style>{`
        :root {
          --md-elevation-1: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
          --md-elevation-2: 0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12);
          --md-elevation-3: 0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10);
          --md-elevation-4: 0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.05);
        }
        
        .elevation-1 { box-shadow: var(--md-elevation-1); }
        .elevation-2 { box-shadow: var(--md-elevation-2); }
        .elevation-3 { box-shadow: var(--md-elevation-3); }
        .elevation-4 { box-shadow: var(--md-elevation-4); }
        
        .ripple {
          position: relative;
          overflow: hidden;
        }
        
        .ripple::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255,255,255,0.3);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        
        .ripple:active::after {
          width: 300px;
          height: 300px;
        }
      `}</style>
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <ProjectProvider>
      <LayoutContent>{children}</LayoutContent>
    </ProjectProvider>
  );
}
