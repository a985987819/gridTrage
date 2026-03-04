// src/pages/AddRecord/index.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 替换 Link 为 useNavigate
import { Layout, Form, Input, Select, Button, Typography, Card, Divider, Modal, message } from 'antd';
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
const { Title } = Typography;
const { Option } = Select;

// 表单类型定义
interface AddRecordForm {
  stockName: string;
  buyPrice: number;
  buyAmount: number;
  targetProfit: number;
}

const AddRecord: React.FC = () => {
  const navigate = useNavigate(); // 使用 useNavigate 进行路由跳转
  const [form] = Form.useForm<AddRecordForm>();
  const [stockNames, setStockNames] = useState<string[]>([]);
  const [showStockModal, setShowStockModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // 初始化股票列表
  useEffect(() => {
    const names = getStockNames();
    setStockNames(names);
    if (names.length) {
      form.setFieldsValue({ stockName: names[0] });
    }

    // 设置默认值
    form.setFieldsValue({
      buyAmount: 500,
      targetProfit: 0.47
    });
  }, [form]);

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
      console.log(`values.buyPrice: ${values.buyPrice}`, Number(values.buyPrice));
      console.log(`values.targetProfit: ${values.targetProfit}`, values.targetProfit);



      // 计算目标价格和预计营收
      const targetPrice = (Number(values.buyPrice) + Number(values.targetProfit)).toFixed(2);
      const expectedProfit = (
        (parseFloat(targetPrice) - Number(values.buyPrice)) * values.buyAmount - 8
      ).toFixed(2);

      // 创建新记录
      const newRecord: TradeRecord = {
        id: Date.now(),
        stockName: values.stockName,
        date: formatDate(new Date()),
        timestamp: new Date().getTime(),
        buyPrice: (Number(values.buyPrice)).toFixed(2),
        buyAmount: values.buyAmount,
        targetPrice,
        expectedProfit,
        status: '未完成',
        completeDate: ''
      };
      const currentRecords = getLocalStorageRecords();

      // 保存记录
      const records = getTradeRecords();
      records.push(newRecord);
      saveTradeRecords(records);

      // 重置表单
      form.setFieldsValue({
        buyPrice: undefined,
        buyAmount: 500,
        targetProfit: 0.47
      });

      const updatedRecords = [...currentRecords, newRecord];
      // 保存（自动去重）
      saveRecordsToLocalStorage(updatedRecords);
      // 提示成功
      message.success({
        title: '添加成功',
        content: '交易记录添加成功！',
      });
    } catch (error) {
      message.error('添加记录失败:', error);
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
                <Input
                  type="number"
                  step="0.01"
                  placeholder="例如：10.01"
                />
              </Form.Item>

              <Form.Item
                name="buyAmount"
                label="买入数量 (股)"
                rules={[
                  { required: true, message: '请输入买入数量！' },
                ]}
              >
                <Input
                  type="number"
                  step="100"
                  min="100"
                />
              </Form.Item>

              <Form.Item
                name="targetProfit"
                label="目标涨幅 (元)"
                rules={[
                  { required: true, message: '请输入目标涨幅！' },
                  { type: 'number', min: 0.01, message: '目标涨幅必须大于0！' }
                ]}
              >
                <Input
                  type="number"
                  step="0.01"
                />
              </Form.Item>
              <span style={{ color: '#ef5c53', marginBottom: '20px' }}>
                预计营收：<span style={{ color: '#1890ff' }}>{(form.getFieldValue('targetProfit') * form.getFieldValue('buyAmount') || 0).toFixed(2)}</span>元
              </span>
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
