import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from '../pages/Home';
import AddRecord from '../pages/AddRecord';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/add-record',
    element: <AddRecord />
  }
]);

const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
