import { useState } from 'react';
import { Modal, Form, Input, Button } from 'antd';
import { addStockName } from '../../utils/storage';

interface StockAddModalProps {
  visible: boolean;
  onCancel: () => void;
  onAddSuccess: () => void;
}

const StockAddModal: React.FC<StockAddModalProps> = ({
  visible,
  onCancel,
  onAddSuccess
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 提交表单
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const name = values.stockName.trim();

      const success = addStockName(name);
      if (success) {
        form.resetFields();
        onAddSuccess();
        Modal.success({
          title: '成功',
          content: `股票「${name}」添加成功！`
        });
      } else {
        Modal.error({
          title: '错误',
          content: '该股票名称已存在！'
        });
      }
    } catch (error) {
      console.error('添加股票失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="新增股票名称"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
        >
          确认添加
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        name="stock_add_form"
      >
        <Form.Item
          name="stockName"
          label="股票名称"
          rules={[
            { required: true, message: '请输入股票名称！' },
            { whitespace: true, message: '股票名称不能为空！' }
          ]}
        >
          <Input
            placeholder="请输入股票名称（如：贵州茅台）"
            maxLength={20}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StockAddModal;
