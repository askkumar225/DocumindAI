import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import authApi from "../services/authApi";

export default function Navbar() {
  const { user, refreshToken, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    // Best-effort: blacklist the refresh token on the server,
    // then clear local state regardless of the server response.
    if (refreshToken) {
      await authApi.logout(refreshToken);
    }
    logout();
    navigate("/login");
  }

  return (
    <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 shrink-0">
      {/* Brand */}
      <Link
        to="/dashboard"
        className="text-xl font-bold text-indigo-700 mr-auto"
      >
        DocuMind AI
      </Link>

      {/* User info + logout */}
      {user && (
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-800">{user.username}</p>
            <p className="text-xs text-gray-400">{user.role}</p>
          </div>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center
                          text-indigo-700 font-semibold text-sm uppercase">
            {user.username.charAt(0)}
          </div>

          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
