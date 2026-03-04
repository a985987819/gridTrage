import { useState, useEffect } from 'react';
import { Table, Tag, Button, Select, Space, Typography, Card } from 'antd';
import type { TableProps, SelectProps } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { TradeRecord } from '../../types';
import { getStockNames } from '../../utils/storage';

const { Title } = Typography;

interface RecordTableProps {
  records: TradeRecord[];
  onStatusChange: (recordId: number, newStatus: '未完成' | '已完成', completeDate: string) => void;
  onDeleteRecord: (recordId: number) => void;
}

const RecordTable: React.FC<RecordTableProps> = ({
  records,
  onStatusChange,
  onDeleteRecord
}) => {
  const [stockNames, setStockNames] = useState<string[]>([]);

  useEffect(() => {
    setStockNames(getStockNames());
  }, []);

  // 状态变更处理
  const handleStatusChange = (recordId: number, value: '未完成' | '已完成') => {
    const completeDate = new Date().toLocaleDateString();
    onStatusChange(recordId, value, completeDate);
  };

  // 按股票分组展示表格
  const renderStockTables = () => {
    return stockNames.map(stockName => {
      const stockRecords = records.filter(record => record.stockName === stockName);
      if (stockRecords.length === 0) return null;

      // 表格列定义
      const columns: TableProps<TradeRecord>['columns'] = [
        {
          title: '交易日期',
          dataIndex: 'date',
          key: 'date',
          width: 120,
        },
        {
          title: '买入价 (元)',
          dataIndex: 'buyPrice',
          key: 'buyPrice',
          width: 100,
        },
        {
          title: '买入数量 (股)',
          dataIndex: 'buyAmount',
          key: 'buyAmount',
          width: 100,
        },
        {
          title: '目标挂单价 (元)',
          dataIndex: 'targetPrice',
          key: 'targetPrice',
          width: 120,
        },
        {
          title: '预计营收 (元)',
          dataIndex: 'expectedProfit',
          key: 'expectedProfit',
          width: 120,
          render: (text) => <span style={{ color: '#52c41a' }}>¥ {text}</span>,
        },
        {
          title: '操作状态',
          key: 'status',
          width: 120,
          render: (_, record) => (
            <Select
              value={record.status}
              style={{ width: 100 }}
              onChange={(value: '未完成' | '已完成') => handleStatusChange(record.id, value)}
              options={[
                { value: '未完成', label: '未完成' },
                { value: '已完成', label: '已完成' },
              ]}
            />
          ),
        },
        {
          title: '完成日期',
          dataIndex: 'completeDate',
          key: 'completeDate',
          width: 120,
          render: (text) => text || '-',
        },
        {
          title: '操作',
          key: 'action',
          width: 100,
          render: (_, record) => (
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => onDeleteRecord(record.id)}
            >
              删除
            </Button>
          ),
        },
      ];

      return (
        <div key={stockName} style={{ marginBottom: 24 }}>
          <Title level={5} style={{ marginBottom: 16 }}>
            股票：{stockName}
          </Title>
          <Table
            dataSource={stockRecords}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="middle"
          />
        </div>
      );
    });
  };

  return (
    <Card title="交易记录明细" style={{ marginBottom: 24 }} onClick={() => Router.pu}>
      {records.length > 0 ? (
        renderStockTables()
      ) : (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <span>暂无交易记录</span>
        </div>
      )}
    </Card>
  );
};

export default RecordTable;
