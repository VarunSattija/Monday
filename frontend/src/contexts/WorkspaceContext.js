import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../config/api';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWorkspaces = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await api.get('/workspaces');
      setWorkspaces(response.data);
      if (response.data.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoards = async (workspaceId) => {
    if (!workspaceId) return;
    try {
      const response = await api.get(`/boards/workspace/${workspaceId}`);
      setBoards(response.data);
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  };

  const createWorkspace = async (name, description) => {
    try {
      const response = await api.post('/workspaces', { name, description });
      setWorkspaces([...workspaces, response.data]);
      return response.data;
    } catch (error) {
      console.error('Error creating workspace:', error);
      throw error;
    }
  };

  const createBoard = async (workspaceId, name, description) => {
    try {
      const response = await api.post('/boards', { workspace_id: workspaceId, name, description });
      setBoards([...boards, response.data]);
      return response.data;
    } catch (error) {
      console.error('Error creating board:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    }
  }, [user]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchBoards(currentWorkspace.id);
    }
  }, [currentWorkspace]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        boards,
        loading,
        fetchWorkspaces,
        fetchBoards,
        createWorkspace,
        createBoard,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
