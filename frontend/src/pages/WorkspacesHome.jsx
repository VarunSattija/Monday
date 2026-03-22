import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../contexts/WorkspaceContext';
import Layout from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Plus, LayoutGrid, BarChart3 } from 'lucide-react';

const WorkspacesHome = () => {
  const { workspaces, currentWorkspace, boards } = useWorkspace();
  const navigate = useNavigate();

  const recentBoards = boards.slice(0, 6);

  return (
    <Layout
      title={currentWorkspace?.name || 'Workspaces'}
      actions={
        <Button
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          onClick={() => navigate('/boards/new')}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Board
        </Button>
      }
    >
      <div className="p-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome to {currentWorkspace?.name}
          </h2>
          <p className="text-gray-600">
            {currentWorkspace?.description || 'Manage your work efficiently with Acuity'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-orange-300"
            onClick={() => navigate('/boards/new')}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                <LayoutGrid className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Create Board</CardTitle>
              <CardDescription>
                Start a new board to organize your work
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-orange-300"
            onClick={() => navigate(`/workspaces/${currentWorkspace?.id}/dashboards`)}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <CardTitle>View Dashboards</CardTitle>
              <CardDescription>
                Analyze your work with powerful insights
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-orange-300"
            onClick={() => navigate(`/workspaces/${currentWorkspace?.id}/automations`)}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Add Automation</CardTitle>
              <CardDescription>
                Automate repetitive tasks and workflows
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Boards */}
        {recentBoards.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Boards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentBoards.map((board) => (
                <Card
                  key={board.id}
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate(`/boards/${board.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="text-base">{board.name}</CardTitle>
                    {board.description && (
                      <CardDescription>{board.description}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {boards.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <LayoutGrid className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No boards yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first board to get started
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

export default WorkspacesHome;
