const { v4: uuidv4 } = require('uuid');
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const multer = require('multer');
dotenv.config();

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = process.env.JWT_SECRET || "defaultSecret";

const test = (req, res) => {
    res.send("Test endpoint working");
}

const register = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userDoc = await User.create({
            name,
            email,
            password: bcrypt.hashSync(password, bcryptSalt),
            albums: []
        });
        res.json(userDoc);
    } catch (e) {
        res.status(422).json({ error: "Registration failed", details: e.message });
    }
}

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const userDoc = await User.findOne({ email });
        if (!userDoc) {
            return res.status(404).json({ error: "User not found" });
        }
        const passOk = bcrypt.compareSync(password, userDoc.password);
        if (passOk) {
            jwt.sign({ email: userDoc.email, id: userDoc._id }, jwtSecret, {}, (err, token) => {
                if (err) {
                    return res.status(500).json({ error: "JWT generation failed" });
                }
                res.cookie('token', token).json('Login successful');
            });
        } else {
            res.status(401).json({ error: "Password not correct" });
        }
    } catch (e) {
        res.status(500).json({ error: "Login failed", details: e.message });
    }
}

const profile = (req, res) => {
    const { token } = req.cookies;
    if (token) {
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
            if (err) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            try {
                const { name, email, _id } = await User.findById(userData.id);
                res.json({ name, email, _id });
            } catch (e) {
                res.status(500).json({ error: "Profile retrieval failed", details: e.message });
            }
        });
    } else {
        res.status(401).json({ error: "No token provided" });
    }
}

const logout = (req, res) => {
    res.clearCookie('token').json('Logout successful');
}

const upload = (req, res) => {
    const uploadedFiles = req.files.map(file => file.filename);

    const albumTitle = req.body.albumTitle;

    const { token } = req.cookies;
    if (token) {
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
            if (err) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            try {
                const user = await User.findById(userData.id);
                if (!user) {
                    return res.status(404).json({ error: "User not found" });
                }

                const albumCode = uuidv4();
                const album = {
                    title: albumTitle,
                    files: uploadedFiles,
                    code: albumCode
                };

                const currentAlbums = Array.isArray(user.albums) ? user.albums : [];
                const updatedAlbums = [...currentAlbums, album];

                await User.findByIdAndUpdate(userData.id, { $set: { albums: updatedAlbums } });

                res.status(200).json({ message: "Album updated successfully", albumCode });
            } catch (e) {
                res.status(500).json({ error: "Profile update failed", details: e.message });
            }
        });
    } else {
        res.status(401).json({ error: "No token provided" });
    }
};

const getMedia = (req, res) => {
    const { token } = req.cookies;
    if (token) {
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
            if (err) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            try {
                const user = await User.findById(userData.id).select('albums');
                if (!user) {
                    return res.status(404).json({ error: "User not found" });
                }
                res.status(200).json({ albums: user.albums });
            } catch (e) {
                res.status(500).json({ error: "Failed to retrieve albums", details: e.message });
            }
        });
    } else {
        res.status(401).json({ error: "No token provided" });
    }
};

const getMediaAll = async (req, res) => {
    try {
        const users = await User.find({}).select('albums name');
        const allAlbums = users.reduce((acc, user) => {
            const userAlbums = user.albums.map(album => ({ ...album._doc, userName: user.name }));
            acc.push(...userAlbums);
            return acc;
        }, []);
        res.status(200).json({ albums: allAlbums });
    } catch (e) {
        res.status(500).json({ error: "Failed to retrieve albums", details: e.message });
    }
};

const getAlbumByCode = async (req, res) => {
  const { albumCode } = req.params;
  try {
      // Fetch the user document that contains the album with the given code
      const user = await User.findOne({ 'albums.code': albumCode }, { 'albums.$': 1, 'name': 1 });
      if (user && user.albums.length > 0) {
          // Include the userName in the response along with the album data
          res.json({ userName: user.name, ...user.albums[0] });
      } else {
          res.status(404).json({ error: "Album not found" });
      }
  } catch (e) {
      res.status(500).json({ error: "Failed to retrieve album", details: e.message });
  }
};


const searchAlbums = async (req, res) => {
  const { query } = req.query;
  try {
      const users = await User.find({ 
          "albums.title": { $regex: query, $options: "i" } 
      }, { "albums.$": 1 });
      const matchingAlbums = users.map(user => user.albums).flat();
      res.status(200).json({ albums: matchingAlbums });
  } catch (e) {
      res.status(500).json({ error: "Search failed", details: e.message });
  }
};


module.exports = {
    register,
    login,
    profile,
    logout,
    upload,
    getMedia,
    getMediaAll,
    getAlbumByCode,
    searchAlbums,
    test
};
