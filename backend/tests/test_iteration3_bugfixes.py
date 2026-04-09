"""
Iteration 3 Bug Fix Tests
Tests for:
1. Group rename functionality (PUT /api/groups/{id})
2. Status column labels save (PUT /api/boards/{boardId}/columns/{colId} with body options)
3. Board sharing with team (POST /api/boards/{id}/share, GET /api/boards/shared/me)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSetup:
    """Setup test data"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Login with existing test user"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testcol@acuity.com",
            "password": "Test1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}


class TestGroupRename(TestSetup):
    """Test group rename functionality - Bug Fix #1"""
    
    board_id = None
    group_id = None
    
    def test_01_get_workspace(self, session, auth_headers):
        """Get workspace to create board"""
        response = session.get(f"{BASE_URL}/api/workspaces", headers=auth_headers)
        assert response.status_code == 200
        workspaces = response.json()
        assert len(workspaces) > 0, "No workspaces found"
        TestGroupRename.workspace_id = workspaces[0]["id"]
        print(f"Using workspace: {TestGroupRename.workspace_id}")
    
    def test_02_create_board_for_group_test(self, session, auth_headers):
        """Create a board for testing group rename"""
        response = session.post(f"{BASE_URL}/api/boards", headers=auth_headers, json={
            "workspace_id": TestGroupRename.workspace_id,
            "name": f"TEST_GroupRename_{uuid.uuid4().hex[:8]}",
            "description": "Test board for group rename"
        })
        assert response.status_code == 200, f"Failed to create board: {response.text}"
        data = response.json()
        TestGroupRename.board_id = data["id"]
        print(f"Created board: {TestGroupRename.board_id}")
    
    def test_03_create_group(self, session, auth_headers):
        """Create a group to rename"""
        response = session.post(f"{BASE_URL}/api/groups", headers=auth_headers, json={
            "board_id": TestGroupRename.board_id,
            "title": "Original Group Name",
            "color": "#0086c0"
        })
        assert response.status_code == 200, f"Failed to create group: {response.text}"
        data = response.json()
        TestGroupRename.group_id = data["id"]
        assert data["title"] == "Original Group Name"
        print(f"Created group: {TestGroupRename.group_id}")
    
    def test_04_rename_group(self, session, auth_headers):
        """Test renaming a group via PUT /api/groups/{id}"""
        new_title = "Renamed Group Title"
        response = session.put(f"{BASE_URL}/api/groups/{TestGroupRename.group_id}", headers=auth_headers, json={
            "board_id": TestGroupRename.board_id,
            "title": new_title,
            "color": "#0086c0"
        })
        assert response.status_code == 200, f"Failed to rename group: {response.text}"
        data = response.json()
        assert data["title"] == new_title, f"Expected title '{new_title}', got '{data['title']}'"
        print(f"Group renamed successfully to: {data['title']}")
    
    def test_05_verify_group_rename_persisted(self, session, auth_headers):
        """Verify the renamed group persists after GET"""
        response = session.get(f"{BASE_URL}/api/groups/board/{TestGroupRename.board_id}", headers=auth_headers)
        assert response.status_code == 200
        groups = response.json()
        renamed_group = next((g for g in groups if g["id"] == TestGroupRename.group_id), None)
        assert renamed_group is not None, "Group not found"
        assert renamed_group["title"] == "Renamed Group Title", f"Group title not persisted: {renamed_group['title']}"
        print("Group rename persisted correctly")


class TestStatusLabelsSave(TestSetup):
    """Test status column labels save - Bug Fix #2"""
    
    board_id = None
    status_column_id = None
    
    def test_01_create_board_for_labels_test(self, session, auth_headers):
        """Create a board for testing label save"""
        response = session.get(f"{BASE_URL}/api/workspaces", headers=auth_headers)
        workspaces = response.json()
        workspace_id = workspaces[0]["id"]
        
        response = session.post(f"{BASE_URL}/api/boards", headers=auth_headers, json={
            "workspace_id": workspace_id,
            "name": f"TEST_LabelsSave_{uuid.uuid4().hex[:8]}",
            "description": "Test board for labels save"
        })
        assert response.status_code == 200, f"Failed to create board: {response.text}"
        data = response.json()
        TestStatusLabelsSave.board_id = data["id"]
        
        # Find the Status column (default column)
        columns = data.get("columns", [])
        status_col = next((c for c in columns if c["type"] == "status"), None)
        assert status_col is not None, "Status column not found in default columns"
        TestStatusLabelsSave.status_column_id = status_col["id"]
        print(f"Created board: {TestStatusLabelsSave.board_id}, Status column: {TestStatusLabelsSave.status_column_id}")
    
    def test_02_update_status_labels(self, session, auth_headers):
        """Test updating status column labels via PUT with body options"""
        custom_labels = [
            {"id": "1", "label": "Custom Working", "color": "#fdab3d"},
            {"id": "2", "label": "Custom Done", "color": "#00c875"},
            {"id": "3", "label": "Custom Stuck", "color": "#e2445c"},
            {"id": "4", "label": "Custom Pending", "color": "#579bfc"}
        ]
        
        response = session.put(
            f"{BASE_URL}/api/boards/{TestStatusLabelsSave.board_id}/columns/{TestStatusLabelsSave.status_column_id}",
            headers=auth_headers,
            json={"options": custom_labels}
        )
        assert response.status_code == 200, f"Failed to update labels: {response.text}"
        print("Labels updated successfully")
    
    def test_03_verify_labels_persisted(self, session, auth_headers):
        """Verify the custom labels persist after GET"""
        response = session.get(f"{BASE_URL}/api/boards/{TestStatusLabelsSave.board_id}", headers=auth_headers)
        assert response.status_code == 200
        board = response.json()
        
        columns = board.get("columns", [])
        status_col = next((c for c in columns if c["id"] == TestStatusLabelsSave.status_column_id), None)
        assert status_col is not None, "Status column not found"
        
        options = status_col.get("options", [])
        assert len(options) == 4, f"Expected 4 labels, got {len(options)}"
        
        # Verify custom labels
        labels = [opt["label"] for opt in options]
        assert "Custom Working" in labels, f"Custom Working not found in labels: {labels}"
        assert "Custom Done" in labels, f"Custom Done not found in labels: {labels}"
        assert "Custom Stuck" in labels, f"Custom Stuck not found in labels: {labels}"
        assert "Custom Pending" in labels, f"Custom Pending not found in labels: {labels}"
        print(f"Labels persisted correctly: {labels}")


class TestBoardSharing(TestSetup):
    """Test board sharing with team - Bug Fix #3"""
    
    board_id = None
    
    def test_01_create_board_for_sharing_test(self, session, auth_headers):
        """Create a board for testing sharing"""
        response = session.get(f"{BASE_URL}/api/workspaces", headers=auth_headers)
        workspaces = response.json()
        workspace_id = workspaces[0]["id"]
        
        response = session.post(f"{BASE_URL}/api/boards", headers=auth_headers, json={
            "workspace_id": workspace_id,
            "name": f"TEST_BoardSharing_{uuid.uuid4().hex[:8]}",
            "description": "Test board for sharing"
        })
        assert response.status_code == 200, f"Failed to create board: {response.text}"
        data = response.json()
        TestBoardSharing.board_id = data["id"]
        print(f"Created board: {TestBoardSharing.board_id}")
    
    def test_02_share_board_with_team(self, session, auth_headers):
        """Test sharing board with team via POST /api/boards/{id}/share"""
        response = session.post(
            f"{BASE_URL}/api/boards/{TestBoardSharing.board_id}/share",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to share board: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain message"
        print(f"Board shared: {data}")
    
    def test_03_get_shared_boards_endpoint(self, session, auth_headers):
        """Test GET /api/boards/shared/me endpoint exists and returns list"""
        response = session.get(f"{BASE_URL}/api/boards/shared/me", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get shared boards: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Shared boards endpoint works, returned {len(data)} boards")


class TestCleanup(TestSetup):
    """Cleanup test data"""
    
    def test_cleanup_boards(self, session, auth_headers):
        """Delete test boards"""
        # Get all boards
        response = session.get(f"{BASE_URL}/api/workspaces", headers=auth_headers)
        if response.status_code == 200:
            workspaces = response.json()
            for ws in workspaces:
                boards_response = session.get(f"{BASE_URL}/api/boards/workspace/{ws['id']}", headers=auth_headers)
                if boards_response.status_code == 200:
                    boards = boards_response.json()
                    for board in boards:
                        if board["name"].startswith("TEST_"):
                            session.delete(f"{BASE_URL}/api/boards/{board['id']}", headers=auth_headers)
                            print(f"Deleted test board: {board['name']}")
        print("Cleanup completed")
