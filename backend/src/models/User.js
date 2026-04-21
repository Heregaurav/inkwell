const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String, trim: true, maxlength: 60 },
  bio: { type: String, maxlength: 300, default: '' },
  avatar: { type: String, default: '' },
  followedTopics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topic' }],
  followedAuthors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  readerModePrefs: { type: Map, of: String, default: {} },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toPublic = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.email;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
