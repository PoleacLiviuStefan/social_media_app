// models/User.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


// Import the Album schema
const AlbumSchema = require('./Album').schema;

const NotificationSchema = new mongoose.Schema({
    type: String, // e.g., 'comment'
    message: String, // e.g., 'John commented on Album XYZ'
    albumCode: String, // Reference to the album
    createdAt: { type: Date, default: Date.now } // Timestamp of the notification
});

const UserSchema = new Schema({
    name: {type: String, unique: true},
    email: { type: String, unique: true },
    bio: {type: String, default: ""},
    password: String,
    image: { type: String, default: null },
    isPrivate: {type: Boolean, default: false},
    isCommentDisabled: {type: Boolean, default: false},
    isDownloadDisabled:{type: Boolean, default: false},
    googleId: { type: String, unique: true, sparse: true }, // Unique Google ID for Google OAuth
    redditId: { type: String, unique: true, sparse: true }, // Unique Reddit ID for Reddit OAuth
    twitterId: { type: String, unique: true, sparse: true }, // Unique Twitter ID for Reddit OAuth
    albums: [AlbumSchema],
    repostedAlbums: [AlbumSchema],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likedAlbums: [{ type: String }],
    savedAlbums: [{type: String}],
    notifications: [NotificationSchema]
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
