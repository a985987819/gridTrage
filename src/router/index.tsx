// src/router/index.tsx（你的路由文件）
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from '../pages/Home';
import AddRecord from '../pages/AddRecord';

// 核心：定义 GitHub Pages 基础路径（和 vite.config.ts 中的 base 一致）
// 替换为你的 GitHub 仓库名（比如仓库地址是 https://github.com/xxx/grid-trade，就填 'grid-trade'）
const GITHUB_REPO_NAME = 'grid-trade';

// 区分环境：开发环境用 '/'，生产环境用 '/仓库名/'
const basename = process.env.NODE_ENV === 'production' ? `/${GITHUB_REPO_NAME}/` : '/';

const router = createBrowserRouter(
  [
    {
      path: '/', // 保持原有路径写法不变
      element: <Home />
    },
    {
      path: '/add-record', // 保持原有路径写法不变
      element: <AddRecord />
    }
  ],
  {
    basename: basename // 新增：配置基础路径
  }
);

const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
