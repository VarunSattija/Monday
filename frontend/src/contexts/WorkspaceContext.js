import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [sharedBoards, setSharedBoards] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
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
  }, [user, currentWorkspace]);

  const fetchBoards = useCallback(async (workspaceId) => {
    if (!workspaceId) return;
    try {
      const response = await api.get(`/boards/workspace/${workspaceId}`);
      setBoards(response.data);
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  }, []);

  const fetchSharedBoards = useCallback(async () => {
    if (!user) return;
    try {
      const response = await api.get('/boards/shared/me');
      setSharedBoards(response.data);
    } catch (error) {
      console.error('Error fetching shared boards:', error);
    }
  }, [user]);

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
      fetchSharedBoards();
    }
  }, [user, fetchWorkspaces, fetchSharedBoards]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchBoards(currentWorkspace.id);
    }
  }, [currentWorkspace, fetchBoards]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        boards,
        sharedBoards,
        loading,
        fetchWorkspaces,
        fetchBoards,
        fetchSharedBoards,
        createWorkspace,
        createBoard,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
