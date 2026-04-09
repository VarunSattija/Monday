import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../config/api';
import Layout from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Table as TableIcon, Kanban, Calendar, BarChart3, Settings, History, Share2 } from 'lucide-react';
import TableView from '../components/board/TableView';
import KanbanView from '../components/board/KanbanView';
import TimelineView from '../components/board/TimelineView';
import CalendarView from '../components/board/CalendarView';
import AddColumnDialog from '../components/board/AddColumnDialog';
import ActivityLog from '../components/board/ActivityLog';
import BoardContextMenu from '../components/board/BoardContextMenu';
import InviteToBoardDialog from '../components/board/InviteToBoardDialog';
import { toast } from '../hooks/use-toast';

const BoardPage = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('table');
  const [showActivityLog, setShowActivityLog] = useState(false);

  useEffect(() => {
    fetchBoardData();
  }, [boardId]);

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      const [boardRes, itemsRes, groupsRes] = await Promise.all([
        api.get(`/boards/${boardId}`),
        api.get(`/items/board/${boardId}`),
        api.get(`/groups/board/${boardId}`),
      ]);

      setBoard(boardRes.data);
      setItems(itemsRes.data);
      setGroups(groupsRes.data);
    } catch (error) {
      console.error('Error fetching board data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load board data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (groupId) => {
    try {
      const response = await api.post('/items', {
        board_id: boardId,
        group_id: groupId,
        name: 'New Item',
        column_values: {},
      });
      setItems([...items, response.data]);
      toast({ title: 'Success', description: 'Item added successfully!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add item',
        variant: 'destructive',
      });
    }
  };

  const handleAddGroup = async () => {
    try {
      const response = await api.post('/groups', {
        board_id: boardId,
        title: 'New Group',
        color: '#0086c0',
      });
      setGroups([...groups, response.data]);
      toast({ title: 'Success', description: 'Group added successfully!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add group',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    try {
      const response = await api.put(`/items/${itemId}`, updates);
      setItems(items.map((item) => (item.id === itemId ? response.data : item)));
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await api.delete(`/items/${itemId}`);
      setItems(items.filter((item) => item.id !== itemId));
      toast({ title: 'Success', description: 'Item deleted successfully!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Layout title="Loading...">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading board...</div>
        </div>
      </Layout>
    );
  }

  if (!board) {
    return (
      <Layout title="Board Not Found">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Board not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={board.name}
      actions={
        <div className="flex gap-2">
          <InviteToBoardDialog boardId={boardId} onInvite={fetchBoardData} />
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const res = await api.post(`/boards/${boardId}/share`);
                toast({ title: 'Shared!', description: res.data.message });
              } catch (error) {
                toast({ title: 'Error', description: 'Failed to share board', variant: 'destructive' });
              }
            }}
            data-testid="share-board-btn"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share with Team
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowActivityLog(true)}
          >
            <History className="h-4 w-4 mr-2" />
            Activity
          </Button>
          <AddColumnDialog boardId={boardId} onColumnAdded={fetchBoardData} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddGroup}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Group
          </Button>
          <BoardContextMenu board={board} onUpdate={fetchBoardData} />
          <Button
            size="sm"
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            onClick={() => navigate(`/boards/${boardId}/settings`)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      }
    >
      <div className="h-full flex flex-col">
        {/* View Tabs */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <Tabs value={currentView} onValueChange={setCurrentView} className="w-full">
            <TabsList className="bg-transparent">
              <TabsTrigger value="table" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">
                <TableIcon className="h-4 w-4 mr-2" />
                Table
              </TabsTrigger>
              <TabsTrigger value="kanban" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">
                <Kanban className="h-4 w-4 mr-2" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="timeline" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">
                <BarChart3 className="h-4 w-4 mr-2" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="calendar" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">
                <Calendar className="h-4 w-4 mr-2" />
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'table' && (
            <TableView
              board={board}
              items={items}
              groups={groups}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onRefresh={fetchBoardData}
            />
          )}
          {currentView === 'kanban' && (
            <KanbanView
              board={board}
              items={items}
              groups={groups}
              onUpdateItem={handleUpdateItem}
              onRefresh={fetchBoardData}
            />
          )}
          {currentView === 'timeline' && (
            <TimelineView
              board={board}
              items={items}
              groups={groups}
              onRefresh={fetchBoardData}
            />
          )}
          {currentView === 'calendar' && (
            <CalendarView
              board={board}
              items={items}
              onRefresh={fetchBoardData}
            />
          )}
        </div>
      </div>

      {/* Activity Log Sidebar */}
      <ActivityLog open={showActivityLog} onClose={() => setShowActivityLog(false)} />
    </Layout>
  );
};

export default BoardPage;
