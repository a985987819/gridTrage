// src/App.tsx
import { ConfigProvider } from 'antd';
import AppRouter from './router';
import { dateConfig } from './utils/dateConfig';
import './index.css';

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={dateConfig.locale}
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
      datepicker={{
        generateConfig: dateConfig.dateGenerateConfig,
        locale: dateConfig.locale,
      }}
    >
      <AppRouter />
    </ConfigProvider>
  );
};

export default App;
