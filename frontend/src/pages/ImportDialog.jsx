import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, X, Loader2, FolderPlus, FolderOpen } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '../hooks/use-toast';
import api from '../config/api';

const ImportDialog = ({ open, onClose }) => {
  const { currentWorkspace, boards, fetchBoards } = useWorkspace();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [boardName, setBoardName] = useState('');
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importMode, setImportMode] = useState('new');
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && currentWorkspace) {
      fetchBoards(currentWorkspace.id);
    }
  }, [open, currentWorkspace]);

  if (!open) return null;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!boardName) setBoardName(f.name.replace(/\.(xlsx|xls|csv)$/i, ''));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      if (!boardName) setBoardName(f.name.replace(/\.(xlsx|xls|csv)$/i, ''));
    }
  };

  const handleImport = async () => {
    if (!file) return;
    if (importMode === 'new' && !currentWorkspace) return;
    if (importMode === 'existing' && !selectedBoardId) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setImporting(true);
      let url;
      if (importMode === 'existing') {
        url = `/import/excel?workspace_id=${currentWorkspace?.id || ''}&existing_board_id=${selectedBoardId}`;
      } else {
        url = `/import/excel?workspace_id=${currentWorkspace.id}&board_name=${encodeURIComponent(boardName || file.name)}`;
      }
      const response = await api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast({
        title: 'Import Successful!',
        description: response.data.message,
      });
      if (currentWorkspace) fetchBoards(currentWorkspace.id);
      onClose();
      navigate(`/boards/${response.data.board_id}`);
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error.response?.data?.detail || 'Failed to import file',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const workspaceBoards = boards || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="import-dialog">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Import Board</h3>
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="import-close-btn">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            data-testid="import-dropzone"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              data-testid="import-file-input"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="h-10 w-10 text-green-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="font-medium text-gray-700">Drop your file here or click to browse</p>
                <p className="text-sm text-gray-500 mt-1">Supports Excel (.xlsx) and CSV (.csv)</p>
              </>
            )}
          </div>

          {/* Import Mode Toggle */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Import to</Label>
            <div className="flex gap-2">
              <Button
                variant={importMode === 'new' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setImportMode('new'); setSelectedBoardId(''); }}
                className={importMode === 'new' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                data-testid="import-mode-new"
              >
                <FolderPlus className="h-4 w-4 mr-1.5" />
                New Board
              </Button>
              <Button
                variant={importMode === 'existing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setImportMode('existing')}
                className={importMode === 'existing' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                data-testid="import-mode-existing"
              >
                <FolderOpen className="h-4 w-4 mr-1.5" />
                Existing Board
              </Button>
            </div>
          </div>

          {/* Import Options */}
          <div className="space-y-3">
            {importMode === 'new' ? (
              <div className="space-y-1.5">
                <Label>Board Name</Label>
                <Input
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  placeholder="Enter board name"
                  data-testid="import-board-name"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Select Board</Label>
                <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                  <SelectTrigger data-testid="import-board-select">
                    <SelectValue placeholder="Select a board to import into..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaceBoards.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {workspaceBoards.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No boards in this workspace yet</p>
                )}
              </div>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-blue-800">Smart Group Detection</p>
                  <p className="text-xs text-blue-600 mt-1">Groups are auto-detected from blank row separators in your file</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-green-800">Column Mapping</p>
                  <p className="text-xs text-green-600 mt-1">Headers map to columns. Status, dates and people are auto-detected</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Button
            onClick={handleImport}
            disabled={!file || importing || (importMode === 'existing' && !selectedBoardId)}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            data-testid="import-submit-btn"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {importMode === 'existing' ? 'Import into Board' : 'Import as New Board'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;
