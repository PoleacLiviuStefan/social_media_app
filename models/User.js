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
    albums: [AlbumSchema],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likedAlbums: [{ type: String }],
    notifications: [NotificationSchema]
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
