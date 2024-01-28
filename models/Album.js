// models/Album.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const CommentSchema = new Schema({
    user: String, // Consider using user reference if you have user IDs
    text: String, // The actual comment text
    commentDate: { type: Date, default: Date.now } // Auto-set the date of the comment
}); 

const MediaScheme = new Schema({
    name: String,
    code: String,
    likes: Number,
    likesByUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

const AlbumSchema = new Schema({
    title: String,            
    code: String,
    originalOwnerName: { type: String, default: null }, // Username of the original owner    
    originalOwnerImage: { type: String, default: null },
    content: [MediaScheme],
    views: { type: Number, default: 0 },
    lastViewedAt: { type: Date },
    likes: { type: Number, default: 0 },
    likesByUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Track which users liked the album
    saves: { type: Number, default: 0 },
    savesByUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Track which users liked the album
    reposts: { type: Number, default: 0 },
    repostsByUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    shares: { type: Number, default: 0 },
    isReposted: {type: Boolean, default: false},
    hideComments: { type: Boolean, default: false }, // Indicates if all comments should be hidden
    comments: [CommentSchema] // Array of CommentSchema documents

});

const Album = mongoose.model('Album', AlbumSchema);
module.exports = Album;
