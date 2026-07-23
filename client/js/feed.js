/**
 * Feed & Social Interaction Engine
 */

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();
  await Auth.syncCurrentUser();

  const currentUser = Auth.getUser();
  renderSidebarProfile(currentUser);

  // Initialize Feed Data
  loadFeed();
  loadSuggestedUsers();

  // Setup Create Post Listener & Preview
  setupCreatePostForm(currentUser);
  setupSearchInput();
});

// Render Left Sidebar Profile Info
function renderSidebarProfile(user) {
  if (!user) return;
  const avatar = document.getElementById('sidebar-user-avatar');
  const name = document.getElementById('sidebar-user-name');
  const username = document.getElementById('sidebar-user-username');
  const followers = document.getElementById('sidebar-followers-count');
  const following = document.getElementById('sidebar-following-count');

  if (avatar) avatar.src = user.profilePicture || '/uploads/default-avatar.svg';
  if (name) name.textContent = user.username;
  if (username) username.textContent = `@${user.username}`;
  if (followers) followers.textContent = user.followers ? user.followers.length : 0;
  if (following) following.textContent = user.following ? user.following.length : 0;
}

// Load Posts Feed Stream
async function loadFeed(searchQuery = '') {
  const feedContainer = document.getElementById('feed-posts-container');
  if (!feedContainer) return;

  // Show Skeleton Loaders
  feedContainer.innerHTML = getSkeletonHTML();

  try {
    const endpoint = searchQuery ? `/posts?search=${encodeURIComponent(searchQuery)}` : '/posts';
    const data = await API.get(endpoint);
    const posts = data.posts || [];
    const currentUser = Auth.getUser();

    if (posts.length === 0) {
      feedContainer.innerHTML = `
        <div class="glass-card empty-state">
          <div class="empty-state-icon">📷</div>
          <h3>No posts found</h3>
          <p>${searchQuery ? 'Try another search query' : 'Be the first to share something with the community!'}</p>
        </div>
      `;
      return;
    }

    feedContainer.innerHTML = posts.map(post => renderPostCard(post, currentUser)).join('');
  } catch (err) {
    showToast('Failed to load feed posts', 'error');
    console.error(err);
  }
}

// Render Single Post HTML Card
function renderPostCard(post, currentUser) {
  const isLiked = post.likes && post.likes.includes(currentUser._id);
  const isOwner = post.userId && (post.userId._id === currentUser._id || post.userId === currentUser._id);
  const authorName = post.userId?.username || 'Unknown';
  const authorAvatar = post.userId?.profilePicture || '/uploads/default-avatar.svg';
  const authorId = post.userId?._id || post.userId;

  return `
    <div class="glass-card post-card" id="post-${post._id}">
      <div class="post-header">
        <a href="/profile.html?id=${authorId}" class="post-author">
          <img src="${authorAvatar}" class="post-author-img" alt="${authorName}">
          <div>
            <div class="author-username">${authorName}</div>
            <div class="post-time">${timeAgo(post.createdAt)}</div>
          </div>
        </a>
        ${isOwner ? `
          <button class="icon-btn" onclick="deletePost('${post._id}')" title="Delete Post">
            🗑️
          </button>
        ` : ''}
      </div>

      ${post.caption ? `<div class="post-caption">${escapeHTML(post.caption)}</div>` : ''}

      ${post.image ? `
        <div class="post-media">
          <img src="${post.image}" alt="Post Media" loading="lazy">
        </div>
      ` : ''}

      <div class="post-actions">
        <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post._id}')" id="like-btn-${post._id}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="${isLiked ? '#f43f5e' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span id="likes-count-${post._id}">${post.likes ? post.likes.length : 0}</span>
        </button>

        <a href="/post.html?id=${post._id}" class="action-btn">
          💬 <span>${post.comments ? post.comments.length : 0}</span>
        </a>
      </div>

      <!-- Quick Inline Comment Box -->
      <div class="post-comments-section">
        <div id="comments-list-${post._id}">
          ${(post.comments || []).slice(0, 2).map(c => `
            <div class="comment-item">
              <img src="${c.userId?.profilePicture || '/uploads/default-avatar.svg'}" class="comment-avatar">
              <div class="comment-bubble">
                <span class="comment-author">${c.userId?.username || 'User'}</span>
                <span>${escapeHTML(c.text)}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <form class="add-comment-form" onsubmit="handleInlineComment(event, '${post._id}')">
          <input type="text" class="form-control" placeholder="Write a comment..." id="comment-input-${post._id}" required>
          <button type="submit" class="btn-primary" style="padding: 6px 14px; font-size: 0.85rem;">Post</button>
        </form>
      </div>
    </div>
  `;
}

// Handle Like Toggle
async function toggleLike(postId) {
  try {
    const res = await API.post(`/posts/${postId}/like`);
    const countEl = document.getElementById(`likes-count-${postId}`);
    const btnEl = document.getElementById(`like-btn-${postId}`);

    if (countEl) countEl.textContent = res.likesCount;
    if (btnEl) {
      if (res.isLiked) {
        btnEl.classList.add('liked');
        btnEl.querySelector('svg').setAttribute('fill', '#f43f5e');
      } else {
        btnEl.classList.remove('liked');
        btnEl.querySelector('svg').setAttribute('fill', 'none');
      }
    }
  } catch (err) {
    showToast('Failed to toggle like', 'error');
  }
}

// Handle Inline Comment
async function handleInlineComment(event, postId) {
  event.preventDefault();
  const input = document.getElementById(`comment-input-${postId}`);
  const text = input.value.trim();
  if (!text) return;

  try {
    const comment = await API.post(`/posts/${postId}/comment`, { text });
    input.value = '';
    
    const listEl = document.getElementById(`comments-list-${postId}`);
    if (listEl) {
      const newCommentHTML = `
        <div class="comment-item" style="animation: fadeIn 0.3s ease;">
          <img src="${comment.userId?.profilePicture || '/uploads/default-avatar.svg'}" class="comment-avatar">
          <div class="comment-bubble">
            <span class="comment-author">${comment.userId?.username}</span>
            <span>${escapeHTML(comment.text)}</span>
          </div>
        </div>
      `;
      listEl.insertAdjacentHTML('afterbegin', newCommentHTML);
    }
    showToast('Comment added!', 'success');
  } catch (err) {
    showToast('Failed to add comment', 'error');
  }
}

// Handle Delete Post
async function deletePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  try {
    await API.delete(`/posts/${postId}`);
    const postCard = document.getElementById(`post-${postId}`);
    if (postCard) {
      postCard.style.opacity = '0';
      postCard.style.transform = 'scale(0.9)';
      postCard.style.transition = 'all 0.3s ease';
      setTimeout(() => postCard.remove(), 300);
    }
    showToast('Post deleted', 'info');
  } catch (err) {
    showToast('Failed to delete post', 'error');
  }
}

// Setup Create Post Form & Image Preview
function setupCreatePostForm(currentUser) {
  const form = document.getElementById('create-post-form');
  const fileInput = document.getElementById('post-image-input');
  const previewContainer = document.getElementById('image-preview-container');
  const previewImage = document.getElementById('image-preview');
  const removeBtn = document.getElementById('remove-img-btn');
  const avatar = document.getElementById('create-post-avatar');

  if (avatar && currentUser) {
    avatar.src = currentUser.profilePicture || '/uploads/default-avatar.svg';
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          previewImage.src = event.target.result;
          previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      fileInput.value = '';
      previewContainer.style.display = 'none';
      previewImage.src = '';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const caption = document.getElementById('post-caption-input').value.trim();
      const file = fileInput ? fileInput.files[0] : null;

      if (!caption && !file) {
        showToast('Please enter a caption or upload an image', 'error');
        return;
      }

      const formData = new FormData();
      if (caption) formData.append('caption', caption);
      if (file) formData.append('image', file);

      try {
        const newPost = await API.postFormData('/posts', formData);
        document.getElementById('post-caption-input').value = '';
        if (fileInput) fileInput.value = '';
        if (previewContainer) previewContainer.style.display = 'none';

        const feedContainer = document.getElementById('feed-posts-container');
        if (feedContainer) {
          const newPostCard = renderPostCard(newPost, currentUser);
          feedContainer.insertAdjacentHTML('afterbegin', newPostCard);
        }

        showToast('Post published successfully!', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to publish post', 'error');
      }
    });
  }
}

// Load Suggested Users for Right Sidebar
async function loadSuggestedUsers() {
  const container = document.getElementById('suggested-users-container');
  if (!container) return;

  try {
    const users = await API.get('/users');
    const currentUser = Auth.getUser();

    const suggested = users.filter(u => u._id !== currentUser._id).slice(0, 5);

    if (suggested.length === 0) {
      container.innerHTML = '<div class="text-muted" style="font-size: 0.85rem;">No new suggestions</div>';
      return;
    }

    container.innerHTML = suggested.map(u => {
      const isFollowing = u.followers && u.followers.includes(currentUser._id);
      return `
        <div class="user-suggest-item">
          <a href="/profile.html?id=${u._id}" class="user-suggest-info">
            <img src="${u.profilePicture || '/uploads/default-avatar.svg'}" class="comment-avatar" alt="${u.username}">
            <div>
              <div style="font-weight: 700; font-size: 0.88rem;">${u.username}</div>
              <div class="post-time">${u.email}</div>
            </div>
          </a>
          <button class="btn-follow ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${u._id}', this)">
            ${isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load suggested users', err);
  }
}

// Toggle Follow Action
async function toggleFollow(targetUserId, buttonEl) {
  try {
    const res = await API.post(`/users/${targetUserId}/follow`);
    if (res.isFollowing) {
      buttonEl.classList.add('following');
      buttonEl.textContent = 'Following';
      showToast('User followed!', 'success');
    } else {
      buttonEl.classList.remove('following');
      buttonEl.textContent = 'Follow';
      showToast('Unfollowed user', 'info');
    }
    // Update local user session followers/following count
    Auth.syncCurrentUser();
  } catch (err) {
    showToast('Failed to follow user', 'error');
  }
}

// Search Input Listener
function setupSearchInput() {
  const searchInput = document.getElementById('nav-search-input');
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        loadFeed(e.target.value.trim());
      }, 400);
    });
  }
}

// Helper: Skeleton Loader HTML
function getSkeletonHTML() {
  return Array(3).fill(0).map(() => `
    <div class="glass-card post-card">
      <div class="post-header">
        <div style="display: flex; gap: 12px; align-items: center;">
          <div class="skeleton" style="width: 46px; height: 46px; border-radius: 50%;"></div>
          <div>
            <div class="skeleton" style="width: 120px; height: 16px; margin-bottom: 6px;"></div>
            <div class="skeleton" style="width: 60px; height: 12px;"></div>
          </div>
        </div>
      </div>
      <div class="skeleton" style="width: 100%; height: 200px; margin: 12px 0;"></div>
    </div>
  `).join('');
}

// Helper: Escape HTML string to prevent XSS
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
