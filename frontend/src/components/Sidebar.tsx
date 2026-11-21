import { NavLink } from "react-router-dom";
import { useAuth } from "../store/authStore";

interface NavItem {
  label: string;
  to: string;
  icon: string;
  roles?: string[]; // undefined = all roles
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "",
    items: [
      { label: "Dashboard",  to: "/dashboard",    icon: "▦" },
    ],
  },
  {
    label: "AI Assistant",
    items: [
      { label: "Document Chat", to: "/chat",      icon: "💬" },
    ],
  },
  {
    label: "Documents",
    items: [
      { label: "Documents",  to: "/documents",    icon: "📄" },
      { label: "Upload",     to: "/upload",       icon: "⬆" },
      { label: "Search",     to: "/search",       icon: "🔍" },
      { label: "Compare",    to: "/comparisons",  icon: "🔀" },
      { label: "Review",     to: "/review",       icon: "✅", roles: ["MANAGER", "ADMIN", "EMPLOYEE"] },
    ],
  },
  {
    label: "Career AI",
    items: [
      { label: "Resume",       to: "/resume",       icon: "📋" },
      { label: "Job Match",    to: "/job-match",    icon: "🎯" },
      { label: "Applications", to: "/applications",  icon: "💼" },
      { label: "Cover Letter",  to: "/cover-letter",  icon: "✉" },
      { label: "Interview",    to: "/interview",     icon: "🎤" },
    ],
  },
  {
    label: "Government Exams",
    items: [
      { label: "Exams",    to: "/exams",    icon: "📚" },
      { label: "Progress", to: "/progress", icon: "📈" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics",  to: "/analytics",    icon: "📊" },
    ],
  },
];

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";

  return (
    <aside className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
      <nav className="flex-1 py-4 px-3">
        {NAV_SECTIONS.map((section, si) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(role)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={si} className={si > 0 ? "mt-4" : ""}>
              {section.label && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                       transition-colors
                       ${isActive
                         ? "bg-indigo-50 text-indigo-700"
                         : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                       }`
                    }
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 leading-relaxed">
          DocuMind AI
          <br />
          <span className="text-indigo-400 font-medium">{role}</span>
        </p>
      </div>
    </aside>
  );
}
