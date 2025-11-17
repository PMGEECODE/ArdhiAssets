"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  MessageCircle,
  Users,
  UserX,
  Plus,
  Search,
  Filter,
  Phone,
  Building2,
  Mail,
  User,
  Calendar,
  Shield,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import DataTable from "../../../../shared/components/ui/DataTable";
import Button from "../../../../shared/components/ui/Button";
import DeactivateUserModal from "../../../../shared/components/ui/DeactivateUserModal";
import { useAuthStore } from "../../../../shared/store/authStore";
import { API_URL } from "../../../../shared/config/constants";

type UserType = {
  id: number;
  name: string;
  username: string;
  email: string;
  personal_number: string;
  department: string;
  role: string;
  last_login: string;
  is_active: boolean;
  deactivation_reason?: string;
  deactivated_at?: string;
};

type DepartmentGroup = {
  name: string;
  users: UserType[];
  isExpanded: boolean;
};

const columns: {
  header: string;
  accessor: keyof UserType;
  sortable: boolean;
  mobileHidden?: boolean;
}[] = [
  { header: "ID", accessor: "id", sortable: true, mobileHidden: true },
  { header: "Name", accessor: "name", sortable: true },
  {
    header: "Username",
    accessor: "username",
    sortable: true,
    mobileHidden: true,
  },
  { header: "Email", accessor: "email", sortable: true, mobileHidden: true },
  { header: "Personal #", accessor: "personal_number", sortable: true },
  { header: "Role", accessor: "role", sortable: true },
  {
    header: "Last Login",
    accessor: "last_login",
    sortable: true,
    mobileHidden: true,
  },
];

const departments = [
  "All Departments",
  "Engineering",
  "Human Resources",
  "Marketing",
  "Sales",
  "Finance",
  "Operations",
  "Customer Support",
  "IT",
  "Legal",
];

const UserManagement = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([]);
  const [departmentGroups, setDepartmentGroups] = useState<DepartmentGroup[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] =
    useState("All Departments");
  const [activeTab, setActiveTab] = useState<"active" | "deactivated">(
    "active"
  );

  const [deactivateModal, setDeactivateModal] = useState<{
    isOpen: boolean;
    user: UserType | null;
  }>({ isOpen: false, user: null });
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [reasonModal, setReasonModal] = useState<{
    isOpen: boolean;
    reason: string;
    userName: string;
    user: UserType | null;
  }>({ isOpen: false, reason: "", userName: "", user: null });

  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
        method: "GET",
        credentials: "include", // ✅ send cookies
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok)
        throw new Error(`Failed to fetch users: ${response.statusText}`);

      const data = await response.json();
      const formatted = data.map((user: any) => ({
        id: user.id,
        name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        username: user.username,
        email: user.email,
        personal_number: user.personal_number || "N/A",
        department: user.department || "Unassigned",
        role: user.role,
        last_login: user.last_login
          ? new Date(user.last_login).toLocaleString()
          : "Never",
        is_active: user.is_active,
        deactivation_reason: user.deactivation_reason,
        deactivated_at: user.deactivated_at,
      }));

      setUsers(formatted);
      setFilteredUsers(formatted);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const groupUsersByDepartment = (users: UserType[]) => {
    const groups: { [key: string]: UserType[] } = {};

    users.forEach((user) => {
      const dept = user.department || "Unassigned";
      if (!groups[dept]) {
        groups[dept] = [];
      }
      groups[dept].push(user);
    });

    // Sort departments alphabetically, but put "Unassigned" at the end
    const sortedDepartments = Object.keys(groups).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });

    return sortedDepartments.map((dept) => ({
      name: dept,
      users: groups[dept].sort((a, b) => a.name.localeCompare(b.name)),
      isExpanded: true, // Start with all departments expanded
    }));
  };

  // Filter users based on search term and department
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.personal_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDepartment !== "All Departments") {
      filtered = filtered.filter(
        (user) => user.department === selectedDepartment
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, selectedDepartment]);

  useEffect(() => {
    const activeUsers = filteredUsers.filter((user) => user.is_active);
    const deactivatedUsers = filteredUsers.filter((user) => !user.is_active);
    const currentUsers =
      activeTab === "active" ? activeUsers : deactivatedUsers;

    setDepartmentGroups(groupUsersByDepartment(currentUsers));
  }, [filteredUsers, activeTab]);

  const toggleDepartment = (departmentName: string) => {
    setDepartmentGroups((prev) =>
      prev.map((dept) =>
        dept.name === departmentName
          ? { ...dept, isExpanded: !dept.isExpanded }
          : dept
      )
    );
  };

  const toggleAllDepartments = (expand: boolean) => {
    setDepartmentGroups((prev) =>
      prev.map((dept) => ({ ...dept, isExpanded: expand }))
    );
  };

  const activateUser = async (userId: number) => {
    try {
      const response = await fetch(`${API_URL}/users/${userId}/activate`, {
        method: "POST",
        credentials: "include", // ✅ send cookies
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to activate user");

      await fetchUsers();
      toast.success("User activated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to activate user");
    }
  };

  const deactivateUser = async (userId: number, reason: string) => {
    try {
      setIsDeactivating(true);
      const response = await fetch(`${API_URL}/users/${userId}/deactivate`, {
        method: "POST",
        credentials: "include", // ✅ send cookies
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) throw new Error("Failed to deactivate user");

      await fetchUsers();
      toast.success("User account has been deactivated successfully");
      setDeactivateModal({ isOpen: false, user: null });
    } catch (err) {
      console.error(err);
      toast.error("Failed to deactivate user account");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleDeactivateClick = (user: UserType) => {
    if (currentUser && currentUser.id === user.id) {
      toast.error("You cannot deactivate your own account");
      return;
    }

    if (!user.is_active) {
      toast.error("This account is already deactivated");
      return;
    }

    setDeactivateModal({ isOpen: true, user });
  };

  const handleDeactivateConfirm = (reason: string) => {
    if (deactivateModal.user) {
      deactivateUser(deactivateModal.user.id, reason);
    }
  };

  const showDeactivationReason = (user: UserType) => {
    setReasonModal({
      isOpen: true,
      reason: user.deactivation_reason || "No reason provided",
      userName: user.name,
      user: user,
    });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const activeUsers = filteredUsers.filter((user) => user.is_active);
  const deactivatedUsers = filteredUsers.filter((user) => !user.is_active);

  // Mobile card component
  const UserCard = ({ user }: { user: UserType }) => (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-lg">
            {user.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            @{user.username}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {user.is_active ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeactivateClick(user)}
              disabled={currentUser?.id === user.id}
              className="text-xs"
            >
              Deactivate
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => activateUser(user.id)}
                className="text-xs"
              >
                Activate
              </Button>
              {user.deactivation_reason && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => showDeactivationReason(user)}
                  title="View reason"
                  className="p-2"
                >
                  <MessageCircle className="w-3 h-3" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm">
        <div className="flex items-center space-x-2">
          <Mail className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <span className="text-gray-600 dark:text-slate-300">
            {user.email}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <span className="text-gray-600 dark:text-slate-300">
            {user.personal_number}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <span className="text-gray-600 dark:text-slate-300 capitalize">
            {user.role}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <span className="text-gray-600 dark:text-slate-300">
            {user.last_login}
          </span>
        </div>
      </div>
    </div>
  );

  const DepartmentHeader = ({
    department,
    userCount,
    isExpanded,
    onToggle,
  }: {
    department: string;
    userCount: number;
    isExpanded: boolean;
    onToggle: () => void;
  }) => (
    <div
      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          )}
          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-lg">
            {department}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {userCount} {userCount === 1 ? "user" : "users"}
          </p>
        </div>
      </div>
      <div className="text-sm text-gray-500 dark:text-slate-400">
        Click to {isExpanded ? "collapse" : "expand"}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-9xl mx-auto px-2 sm:px-4 lg:px-4">
          <div className="py-2 sm:py-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-1xl sm:text-1xl font-bold text-gray-900 dark:text-slate-100">
                  User Management
                </h1>
                <p className="mt-0 text-sm text-gray-500 dark:text-slate-400">
                  Manage user accounts organized by departments
                </p>
              </div>
              <Button
                onClick={() => navigate("/admin/users/add")}
                className="flex items-center space-x-2 w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                <span>Add User</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-9xl mx-auto px-2 sm:px-4 lg:px-4 py-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users by name, username, email, or personal number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>

            <div className="sm:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent appearance-none"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-slate-700">
            <nav className="flex">
              <button
                onClick={() => setActiveTab("active")}
                className={`flex-1 sm:flex-none px-4 sm:px-8 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "active"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800"
                    : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Active Users ({activeUsers.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("deactivated")}
                className={`flex-1 sm:flex-none px-4 sm:px-8 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "deactivated"
                    ? "border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-slate-800"
                    : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <UserX className="w-4 h-4" />
                  <span>Deactivated ({deactivatedUsers.length})</span>
                </div>
              </button>
            </nav>
          </div>

          {departmentGroups.length > 1 && (
            <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  {departmentGroups.length} departments found
                </span>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleAllDepartments(true)}
                    className="text-xs"
                  >
                    Expand All
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleAllDepartments(false)}
                    className="text-xs"
                  >
                    Collapse All
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-slate-400">
                  Loading users...
                </span>
              </div>
            ) : departmentGroups.length === 0 ? (
              <div className="text-center py-12">
                <User className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-600" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-slate-100">
                  No users found
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {searchTerm || selectedDepartment !== "All Departments"
                    ? "Try adjusting your search or filter criteria."
                    : `No ${activeTab} users at this time.`}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {departmentGroups.map((department) => (
                  <div
                    key={department.name}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden"
                  >
                    <DepartmentHeader
                      department={department.name}
                      userCount={department.users.length}
                      isExpanded={department.isExpanded}
                      onToggle={() => toggleDepartment(department.name)}
                    />

                    {department.isExpanded && (
                      <div className="p-4">
                        {/* Mobile View - Cards */}
                        <div className="sm:hidden space-y-4">
                          {department.users.map((user) => (
                            <UserCard key={user.id} user={user} />
                          ))}
                        </div>

                        {/* Desktop View - Table */}
                        <div className="hidden sm:block">
                          <DataTable<UserType>
                            data={department.users}
                            columns={columns}
                            keyField="id"
                            actions={(user) => (
                              <div className="flex items-center space-x-2">
                                {user.is_active ? (
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeactivateClick(user);
                                    }}
                                    disabled={currentUser?.id === user.id}
                                  >
                                    Deactivate
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        activateUser(user.id);
                                      }}
                                    >
                                      Activate
                                    </Button>
                                    {user.deactivation_reason && (
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          showDeactivationReason(user);
                                        }}
                                        title="View deactivation reason"
                                      >
                                        <MessageCircle className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <DeactivateUserModal
        isOpen={deactivateModal.isOpen}
        onClose={() => setDeactivateModal({ isOpen: false, user: null })}
        onConfirm={handleDeactivateConfirm}
        userName={deactivateModal.user ? `${deactivateModal.user.name}` : ""}
        isLoading={isDeactivating}
      />

      {reasonModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl">
            <div className="flex items-center p-6 space-x-3 border-b border-gray-100 dark:border-slate-700">
              <div className="flex flex-shrink-0 justify-center items-center w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full">
                <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Deactivation Details
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {reasonModal.userName}
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                  Reason for Deactivation
                </label>
                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                  <p className="leading-relaxed text-gray-800 dark:text-slate-200">
                    {reasonModal.reason}
                  </p>
                </div>
              </div>

              {reasonModal.user?.deactivated_at && (
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                    Deactivated On
                  </label>
                  <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      {new Date(
                        reasonModal.user.deactivated_at
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setReasonModal({
                      isOpen: false,
                      reason: "",
                      userName: "",
                      user: null,
                    })
                  }
                  className="px-6 py-2"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
