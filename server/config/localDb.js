const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const dbFilePath = path.join(__dirname, '../uploads/local_db.json');

const initialData = {
  users: [],
  posts: [],
  comments: [],
  messages: [],
};

function loadData() {
  try {
    if (!fs.existsSync(dbFilePath)) {
      fs.writeFileSync(dbFilePath, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const content = fs.readFileSync(dbFilePath, 'utf8');
    const parsed = JSON.parse(content);
    if (!parsed.messages) parsed.messages = [];
    return parsed;
  } catch (err) {
    return initialData;
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save local DB file', err);
  }
}

function generateObjectId() {
  return new mongoose.Types.ObjectId().toString();
}

const LocalDB = {
  // --- User Operations ---
  async findUser(query) {
    const db = loadData();
    if (query.$or) {
      return db.users.find(u => 
        query.$or.some(cond => {
          if (cond.email && u.email.toLowerCase() === cond.email.toLowerCase()) return true;
          if (cond.username && u.username.toLowerCase() === cond.username.toLowerCase()) return true;
          return false;
        })
      );
    }
    if (query._id) return db.users.find(u => u._id === query._id.toString());
    if (query.email) return db.users.find(u => u.email.toLowerCase() === query.email.toLowerCase());
    if (query.username) return db.users.find(u => u.username.toLowerCase() === query.username.toLowerCase());
    return null;
  },

  async createUser(userData) {
    const db = loadData();
    const newUser = {
      _id: generateObjectId(),
      username: userData.username,
      email: userData.email,
      password: userData.password,
      bio: userData.bio || '',
      profilePicture: userData.profilePicture || '/uploads/default-avatar.svg',
      followers: [],
      following: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveData(db);
    return newUser;
  },

  async updateUser(userId, updateData) {
    const db = loadData();
    const userIndex = db.users.findIndex(u => u._id === userId.toString());
    if (userIndex === -1) return null;

    if (updateData.username) db.users[userIndex].username = updateData.username;
    if (updateData.bio !== undefined) db.users[userIndex].bio = updateData.bio;
    if (updateData.profilePicture) db.users[userIndex].profilePicture = updateData.profilePicture;
    db.users[userIndex].updatedAt = new Date().toISOString();

    saveData(db);
    return db.users[userIndex];
  },

  async searchUsers(queryStr) {
    const db = loadData();
    if (!queryStr) return db.users.slice(0, 20);
    const regex = new RegExp(queryStr, 'i');
    return db.users.filter(u => regex.test(u.username) || regex.test(u.email));
  },

  async followUser(currentUserId, targetUserId) {
    const db = loadData();
    const currentUser = db.users.find(u => u._id === currentUserId.toString());
    const targetUser = db.users.find(u => u._id === targetUserId.toString());

    if (!currentUser || !targetUser) return null;

    if (!currentUser.following) currentUser.following = [];
    if (!targetUser.followers) targetUser.followers = [];

    const isFollowing = currentUser.following.includes(targetUserId.toString());

    if (isFollowing) {
      currentUser.following = currentUser.following.filter(id => id !== targetUserId.toString());
      targetUser.followers = targetUser.followers.filter(id => id !== currentUserId.toString());
    } else {
      currentUser.following.push(targetUserId.toString());
      targetUser.followers.push(currentUserId.toString());
    }

    saveData(db);
    return {
      isFollowing: !isFollowing,
      followersCount: targetUser.followers.length,
      followingCount: currentUser.following.length,
    };
  },

  // --- Post Operations ---
  async getPosts(searchQuery, userId) {
    const db = loadData();
    let posts = [...db.posts];

    if (userId) {
      posts = posts.filter(p => p.userId === userId || (p.userId && p.userId._id === userId));
    }
    if (searchQuery) {
      const regex = new RegExp(searchQuery, 'i');
      posts = posts.filter(p => regex.test(p.caption));
    }

    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return posts.map(post => this.populatePost(post, db));
  },

  populatePost(post, db) {
    const user = db.users.find(u => u._id === (post.userId?._id || post.userId));
    const comments = (db.comments || [])
      .filter(c => c.postId === post._id)
      .map(c => {
        const commentUser = db.users.find(u => u._id === c.userId);
        return {
          ...c,
          userId: commentUser ? { _id: commentUser._id, username: commentUser.username, profilePicture: commentUser.profilePicture } : null
        };
      });

    return {
      ...post,
      userId: user ? { _id: user._id, username: user.username, profilePicture: user.profilePicture, bio: user.bio } : { username: 'User' },
      comments,
    };
  },

  async createPost(postData) {
    const db = loadData();
    const newPost = {
      _id: generateObjectId(),
      userId: postData.userId,
      caption: postData.caption || '',
      image: postData.image || '',
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.posts.push(newPost);
    saveData(db);
    return this.populatePost(newPost, db);
  },

  async toggleLikePost(postId, userId) {
    const db = loadData();
    const post = db.posts.find(p => p._id === postId);
    if (!post) return null;

    if (!post.likes) post.likes = [];
    const isLiked = post.likes.includes(userId.toString());

    if (isLiked) {
      post.likes = post.likes.filter(id => id !== userId.toString());
    } else {
      post.likes.push(userId.toString());
    }

    saveData(db);
    return {
      isLiked: !isLiked,
      likesCount: post.likes.length,
      likes: post.likes,
    };
  },

  // --- Comment Operations ---
  async createComment(commentData) {
    const db = loadData();
    const newComment = {
      _id: generateObjectId(),
      userId: commentData.userId,
      postId: commentData.postId,
      text: commentData.text,
      createdAt: new Date().toISOString(),
    };
    db.comments.push(newComment);

    const post = db.posts.find(p => p._id === commentData.postId);
    if (post) {
      if (!post.comments) post.comments = [];
      post.comments.push(newComment._id);
    }

    saveData(db);
    const user = db.users.find(u => u._id === commentData.userId);
    return {
      ...newComment,
      userId: user ? { _id: user._id, username: user.username, profilePicture: user.profilePicture } : null,
    };
  },

  async deleteComment(commentId) {
    const db = loadData();
    db.comments = db.comments.filter(c => c._id !== commentId);
    db.posts.forEach(p => {
      if (p.comments) p.comments = p.comments.filter(cId => cId !== commentId);
    });
    saveData(db);
    return true;
  },

  // --- Direct Message Operations ---
  async sendMessage(senderId, receiverId, text) {
    const db = loadData();
    const newMessage = {
      _id: generateObjectId(),
      senderId: senderId.toString(),
      receiverId: receiverId.toString(),
      text,
      createdAt: new Date().toISOString(),
    };
    if (!db.messages) db.messages = [];
    db.messages.push(newMessage);
    saveData(db);
    return newMessage;
  },

  async getMessages(user1, user2) {
    const db = loadData();
    const messages = (db.messages || []).filter(
      m =>
        (m.senderId === user1.toString() && m.receiverId === user2.toString()) ||
        (m.senderId === user2.toString() && m.receiverId === user1.toString())
    );
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return messages;
  },

  async getConversations(userId) {
    const db = loadData();
    const uId = userId.toString();
    const partnerIds = new Set();

    (db.messages || []).forEach(m => {
      if (m.senderId === uId) partnerIds.add(m.receiverId);
      if (m.receiverId === uId) partnerIds.add(m.senderId);
    });

    const currentUser = db.users.find(u => u._id === uId);
    if (currentUser) {
      (currentUser.followers || []).forEach(fId => partnerIds.add(fId.toString()));
      (currentUser.following || []).forEach(fId => partnerIds.add(fId.toString()));
    }

    const conversations = [];
    for (const partnerId of partnerIds) {
      const partnerUser = db.users.find(u => u._id === partnerId);
      if (!partnerUser) continue;

      const chatMsgs = (db.messages || []).filter(
        m =>
          (m.senderId === uId && m.receiverId === partnerId) ||
          (m.senderId === partnerId && m.receiverId === uId)
      );
      chatMsgs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const lastMessage = chatMsgs[0] || null;

      conversations.push({
        user: {
          _id: partnerUser._id,
          username: partnerUser.username,
          profilePicture: partnerUser.profilePicture,
        },
        lastMessage,
      });
    }

    conversations.sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(0);
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(0);
      return dateB - dateA;
    });

    return conversations;
  }
};

module.exports = LocalDB;
