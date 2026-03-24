"""
Acuity Team Hub API Tests
Tests for: Auth, Team, Updates (Comments) endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_EMAIL = f"test_{uuid.uuid4().hex[:8]}@acuity.com"
TEST_PASSWORD = "Test1234"
TEST_NAME = "Test User"

# Global state for tests
test_state = {
    "token": None,
    "user_id": None,
    "team_id": None,
    "workspace_id": None,
    "board_id": None,
    "group_id": None,
    "item_id": None,
    "comment_id": None
}


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_register_new_user(self):
        """Test user registration - should return token and redirect info"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        assert response.status_code == 200, f"Register failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["name"] == TEST_NAME
        assert data.get("requires_company_selection") == True
        
        # Store token for subsequent tests
        test_state["token"] = data["access_token"]
        test_state["user_id"] = data["user"]["id"]
        print(f"✓ User registered: {TEST_EMAIL}")
    
    def test_select_company(self):
        """Test company selection after registration"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.post(
            f"{BASE_URL}/api/auth/select-company?company_name=Acuity-Professional",
            headers=headers
        )
        
        assert response.status_code == 200, f"Select company failed: {response.text}"
        data = response.json()
        assert data.get("company") == "Acuity-Professional"
        print("✓ Company selected: Acuity-Professional")
    
    def test_login_existing_user(self):
        """Test login with registered user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        
        # Update token
        test_state["token"] = data["access_token"]
        print(f"✓ User logged in: {TEST_EMAIL}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        print("✓ Invalid login rejected correctly")
    
    def test_get_current_user(self):
        """Test /auth/me endpoint"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200, f"Get me failed: {response.text}"
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print("✓ Current user retrieved")


class TestTeamEndpoints:
    """Team management endpoint tests"""
    
    def test_get_team_by_name(self):
        """Test fetching team by name"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.get(
            f"{BASE_URL}/api/teams/by-name/Acuity-Professional",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get team failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "Acuity-Professional"
        assert "members" in data
        assert len(data["members"]) > 0
        
        test_state["team_id"] = data["id"]
        print(f"✓ Team retrieved: {data['name']} with {len(data['members'])} members")
    
    def test_team_has_current_user_as_member(self):
        """Verify current user is in team members"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.get(
            f"{BASE_URL}/api/teams/by-name/Acuity-Professional",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        user_in_team = any(
            m["user_id"] == test_state["user_id"] 
            for m in data["members"]
        )
        assert user_in_team, "Current user should be in team"
        print("✓ Current user is in team members")
    
    def test_invite_member_by_email(self):
        """Test inviting a new member by email"""
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
        print(f"✓ Member invited: {invite_email}")
    
    def test_invite_duplicate_email_fails(self):
        """Test that inviting same email twice fails"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        
        # First invite
        invite_email = f"dup_{uuid.uuid4().hex[:8]}@acuity.com"
        response1 = requests.post(
            f"{BASE_URL}/api/teams/{test_state['team_id']}/invite",
            headers=headers,
            json={"email": invite_email, "role": "member"}
        )
        assert response1.status_code == 200
        
        # Second invite should fail
        response2 = requests.post(
            f"{BASE_URL}/api/teams/{test_state['team_id']}/invite",
            headers=headers,
            json={"email": invite_email, "role": "member"}
        )
        assert response2.status_code == 400
        print("✓ Duplicate invite rejected correctly")


class TestWorkspaceAndBoardEndpoints:
    """Workspace and Board endpoint tests for comment testing"""
    
    def test_get_workspaces(self):
        """Get user workspaces"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.get(f"{BASE_URL}/api/workspaces", headers=headers)
        
        assert response.status_code == 200, f"Get workspaces failed: {response.text}"
        data = response.json()
        assert len(data) > 0, "User should have at least one workspace"
        
        test_state["workspace_id"] = data[0]["id"]
        print(f"✓ Workspaces retrieved: {len(data)}")
    
    def test_create_board(self):
        """Create a board for testing comments"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.post(
            f"{BASE_URL}/api/boards",
            headers=headers,
            json={
                "name": f"TEST_Board_{uuid.uuid4().hex[:6]}",
                "workspace_id": test_state["workspace_id"],
                "description": "Test board for comments"
            }
        )
        
        assert response.status_code == 200, f"Create board failed: {response.text}"
        data = response.json()
        assert "id" in data
        
        test_state["board_id"] = data["id"]
        print(f"✓ Board created: {data['name']}")
    
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
        assert "id" in data
        
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
        assert "id" in data
        
        test_state["item_id"] = data["id"]
        print(f"✓ Item created: {data['name']}")


class TestCommentEndpoints:
    """Comment/Update endpoint tests"""
    
    def test_create_comment(self):
        """Create a comment on an item"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.post(
            f"{BASE_URL}/api/updates",
            headers=headers,
            json={
                "item_id": test_state["item_id"],
                "content": "This is a test comment"
            }
        )
        
        assert response.status_code == 200, f"Create comment failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["content"] == "This is a test comment"
        assert data["item_id"] == test_state["item_id"]
        assert data["user_id"] == test_state["user_id"]
        
        test_state["comment_id"] = data["id"]
        print(f"✓ Comment created: {data['id']}")
    
    def test_get_item_comments(self):
        """Get comments for an item"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.get(
            f"{BASE_URL}/api/updates/item/{test_state['item_id']}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get comments failed: {response.text}"
        data = response.json()
        
        assert len(data) > 0, "Should have at least one comment"
        assert any(c["id"] == test_state["comment_id"] for c in data)
        print(f"✓ Comments retrieved: {len(data)}")
    
    def test_delete_comment(self):
        """Delete a comment"""
        headers = {"Authorization": f"Bearer {test_state['token']}"}
        response = requests.delete(
            f"{BASE_URL}/api/updates/{test_state['comment_id']}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Delete comment failed: {response.text}"
        
        # Verify deletion
        response2 = requests.get(
            f"{BASE_URL}/api/updates/item/{test_state['item_id']}",
            headers=headers
        )
        data = response2.json()
        assert not any(c["id"] == test_state["comment_id"] for c in data)
        print("✓ Comment deleted and verified")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_user(self):
        """Delete test user by domain"""
        response = requests.delete(
            f"{BASE_URL}/api/auth/users/delete-by-domain?domain=acuity.com"
        )
        # This may fail if endpoint doesn't exist, which is fine
        print(f"✓ Cleanup attempted: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
