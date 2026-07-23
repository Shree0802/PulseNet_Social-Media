/**
 * Single Post View & Full Comment Thread Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();
  await Auth.syncCurrentUser();

  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  if (!postId) {
    window.location.href = '/feed.html';
    return;
  }

  loadSinglePost(postId);
});

async function loadSinglePost(postId) {
  const container = document.getElementById('single-post-container');
  const commentsContainer = document.getElementById('full-comments-list');
  const currentUser = Auth.getUser();

  try {
    const post = await API.get(`/posts/${postId}`);
    const isLiked = post.likes && post.likes.includes(currentUser._id);
    const isOwner = post.userId && (post.userId._id === currentUser._id || post.userId === currentUser._id);
    const authorName = post.userId?.username || 'Unknown User';
    const authorAvatar = post.userId?.profilePicture || '/uploads/default-avatar.svg';

    if (container) {
      container.innerHTML = `
        <div class="glass-card post-card">
          <div class="post-header">
            <a href="/profile.html?id=${post.userId?._id}" class="post-author">
              <img src="${authorAvatar}" class="post-author-img">
              <div>
                <div class="author-username">${authorName}</div>
                <div class="post-time">${timeAgo(post.createdAt)}</div>
              </div>
            </a>
            ${isOwner ? `
              <button class="icon-btn" onclick="deleteSinglePost('${post._id}')" title="Delete Post">
                🗑️
              </button>
            ` : ''}
          </div>

          ${post.caption ? `<div class="post-caption" style="font-size: 1.1rem; line-height: 1.6;">${escapeHTML(post.caption)}</div>` : ''}

          ${post.image ? `
            <div class="post-media" style="margin-top: 1rem;">
              <img src="${post.image}" alt="Post Media" style="max-height: 600px;">
            </div>
          ` : ''}

          <div class="post-actions" style="margin-top: 1.2rem;">
            <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikeSingle('${post._id}')" id="like-btn-${post._id}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="${isLiked ? '#f43f5e' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span id="likes-count-${post._id}">${post.likes ? post.likes.length : 0}</span>
            </button>
            <span class="action-btn">💬 ${post.comments ? post.comments.length : 0} Comments</span>
          </div>
        </div>
      `;
    }

    // Render Full Comments List
    renderCommentsList(post.comments || [], currentUser, post.userId?._id);

    // Setup Add Comment Form
    setupAddCommentForm(postId, currentUser, post.userId?._id);
  } catch (err) {
    showToast('Failed to load post details', 'error');
    console.error(err);
  }
}

function renderCommentsList(comments, currentUser, postOwnerId) {
  const container = document.getElementById('full-comments-list');
  if (!container) return;

  if (comments.length === 0) {
    container.innerHTML = '<div class="text-muted text-center" style="padding: 1.5rem;">No comments yet. Start the conversation!</div>';
    return;
  }

  container.innerHTML = comments.map(c => {
    const isCommentAuthor = c.userId && (c.userId._id === currentUser._id || c.userId === currentUser._id);
    const isPostOwner = postOwnerId === currentUser._id;
    const canDelete = isCommentAuthor || isPostOwner;

    return `
      <div class="comment-item" id="comment-${c._id}" style="margin-bottom: 14px;">
        <img src="${c.userId?.profilePicture || '/uploads/default-avatar.svg'}" class="comment-avatar">
        <div class="comment-bubble" style="padding: 10px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span class="comment-author">${c.userId?.username || 'User'}</span>
            <span class="post-time">${timeAgo(c.createdAt)}</span>
          </div>
          <div>${escapeHTML(c.text)}</div>
        </div>
        ${canDelete ? `
          <button class="comment-delete-btn" onclick="deleteCommentItem('${c._id}')" title="Delete Comment">
            🗑️
          </button>
        ` : ''}
      </div>
    `;
  }).join('');
}

function setupAddCommentForm(postId, currentUser, postOwnerId) {
  const form = document.getElementById('single-comment-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('single-comment-input');
    const text = input.value.trim();
    if (!text) return;

    try {
      const comment = await API.post(`/posts/${postId}/comment`, { text });
      input.value = '';
      showToast('Comment added!', 'success');
      loadSinglePost(postId); // Refresh post and comments
    } catch (err) {
      showToast('Failed to add comment', 'error');
    }
  });
}

async function toggleLikeSingle(postId) {
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

async function deleteSinglePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  try {
    await API.delete(`/posts/${postId}`);
    showToast('Post deleted', 'info');
    setTimeout(() => {
      window.location.href = '/feed.html';
    }, 500);
  } catch (err) {
    showToast('Failed to delete post', 'error');
  }
}

async function deleteCommentItem(commentId) {
  if (!confirm('Delete this comment?')) return;
  try {
    await API.delete(`/comments/${commentId}`);
    const commentEl = document.getElementById(`comment-${commentId}`);
    if (commentEl) commentEl.remove();
    showToast('Comment removed', 'info');
  } catch (err) {
    showToast('Failed to delete comment', 'error');
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
