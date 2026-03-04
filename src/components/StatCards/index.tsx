import { Card, Row, Col, Typography } from 'antd';
import {
  DollarOutlined,
  OrderedListOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { TradeRecord } from '../../types';
import { calculateStats } from '../../utils/dateUtils';

const { Title, Text } = Typography;

interface StatCardsProps {
  records: TradeRecord[];
}

const StatCards: React.FC<StatCardsProps> = ({ records }) => {
  const { profit, totalCount, completedCount, uncompletedCount } = calculateStats(records);

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} md={6}>
        <Card
          bordered={true}
          icon={<DollarOutlined style={{ color: '#52c41a' }} />}
          title="筛选期已实现营收"
        >
          <Title level={3} style={{ color: '#52c41a' }}>¥ {profit}</Title>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card
          bordered={true}
          icon={<OrderedListOutlined style={{ color: '#faad14' }} />}
          title="筛选期交易总次数"
        >
          <Title level={3}>{totalCount}</Title>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card
          bordered={true}
          icon={<CheckCircleOutlined style={{ color: '#1890ff' }} />}
          title="筛选期已完成次数"
        >
          <Title level={3}>{completedCount}</Title>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card
          bordered={true}
          icon={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
          title="筛选期未完成次数"
        >
          <Title level={3}>{uncompletedCount}</Title>
        </Card>
      </Col>
    </Row>
  );
};

export default StatCards;
