import React, { useEffect, useState, useMemo } from 'react';
import { Avatar, Table, Tag, Row, Col, Typography, Spin , notification } from 'antd';
import socketIOClient from 'socket.io-client';
import { UserOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css';
import Logo from "./2023_synchrony_basic_logo.svg";
import './App.css';

const { Title, Text } = Typography;

function App() {
  const [testCases, setTestCases] = useState([]);
  const [dateTime, setDateTime] = useState({
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
  });
  const [project] = useState('My Project');
  const [scenarioSummary, setScenarioSummary] = useState({
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  });
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = process.env.REACT_APP_API_KEY;
    const socket = socketIOClient(endpoint);

    const handleData = (data) => {
      setTestCases(data.testCases);
      setScenarioSummary(calculateSummary(data.testCases));
      if (data.schema) setColumns(generateColumnsFromSchema(data.schema));
      setLoading(false); 

         // Show notification when new data arrives
      notification.open({
        message: `${JSON.stringify(data.testCases[data.testCases.length -1])}`,
        placement : "topLeft" ,
        description: `New data has been added with ${data.testCases.length} test cases.`,
      });
    };
    
    setLoading(true);
    socket.on('FromAPI', handleData);

    return () => socket.disconnect();
  }, []);

  const calculateSummary = (testCases) =>
    testCases.reduce((acc, { status }) => {
      acc[status] = (acc[status] || 0) + 1;
      acc.total += 1;
      return acc;
    }, { passed: 0, failed: 0, skipped: 0, total: 0 });

  const statusColors = {
    passed: 'green',
    failed: 'red',
    skipped: 'blue',
    total: 'orange',
  };

  const generateColumnsFromSchema = (schema) =>
    Object.keys(schema).map((key) => {
      const isDateColumn = key === 'createdAt' || key === 'updatedAt';
      return {
        title: key.charAt(0).toUpperCase() + key.slice(1),
        dataIndex: key,
        key,
        render: (text) => {
          if (key === 'status') {
            return <Tag className={'tag-style'} color={statusColors[text?.toLowerCase()] || 'default'}>{text}</Tag>;
          }
          return isDateColumn ? new Date(text).toLocaleString() : Array.isArray(text) ? text.join(', ') : text;
        },
        sorter: isDateColumn ? (a, b) => new Date(a[key]) - new Date(b[key]) : undefined,
        sortDirections: ['ascend', 'descend'],
      };
    });

  const columnsMemo = useMemo(() => generateColumnsFromSchema(testCases[0] || {}), [testCases]);

  return (
    <div className="App">
      <header className="App-header">
        <img src={Logo} alt="logo" />
        <Avatar size="default" icon={<UserOutlined />} className="user-icon" />
      </header>
      <main>
        <div className="summary-section">
          <Row justify="space-between" className="summary-section-row">
            <Col>
              <Title level={4}>Project: {project}</Title>
              <Text>Date: {dateTime.date}</Text> <br />
              <Text>Time: {dateTime.time}</Text>
            </Col>
            <Col className="summary-section-row-status">
              {['Total', 'Passed', 'Failed', 'Skipped'].map((key) => (
                <Tag
                  bordered={false}
                  size="large"
                  key={key}
                  className={`summary-section-row-status-items`}
                  color={statusColors[key?.toLowerCase()] || 'default'}
                >
                  {`${key} :  `} {scenarioSummary[key.toLowerCase()]}
                </Tag>
              ))}
            </Col>
          </Row>
        </div>
        <Table
          loading={loading && <Spin title="Loading....." size="small" />}
          bordered
          virtual
          className="ant-table-wrapper"
          columns={columnsMemo}
          dataSource={testCases}
          rowKey="_id"
          pagination={false}
          size="large"
          scroll={{ x: 300, y: 300 }}
        />
      </main>
    </div>
  );
}

export default App;
