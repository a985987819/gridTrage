// src/pages/AddRecord/index.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Form, Input, Select, Button, Typography, Card, Divider, Modal, message, InputNumber } from 'antd';
import { saveRecordsToLocalStorage, getLocalStorageRecords } from '../../utils/dataHandler';
import {
  ArrowLeftOutlined,
  StockOutlined,
  SaveOutlined
} from '@ant-design/icons';
import type { FormInstance } from 'antd';
import StockAddModal from '../../components/StockAddModal';
import {
  getStockNames,
  getTradeRecords,
  saveTradeRecords,
  addStockName
} from '../../utils/storage';
import { formatDate } from '../../utils/dateUtils';
import { TradeRecord } from '../../types';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

// 股票目标涨幅配置
const STOCK_PRICE_CONFIG: { [key: string]: number } = {
  '柳工': 0.47,
  '三一重工': 10.07,
  '安道麦A': 0.27,
  '奥佳华': 0.27
};

// 表单类型定义
interface AddRecordForm {
  stockName: string;
  buyPrice: number;
  buyAmount: number;
  targetPrice: number;
}

const AddRecord: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<AddRecordForm>();
  const [stockNames, setStockNames] = useState<string[]>([]);
  const [showStockModal, setShowStockModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [calculatedTargetPrice, setCalculatedTargetPrice] = useState<number | null>(null);
  const [expectedProfit, setExpectedProfit] = useState<string>('0.00');

  // 获取股票的默认目标涨幅
  const getStockConfig = (stockName: string): number => {
    return STOCK_PRICE_CONFIG[stockName] || 0.47;
  };

  // 计算目标挂单价和预计盈利
  const calculateValues = (buyPrice: number, buyAmount: number, stockName: string) => {
    if (buyPrice && buyAmount && stockName) {
      const targetProfit = getStockConfig(stockName);
      const targetPrice = (buyPrice + targetProfit).toFixed(2);
      const profit = ((parseFloat(targetPrice) - buyPrice) * buyAmount - 8).toFixed(2);
      setCalculatedTargetPrice(parseFloat(targetPrice));
      setExpectedProfit(profit);
    }
  };

  // 初始化股票列表
  useEffect(() => {
    const names = getStockNames();
    setStockNames(names);
    if (names.length) {
      form.setFieldsValue({ stockName: names[0] });
      setSelectedStock(names[0]);
    }
    form.setFieldsValue({
      buyAmount: 500
    });
  }, [form]);

  // 当选择股票时，自动计算目标挂单价
  useEffect(() => {
    if (selectedStock) {
      const buyPrice = form.getFieldValue('buyPrice');
      const buyAmount = form.getFieldValue('buyAmount');
      calculateValues(buyPrice, buyAmount, selectedStock);
    }
  }, [selectedStock]);

  // 刷新股票列表
  const refreshStockList = () => {
    setStockNames(getStockNames());
    setShowStockModal(false);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const buyPrice = Number(values.buyPrice);
      const buyAmount = Number(values.buyAmount);
      const targetPrice = Number(values.targetPrice);

      if (isNaN(buyPrice) || isNaN(buyAmount) || isNaN(targetPrice)) {
        Modal.error({ title: '输入错误', content: '请输入有效的数字！' });
        setLoading(false);
        return;
      }

      const profit = ((targetPrice - buyPrice) * buyAmount - 8).toFixed(2);

      const newRecord: TradeRecord = {
        id: Date.now(),
        stockName: values.stockName,
        date: formatDate(new Date()),
        timestamp: new Date().getTime(),
        buyPrice: buyPrice.toFixed(2),
        buyAmount: buyAmount,
        targetPrice: targetPrice.toFixed(2),
        expectedProfit: profit,
        status: '未完成',
        completeDate: '',
        completedAmount: 0
      };

      const currentRecords = getLocalStorageRecords();
      const updatedRecords = [...currentRecords, newRecord];
      saveRecordsToLocalStorage(updatedRecords);

      form.setFieldsValue({
        buyPrice: undefined,
        buyAmount: 500,
        targetPrice: undefined
      });
      setCalculatedTargetPrice(null);
      setExpectedProfit('0.00');

      message.success('交易记录已保存！');
    } catch (error) {
      console.error('添加记录失败:', error);
      message.error('交易记录保存失败，请重试！');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            <StockOutlined /> 股票网格交易记录工具
          </Title>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')} // 优化返回按钮的路由跳转
          >
            返回统计分析
          </Button>
        </div>
      </Header>

      <Content style={{ padding: '24px' }}>
        <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
          <Card title="添加交易记录" bordered={false}>
            <Form
              form={form}
              layout="vertical"
              name="add_record_form"
              initialValues={{
                buyAmount: 500,
                targetProfit: 0.47
              }}
            >
              <Form.Item
                name="stockName"
                label="股票名称"
                rules={[{ required: true, message: '请选择股票名称！' }]}
              >
                <div style={{ display: 'flex' }}>
                  <Select
                    style={{ flex: 1, marginRight: 8 }}
                    placeholder="请选择股票名称"
                    onChange={(value) => setSelectedStock(value)}
                  >
                    {stockNames.map(name => (
                      <Option key={name} value={name}>
                        {name}
                      </Option>
                    ))}
                  </Select>
                  <Button
                    type="dashed"
                    onClick={() => setShowStockModal(true)}
                  >
                    新增股票
                  </Button>
                </div>
              </Form.Item>

              <Divider />

              <Form.Item
                name="buyPrice"
                label="买入价 (元)"
                rules={[
                  { required: true, message: '请输入买入价！' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  step="0.01"
                  placeholder="例如：10.01"
                  onChange={(value) => {
                    const buyAmount = form.getFieldValue('buyAmount') || 500;
                    calculateValues(value, buyAmount, selectedStock);
                  }}
                />
              </Form.Item>

              <Form.Item
                name="buyAmount"
                label="买入数量 (股)"
                rules={[
                  { required: true, message: '请输入买入数量！' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  step={100}
                  min={100}
                  onChange={(value) => {
                    const buyPrice = form.getFieldValue('buyPrice');
                    calculateValues(buyPrice, value, selectedStock);
                  }}
                />
              </Form.Item>

              <Form.Item
                name="targetPrice"
                label={`目标挂单价 (元) - ${selectedStock ? `柳工+0.47,三一重工+1.07,安道麦A/奥佳华+0.27` : '请先选择股票'}`}
                rules={[
                  { required: true, message: '请输入目标挂单价！' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  step="0.01"
                  placeholder={calculatedTargetPrice ? `自动计算: ${calculatedTargetPrice}` : '请输入目标挂单价'}
                  onChange={(value) => {
                    setCalculatedTargetPrice(value);
                    const buyPrice = form.getFieldValue('buyPrice');
                    const buyAmount = form.getFieldValue('buyAmount') || 500;
                    if (value && buyPrice && buyAmount) {
                      const profit = ((value - buyPrice) * buyAmount).toFixed(2);
                      setExpectedProfit(profit);
                    }
                  }}
                />
              </Form.Item>

              <div style={{
                marginBottom: 20,
                padding: '12px',
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: '4px'
              }}>
                <Text strong>预计营收：</Text>
                <Text style={{ fontSize: 18, color: '#52c41a', marginLeft: 8 }}>
                  ¥{expectedProfit}
                </Text>
                <Text type="secondary" style={{ marginLeft: 16, fontSize: 12 }}>
                  (目标价 - 买入价) × 买入数量
                </Text>
              </div>

              <Form.Item>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={loading}
                  onClick={handleSubmit}
                >
                  保存交易记录
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </Content>

      <Footer style={{ textAlign: 'center' }}>
        股票网格交易记录工具 ©{new Date().getFullYear()}
      </Footer>

      {/* 新增股票弹窗 */}
      <StockAddModal
        visible={showStockModal}
        onCancel={() => setShowStockModal(false)}
        onAddSuccess={refreshStockList}
      />
    </Layout>
  );
};

export default AddRecord;
