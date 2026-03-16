// src/components/RecordTable/index.tsx
import { useState } from 'react';
import { Table, Button, InputNumber, Modal, Progress, message } from 'antd';
import { CheckOutlined, EditOutlined } from '@ant-design/icons';
import { TradeRecord } from '../../types';
import { calculateRecordProgress } from '../../utils/dateUtils';

interface RecordTableProps {
  records: TradeRecord[];
  onStatusChange: (recordId: number | string, newStatus: '未完成' | '已完成', completeDate: string, completedAmount?: number, nextPurchasePrice?: string, nextExpectedShares?: number) => void;
  onDeleteRecord: (recordId: number | string) => void;
}

const RecordTable: React.FC<RecordTableProps> = ({ records, onStatusChange, onDeleteRecord }) => {
  // 存储每条记录的完成数量输入值
  const [completedAmountInput, setCompletedAmountInput] = useState<{ [key: string]: number }>({});

  // 处理完成操作
  const handleCompleteOperation = (record: TradeRecord) => {
    const inputAmount = completedAmountInput[record.id] ?? 0;
    const today = new Date().toISOString().split('T')[0]; // 今日日期
    let newCompletedAmount = record.buyAmount; // 默认100%完成
    let newStatus: '未完成' | '已完成' = '已完成';
    let nextPurchasePrice: string | undefined;
    let nextExpectedShares: number | undefined;

    // 有输入值时，按输入值处理（100步进，≤买入数量）
    if (inputAmount > 0) {
      // 校验输入值：100步进，最小100，最大≤买入数量
      if (inputAmount < 100) {
        message.error('完成数量不能小于100！');
        return;
      }
      if (inputAmount % 100 !== 0) {
        message.error('完成数量必须按100步进！');
        return;
      }
      if (inputAmount > record.buyAmount) {
        message.error(`完成数量不能超过买入数量（${record.buyAmount}）！`);
        return;
      }

      newCompletedAmount = inputAmount;
      // 输入值=买入数量则标记为已完成，否则标记为未完成（但有部分完成）
      newStatus = inputAmount === record.buyAmount ? '已完成' : '未完成';
    } else {
      // 如果没有输入值，则使用完整的买入数量作为已完成数量
      newCompletedAmount = record.buyAmount;
    }

    // 如果是完全完成，计算下次购入预估价和预计购买份额
    if (newStatus === '已完成') {
      const targetPrice = parseFloat(record.targetPrice);
      const buyPrice = parseFloat(record.buyPrice);
      nextPurchasePrice = (targetPrice - buyPrice - 0.1).toFixed(2);
      nextExpectedShares = record.buyAmount + 100;
    }

    // 调用父组件更新状态
    onStatusChange(record.id, newStatus, today, newCompletedAmount, nextPurchasePrice, nextExpectedShares);
    // 清空输入框
    setCompletedAmountInput(prev => ({ ...prev, [record.id]: 0 }));
    message.success(`操作成功！完成数量：${newCompletedAmount}${newStatus === '已完成' ? '，已标记为完成' : ''}`);
  };

  // 列配置
  const columns = [
    {
      title: '股票名称',
      dataIndex: 'stockName',
      key: 'stockName',
    },
    {
      title: '交易日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '买入价',
      dataIndex: 'buyPrice',
      key: 'buyPrice',
    },
    {
      title: '买入数量',
      dataIndex: 'buyAmount',
      key: 'buyAmount',
    },
    {
      title: '目标价',
      dataIndex: 'targetPrice',
      key: 'targetPrice',
    },
    {
      title: '预计盈利',
      dataIndex: 'expectedProfit',
      key: 'expectedProfit',
    },
    {
      title: '下次购入预估价',
      dataIndex: 'nextPurchasePrice',
      key: 'nextPurchasePrice',
      render: (text: string) => text || '-'
    },
    {
      title: '下次预计购买份额',
      dataIndex: 'nextExpectedShares',
      key: 'nextExpectedShares',
      render: (text: number) => text || '-'
    },
    {
      title: '完成进度',
      key: 'progress',
      render: (_, record: TradeRecord) => {
        const progress = calculateRecordProgress(record);
        return (
          <div>
            <Progress percent={progress} size="small" status={progress === 100 ? 'success' : 'active'} />
            <span style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
              {progress}%（{record.completedAmount ?? 0}/{record.buyAmount}）
            </span>
          </div>
        );
      },
    },
    {
      title: '完成操作',
      key: 'complete',
      render: (_, record: TradeRecord) => {
        if (record.status === '已完成') return <span style={{ color: '#52c41a' }}>已完成</span>;

        return (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <InputNumber
              min={100}
              max={record.buyAmount}
              step={100}
              value={completedAmountInput[record.id] || undefined}
              onChange={(value) => setCompletedAmountInput(prev => ({ ...prev, [record.id]: value || 0 }))}
              placeholder="输入数量"
              size="small"
              style={{ width: '120px' }}
            />
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleCompleteOperation(record)}
            >
              确认完成
            </Button>
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: TradeRecord) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            danger
            size="small"
            onClick={() => onDeleteRecord(record.id)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={records.map(record => ({ ...record, key: record.id }))}
      pagination={{ pageSize: 10 }}
      scroll={{ x: 'max-content' }}
    />
  );
};

export default RecordTable;
