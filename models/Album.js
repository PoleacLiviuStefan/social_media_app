// models/Album.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
    user: String, // Consider using user reference if you have user IDs
    text: String, // The actual comment text
    commentDate: { type: Date, default: Date.now } // Auto-set the date of the comment
});

const AlbumSchema = new Schema({
    title: String,        
    files: [String],      
    code: String,
    originalOwnerName: { type: String, default: null }, // Username of the original owner    
    views: { type: Number, default: 0 },
    lastViewedAt: { type: Date },
    likes: { type: Number, default: 0 },
    likesByUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Track which users liked the album
    saves: { type: Number, default: 0 },
    savesByUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Track which users liked the album
    reposts: { type: Number, default: 0 },
    repostsByUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    shares: { type: Number, default: 0 },
    hideComments: { type: Boolean, default: false }, // Indicates if all comments should be hidden
    comments: [CommentSchema] // Array of CommentSchema documents

});

const Album = mongoose.model('Album', AlbumSchema);
module.exports = Album;
