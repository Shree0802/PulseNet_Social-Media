/**
 * Direct Messaging Chat Controller
 */

let activePartnerId = null;
let pollInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();
  await Auth.syncCurrentUser();

  const urlParams = new URLSearchParams(window.location.search);
  const targetUserParam = urlParams.get('user');

  await loadConversations(targetUserParam);

  setupMessageForm();
});

// Load Sidebar Conversations List
async function loadConversations(autoSelectId = null) {
  const container = document.getElementById('conversations-list');
  if (!container) return;

  try {
    const conversations = await API.get('/messages/conversations');
    const currentUser = Auth.getUser();

    if (!conversations || conversations.length === 0) {
      container.innerHTML = `
        <div class="text-muted text-center" style="padding: 1.5rem; font-size: 0.9rem;">
          No active chats yet.<br>Follow people to start messaging!
        </div>
      `;
      return;
    }

    container.innerHTML = conversations.map(conv => {
      const partner = conv.user;
      const lastMsg = conv.lastMessage;
      const isSelected = activePartnerId === partner._id;

      return `
        <div class="chat-conv-item ${isSelected ? 'active' : ''}" id="conv-${partner._id}" onclick="selectConversation('${partner._id}')">
          <img src="${partner.profilePicture || '/uploads/default-avatar.svg'}" class="chat-conv-avatar" alt="${partner.username}">
          <div class="chat-conv-info">
            <div class="chat-conv-name">${partner.username}</div>
            <div class="chat-conv-preview">${lastMsg ? escapeHTML(lastMsg.text) : 'Start a conversation'}</div>
          </div>
        </div>
      `;
    }).join('');

    // Auto-select conversation if provided in URL or pick first available conversation
    const toSelect = autoSelectId || (conversations[0] ? conversations[0].user._id : null);
    if (toSelect && (!activePartnerId || autoSelectId)) {
      selectConversation(toSelect);
    }
  } catch (err) {
    console.error('Failed to load conversations', err);
  }
}

// Select a Chat Partner
async function selectConversation(partnerId) {
  if (!partnerId) return;
  activePartnerId = partnerId;

  // Highlight active conversation in sidebar
  document.querySelectorAll('.chat-conv-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.getElementById(`conv-${partnerId}`);
  if (activeItem) activeItem.classList.add('active');

  // Load chat header details & messages
  try {
    const partner = await API.get(`/users/${partnerId}`);

    const headerAvatar = document.getElementById('chat-header-avatar');
    const headerName = document.getElementById('chat-header-name');

    if (headerAvatar) headerAvatar.src = partner.user?.profilePicture || '/uploads/default-avatar.svg';
    if (headerName) headerName.textContent = partner.user?.username || 'Chat';

    await loadChatMessages(partnerId);

    // Start auto polling for live messages
    clearInterval(pollInterval);
    pollInterval = setInterval(() => {
      loadChatMessages(partnerId, true);
    }, 3000);
  } catch (err) {
    console.error('Error selecting conversation:', err);
  }
}

// Load Chat Thread Messages
async function loadChatMessages(partnerId, isSilent = false) {
  const threadContainer = document.getElementById('chat-thread-container');
  if (!threadContainer) return;

  const currentUser = Auth.getUser();

  try {
    const messages = await API.get(`/messages/${partnerId}`);

    if (messages.length === 0) {
      threadContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <h3>Say hello!</h3>
          <p>Send a message to start chatting.</p>
        </div>
      `;
      return;
    }

    const html = messages.map(msg => {
      const isMine = msg.senderId === currentUser._id;
      return `
        <div class="chat-bubble-row ${isMine ? 'mine' : 'theirs'}">
          <div class="chat-bubble">
            <div>${escapeHTML(msg.text)}</div>
            <div class="chat-time">${timeAgo(msg.createdAt)}</div>
          </div>
        </div>
      `;
    }).join('');

    // Save scroll position or scroll to bottom
    const isAtBottom = threadContainer.scrollHeight - threadContainer.scrollTop <= threadContainer.clientHeight + 100;
    threadContainer.innerHTML = html;

    if (!isSilent || isAtBottom) {
      threadContainer.scrollTop = threadContainer.scrollHeight;
    }
  } catch (err) {
    if (!isSilent) showToast('Failed to load chat thread', 'error');
  }
}

// Setup Send Message Form
function setupMessageForm() {
  const form = document.getElementById('chat-message-form');
  const input = document.getElementById('chat-message-input');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activePartnerId) {
        showToast('Please select a user from the left sidebar first', 'info');
        return;
      }

      const text = input.value.trim();
      if (!text) return;

      input.value = '';

      try {
        await API.post('/messages', {
          receiverId: activePartnerId,
          text,
        });

        // Instant refresh messages & conversation preview
        await loadChatMessages(activePartnerId);
        loadConversations();
      } catch (err) {
        showToast('Failed to send message', 'error');
      }
    });
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
