/**
 * Root App Component
 * 
 * Sets up routing and global providers.
 */

import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { GlobalLayout } from './layouts/GlobalLayout';
import { routes } from './routes';
import { AIProvider } from './contexts/AIContext';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <AIProvider>
            <GlobalLayout>
              {routes}
            </GlobalLayout>
          </AIProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
