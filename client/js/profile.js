/**
 * User Profile & Grid Engine
 */

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();
  await Auth.syncCurrentUser();

  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get('id');

  loadUserProfile(targetId);
});

async function loadUserProfile(targetId) {
  const currentUser = Auth.getUser();
  const endpoint = targetId ? `/users/${targetId}` : '/users/profile';

  try {
    const data = await API.get(endpoint);
    const user = data.user;
    const isOwnProfile = !targetId || targetId === currentUser._id || user._id === currentUser._id;

    // Render User Header Details
    document.getElementById('profile-avatar').src = user.profilePicture || '/uploads/default-avatar.svg';
    document.getElementById('profile-username').textContent = user.username;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-bio').textContent = user.bio || 'No bio added yet.';

    document.getElementById('profile-posts-count').textContent = data.postsCount || 0;
    document.getElementById('profile-followers-count').textContent = data.followersCount || 0;
    document.getElementById('profile-following-count').textContent = data.followingCount || 0;

    // Setup Action Button (Edit Profile vs Follow/Unfollow)
    const actionContainer = document.getElementById('profile-action-btn-container');
    if (actionContainer) {
      if (isOwnProfile) {
        actionContainer.innerHTML = `
          <a href="/edit-profile.html" class="btn-secondary">
            ✏️ Edit Profile
          </a>
        `;
      } else {
        const isFollowing = user.followers && user.followers.some(f => (f._id || f) === currentUser._id);
        actionContainer.innerHTML = `
          <div style="display: flex; gap: 8px;">
            <a href="/messages?user=${user._id}" class="btn-secondary" style="font-size: 0.85rem;">
              💬 Message
            </a>
            <button class="btn-follow ${isFollowing ? 'following' : ''}" id="profile-follow-btn" onclick="handleProfileFollow('${user._id}')">
              ${isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        `;
      }
    }

    // Render Posts Grid
    renderUserPostsGrid(data.posts, isOwnProfile);

    // Setup Modal Click Listeners for Followers & Following Lists
    setupFollowListModals(user.followers, user.following);
  } catch (err) {
    showToast('Error loading profile details', 'error');
    console.error(err);
  }
}

// Render User Posts Grid
function renderUserPostsGrid(posts, isOwnProfile) {
  const container = document.getElementById('user-posts-grid');
  if (!container) return;

  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <div class="glass-card empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🖼️</div>
        <h3>No posts yet</h3>
        <p>${isOwnProfile ? 'Share your first post with the world!' : 'This user has not posted anything yet.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = posts.map(post => `
    <a href="/post.html?id=${post._id}" class="glass-card grid-post-item">
      ${post.image ? `
        <img src="${post.image}" alt="Post thumbnail" loading="lazy">
      ` : `
        <div class="grid-post-text-only">
          <p>${escapeHTML(post.caption)}</p>
        </div>
      `}
      <div class="grid-post-overlay">
        <span>❤️ ${post.likes ? post.likes.length : 0}</span>
        <span>💬 ${post.comments ? post.comments.length : 0}</span>
      </div>
    </a>
  `).join('');
}

// Handle Follow Button on Profile Page
async function handleProfileFollow(targetUserId) {
  try {
    const res = await API.post(`/users/${targetUserId}/follow`);
    const btn = document.getElementById('profile-follow-btn');
    const followersCountEl = document.getElementById('profile-followers-count');

    if (btn) {
      if (res.isFollowing) {
        btn.classList.add('following');
        btn.textContent = 'Following';
        showToast('Followed user!', 'success');
      } else {
        btn.classList.remove('following');
        btn.textContent = 'Follow';
        showToast('Unfollowed user', 'info');
      }
    }

    if (followersCountEl) {
      followersCountEl.textContent = res.followersCount;
    }

    Auth.syncCurrentUser();
  } catch (err) {
    showToast('Failed to follow user', 'error');
  }
}

// Followers & Following Modal Popup
function setupFollowListModals(followers = [], following = []) {
  const followersTrigger = document.getElementById('followers-stat-trigger');
  const followingTrigger = document.getElementById('following-stat-trigger');
  const modalBackdrop = document.getElementById('list-modal');
  const modalTitle = document.getElementById('list-modal-title');
  const modalContent = document.getElementById('list-modal-content');
  const closeBtn = document.getElementById('list-modal-close');

  if (followersTrigger) {
    followersTrigger.addEventListener('click', () => {
      openUserListModal('Followers', followers);
    });
  }

  if (followingTrigger) {
    followingTrigger.addEventListener('click', () => {
      openUserListModal('Following', following);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modalBackdrop.classList.remove('active');
    });
  }

  function openUserListModal(title, userList) {
    if (!modalBackdrop) return;
    modalTitle.textContent = title;

    if (!userList || userList.length === 0) {
      modalContent.innerHTML = `<div class="text-muted text-center" style="padding: 1rem;">No ${title.toLowerCase()} yet.</div>`;
    } else {
      modalContent.innerHTML = userList.map(u => `
        <div class="user-suggest-item" style="margin-bottom: 12px;">
          <a href="/profile.html?id=${u._id || u}" class="user-suggest-info">
            <img src="${u.profilePicture || '/uploads/default-avatar.svg'}" class="comment-avatar">
            <div>
              <div style="font-weight: 700; font-size: 0.9rem;">${u.username || 'User'}</div>
            </div>
          </a>
        </div>
      `).join('');
    }

    modalBackdrop.classList.add('active');
  }
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
