"use client";

import React, { useState } from "react";
import {
  Search,
  LayoutDashboard,
  CheckSquare,
  Folder,
  Calendar,
  Users,
  BarChart2,
  FilePlus,
  Settings,
  User,
  ChevronDown,
  Plus,
  Filter,
  Clock,
  Loader2,
  CheckCircle,
  Flag,
  Archive,
  Eye,
  FileText,
  Star,
  BarChart,
  FolderOpen,
  Share2,
  CloudUpload,
  Shield,
  Bell,
  Plug,
  MoreHorizontal,
} from "lucide-react";

const softSpringEasing = "cubic-bezier(0.25, 1.1, 0.4, 1)";

/* ----------------------------- Brand Logo ----------------------------- */

function BrandMark() {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-50">
      <div className="grid grid-cols-2 gap-[2px]">
        <div className="h-2.5 w-2.5 rounded-sm bg-black" />
        <div className="h-2.5 w-2.5 rounded-sm bg-black" />
        <div className="h-2.5 w-2.5 rounded-sm bg-black" />
        <div className="h-2.5 w-2.5 rounded-sm bg-transparent border border-black" />
      </div>
    </div>
  );
}

function BrandBadge() {
  return (
    <div className="flex items-center gap-2 px-1 py-1 w-full">
      <BrandMark />
      <span className="font-semibold text-base text-neutral-50 tracking-tight">Interfaces</span>
    </div>
  );
}

/* --------------------------------- Avatar -------------------------------- */

function AvatarCircle() {
  return (
    <div className="relative rounded-full shrink-0 size-8 bg-neutral-800 border border-neutral-700 flex items-center justify-center">
      <User size={14} className="text-neutral-300" />
    </div>
  );
}

/* ------------------------------ Search Input ----------------------------- */

function SearchContainer({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const [searchValue, setSearchValue] = useState("");

  return (
    <div
      className={`relative shrink-0 transition-all duration-500 ${
        isCollapsed ? "w-full flex justify-center" : "w-full"
      }`}
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      <div
        className={`bg-neutral-900 border border-neutral-800 h-10 relative rounded-lg flex items-center transition-all duration-500 ${
          isCollapsed ? "w-10 min-w-10 justify-center" : "w-full"
        }`}
        style={{ transitionTimingFunction: softSpringEasing }}
      >
        <div className={`flex items-center justify-center shrink-0 ${isCollapsed ? "p-1" : "px-3"}`}>
          <Search size={14} className="text-neutral-400" />
        </div>

        <div
          className={`flex-1 relative transition-opacity duration-500 overflow-hidden ${
            isCollapsed ? "opacity-0 w-0" : "opacity-100"
          }`}
          style={{ transitionTimingFunction: softSpringEasing }}
        >
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm text-neutral-50 placeholder:text-neutral-500 pr-3"
            tabIndex={isCollapsed ? -1 : 0}
          />
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Types / Content Map -------------------------- */

interface MenuItemT {
  icon?: React.ReactNode;
  label: string;
  hasDropdown?: boolean;
  isActive?: boolean;
  children?: MenuItemT[];
}
interface MenuSectionT {
  title: string;
  items: MenuItemT[];
}
interface SidebarContent {
  title: string;
  sections: MenuSectionT[];
}

function getSidebarContent(activeSection: string): SidebarContent {
  const contentMap: Record<string, SidebarContent> = {
    dashboard: {
      title: "Dashboard",
      sections: [
        {
          title: "Dashboard Types",
          items: [
            { icon: <Eye size={15} className="text-neutral-50" />, label: "Overview", isActive: true },
            {
              icon: <LayoutDashboard size={15} className="text-neutral-50" />,
              label: "Executive Summary",
              hasDropdown: true,
              children: [
                { label: "Revenue Overview" },
                { label: "Key Performance Indicators" },
                { label: "Strategic Goals Progress" },
                { label: "Department Highlights" },
              ],
            },
            {
              icon: <BarChart size={15} className="text-neutral-50" />,
              label: "Operations Dashboard",
              hasDropdown: true,
              children: [
                { label: "Project Timeline" },
                { label: "Resource Allocation" },
                { label: "Team Performance" },
                { label: "Capacity Planning" },
              ],
            },
            {
              icon: <BarChart2 size={15} className="text-neutral-50" />,
              label: "Financial Dashboard",
              hasDropdown: true,
              children: [
                { label: "Budget vs Actual" },
                { label: "Cash Flow Analysis" },
                { label: "Expense Breakdown" },
                { label: "Profit & Loss Summary" },
              ],
            },
          ],
        },
        {
          title: "Report Summaries",
          items: [
            {
              icon: <FileText size={15} className="text-neutral-50" />,
              label: "Weekly Reports",
              hasDropdown: true,
              children: [
                { label: "Team Productivity: 87% ↑" },
                { label: "Project Completion: 12/15" },
                { label: "Budget Utilization: 73%" },
                { label: "Client Satisfaction: 4.6/5" },
              ],
            },
            {
              icon: <Star size={15} className="text-neutral-50" />,
              label: "Monthly Insights",
              hasDropdown: true,
              children: [
                { label: "Revenue Growth: +15.3%" },
                { label: "New Clients: 24" },
                { label: "Team Expansion: 8 hires" },
                { label: "Cost Reduction: 7.2%" },
              ],
            },
            {
              icon: <Eye size={15} className="text-neutral-50" />,
              label: "Quarterly Analysis",
              hasDropdown: true,
              children: [
                { label: "Market Position: Improved" },
                { label: "ROI: 23.4%" },
                { label: "Customer Retention: 92%" },
                { label: "Innovation Index: 8.7/10" },
              ],
            },
          ],
        },
        {
          title: "Business Intelligence",
          items: [
            {
              icon: <BarChart size={15} className="text-neutral-50" />,
              label: "Performance Metrics",
              hasDropdown: true,
              children: [
                { label: "Sales Conversion: 34.2%" },
                { label: "Lead Response Time: 2.3h" },
                { label: "Customer Lifetime Value: $4,280" },
                { label: "Churn Rate: 3.1%" },
              ],
            },
            {
              icon: <BarChart2 size={15} className="text-neutral-50" />,
              label: "Predictive Analytics",
              hasDropdown: true,
              children: [
                { label: "Q4 Revenue Forecast: $2.4M" },
                { label: "Resource Demand: High" },
                { label: "Market Trends: Positive" },
                { label: "Risk Assessment: Low" },
              ],
            },
          ],
        },
      ],
    },

    tasks: {
      title: "Tasks",
      sections: [
        {
          title: "Quick Actions",
          items: [
            { icon: <Plus size={15} className="text-neutral-50" />, label: "New task" },
            { icon: <Filter size={15} className="text-neutral-50" />, label: "Filter tasks" },
          ],
        },
        {
          title: "My Tasks",
          items: [
            {
              icon: <Clock size={15} className="text-neutral-50" />,
              label: "Due today",
              hasDropdown: true,
              children: [
                { icon: <Flag size={13} className="text-neutral-300" />, label: "Review design mockups" },
                { icon: <CheckCircle size={13} className="text-neutral-300" />, label: "Update documentation" },
                { icon: <Loader2 size={13} className="text-neutral-300" />, label: "Test new feature" },
              ],
            },
            {
              icon: <Loader2 size={15} className="text-neutral-50" />,
              label: "In progress",
              hasDropdown: true,
              children: [
                { icon: <CheckSquare size={13} className="text-neutral-300" />, label: "Implement user auth" },
                { icon: <CheckSquare size={13} className="text-neutral-300" />, label: "Database migration" },
              ],
            },
            {
              icon: <CheckCircle size={15} className="text-neutral-50" />,
              label: "Completed",
              hasDropdown: true,
              children: [
                { icon: <CheckCircle size={13} className="text-neutral-300" />, label: "Fixed login bug" },
                { icon: <CheckCircle size={13} className="text-neutral-300" />, label: "Updated dependencies" },
                { icon: <CheckCircle size={13} className="text-neutral-300" />, label: "Code review completed" },
              ],
            },
          ],
        },
        {
          title: "Other",
          items: [
            {
              icon: <Flag size={15} className="text-neutral-50" />,
              label: "Priority tasks",
              hasDropdown: true,
              children: [
                { icon: <Flag size={13} className="text-red-400" />, label: "Security update" },
                { icon: <Flag size={13} className="text-orange-400" />, label: "Client presentation" },
              ],
            },
            { icon: <Archive size={15} className="text-neutral-50" />, label: "Archived" },
          ],
        },
      ],
    },

    projects: {
      title: "Projects",
      sections: [
        {
          title: "Quick Actions",
          items: [
            { icon: <Plus size={15} className="text-neutral-50" />, label: "New project" },
            { icon: <Filter size={15} className="text-neutral-50" />, label: "Filter projects" },
          ],
        },
        {
          title: "Active Projects",
          items: [
            {
              icon: <FolderOpen size={15} className="text-neutral-50" />,
              label: "Web Application",
              hasDropdown: true,
              children: [
                { icon: <CheckSquare size={13} className="text-neutral-300" />, label: "Frontend development" },
                { icon: <CheckSquare size={13} className="text-neutral-300" />, label: "API integration" },
                { icon: <CheckSquare size={13} className="text-neutral-300" />, label: "Testing & QA" },
              ],
            },
            {
              icon: <FolderOpen size={15} className="text-neutral-50" />,
              label: "Mobile App",
              hasDropdown: true,
              children: [
                { icon: <CheckSquare size={13} className="text-neutral-300" />, label: "UI/UX design" },
                { icon: <CheckSquare size={13} className="text-neutral-300" />, label: "Native development" },
              ],
            },
          ],
        },
        {
          title: "Other",
          items: [
            { icon: <CheckCircle size={15} className="text-neutral-50" />, label: "Completed" },
            { icon: <Archive size={15} className="text-neutral-50" />, label: "Archived" },
          ],
        },
      ],
    },

    calendar: {
      title: "Calendar",
      sections: [
        {
          title: "Views",
          items: [
            { icon: <Eye size={15} className="text-neutral-50" />, label: "Month view" },
            { icon: <Calendar size={15} className="text-neutral-50" />, label: "Week view" },
            { icon: <Clock size={15} className="text-neutral-50" />, label: "Day view" },
          ],
        },
        {
          title: "Events",
          items: [
            {
              icon: <Clock size={15} className="text-neutral-50" />,
              label: "Today's events",
              hasDropdown: true,
              children: [
                { icon: <Users size={13} className="text-neutral-300" />, label: "Team standup (9:00 AM)" },
                { icon: <User size={13} className="text-neutral-300" />, label: "Client call (2:00 PM)" },
                { icon: <Users size={13} className="text-neutral-300" />, label: "Project review (4:00 PM)" },
              ],
            },
            { icon: <Calendar size={15} className="text-neutral-50" />, label: "Upcoming events" },
          ],
        },
        {
          title: "Quick Actions",
          items: [
            { icon: <Plus size={15} className="text-neutral-50" />, label: "New event" },
            { icon: <Share2 size={15} className="text-neutral-50" />, label: "Share calendar" },
          ],
        },
      ],
    },

    teams: {
      title: "Teams",
      sections: [
        {
          title: "My Teams",
          items: [
            {
              icon: <Users size={15} className="text-neutral-50" />,
              label: "Development Team",
              hasDropdown: true,
              children: [
                { icon: <User size={13} className="text-neutral-300" />, label: "John Doe (Lead)" },
                { icon: <User size={13} className="text-neutral-300" />, label: "Jane Smith" },
                { icon: <User size={13} className="text-neutral-300" />, label: "Mike Johnson" },
              ],
            },
            {
              icon: <Users size={15} className="text-neutral-50" />,
              label: "Design Team",
              hasDropdown: true,
              children: [
                { icon: <User size={13} className="text-neutral-300" />, label: "Sarah Wilson" },
                { icon: <User size={13} className="text-neutral-300" />, label: "Tom Brown" },
              ],
            },
          ],
        },
        {
          title: "Quick Actions",
          items: [
            { icon: <Plus size={15} className="text-neutral-50" />, label: "Invite member" },
            { icon: <Users size={15} className="text-neutral-50" />, label: "Manage teams" },
          ],
        },
      ],
    },

    analytics: {
      title: "Analytics",
      sections: [
        {
          title: "Reports",
          items: [
            { icon: <FileText size={15} className="text-neutral-50" />, label: "Performance report" },
            { icon: <BarChart size={15} className="text-neutral-50" />, label: "Task completion" },
            { icon: <BarChart2 size={15} className="text-neutral-50" />, label: "Team productivity" },
          ],
        },
        {
          title: "Insights",
          items: [
            {
              icon: <Star size={15} className="text-neutral-50" />,
              label: "Key metrics",
              hasDropdown: true,
              children: [
                { icon: <CheckCircle size={13} className="text-neutral-300" />, label: "Tasks completed: 24" },
                { icon: <Clock size={13} className="text-neutral-300" />, label: "Avg. completion time: 2.5d" },
                { icon: <Users size={13} className="text-neutral-300" />, label: "Team efficiency: 87%" },
              ],
            },
          ],
        },
      ],
    },

    files: {
      title: "Files",
      sections: [
        {
          title: "Quick Actions",
          items: [
            { icon: <CloudUpload size={15} className="text-neutral-50" />, label: "Upload file" },
            { icon: <Plus size={15} className="text-neutral-50" />, label: "New folder" },
          ],
        },
        {
          title: "Recent Files",
          items: [
            {
              icon: <FilePlus size={15} className="text-neutral-50" />,
              label: "Recent documents",
              hasDropdown: true,
              children: [
                { icon: <FilePlus size={13} className="text-neutral-300" />, label: "Project proposal.pdf" },
                { icon: <FilePlus size={13} className="text-neutral-300" />, label: "Meeting notes.docx" },
                { icon: <FilePlus size={13} className="text-neutral-300" />, label: "Design specs.figma" },
              ],
            },
            { icon: <Share2 size={15} className="text-neutral-50" />, label: "Shared with me" },
          ],
        },
        {
          title: "Organization",
          items: [
            { icon: <Folder size={15} className="text-neutral-50" />, label: "All folders" },
            { icon: <Archive size={15} className="text-neutral-50" />, label: "Archived files" },
          ],
        },
      ],
    },

    settings: {
      title: "Settings",
      sections: [
        {
          title: "Account",
          items: [
            { icon: <User size={15} className="text-neutral-50" />, label: "Profile settings" },
            { icon: <Shield size={15} className="text-neutral-50" />, label: "Security" },
            { icon: <Bell size={15} className="text-neutral-50" />, label: "Notifications" },
          ],
        },
        {
          title: "Workspace",
          items: [
            {
              icon: <Settings size={15} className="text-neutral-50" />,
              label: "Preferences",
              hasDropdown: true,
              children: [
                { icon: <Eye size={13} className="text-neutral-300" />, label: "Theme settings" },
                { icon: <Clock size={13} className="text-neutral-300" />, label: "Time zone" },
                { icon: <Bell size={13} className="text-neutral-300" />, label: "Default notifications" },
              ],
            },
            { icon: <Plug size={15} className="text-neutral-50" />, label: "Integrations" },
          ],
        },
      ],
    },
  };

  return contentMap[activeSection] || contentMap.dashboard;
}

/* ---------------------------- Left Icon Nav Rail -------------------------- */

function IconNavButton({
  children,
  isActive = false,
  onClick,
  title,
}: {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className={`flex items-center justify-center rounded-lg size-10 min-w-10 transition-all duration-300
        ${isActive
          ? "bg-neutral-700 text-neutral-50"
          : "text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
        }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function IconNavigation({
  activeSection,
  onSectionChange,
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
}) {
  const navItems = [
    { id: "dashboard", icon: <LayoutDashboard size={16} />, label: "Dashboard" },
    { id: "tasks",     icon: <CheckSquare size={16} />,     label: "Tasks" },
    { id: "projects",  icon: <Folder size={16} />,          label: "Projects" },
    { id: "calendar",  icon: <Calendar size={16} />,        label: "Calendar" },
    { id: "teams",     icon: <Users size={16} />,           label: "Teams" },
    { id: "analytics", icon: <BarChart2 size={16} />,       label: "Analytics" },
    { id: "files",     icon: <FilePlus size={16} />,        label: "Files" },
  ];

  return (
    <aside className="bg-black flex flex-col gap-1 items-center py-4 px-2 w-[60px] h-[800px] border-r border-neutral-800 rounded-l-2xl">
      {/* Logo */}
      <div className="mb-3 flex items-center justify-center size-10">
        <BrandMark />
      </div>

      {/* Nav Icons */}
      <div className="flex flex-col gap-1 w-full items-center">
        {navItems.map((item) => (
          <IconNavButton
            key={item.id}
            isActive={activeSection === item.id}
            onClick={() => onSectionChange(item.id)}
            title={item.label}
          >
            {item.icon}
          </IconNavButton>
        ))}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-2 w-full items-center">
        <IconNavButton
          isActive={activeSection === "settings"}
          onClick={() => onSectionChange("settings")}
          title="Settings"
        >
          <Settings size={16} />
        </IconNavButton>
        <AvatarCircle />
      </div>
    </aside>
  );
}

/* ------------------------------ Right Sidebar ----------------------------- */

function SectionTitle({
  title,
  onToggleCollapse,
  isCollapsed,
}: {
  title: string;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
}) {
  if (isCollapsed) {
    return (
      <div className="w-full flex justify-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center justify-center rounded-lg size-10 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronDown size={15} className="rotate-90" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full">
      <div className="px-2">
        <span className="font-semibold text-lg text-neutral-50 leading-tight">{title}</span>
      </div>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex items-center justify-center rounded-lg size-9 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
        aria-label="Collapse sidebar"
      >
        <ChevronDown size={15} className="-rotate-90" />
      </button>
    </div>
  );
}

function MenuItem({
  item,
  isExpanded,
  onToggle,
  onItemClick,
  isCollapsed,
}: {
  item: MenuItemT;
  isExpanded?: boolean;
  onToggle?: () => void;
  onItemClick?: () => void;
  isCollapsed?: boolean;
}) {
  const handleClick = () => {
    if (item.hasDropdown && onToggle) onToggle();
    else onItemClick?.();
  };

  return (
    <div className={`relative w-full ${isCollapsed ? "flex justify-center" : ""}`}>
      <div
        className={`rounded-lg cursor-pointer transition-all duration-200 flex items-center
          ${item.isActive ? "bg-neutral-800" : "hover:bg-neutral-800"}
          ${isCollapsed ? "size-10 justify-center" : "w-full h-9 px-3"}`}
        onClick={handleClick}
        title={isCollapsed ? item.label : undefined}
      >
        {item.icon && (
          <div className="flex items-center justify-center shrink-0">{item.icon}</div>
        )}

        {!isCollapsed && (
          <>
            <span className="flex-1 text-sm text-neutral-50 ml-2.5 truncate leading-5">
              {item.label}
            </span>
            {item.hasDropdown && (
              <ChevronDown
                size={14}
                className="text-neutral-400 shrink-0 ml-1 transition-transform duration-200"
                style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SubMenuItem({ item, onItemClick }: { item: MenuItemT; onItemClick?: () => void }) {
  return (
    <div className="pl-8 pr-1">
      <div
        className="h-8 w-full rounded-lg cursor-pointer transition-colors hover:bg-neutral-800 flex items-center gap-2 px-2"
        onClick={onItemClick}
      >
        {item.icon && <span className="shrink-0">{item.icon}</span>}
        <span className="text-sm text-neutral-400 truncate">{item.label}</span>
      </div>
    </div>
  );
}

function MenuSection({
  section,
  expandedItems,
  onToggleExpanded,
  isCollapsed,
}: {
  section: MenuSectionT;
  expandedItems: Set<string>;
  onToggleExpanded: (itemKey: string) => void;
  isCollapsed?: boolean;
}) {
  return (
    <div className="flex flex-col w-full gap-0.5">
      {!isCollapsed && (
        <div className="px-3 py-1">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            {section.title}
          </span>
        </div>
      )}

      {section.items.map((item, index) => {
        const itemKey = `${section.title}-${index}`;
        const isExpanded = expandedItems.has(itemKey);
        return (
          <div key={itemKey} className="w-full">
            <MenuItem
              item={item}
              isExpanded={isExpanded}
              onToggle={() => onToggleExpanded(itemKey)}
              onItemClick={() => {}}
              isCollapsed={isCollapsed}
            />
            {isExpanded && item.children && !isCollapsed && (
              <div className="flex flex-col gap-0.5 mt-0.5 mb-1">
                {item.children.map((child, ci) => (
                  <SubMenuItem key={`${itemKey}-${ci}`} item={child} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailSidebar({ activeSection }: { activeSection: string }) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const content = getSidebarContent(activeSection);

  const toggleExpanded = (itemKey: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemKey)) next.delete(itemKey);
      else next.add(itemKey);
      return next;
    });
  };

  return (
    <aside
      className={`bg-black flex flex-col gap-3 p-3 rounded-r-2xl transition-all duration-500 h-[800px] overflow-hidden ${
        isCollapsed ? "w-[60px] items-center" : "w-72"
      }`}
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      {!isCollapsed && <BrandBadge />}

      <SectionTitle
        title={content.title}
        onToggleCollapse={() => setIsCollapsed((s) => !s)}
        isCollapsed={isCollapsed}
      />

      <SearchContainer isCollapsed={isCollapsed} />

      <div className="flex flex-col w-full gap-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-neutral-800">
        {content.sections.map((section, index) => (
          <MenuSection
            key={`${activeSection}-${index}`}
            section={section}
            expandedItems={expandedItems}
            onToggleExpanded={toggleExpanded}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>

      {!isCollapsed && (
        <div className="w-full pt-2 border-t border-neutral-800 shrink-0">
          <div className="flex items-center gap-2 px-1 py-1">
            <AvatarCircle />
            <span className="text-sm text-neutral-300 flex-1 truncate">My Account</span>
            <button
              type="button"
              className="size-7 rounded-md flex items-center justify-center hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

/* --------------------------------- Layout -------------------------------- */

function TwoLevelSidebar() {
  const [activeSection, setActiveSection] = useState("dashboard");

  return (
    <div className="flex flex-row shadow-2xl">
      <IconNavigation activeSection={activeSection} onSectionChange={setActiveSection} />
      <DetailSidebar activeSection={activeSection} />
    </div>
  );
}

export function Frame760() {
  return (
    <div className="bg-[#111] min-h-screen flex items-center justify-center p-8">
      <TwoLevelSidebar />
    </div>
  );
}

export default Frame760;
