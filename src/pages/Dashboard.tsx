import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, User, Clock, Activity, Lock } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'user':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'guest':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-900 to-slate-900"></div>

      <nav className="relative border-b border-slate-700/50 backdrop-blur-xl bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-600/50">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Secure Dashboard</h1>
                <p className="text-xs text-slate-400">Government-grade authentication</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-600"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="relative max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome back, {user?.username}</h2>
                <p className="text-slate-400">You are securely authenticated and logged in.</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <User className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-medium text-slate-300">Username</span>
                </div>
                <p className="text-lg font-semibold text-white">{user?.username}</p>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-medium text-slate-300">Status</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/50">
                  Active
                </span>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <Lock className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-300">Email</span>
                </div>
                <p className="text-lg font-semibold text-white truncate">{user?.email}</p>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-300">Role</span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium border ${getRoleBadgeColor(user?.role)}`}>
                  {user?.role || 'User'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Session Info
            </h3>
            <div className="space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                <p className="text-sm text-slate-400 mb-1">Session ID</p>
                <p className="text-xs font-mono text-white break-all">{user?.id}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                <p className="text-sm text-slate-400 mb-1">Authentication Method</p>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <p className="text-sm text-white">JWT + HttpOnly Cookies</p>
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                <p className="text-sm text-slate-400 mb-1">Security Level</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full w-full"></div>
                  </div>
                  <span className="text-sm font-semibold text-green-400">Maximum</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Security Features
            </h3>
            <div className="space-y-3">
              {[
                'Argon2id password hashing',
                'JWT with RS256 signing',
                'HttpOnly secure cookies',
                'CSRF protection',
                'Refresh token rotation',
                'Token reuse detection',
                'Rate limiting',
                'Brute force protection',
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-slate-300">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Role-Based Access
            </h3>
            <div className="space-y-4">
              {user?.role === 'admin' ? (
                <>
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                    <p className="text-red-400 font-semibold mb-2">Administrator Access</p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                        Full system access
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                        User management
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                        Audit log access
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
                    <p className="text-blue-400 font-semibold mb-2">Standard User Access</p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        View personal data
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        Manage sessions
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        Update profile
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
