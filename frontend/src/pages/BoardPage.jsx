import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../config/api';
import Layout from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Table as TableIcon, Calendar, BarChart3, History, Pencil, Check, Download } from 'lucide-react';
import TableView from '../components/board/TableView';
import ChartView from '../components/board/ChartView';
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
  const [editingName, setEditingName] = useState(false);
  const [boardName, setBoardName] = useState('');

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
      setBoardName(boardRes.data.name);
      setItems(itemsRes.data);
      setGroups(groupsRes.data);
    } catch (error) {
      console.error('Error fetching board data:', error);
      toast({ title: 'Error', description: 'Failed to load board data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBoardName = async () => {
    if (!boardName.trim() || boardName === board.name) {
      setEditingName(false);
      setBoardName(board.name);
      return;
    }
    try {
      await api.put(`/boards/${boardId}`, { name: boardName.trim() });
      setBoard({ ...board, name: boardName.trim() });
      toast({ title: 'Renamed', description: 'Board name updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to rename board', variant: 'destructive' });
      setBoardName(board.name);
    }
    setEditingName(false);
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
      toast({ title: 'Error', description: 'Failed to add item', variant: 'destructive' });
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
      toast({ title: 'Error', description: 'Failed to add group', variant: 'destructive' });
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(`/export/excel/${boardId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${board?.name || 'board'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Exported!', description: 'Board exported to Excel' });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Could not export board', variant: 'destructive' });
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
      toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
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

  const boardTitle = editingName ? (
    <div className="flex items-center gap-2">
      <Input
        value={boardName}
        onChange={(e) => setBoardName(e.target.value)}
        onBlur={handleSaveBoardName}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSaveBoardName();
          if (e.key === 'Escape') { setEditingName(false); setBoardName(board.name); }
        }}
        autoFocus
        className="h-8 w-64 text-lg font-semibold border-orange-300 focus-visible:ring-orange-400"
        data-testid="board-name-input"
      />
      <Button variant="ghost" size="sm" onClick={handleSaveBoardName}>
        <Check className="h-4 w-4 text-green-600" />
      </Button>
    </div>
  ) : (
    <span
      className="cursor-pointer hover:text-orange-600 transition-colors flex items-center gap-2"
      onClick={() => setEditingName(true)}
      data-testid="board-name-editable"
    >
      {board.name}
      <Pencil className="h-3.5 w-3.5 text-gray-400" />
    </span>
  );

  return (
    <Layout
      title={boardTitle}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            data-testid="export-board-btn"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <InviteToBoardDialog boardId={boardId} onInvite={fetchBoardData} />
          <Button variant="outline" size="sm" onClick={() => setShowActivityLog(true)}>
            <History className="h-4 w-4 mr-2" />
            Activity
          </Button>
          <AddColumnDialog boardId={boardId} onColumnAdded={fetchBoardData} existingColumns={board?.columns} />
          <Button variant="outline" size="sm" onClick={handleAddGroup}>
            <Plus className="h-4 w-4 mr-2" />
            Add Group
          </Button>
          <BoardContextMenu board={board} onUpdate={fetchBoardData} />
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
              <TabsTrigger value="chart" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600" data-testid="chart-tab">
                <BarChart3 className="h-4 w-4 mr-2" />
                Chart
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
          {currentView === 'chart' && (
            <ChartView
              board={board}
              items={items}
              groups={groups}
            />
          )}
          {currentView === 'timeline' && (
            <TimelineView board={board} items={items} groups={groups} onRefresh={fetchBoardData} />
          )}
          {currentView === 'calendar' && (
            <CalendarView board={board} items={items} onRefresh={fetchBoardData} />
          )}
        </div>
      </div>

      <ActivityLog open={showActivityLog} onClose={() => setShowActivityLog(false)} />
    </Layout>
  );
};

export default BoardPage;
