"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  Shield,
  Lock,
  Unlock,
  User,
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  X,
} from "lucide-react";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import {
  type User as UserType,
  AssetCategoryType,
  PermissionLevel,
  type BulkPermissionUpdate,
} from "../../../../shared/types";

const AdminUserPermissions: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [userPermissions, setUserPermissions] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissionChanges, setPermissionChanges] = useState<
    Record<string, PermissionLevel>
  >({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);

  const categoryLabels: Record<AssetCategoryType, string> = {
    [AssetCategoryType.DEVICES]: "Devices",
    [AssetCategoryType.LAND_REGISTER]: "Land Register",
    [AssetCategoryType.BUILDINGS_REGISTER]: "Buildings Register",
    [AssetCategoryType.MOTOR_VEHICLES_REGISTER]: "Motor Vehicles Register",
    [AssetCategoryType.OFFICE_EQUIPMENT]: "Office Equipment",
    [AssetCategoryType.FURNITURE_FITTINGS_EQUIPMENT]:
      "Furniture & Fittings Equipment",
    [AssetCategoryType.PLANT_MACHINERY]: "Plant & Machinery",
    [AssetCategoryType.PORTABLE_ATTRACTIVE_ITEMS]:
      "Portable & Attractive Items",
    [AssetCategoryType.ICT_ASSETS]: "ICT Assets",
  };

  const permissionLevelLabels: Record<
    PermissionLevel,
    { label: string; color: string; icon: React.ReactNode }
  > = {
    [PermissionLevel.NONE]: {
      label: "No Access",
      color:
        "text-error-600 bg-error-50 border-error-300 dark:text-error-400 dark:bg-error-950 dark:border-error-800",
      icon: <XCircle className="w-3 h-3" />,
    },
    [PermissionLevel.READ]: {
      label: "Read Only",
      color:
        "text-accent-600 bg-accent-50 border-accent-300 dark:text-accent-400 dark:bg-accent-950 dark:border-accent-800",
      icon: <Lock className="w-3 h-3" />,
    },
    [PermissionLevel.WRITE]: {
      label: "Read & Write",
      color:
        "text-warning-600 bg-warning-50 border-warning-300 dark:text-warning-400 dark:bg-warning-950 dark:border-warning-800",
      icon: <Unlock className="w-3 h-3" />,
    },
    [PermissionLevel.ADMIN]: {
      label: "Full Access",
      color:
        "text-success-600 bg-success-50 border-success-300 dark:text-success-400 dark:bg-success-950 dark:border-success-800",
      icon: <CheckCircle className="w-3 h-3" />,
    },
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      const activeUsers = data.filter((user: UserType) => user.is_active);
      setUsers(activeUsers);
      setFilteredUsers(activeUsers);

      const roles = [
        ...new Set(activeUsers.map((user: UserType) => user.role)),
      ] as string[];
      setAvailableRoles(roles);

      if (activeUsers.length > 0 && !selectedUser) {
        setSelectedUser(activeUsers[0]);
        fetchUserPermissions(activeUsers[0].id.toString());
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (selectedRole !== "all") {
      filtered = filtered.filter((user) => user.role === selectedRole);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((user) => {
        const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
        const email = user.email.toLowerCase();
        const role = user.role.toLowerCase();
        const department = (user as any).department?.toLowerCase() || "";

        return (
          fullName.includes(term) ||
          email.includes(term) ||
          role.includes(term) ||
          department.includes(term)
        );
      });
    }

    setFilteredUsers(filtered);

    if (selectedUser && !filtered.find((user) => user.id === selectedUser.id)) {
      if (filtered.length > 0) {
        setSelectedUser(filtered[0]);
        fetchUserPermissions(filtered[0].id.toString());
      } else {
        setSelectedUser(null);
        setUserPermissions(null);
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedRole("all");
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/permissions/user/${userId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch permissions");
      const data = await response.json();
      setUserPermissions(data);
      setPermissionChanges({});
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: UserType) => {
    setSelectedUser(user);
    fetchUserPermissions(user.id.toString());
  };

  const handlePermissionChange = (
    category: AssetCategoryType,
    level: PermissionLevel
  ) => {
    setPermissionChanges((prev) => ({
      ...prev,
      [category]: level,
    }));
  };

  const savePermissions = async () => {
    if (!selectedUser || Object.keys(permissionChanges).length === 0) return;

    try {
      setSaving(true);
      const bulkUpdate: BulkPermissionUpdate = {
        user_id: selectedUser.id.toString(),
        permissions: Object.entries(permissionChanges).map(
          ([category, level]) => ({
            category: category as AssetCategoryType,
            permission_level: level,
          })
        ),
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/permissions/bulk-update`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bulkUpdate),
        }
      );

      if (!response.ok) throw new Error("Failed to update permissions");

      await fetchUserPermissions(selectedUser.id.toString());
    } catch (error) {
      console.error("Error updating permissions:", error);
    } finally {
      setSaving(false);
    }
  };

  const getCurrentPermissionLevel = (
    category: AssetCategoryType
  ): PermissionLevel => {
    if (permissionChanges[category]) {
      return permissionChanges[category];
    }
    return (
      (userPermissions?.permissions[category]
        ?.permission_level as PermissionLevel) || PermissionLevel.NONE
    );
  };

  const hasChanges = Object.keys(permissionChanges).length > 0;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (filteredUsers.length > 0 && !selectedUser) {
      setSelectedUser(filteredUsers[0]);
      fetchUserPermissions(filteredUsers[0].id.toString());
    }
  }, [filteredUsers, selectedUser]);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, selectedRole, users]);

  return (
    <div className="p-0 sm:p-0 space-y-2">
      <div className="sticky top-0 z-40 bg-primary-50 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors duration-200">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-primary-900 dark:text-primary-50">
              User Permissions
            </h1>
            <p className="text-xs sm:text-sm text-primary-600 dark:text-primary-400">
              Manage asset category access permissions for users
            </p>
          </div>
        </div>
        <Button
          onClick={() => fetchUsers()}
          variant="secondary"
          className="flex items-center space-x-2"
          size="sm"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 p-4">
        <Card className="lg:col-span-1 lg:max-w-xs">
          <div className="p-2 sm:p-3 border-b border-primary-200 dark:border-primary-700">
            <h2 className="text-sm sm:text-base font-semibold text-primary-900 dark:text-primary-50 flex items-center">
              <User className="w-4 h-4 mr-1.5 text-accent-600 dark:text-accent-400" />
              Select User
              <span className="ml-auto text-xs text-primary-600 dark:text-primary-400">
                {filteredUsers.length} of {users.length}
              </span>
            </h2>
          </div>

          <div className="p-2 sm:p-3 border-b border-primary-200 dark:border-primary-700 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-primary-500 dark:text-primary-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-8 py-1.5 text-xs border border-primary-200 dark:border-primary-700 rounded-md
                           bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100
                           placeholder:text-primary-500 dark:placeholder:text-primary-500
                           focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                           focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary-500 dark:text-primary-400
                             hover:text-primary-700 dark:hover:text-primary-200 transition-colors duration-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-3 h-3 text-primary-500 dark:text-primary-400" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="flex-1 text-xs border border-primary-200 dark:border-primary-700 rounded-md px-2 py-1
                           bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100
                           focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                           focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200"
              >
                <option value="all">All Roles</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
              {(searchTerm || selectedRole !== "all") && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-accent-600 dark:text-accent-400 hover:text-accent-700
                             dark:hover:text-accent-300 font-medium transition-colors duration-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="p-2 sm:p-3 overflow-y-auto max-h-[500px]">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-6">
                <User className="w-6 h-6 text-primary-400 dark:text-primary-500 mx-auto mb-2" />
                <p className="text-xs text-primary-600 dark:text-primary-400">
                  {searchTerm || selectedRole !== "all"
                    ? "No users match your filters"
                    : "No users found"}
                </p>
                {(searchTerm || selectedRole !== "all") && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-accent-600 dark:text-accent-400 hover:text-accent-700
                               dark:hover:text-accent-300 mt-1 transition-colors duration-200"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className={`p-2 rounded-lg cursor-pointer transition-all duration-200 mb-1.5 border ${
                    selectedUser?.id === user.id
                      ? "bg-accent-50 dark:bg-accent-950 border-accent-300 dark:border-accent-700 shadow-sm"
                      : "border-transparent hover:bg-primary-100 dark:hover:bg-primary-800 hover:border-primary-200 dark:hover:border-primary-700"
                  }`}
                >
                  <div className="text-sm font-medium text-primary-900 dark:text-primary-100">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="text-xs text-primary-600 dark:text-primary-400">
                    {user.email}
                  </div>
                  {(user as any).department && (
                    <div className="text-xs text-primary-500 dark:text-primary-500">
                      {(user as any).department}
                    </div>
                  )}
                  <div className="text-xs text-primary-500 dark:text-primary-500 capitalize">
                    {user.role}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <div className="p-2 sm:p-3 border-b border-primary-200 dark:border-primary-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-primary-900 dark:text-primary-50 flex items-center">
                <Settings className="w-4 h-4 mr-1.5 text-accent-600 dark:text-accent-400" />
                Asset Category Permissions
                {selectedUser && (
                  <span className="ml-2 text-xs font-normal text-primary-600 dark:text-primary-400 hidden sm:inline">
                    for {selectedUser.first_name} {selectedUser.last_name}
                  </span>
                )}
              </h2>
              {hasChanges && (
                <Button
                  onClick={savePermissions}
                  disabled={saving}
                  variant="success"
                  size="sm"
                  className="flex items-center space-x-1.5"
                >
                  <Save className="w-3 h-3" />
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </Button>
              )}
            </div>
            {selectedUser && (
              <div className="text-xs text-primary-600 dark:text-primary-400 mt-1 sm:hidden">
                for {selectedUser.first_name} {selectedUser.last_name}
                {(selectedUser as any).department && (
                  <span className="text-primary-500 dark:text-primary-500">
                    {" "}
                    • {(selectedUser as any).department}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="p-2 sm:p-3">
            {!selectedUser ? (
              <div className="text-center py-8">
                <User className="w-8 h-8 text-primary-400 dark:text-primary-500 mx-auto mb-3" />
                <p className="text-sm text-primary-600 dark:text-primary-400">
                  Select a user to manage their permissions
                </p>
              </div>
            ) : loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 text-accent-600 dark:text-accent-400 animate-spin mx-auto mb-3" />
                <p className="text-sm text-primary-600 dark:text-primary-400">
                  Loading permissions...
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedUser.role === "admin" && (
                  <div className="p-3 bg-success-50 dark:bg-success-950 border border-success-200 dark:border-success-800 rounded-lg transition-colors duration-200">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-success-600 dark:text-success-400 mr-2" />
                      <span className="text-success-800 dark:text-success-300 text-sm font-medium">
                        Admin users have full access to all asset categories
                      </span>
                    </div>
                  </div>
                )}

                {Object.values(AssetCategoryType).map((category) => {
                  const currentLevel = getCurrentPermissionLevel(category);
                  const hasChange = permissionChanges[category] !== undefined;

                  return (
                    <div
                      key={category}
                      className={`p-3 border rounded-lg transition-all duration-200 ${
                        hasChange
                          ? "border-accent-300 dark:border-accent-700 bg-accent-50 dark:bg-accent-950 shadow-sm"
                          : "border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-primary-900 dark:text-primary-100">
                          {categoryLabels[category]}
                        </h3>
                        {hasChange && (
                          <span className="text-xs text-accent-600 dark:text-accent-400 font-medium">
                            Modified
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
                        {Object.values(PermissionLevel).map((level) => {
                          const isSelected = currentLevel === level;
                          const levelInfo = permissionLevelLabels[level];
                          const isDisabled = selectedUser.role === "admin";

                          return (
                            <button
                              key={level}
                              onClick={() =>
                                !isDisabled &&
                                handlePermissionChange(category, level)
                              }
                              disabled={isDisabled}
                              className={`p-2 rounded-lg border-2 transition-all duration-200 text-xs font-medium
                                         flex flex-col sm:flex-row items-center justify-center space-y-1
                                         sm:space-y-0 sm:space-x-1.5 ${
                                           isSelected
                                             ? levelInfo.color + " shadow-sm"
                                             : isDisabled
                                             ? "text-primary-400 dark:text-primary-500 bg-primary-100 dark:bg-primary-800 border-primary-200 dark:border-primary-700 cursor-not-allowed opacity-60"
                                             : "text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-800 border-primary-200 dark:border-primary-700 hover:border-accent-300 dark:hover:border-accent-600 hover:bg-primary-100 dark:hover:bg-primary-700"
                                         }`}
                            >
                              {levelInfo.icon}
                              <span className="text-center sm:text-left">
                                {levelInfo.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {hasChanges && (
                  <div className="p-3 bg-warning-50 dark:bg-warning-950 border border-warning-200 dark:border-warning-800 rounded-lg transition-colors duration-200">
                    <div className="flex items-center">
                      <AlertTriangle className="w-4 h-4 text-warning-600 dark:text-warning-400 mr-2" />
                      <span className="text-warning-800 dark:text-warning-300 text-sm">
                        You have unsaved changes. Click "Save Changes" to apply
                        them.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminUserPermissions;
