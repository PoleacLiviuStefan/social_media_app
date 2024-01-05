const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AlbumSchema = new Schema({
    title: String,        // For the album title
    files: [String],      // An array of file names as strings
    code: String,          // Unique code for each album
    views: { type: Number, default: 0 }, // New field for views
    lastViewedAt: { type: Date } // New field to track last view time
});

const UserSchema = new Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    albums: [AlbumSchema] // Using the defined AlbumSchema
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
