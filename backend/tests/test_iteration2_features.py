"""
Iteration 2 Feature Tests
Tests for: 
- Auto-add to team on signup
- Team invite for all members (not just admin)
- Column operations (rename, delete, add, duplicate, change type)
- Comment counts
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test state
test_state = {
    "token": None,
    "user_id": None,
    "team_id": None,
    "workspace_id": None,
    "board_id": None,
    "group_id": None,
    "item_id": None,
    "column_id": None,
}


class TestAutoAddToTeamOnSignup:
    """Test that new users are auto-added to Acuity-Professional team"""
    
    def test_register_new_user_auto_added_to_team(self):
        """Register new user and verify they are auto-added to Acuity-Professional team"""
        test_email = f"autotest_{uuid.uuid4().hex[:8]}@acuity.com"
        test_password = "Test1234"
        test_name = "Auto Test User"
        
        # Register new user
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": test_password,
            "name": test_name
        })
        
        assert response.status_code == 200, f"Register failed: {response.text}"
        data = response.json()
        
        # Store token and user_id
        test_state["token"] = data["access_token"]
        test_state["user_id"] = data["user"]["id"]
        
        # Verify user is in Acuity-Professional team
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        team_response = requests.get(
            f"{BASE_URL}/api/teams/by-name/Acuity-Professional",
            headers=headers
        )
        
        assert team_response.status_code == 200, f"Get team failed: {team_response.text}"
        team_data = team_response.json()
        
        # Check user is in team members
        user_in_team = any(
            m["user_id"] == test_state["user_id"] 
            for m in team_data.get("members", [])
        )
        assert user_in_team, "New user should be auto-added to Acuity-Professional team"
        
        test_state["team_id"] = team_data["id"]
        print(f"✓ User {test_email} auto-added to team on registration")


class TestTeamInviteForAllMembers:
    """Test that any team member can invite others (not just admin)"""
    
    def test_member_can_invite_others(self):
        """Test that a non-admin member can invite others"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        invite_email = f"invited_{uuid.uuid4().hex[:8]}@acuity.com"
        
        response = requests.post(
            f"{BASE_URL}/api/teams/{test_state['team_id']}/invite",
            headers=headers,
            json={
                "email": invite_email,
                "role": "member"
            }
        )
        
        assert response.status_code == 200, f"Invite failed: {response.text}"
        data = response.json()
        assert "member" in data
        assert data["member"]["email"] == invite_email
        assert data["member"]["status"] == "invited"
        print(f"✓ Member successfully invited {invite_email}")
    
    def test_invited_member_appears_in_pending(self):
        """Verify invited member appears in team with 'invited' status"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        
        response = requests.get(
            f"{BASE_URL}/api/teams/by-name/Acuity-Professional",
            headers=headers
        )
        
        assert response.status_code == 200
        team_data = response.json()
        
        invited_members = [m for m in team_data.get("members", []) if m["status"] == "invited"]
        assert len(invited_members) > 0, "Should have at least one invited member"
        print(f"✓ Found {len(invited_members)} pending invitations")


class TestBoardAndColumnSetup:
    """Setup board for column operation tests"""
    
    def test_get_workspace(self):
        """Get user workspace"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.get(f"{BASE_URL}/api/workspaces", headers=headers)
        
        assert response.status_code == 200, f"Get workspaces failed: {response.text}"
        data = response.json()
        assert len(data) > 0, "User should have at least one workspace"
        
        test_state["workspace_id"] = data[0]["id"]
        print(f"✓ Workspace retrieved: {data[0]['name']}")
    
    def test_create_board(self):
        """Create a board for column testing"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.post(
            f"{BASE_URL}/api/boards",
            headers=headers,
            json={
                "name": f"TEST_ColumnOps_{uuid.uuid4().hex[:6]}",
                "workspace_id": test_state["workspace_id"],
                "description": "Test board for column operations"
            }
        )
        
        assert response.status_code == 200, f"Create board failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "columns" in data
        assert len(data["columns"]) > 0, "Board should have default columns"
        
        test_state["board_id"] = data["id"]
        # Get a column ID for testing (skip first "Item" column)
        test_state["column_id"] = data["columns"][1]["id"]
        print(f"✓ Board created with {len(data['columns'])} columns")
    
    def test_create_group(self):
        """Create a group in the board"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.post(
            f"{BASE_URL}/api/groups",
            headers=headers,
            json={
                "title": f"TEST_Group_{uuid.uuid4().hex[:6]}",
                "board_id": test_state["board_id"],
                "color": "#FF6B6B"
            }
        )
        
        assert response.status_code == 200, f"Create group failed: {response.text}"
        data = response.json()
        test_state["group_id"] = data["id"]
        print(f"✓ Group created: {data['title']}")
    
    def test_create_item(self):
        """Create an item in the group"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.post(
            f"{BASE_URL}/api/items",
            headers=headers,
            json={
                "name": f"TEST_Item_{uuid.uuid4().hex[:6]}",
                "board_id": test_state["board_id"],
                "group_id": test_state["group_id"]
            }
        )
        
        assert response.status_code == 200, f"Create item failed: {response.text}"
        data = response.json()
        test_state["item_id"] = data["id"]
        print(f"✓ Item created: {data['name']}")


class TestColumnOperations:
    """Test column CRUD operations"""
    
    def test_rename_column(self):
        """Test renaming a column"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        new_title = "Renamed Status"
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{test_state['board_id']}/columns/{test_state['column_id']}?title={new_title}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Rename column failed: {response.text}"
        
        # Verify rename
        board_response = requests.get(
            f"{BASE_URL}/api/boards/{test_state['board_id']}",
            headers=headers
        )
        board_data = board_response.json()
        renamed_col = next((c for c in board_data["columns"] if c["id"] == test_state["column_id"]), None)
        assert renamed_col is not None
        assert renamed_col["title"] == new_title
        print(f"✓ Column renamed to '{new_title}'")
    
    def test_change_column_type(self):
        """Test changing column type"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{test_state['board_id']}/columns/{test_state['column_id']}?column_type=text",
            headers=headers
        )
        
        assert response.status_code == 200, f"Change column type failed: {response.text}"
        
        # Verify type change
        board_response = requests.get(
            f"{BASE_URL}/api/boards/{test_state['board_id']}",
            headers=headers
        )
        board_data = board_response.json()
        changed_col = next((c for c in board_data["columns"] if c["id"] == test_state["column_id"]), None)
        assert changed_col is not None
        assert changed_col["type"] == "text"
        print("✓ Column type changed to 'text'")
    
    def test_add_column_to_right(self):
        """Test adding a column to the right of existing column"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/boards/{test_state['board_id']}/columns?after_column_id={test_state['column_id']}",
            headers=headers,
            json={
                "title": "New Column Right",
                "type": "text",
                "width": 150,
                "options": []
            }
        )
        
        assert response.status_code == 200, f"Add column failed: {response.text}"
        
        # Verify column was added
        board_response = requests.get(
            f"{BASE_URL}/api/boards/{test_state['board_id']}",
            headers=headers
        )
        board_data = board_response.json()
        new_col = next((c for c in board_data["columns"] if c["title"] == "New Column Right"), None)
        assert new_col is not None
        print("✓ Column added to the right")
    
    def test_duplicate_column(self):
        """Test duplicating a column"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/boards/{test_state['board_id']}/columns/{test_state['column_id']}/duplicate",
            headers=headers
        )
        
        assert response.status_code == 200, f"Duplicate column failed: {response.text}"
        
        # Verify column was duplicated
        board_response = requests.get(
            f"{BASE_URL}/api/boards/{test_state['board_id']}",
            headers=headers
        )
        board_data = board_response.json()
        copy_col = next((c for c in board_data["columns"] if "(Copy)" in c["title"]), None)
        assert copy_col is not None
        print("✓ Column duplicated successfully")
    
    def test_delete_column(self):
        """Test deleting a column"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        
        # First get the board to find a column to delete
        board_response = requests.get(
            f"{BASE_URL}/api/boards/{test_state['board_id']}",
            headers=headers
        )
        board_data = board_response.json()
        initial_count = len(board_data["columns"])
        
        # Delete the copy column
        copy_col = next((c for c in board_data["columns"] if "(Copy)" in c["title"]), None)
        if copy_col:
            response = requests.delete(
                f"{BASE_URL}/api/boards/{test_state['board_id']}/columns/{copy_col['id']}",
                headers=headers
            )
            
            assert response.status_code == 200, f"Delete column failed: {response.text}"
            
            # Verify column was deleted
            board_response = requests.get(
                f"{BASE_URL}/api/boards/{test_state['board_id']}",
                headers=headers
            )
            board_data = board_response.json()
            assert len(board_data["columns"]) == initial_count - 1
            print("✓ Column deleted successfully")
        else:
            print("⚠ No copy column found to delete")


class TestCommentCounts:
    """Test comment count functionality"""
    
    def test_create_comment(self):
        """Create a comment on an item"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.post(
            f"{BASE_URL}/api/updates",
            headers=headers,
            json={
                "item_id": test_state["item_id"],
                "content": "Test comment for count"
            }
        )
        
        assert response.status_code == 200, f"Create comment failed: {response.text}"
        print("✓ Comment created")
    
    def test_get_comment_counts(self):
        """Test getting comment counts for a board"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.get(
            f"{BASE_URL}/api/updates/counts/board/{test_state['board_id']}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get comment counts failed: {response.text}"
        data = response.json()
        
        # Should have count for our item
        assert test_state["item_id"] in data or len(data) > 0
        print(f"✓ Comment counts retrieved: {data}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup(self):
        """Delete test board"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        
        if test_state["board_id"]:
            response = requests.delete(
                f"{BASE_URL}/api/boards/{test_state['board_id']}",
                headers=headers
            )
            print(f"✓ Cleanup: Board deleted (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
