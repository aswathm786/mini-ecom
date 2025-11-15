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

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <GlobalLayout>
            {routes}
          </GlobalLayout>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
