import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ChatPage } from './pages/ChatPage';
import { SemanticSearchPage } from './pages/SemanticSearchPage';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Public Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Authenticated Application Shell Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<ErrorBoundary title="Dashboard error"><DashboardPage /></ErrorBoundary>} />
                <Route path="/documents" element={<ErrorBoundary title="Documents error"><DocumentsPage /></ErrorBoundary>} />
                <Route path="/chat" element={<ErrorBoundary title="Chat error"><ChatPage /></ErrorBoundary>} />
                <Route path="/search" element={<ErrorBoundary title="Search error"><SemanticSearchPage /></ErrorBoundary>} />
                <Route path="/knowledge-graph" element={<ErrorBoundary title="Graph error"><KnowledgeGraphPage /></ErrorBoundary>} />
                <Route path="/recommendations" element={<ErrorBoundary title="Recommendations error"><RecommendationsPage /></ErrorBoundary>} />
                <Route path="/evaluation" element={<ErrorBoundary title="Evaluation error"><EvaluationPage /></ErrorBoundary>} />
                <Route path="/settings" element={<ErrorBoundary title="Settings error"><SettingsPage /></ErrorBoundary>} />
              </Route>

              {/* Default and Catch-all redirects to Dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
