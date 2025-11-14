/**
 * Root App Component
 * 
 * Sets up routing and global providers.
 */

import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { GlobalLayout } from './layouts/GlobalLayout';
import { routes } from './routes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GlobalLayout>
          {routes}
        </GlobalLayout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
