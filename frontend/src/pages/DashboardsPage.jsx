import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../contexts/WorkspaceContext';
import api from '../config/api';
import Layout from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Plus, TrendingUp, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { PieChart, Pie, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { toast } from '../hooks/use-toast';

const DashboardsPage = () => {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState([]);
  const [boards, setBoards] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) {
      fetchDashboards();
      fetchWorkspaceData();
    }
  }, [currentWorkspace]);

  const fetchDashboards = async () => {
    try {
      const response = await api.get(`/dashboards/workspace/${currentWorkspace.id}`);
      setDashboards(response.data);
    } catch (error) {
      console.error('Error fetching dashboards:', error);
    }
  };

  const fetchWorkspaceData = async () => {
    try {
      setLoading(true);
      const boardsRes = await api.get(`/boards/workspace/${currentWorkspace.id}`);
      const boardsData = boardsRes.data;
      setBoards(boardsData);

      // Fetch all items from all boards
      const allItems = [];
      for (const board of boardsData) {
        try {
          const itemsRes = await api.get(`/items/board/${board.id}`);
          allItems.push(...itemsRes.data);
        } catch (error) {
          console.error(`Error fetching items for board ${board.id}:`, error);
        }
      }
      setItems(allItems);
    } catch (error) {
      console.error('Error fetching workspace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDashboard = async () => {
    try {
      const response = await api.post('/dashboards', {
        workspace_id: currentWorkspace.id,
        name: 'New Dashboard',
      });
      setDashboards([...dashboards, response.data]);
      toast({ title: 'Success', description: 'Dashboard created successfully!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create dashboard',
        variant: 'destructive',
      });
    }
  };

  // Calculate statistics
  const totalItems = items.length;
  const statusColumn = boards[0]?.columns?.find((col) => col.type === 'status');
  const doneItems = items.filter((item) => {
    const status = statusColumn ? item.column_values[statusColumn.id] : null;
    return status === 'Done';
  });
  const stuckItems = items.filter((item) => {
    const status = statusColumn ? item.column_values[statusColumn.id] : null;
    return status === 'Stuck';
  });
  const workingItems = items.filter((item) => {
    const status = statusColumn ? item.column_values[statusColumn.id] : null;
    return status === 'Working on it';
  });

  const completionRate = totalItems > 0 ? Math.round((doneItems.length / totalItems) * 100) : 0;

  // Prepare chart data
  const statusData = [
    { name: 'Done', value: doneItems.length, color: '#00c875' },
    { name: 'Working on it', value: workingItems.length, color: '#fdab3d' },
    { name: 'Stuck', value: stuckItems.length, color: '#e2445c' },
    { name: 'Not Started', value: totalItems - doneItems.length - workingItems.length - stuckItems.length, color: '#c4c4c4' },
  ].filter(item => item.value > 0);

  const boardData = boards.map((board) => {
    const boardItems = items.filter((item) => item.board_id === board.id);
    return {
      name: board.name,
      items: boardItems.length,
      done: boardItems.filter((item) => {
        const status = statusColumn ? item.column_values[statusColumn.id] : null;
        return status === 'Done';
      }).length,
    };
  });

  if (loading) {
    return (
      <Layout title="Dashboards">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading dashboards...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Dashboards"
      actions={
        <Button
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          onClick={createDashboard}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Dashboard
        </Button>
      }
    >
      <div className="p-8 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Items</CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalItems}</div>
              <p className="text-xs text-gray-500 mt-1">Across {boards.length} boards</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{completionRate}%</div>
              <p className="text-xs text-gray-500 mt-1">{doneItems.length} items completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
              <Users className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{workingItems.length}</div>
              <p className="text-xs text-gray-500 mt-1">Items being worked on</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Blocked</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stuckItems.length}</div>
              <p className="text-xs text-gray-500 mt-1">Items stuck</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Board Progress Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Progress by Board</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={boardData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="items" fill="#fdab3d" name="Total Items" />
                  <Bar dataKey="done" fill="#00c875" name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Board List */}
        <Card>
          <CardHeader>
            <CardTitle>Boards Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {boards.map((board) => {
                const boardItems = items.filter((item) => item.board_id === board.id);
                const boardDone = boardItems.filter((item) => {
                  const status = statusColumn ? item.column_values[statusColumn.id] : null;
                  return status === 'Done';
                }).length;
                const progress = boardItems.length > 0 ? (boardDone / boardItems.length) * 100 : 0;

                return (
                  <div
                    key={board.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/boards/${board.id}`)}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{board.name}</h3>
                      <p className="text-sm text-gray-500">
                        {boardItems.length} items • {boardDone} completed
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{Math.round(progress)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {boards.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No data to display
              </h3>
              <p className="text-gray-500 mb-6">
                Create boards and add items to see insights
              </p>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                onClick={() => navigate('/boards/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Board
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default DashboardsPage;
