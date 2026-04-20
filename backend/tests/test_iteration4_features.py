"""
Iteration 4 Feature Tests:
- Import from Excel/CSV (POST /api/import/excel)
- Folder CRUD (POST/GET/PUT/DELETE /api/folders)
- Move board to folder (PUT /api/folders/boards/{boardId}/move)
- Board rename (PUT /api/boards/{id} with {name: 'New Name'})
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testcol@acuity.com"
TEST_PASSWORD = "Test1234"


class TestAuth:
    """Authentication setup"""
    token = None
    workspace_id = None
    
    @pytest.fixture(autouse=True, scope="class")
    def setup_auth(self, request):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        request.cls.token = data.get("access_token")
        assert request.cls.token, f"No token received. Response: {data}"
        
        # Get workspace
        headers = {"Authorization": f"Bearer {request.cls.token}"}
        ws_response = requests.get(f"{BASE_URL}/api/workspaces", headers=headers)
        assert ws_response.status_code == 200
        workspaces = ws_response.json()
        assert len(workspaces) > 0, "No workspaces found"
        request.cls.workspace_id = workspaces[0]["id"]


class TestImportCSV(TestAuth):
    """Test CSV import functionality"""
    board_id = None
    
    def test_01_import_csv_creates_board(self):
        """POST /api/import/excel with CSV file creates board with correct columns and items"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create a simple CSV content
        csv_content = "Name,Status,Priority\nTask1,Working,High\nTask2,Done,Low\nTask3,Stuck,Medium"
        
        files = {
            'file': ('test_import.csv', io.BytesIO(csv_content.encode('utf-8')), 'text/csv')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/import/excel?workspace_id={self.workspace_id}&board_name=TEST_CSV_Import",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "board_id" in data, "No board_id in response"
        assert "items_created" in data, "No items_created in response"
        assert "columns_created" in data, "No columns_created in response"
        
        # Verify counts
        assert data["items_created"] == 3, f"Expected 3 items, got {data['items_created']}"
        assert data["columns_created"] >= 3, f"Expected at least 3 columns, got {data['columns_created']}"
        
        TestImportCSV.board_id = data["board_id"]
        print(f"CSV Import successful: board_id={data['board_id']}, items={data['items_created']}, columns={data['columns_created']}")
    
    def test_02_verify_imported_board_structure(self):
        """Verify the imported board has correct columns"""
        assert self.board_id, "No board_id from previous test"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.get(f"{BASE_URL}/api/boards/{self.board_id}", headers=headers)
        assert response.status_code == 200, f"Get board failed: {response.text}"
        
        board = response.json()
        assert board["name"] == "TEST_CSV_Import", f"Board name mismatch: {board['name']}"
        
        # Check columns exist
        columns = board.get("columns", [])
        column_titles = [c["title"] for c in columns]
        
        # First column should be "Item" (name column)
        assert "Item" in column_titles, f"Missing 'Item' column. Columns: {column_titles}"
        # Status and Priority should be imported
        assert "Status" in column_titles, f"Missing 'Status' column. Columns: {column_titles}"
        assert "Priority" in column_titles, f"Missing 'Priority' column. Columns: {column_titles}"
        
        print(f"Board columns verified: {column_titles}")
    
    def test_03_verify_imported_items(self):
        """Verify the imported items have correct data"""
        assert self.board_id, "No board_id from previous test"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.get(f"{BASE_URL}/api/items/board/{self.board_id}", headers=headers)
        assert response.status_code == 200, f"Get items failed: {response.text}"
        
        items = response.json()
        assert len(items) == 3, f"Expected 3 items, got {len(items)}"
        
        item_names = [item["name"] for item in items]
        assert "Task1" in item_names, f"Missing Task1. Items: {item_names}"
        assert "Task2" in item_names, f"Missing Task2. Items: {item_names}"
        assert "Task3" in item_names, f"Missing Task3. Items: {item_names}"
        
        print(f"Imported items verified: {item_names}")


class TestImportXLSX(TestAuth):
    """Test XLSX import functionality"""
    board_id = None
    
    def test_01_import_xlsx_creates_board(self):
        """POST /api/import/excel with XLSX file creates board"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create a minimal XLSX file using openpyxl
        try:
            import openpyxl
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.append(["Name", "Status", "Owner"])
            ws.append(["Project A", "In Progress", "John"])
            ws.append(["Project B", "Complete", "Jane"])
            
            xlsx_buffer = io.BytesIO()
            wb.save(xlsx_buffer)
            xlsx_buffer.seek(0)
            
            files = {
                'file': ('test_import.xlsx', xlsx_buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            }
            
            response = requests.post(
                f"{BASE_URL}/api/import/excel?workspace_id={self.workspace_id}&board_name=TEST_XLSX_Import",
                headers=headers,
                files=files
            )
            
            assert response.status_code == 200, f"XLSX Import failed: {response.text}"
            data = response.json()
            
            assert data["items_created"] == 2, f"Expected 2 items, got {data['items_created']}"
            TestImportXLSX.board_id = data["board_id"]
            print(f"XLSX Import successful: board_id={data['board_id']}, items={data['items_created']}")
            
        except ImportError:
            pytest.skip("openpyxl not available for XLSX test")


class TestFolderCRUD(TestAuth):
    """Test folder CRUD operations"""
    folder_id = None
    
    def test_01_create_folder(self):
        """POST /api/folders with workspace_id creates folder"""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/folders",
            headers=headers,
            json={"name": "TEST_Folder", "workspace_id": self.workspace_id}
        )
        
        assert response.status_code == 200, f"Create folder failed: {response.text}"
        data = response.json()
        
        assert "id" in data, "No folder id in response"
        assert data["name"] == "TEST_Folder", f"Folder name mismatch: {data['name']}"
        assert data["workspace_id"] == self.workspace_id, "Workspace ID mismatch"
        
        TestFolderCRUD.folder_id = data["id"]
        print(f"Folder created: id={data['id']}, name={data['name']}")
    
    def test_02_get_workspace_folders(self):
        """GET /api/folders/workspace/{id} returns folders"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/folders/workspace/{self.workspace_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get folders failed: {response.text}"
        folders = response.json()
        
        assert isinstance(folders, list), "Response should be a list"
        folder_ids = [f["id"] for f in folders]
        assert self.folder_id in folder_ids, f"Created folder not found. Folders: {folder_ids}"
        
        print(f"Found {len(folders)} folders in workspace")
    
    def test_03_rename_folder(self):
        """PUT /api/folders/{id}?name=NewName renames folder"""
        assert self.folder_id, "No folder_id from previous test"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/folders/{self.folder_id}?name=TEST_Folder_Renamed",
            headers=headers
        )
        
        assert response.status_code == 200, f"Rename folder failed: {response.text}"
        
        # Verify rename persisted
        get_response = requests.get(
            f"{BASE_URL}/api/folders/workspace/{self.workspace_id}",
            headers=headers
        )
        folders = get_response.json()
        renamed_folder = next((f for f in folders if f["id"] == self.folder_id), None)
        assert renamed_folder, "Folder not found after rename"
        assert renamed_folder["name"] == "TEST_Folder_Renamed", f"Rename not persisted: {renamed_folder['name']}"
        
        print(f"Folder renamed to: {renamed_folder['name']}")


class TestMoveBoardToFolder(TestAuth):
    """Test moving boards to folders"""
    board_id = None
    folder_id = None
    
    def test_01_setup_board_and_folder(self):
        """Create a board and folder for move test"""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Create board
        board_response = requests.post(
            f"{BASE_URL}/api/boards",
            headers=headers,
            json={"name": "TEST_Board_For_Move", "workspace_id": self.workspace_id}
        )
        assert board_response.status_code == 200, f"Create board failed: {board_response.text}"
        TestMoveBoardToFolder.board_id = board_response.json()["id"]
        
        # Create folder
        folder_response = requests.post(
            f"{BASE_URL}/api/folders",
            headers=headers,
            json={"name": "TEST_Folder_For_Move", "workspace_id": self.workspace_id}
        )
        assert folder_response.status_code == 200, f"Create folder failed: {folder_response.text}"
        TestMoveBoardToFolder.folder_id = folder_response.json()["id"]
        
        print(f"Setup complete: board_id={self.board_id}, folder_id={self.folder_id}")
    
    def test_02_move_board_to_folder(self):
        """PUT /api/folders/boards/{boardId}/move?folder_id={folderId} moves board"""
        assert self.board_id and self.folder_id, "Missing board_id or folder_id"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/folders/boards/{self.board_id}/move?folder_id={self.folder_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Move board failed: {response.text}"
        
        # Verify board has folder_id set
        board_response = requests.get(f"{BASE_URL}/api/boards/{self.board_id}", headers=headers)
        board = board_response.json()
        assert board.get("folder_id") == self.folder_id, f"Board folder_id not set: {board.get('folder_id')}"
        
        print(f"Board moved to folder successfully")
    
    def test_03_remove_board_from_folder(self):
        """PUT /api/folders/boards/{boardId}/move?folder_id= removes board from folder"""
        assert self.board_id, "Missing board_id"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/folders/boards/{self.board_id}/move?folder_id=",
            headers=headers
        )
        
        assert response.status_code == 200, f"Remove from folder failed: {response.text}"
        
        # Verify board has no folder_id
        board_response = requests.get(f"{BASE_URL}/api/boards/{self.board_id}", headers=headers)
        board = board_response.json()
        assert board.get("folder_id") is None or board.get("folder_id") == "", f"Board still has folder_id: {board.get('folder_id')}"
        
        print(f"Board removed from folder successfully")


class TestBoardRename(TestAuth):
    """Test board rename functionality"""
    board_id = None
    
    def test_01_create_board_for_rename(self):
        """Create a board to test rename"""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/boards",
            headers=headers,
            json={"name": "TEST_Board_Original_Name", "workspace_id": self.workspace_id}
        )
        
        assert response.status_code == 200, f"Create board failed: {response.text}"
        TestBoardRename.board_id = response.json()["id"]
        print(f"Board created: id={self.board_id}")
    
    def test_02_rename_board(self):
        """PUT /api/boards/{id} with {name: 'New Name'} renames board"""
        assert self.board_id, "No board_id from previous test"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{self.board_id}",
            headers=headers,
            json={"name": "TEST_Board_Renamed"}
        )
        
        assert response.status_code == 200, f"Rename board failed: {response.text}"
        data = response.json()
        assert data["name"] == "TEST_Board_Renamed", f"Board name not updated in response: {data['name']}"
        
        print(f"Board renamed to: {data['name']}")
    
    def test_03_verify_rename_persisted(self):
        """Verify board rename persisted in database"""
        assert self.board_id, "No board_id from previous test"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.get(f"{BASE_URL}/api/boards/{self.board_id}", headers=headers)
        assert response.status_code == 200, f"Get board failed: {response.text}"
        
        board = response.json()
        assert board["name"] == "TEST_Board_Renamed", f"Rename not persisted: {board['name']}"
        
        print(f"Board rename verified: {board['name']}")


class TestDeleteFolder(TestAuth):
    """Test folder deletion and board cleanup"""
    folder_id = None
    board_id = None
    
    def test_01_setup_folder_with_board(self):
        """Create folder and board inside it"""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Create folder
        folder_response = requests.post(
            f"{BASE_URL}/api/folders",
            headers=headers,
            json={"name": "TEST_Folder_To_Delete", "workspace_id": self.workspace_id}
        )
        assert folder_response.status_code == 200
        TestDeleteFolder.folder_id = folder_response.json()["id"]
        
        # Create board
        board_response = requests.post(
            f"{BASE_URL}/api/boards",
            headers=headers,
            json={"name": "TEST_Board_In_Folder", "workspace_id": self.workspace_id}
        )
        assert board_response.status_code == 200
        TestDeleteFolder.board_id = board_response.json()["id"]
        
        # Move board to folder
        move_response = requests.put(
            f"{BASE_URL}/api/folders/boards/{self.board_id}/move?folder_id={self.folder_id}",
            headers=headers
        )
        assert move_response.status_code == 200
        
        print(f"Setup complete: folder_id={self.folder_id}, board_id={self.board_id}")
    
    def test_02_delete_folder_removes_folder_id_from_boards(self):
        """DELETE /api/folders/{id} deletes folder and removes folder_id from boards"""
        assert self.folder_id and self.board_id, "Missing folder_id or board_id"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Delete folder
        response = requests.delete(
            f"{BASE_URL}/api/folders/{self.folder_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Delete folder failed: {response.text}"
        
        # Verify folder is deleted
        folders_response = requests.get(
            f"{BASE_URL}/api/folders/workspace/{self.workspace_id}",
            headers=headers
        )
        folders = folders_response.json()
        folder_ids = [f["id"] for f in folders]
        assert self.folder_id not in folder_ids, "Folder still exists after delete"
        
        # Verify board's folder_id is cleared
        board_response = requests.get(f"{BASE_URL}/api/boards/{self.board_id}", headers=headers)
        board = board_response.json()
        assert board.get("folder_id") is None, f"Board still has folder_id after folder delete: {board.get('folder_id')}"
        
        print(f"Folder deleted and board's folder_id cleared")


class TestCleanup(TestAuth):
    """Cleanup test data"""
    
    def test_cleanup_test_boards(self):
        """Delete all TEST_ prefixed boards"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get all boards
        response = requests.get(
            f"{BASE_URL}/api/boards/workspace/{self.workspace_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            boards = response.json()
            deleted = 0
            for board in boards:
                if board["name"].startswith("TEST_"):
                    del_response = requests.delete(
                        f"{BASE_URL}/api/boards/{board['id']}",
                        headers=headers
                    )
                    if del_response.status_code == 200:
                        deleted += 1
            print(f"Cleaned up {deleted} test boards")
    
    def test_cleanup_test_folders(self):
        """Delete all TEST_ prefixed folders"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get all folders
        response = requests.get(
            f"{BASE_URL}/api/folders/workspace/{self.workspace_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            folders = response.json()
            deleted = 0
            for folder in folders:
                if folder["name"].startswith("TEST_"):
                    del_response = requests.delete(
                        f"{BASE_URL}/api/folders/{folder['id']}",
                        headers=headers
                    )
                    if del_response.status_code == 200:
                        deleted += 1
            print(f"Cleaned up {deleted} test folders")
