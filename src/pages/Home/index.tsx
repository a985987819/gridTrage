// src/pages/Home/index.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Divider, Card, Modal, message } from 'antd';
import {
  DashboardOutlined,
  PlusOutlined,
  StockOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import CalendarPicker from '../../components/CalendarPicker';
import StatCards from '../../components/StatCards';
import ChartSection from '../../components/ChartSection';
import RecordTable from '../../components/RecordTable';
import StockAddModal from '../../components/StockAddModal';
import { TradeRecord } from '../../types';
import {
  getTradeRecords,
  saveTradeRecords
} from '../../utils/storage';
import {
  filterRecordsByDate,
  calculateStats,
  calculateYearlyStats, // 新增：按年统计
  formatDate
} from '../../utils/dateUtils';
import dayjs from 'dayjs';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  // 状态管理
  const [allRecords, setAllRecords] = useState<TradeRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TradeRecord[]>([]);
  // 移除 day 类型，只保留 year/month
  const [filterType, setFilterType] = useState<'year' | 'month'>('month');
  const [showStockModal, setShowStockModal] = useState(false);
  const [totalProfit, setTotalProfit] = useState('0.00');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // 新增：按年统计数据
  const [yearlyStats, setYearlyStats] = useState({
    buyCount: 0,
    successCount: 0,
    profit: '0.00'
  });

  // 初始化数据
  useEffect(() => {
    const records = getTradeRecords();
    setAllRecords(records);
    setFilteredRecords(filterRecordsByDate(records, filterType, new Date()));

    // 计算总营收
    const { profit } = calculateStats(records);
    setTotalProfit(profit);
  }, []);

  // 筛选日期变更（修复按年查看响应）
  const handleDateSelect = (type: 'year' | 'month', date: Date) => {
    setFilterType(type);
    setSelectedDate(date);

    const filtered = filterRecordsByDate(allRecords, type, date);
    setFilteredRecords(filtered);

    // 如果是按年查看，计算年度统计
    if (type === 'year') {
      const stats = calculateYearlyStats(filtered);
      setYearlyStats(stats);
    }
  };

  // 回到今日按钮点击事件
  const handleBackToToday = () => {
    const today = new Date();
    // 1. 更新选中日期（原有逻辑）
    setSelectedDate(today);
    // 2. 新增：强制更新日历显示的月份为今日所在月份
    setCurrentDate(today);

    // 3. 重新筛选数据
    const filtered = filterRecordsByDate(allRecords, filterType, today);
    setFilteredRecords(filtered);

    // 4. 如果是按年查看，更新年度统计
    if (filterType === 'year') {
      const stats = calculateYearlyStats(filtered);
      setYearlyStats(stats);
    }

  };

  // 处理状态变更（记录完成日期）
  const handleStatusChange = (
    recordId: number,
    newStatus: '未完成' | '已完成',
    completeDate: string
  ) => {
    try {
      const updatedRecords = allRecords.map(record => {
        if (record.id === recordId) {
          return {
            ...record,
            status: newStatus,
            completeDate: newStatus === '已完成' ? completeDate : ''
          };
        }
        return record;
      });

      setAllRecords(updatedRecords);
      const filtered = filterRecordsByDate(updatedRecords, filterType, selectedDate);
      setFilteredRecords(filtered);
      saveTradeRecords(updatedRecords);

      // 更新总营收
      const { profit } = calculateStats(updatedRecords);
      setTotalProfit(profit);

      // 如果是按年查看，更新年度统计
      if (filterType === 'year') {
        const stats = calculateYearlyStats(filtered);
        setYearlyStats(stats);
      }

      // 操作成功提示
      message.success({
        title: '操作成功',
        content: `交易状态已更新为「${newStatus}」！`,
      });
    } catch (error) {
      message.error({
        title: '操作失败',
        content: '交易状态更新失败，请重试！',
      });
    }
  };

  // 处理删除记录
  const handleDeleteRecord = (recordId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条交易记录吗？此操作不可撤销！',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        const updatedRecords = allRecords.filter(record => record.id !== recordId);
        setAllRecords(updatedRecords);
        const filtered = filterRecordsByDate(updatedRecords, filterType, selectedDate);
        setFilteredRecords(filtered);
        saveTradeRecords(updatedRecords);

        // 更新总营收
        const { profit } = calculateStats(updatedRecords);
        setTotalProfit(profit);

        // 如果是按年查看，更新年度统计
        if (filterType === 'year') {
          const stats = calculateYearlyStats(filtered);
          setYearlyStats(stats);
        }
      }
    });
  };

  // 切换筛选类型（移除 day 选项）
  const switchFilterType = (type: 'year' | 'month') => {
    setFilterType(type);
    const filtered = filterRecordsByDate(allRecords, type, selectedDate);
    setFilteredRecords(filtered);

    // 如果切换到按年查看，计算年度统计
    if (type === 'year') {
      const stats = calculateYearlyStats(filtered);
      setYearlyStats(stats);
    }
  };

  // 跳转到添加交易记录页面
  const goToAddRecord = () => {
    navigate('/add-record');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            <StockOutlined /> 股票网格交易记录工具
          </Title>
          <Menu
            mode="horizontal"
            selectedKeys={['home']}
            style={{ borderBottom: 0 }}
          >
            <Menu.Item key="home" icon={<DashboardOutlined />}>
              <Link to="/">统计分析</Link>
            </Menu.Item>
            <Menu.Item
              key="add"
              icon={<PlusOutlined />}
              onClick={goToAddRecord}
            >
              添加交易记录
            </Menu.Item>
            <Menu.Item
              key="stock"
              icon={<StockOutlined />}
              onClick={() => setShowStockModal(true)}
            >
              新增股票
            </Menu.Item>
          </Menu>
        </div>
      </Header>

      <Content style={{ padding: '24px' }}>
        <div style={{
          background: '#fff',
          padding: 24,
          borderRadius: 8,
          minHeight: 280,
          marginTop: 0
        }}>

          {/* 按年查看时显示年度统计卡片 */}
          {filterType === 'year' && (
            <Card
              title={`${dayjs(selectedDate).format('YYYY年')} 年度统计`}
              style={{ marginBottom: 16 }}
            >
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <Text strong>总买入次数：</Text>
                  <Text style={{ fontSize: '18px', color: '#1890ff' }}>
                    {yearlyStats.buyCount} 笔
                  </Text>
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <Text strong>成功完成次数：</Text>
                  <Text style={{ fontSize: '18px', color: '#52c41a' }}>
                    {yearlyStats.successCount} 笔
                  </Text>
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <Text strong>年度实现盈利：</Text>
                  <Text style={{ fontSize: '18px', color: '#fa8c16' }}>
                    ¥ {yearlyStats.profit}
                  </Text>
                </div>
              </div>
            </Card>
          )}
          <Divider />

          {/* 交易记录表格 */}
          <RecordTable
            records={filteredRecords}
            onStatusChange={handleStatusChange}
            onDeleteRecord={handleDeleteRecord}
          />

          {/* 统计卡片 */}
          <StatCards records={filteredRecords} />

          {/* 图表区域 */}
          <ChartSection records={filteredRecords} />

          <Divider />


          {/* 筛选类型切换（移除按日查看按钮）+ 回到今日按钮 */}
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Button
                type={filterType === 'year' ? 'primary' : 'default'}
                onClick={() => switchFilterType('year')}
                style={{ marginRight: 8 }}
              >
                按年查看
              </Button>
              <Button
                type={filterType === 'month' ? 'primary' : 'default'}
                onClick={() => switchFilterType('month')}
              >
                按月查看
              </Button>
            </div>
          </div>
          {/* 总营收统计 */}
          <Card
            title="累计统计"
            style={{ marginTop: 24, textAlign: 'right' }}
          >
            <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
              累计已实现总营收：¥ {totalProfit}
            </Title>
          </Card>
          {/* 日历选择器 */}
          <CalendarPicker
            records={allRecords}
            onDateSelect={handleDateSelect}
            filterType={filterType}
            selectedDate={selectedDate}
            currentDate={currentDate} // 新增
            onBackToToday={handleBackToToday}
          />

        </div>
      </Content>

      <Footer style={{ textAlign: 'center' }}>
        股票网格交易记录工具 ©{new Date().getFullYear()}
      </Footer>

      {/* 新增股票弹窗 */}
      <StockAddModal
        visible={showStockModal}
        onCancel={() => setShowStockModal(false)}
        onAddSuccess={() => setShowStockModal(false)}
      />
    </Layout>
  );
};

export default Home;
