import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { Toaster } from './components/ui/toaster';
import Login from './pages/Login';
import Register from './pages/Register';
import WorkspacesHome from './pages/WorkspacesHome';
import NewBoard from './pages/NewBoard';
import BoardPage from './pages/BoardPage';
import DashboardsPage from './pages/DashboardsPage';
import NewWorkspace from './pages/NewWorkspace';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/workspaces"
                element={
                  <ProtectedRoute>
                    <WorkspacesHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspaces/new"
                element={
                  <ProtectedRoute>
                    <NewWorkspace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspaces/:workspaceId/dashboards"
                element={
                  <ProtectedRoute>
                    <DashboardsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/boards/new"
                element={
                  <ProtectedRoute>
                    <NewBoard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/boards/:boardId"
                element={
                  <ProtectedRoute>
                    <BoardPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/workspaces" replace />} />
            </Routes>
            <Toaster />
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
