const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Album = require("../models/Album");
const multer = require("multer");
const nodemailer = require("nodemailer");
const passport = require("passport");
const mongoose = require('mongoose'); // Add this line

dotenv.config();

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = process.env.JWT_SECRET || "defaultSecret";

const serverURL = "https://blisio-backend-d30f62efe387.herokuapp.com/";

const test = (req, res) => {
  res.send("Test endpoint working");
};

const register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userDoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
      albums: [],
    });
    res.json(userDoc);
  } catch (e) {
    res.status(422).json({ error: "Registration failed", details: e.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const userDoc = await User.findOne({ email });
    if (!userDoc) {
      return res.status(404).json({ error: "User not found" });
    }
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      jwt.sign(
        { email: userDoc.email, id: userDoc._id },
        jwtSecret,
        {},
        (err, token) => {
          if (err) {  
            return res.status(500).json({ error: "JWT generation failed" });
          }
          console.log(token);
          res
            .cookie("token", token, {
              httpOnly: false,
              maxAge: 3600000 * 5,
              secure: true,
              sameSite: "none",
            })
            .json("Login successful");
        }
      );
    } else {
      res.status(401).json({ error: "Password not correct" });
    }
  } catch (e) {
    res.status(500).json({ error: "Login failed", details: e.message });
  }
};

const getGoogle = (req, res, next) => {
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
};


const handleGoogleCallback = (req, res) => {
  // Successful authentication
  res.redirect(`${serverURL}/api/login/success`);
};

const getReddit = (req, res, next) => {
  passport.authenticate('reddit', {
    state: 'someRandomString', // Reddit requires a 'state' parameter for CSRF protection
    duration: 'permanent', // or 'temporary' depending on your needs
  })(req, res, next);
};

const handleRedditCallback = (req, res) => {
  // Successful authentication
  res.redirect(`${serverURL}/api/login/success`);
};

const getTwitter = (req, res, next) => {
  passport.authenticate('twitter')(req, res, next);
};


const handleTwitterCallback = (req, res) => {
  // Successful authentication
  res.redirect(`${serverURL}/api/login/success`);
};


const loginSuccess = (req, res) => {
  if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
  }

  jwt.sign(
      { email: req.user.email, id: req.user._id },
      jwtSecret,
      {},
      (err, token) => {
          if (err) {
              return res.status(500).json({ error: "JWT generation failed" });
          }

          // Set the JWT as a cookie
          res.cookie('token', token, {
              httpOnly: false,
              maxAge: 3600000 * 5,
              secure: true,
              sameSite: 'none'
          });

          // Redirect to the desired URL
          res.redirect("https://thler.com/explore");
      }
  );
};



const loginFailed = (req,res)=>{
  res.status(401).json({message:"Log In failure"});
}



const forgotPassword = (req, res) => {
  const { email } = req.body;

  User.findOne({ email: email }).then((user) => {
    if (!user) {
      return res.send({ Status: "User not existed" });
    }

    const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: "1d" });
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "stefan.liviu286@gmail.com",
        pass: "vupb ifns blyw byzt",
      },
    });

    var mailOptions = {
      from: "stefan.liviu286@gmail.com",
      to: "quequeg.liviu@gmail.com",
      subject: "Reset your password",
      text: `https://thler.com/reset-password/${user._id}/${token}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        return res.send({ Status: "Succes" });
      }
    });
  });
};

const resetPassword = (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.json({ Status: "Error with token" });
    } else {
      bcrypt
        .hash(password, bcryptSalt)
        .then((hash) => {
          User.findByIdAndUpdate({ _id: id }, { password: hash })
            .then((u) => res.send({ Status: "Success" }))
            .catch((err) => res.send({ Status: err }));
        })
        .catch((err) => console.log({ Statu: err }));
    }
  });
};

const sendEmailChange = (req, res) => {
  const { email } = req.body;
    console.log(email);
  User.findOne({ email: email }).then((user) => {
    if (!user) {
      return res.send({ Status: "User not existed" });
    }

    const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: "1d" });
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "stefan.liviu286@gmail.com",
        pass: "vupb ifns blyw byzt",
      },
    });

    var mailOptions = {
      from: "stefan.liviu286@gmail.com",
      to: "quequeg.liviu@gmail.com",
      subject: "Reset your password",
      text: `http://thler.com/reset-email/${user._id}/${token}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        return res.send({ Status: "Succes" });
      }
    });
  });
};

const changeEmail = (req, res) => {
  const { id, token } = req.params;
  const { email } = req.body;

  User.findByIdAndUpdate({ _id: id }, { email: email });
};

const togglePrivacy = async (req, res) => {
  const { token } = req.cookies; // Get the token from cookies

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // Verify the token to get the user's ID
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Toggle the isPrivate field
    user.isPrivate = !user.isPrivate;

    // Save the updated user
    await user.save();

    res.json({ message: "Privacy setting updated", isPrivate: user.isPrivate });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res.status(500).json({ error: "Failed to update privacy setting", details: error.message });
    }
  }
};


const profile = (req, res) => {
  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      try {
        const user = await User.findById(userData.id).select("name email bio");
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        // Destructure the fields you need from the user object
        const { name, email, bio } = user;
        res.json({ name, email, bio });
      } catch (e) {
        res
          .status(500)
          .json({ error: "Profile retrieval failed", details: e.message });
      }
    });
  } else {
    res.status(401).json({ error: "No token provided" });
  }
};

const getCurrentUserInfo = async (req, res) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    const user = await User.findById(userId).select("email bio name image");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ email: user.email, bio: user.bio, name: user.name, image: user.image });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res
      .status(500)
      .json({ error: "Failed to retrieve user info", details: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  const { newUsername, newBio } = req.body;
  const { token } = req.cookies;

  console.log("Received data:", req.body);

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    console.log("UserID from token:", userId);

    // Check if the new username is taken by another user, only if newUsername is provided
    if (newUsername) {
      const existingUser = await User.findOne({
        name: newUsername,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }

    const updateData = {};
    if (newUsername) updateData.name = newUsername;
    if (newBio) updateData.bio = newBio;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res
      .status(500)
      .json({ error: "Failed to update profile", details: error.message });
  }
};

const updateUserPassword = async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const { token } = req.cookies; // Assuming token is stored in cookies

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  try {
    // Decode the token to get the user ID
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    // Hash the new password

    const hashedPassword = bcrypt.hashSync(newPassword, bcryptSalt);

    // Update the user's password
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res
      .status(500)
      .json({ error: "Failed to update password", details: error.message });
  }
};

const removeProfileImage= async (req,res) => {
  const { token } = req.cookies; // Assuming the token is stored in cookies

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // Verify the token and extract user ID
    const decoded = jwt.verify(token, jwtSecret);
    const currentUserId = decoded.id;

    // Update the user's image to null
    const result = await User.updateOne(
      { _id: currentUserId },
      { $set: { image: null } }
    );

    if (result.nModified > 0) {
      res.json({ message: "Profile image removed successfully" });
    } else {
      res.status(404).json({ error: "User not found or image already removed" });
    }
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res.status(500).json({ error: "Failed to remove profile image", details: e.message });
    }
  }
};

const uploadProfileImage = async (req, res) => {
  const { token } = req.cookies; // Assuming the token is stored in cookies

  if (!token) {
      return res.status(401).json({ error: "No token provided" });
  }

  try {
      // Verify the token and extract user ID
      const decoded = jwt.verify(token, jwtSecret);
      const currentUserId = decoded.id;

      // Check if a file is uploaded
      if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
      }

      // Use the filename generated by Multer
      const multerFilename = req.file.filename;

      // Update the user's image with the Multer filename
      const result = await User.updateOne(
          { _id: currentUserId },
          { $set: { image: multerFilename } }
      );

      if (result.modifiedCount > 0) {
          res.json({ message: "Profile image updated successfully", filename: multerFilename });
      } else {
          res.status(404).json({ error: "User not found or image not updated" });
      }
  } catch (e) {
      if (e instanceof jwt.JsonWebTokenError) {
          res.status(401).json({ error: "Invalid token" });
      } else {
          res.status(500).json({ error: "Failed to upload profile image", details: e.message });
      }
  }
};



const logout = (req, res) => {
  res
    .clearCookie("token", {
      httpOnly: true,
      maxAge: 3600000 * 5,
      secure: true,
      sameSite: "none",
    })
    .json("Logout successful");
};

const upload = (req, res) => {
  const uploadedFiles = req.files.map((file) => file.filename);

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
          code: albumCode,
          views: 0, // Automatically handled by Mongoose default value
        };

        const currentAlbums = Array.isArray(user.albums) ? user.albums : [];
        const updatedAlbums = [...currentAlbums, album];

        await User.findByIdAndUpdate(userData.id, {
          $set: { albums: updatedAlbums },
        });

        res
          .status(200)
          .json({ message: "Album updated successfully", albumCode });
      } catch (e) {
        res
          .status(500)
          .json({ error: "Profile update failed", details: e.message });
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
              const user = await User.findById(userData.id).select("albums repostedAlbums");
              if (!user) {
                  return res.status(404).json({ error: "User not found" });
              }
              res.status(200).json({ 
                  albums: user.albums, 
                  repostedAlbums: user.repostedAlbums 
              });
          } catch (e) {
              res
                  .status(500)
                  .json({ error: "Failed to retrieve albums", details: e.message });
          }
      });
  } else {
      res.status(401).json({ error: "No token provided" });
  }
};


const getMediaByUserName = async (req, res) => {
  const { username } = req.params; // Get the username from URL parameters

  try {
      // Find the user by username and retrieve their albums and reposted albums
      const user = await User.findOne({ name: username }).select("albums repostedAlbums");

      if (!user) {
          return res.status(404).json({ error: "User not found" });
      }

      // Sending the albums and reposted albums to the client
      res.status(200).json({ 
          albums: user.albums, 
          repostedAlbums: user.repostedAlbums 
      });
  } catch (e) {
      res
          .status(500)
          .json({ error: "Failed to retrieve albums", details: e.message });
  }
};


const getLikedAlbums = async (req, res) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    const currentUser = await User.findById(userId);
    if (
      !currentUser ||
      !currentUser.likedAlbums ||
      currentUser.likedAlbums.length === 0
    ) {
      return res.status(404).json({ error: "User has no liked albums" });
    }

    console.log("Liked Albums Codes:", currentUser.likedAlbums);

    // Search all users' albums to find matches
    const usersWithLikedAlbums = await User.find(
      {
        "albums.code": { $in: currentUser.likedAlbums },
      },
      "name albums"
    );

    let likedAlbums = [];
    usersWithLikedAlbums.forEach((user) => {
      user.albums.forEach((album) => {
        if (currentUser.likedAlbums.includes(album.code)) {
          const images = album.files.filter(
            (file) =>
              file.endsWith(".png") ||
              file.endsWith(".jpg") ||
              file.endsWith(".jpeg")
          );
          const videos = album.files.filter((file) => file.endsWith(".mp4"));
          likedAlbums.push({
            code: album.code,
            thumbnail: [...images, ...videos],
            userName: user.name,
            videoTitle: album.title,
            viewsNumber: album.views,
            videosNumber: videos.length,
            photosNumber: images.length,
          });
        }
      });
    });

    res.json(likedAlbums);
  } catch (error) {
    console.error("Error in getLikedAlbums:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res
      .status(500)
      .json({
        error: "Failed to retrieve liked albums",
        details: error.message,
      });
  }
};

const getMediaAll = async (req, res) => {
  try {
    // Include 'image' in the selected fields
    const users = await User.find({}).select("albums name image");
    const allAlbums = users.reduce((acc, user) => {
      const userAlbums = user.albums.map((album) => ({
        ...album._doc,
        userName: user.name,
        userImage: user.image  // Use 'userImage' to avoid confusion with any 'image' field in the album
      }));
      acc.push(...userAlbums);
      return acc;
    }, []);
    
    res.status(200).json({ albums: allAlbums });
  } catch (e) {
    res.status(500).json({ error: "Failed to retrieve albums", details: e.message });
  }
};

const getNotifications = async (req, res) => {
  const { token } = req.cookies;

  if (!token) {
      return res.status(401).json({ error: "No token provided" });
  }

  try {
      const decoded = jwt.verify(token, jwtSecret);
      const userId = decoded.id;

      const user = await User.findById(userId).select("notifications");
      if (!user) {
          return res.status(404).json({ error: "User not found" });
      }

      const enhancedNotifications = await Promise.all(user.notifications.map(async (notification) => {
          // Find the user who made the comment
          const commentingUser = await User.findById(notification.commentingUserId).select("name");

          return {
              ...notification._doc,
              commentingUserName: commentingUser ? commentingUser.name : "Unknown User"
          };
      }));

      res.json(enhancedNotifications);
  } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
          return res.status(401).json({ error: "Invalid token" });
      }
      res.status(500).json({ error: "Failed to retrieve notifications", details: error.message });
  }
};




const getMediaFromFollowing = async (req, res) => {
  const { token } = req.cookies; // or get the user ID from request params or body

  try {
    // Verify the token and get the user's ID
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    // Find the current user and get their following list
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch albums from the users that the current user is following
    const followingUsers = await User.find({
      _id: { $in: currentUser.following },
    }).select("albums name");
    const followingAlbums = followingUsers.reduce((acc, user) => {
      const userAlbums = user.albums.map((album) => ({
        ...album._doc,
        userName: user.name,
      }));
      acc.push(...userAlbums);
      return acc;
    }, []);

    res.status(200).json({ albums: followingAlbums });
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res
        .status(500)
        .json({
          error: "Failed to retrieve albums from following",
          details: e.message,
        });
    }
  }
};

const getAlbumByCode = async (req, res) => {
  const { albumCode } = req.params;
  try {
    // Fetch the user document that contains the album with the given code
    const user = await User.findOne(
      { "albums.code": albumCode },
      { "albums.$": 1, name: 1, image: 1 }
    );
    if (user && user.albums.length > 0) {
      // Include the userName in the response along with the album data
      res.json({ userName: user.name, userImage: user.image , ...user.albums[0] });
    } else {
      res.status(404).json({ error: "Album not found" });
    }
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to retrieve album", details: e.message });
  }
};

const searchAlbums = async (req, res) => {
  const { query } = req.query;
  try {
    const users = await User.find(
      {
        "albums.title": { $regex: query, $options: "i" },
      },
      { "albums.$": 1 }
    );
    const matchingAlbums = users.map((user) => user.albums).flat();
    res.status(200).json({ albums: matchingAlbums });
  } catch (e) {
    res.status(500).json({ error: "Search failed", details: e.message });
  }
};

const getMoreAlbums = async (req, res) => {
  const { currentAlbumCode } = req.params; // Get the current album code from URL parameters

  try {
    // Find the current album's position
    const currentAlbumPosition = await User.aggregate([
      { $unwind: "$albums" },
      { $sort: { "albums.createdAt": 1 } }, // Assuming there's a createdAt field
      { $group: { _id: null, albums: { $push: "$albums" } } },
      { $unwind: { path: "$albums", includeArrayIndex: "arrayIndex" } },
      { $match: { "albums.code": currentAlbumCode } },
      { $project: { _id: 0, position: "$arrayIndex" } },
    ]);

    if (currentAlbumPosition.length === 0) {
      return res.status(404).json({ error: "Current album not found" });
    }

    const position = currentAlbumPosition[0].position;

    // Fetch the next 12 albums
    const albums = await User.aggregate([
      { $unwind: "$albums" },
      { $sort: { "albums.createdAt": 1 } },
      { $skip: position + 1 },
      { $limit: 12 },
      { $project: { albums: 1, name: 1, _id: 0 } },
    ]);

    const moreAlbums = albums.map((item) => ({
      ...item.albums,
      userName: item.name,
    }));

    res.status(200).json({ albums: moreAlbums });
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to retrieve more albums", details: e.message });
  }
};

const incrementAlbumViews = async (req, res) => {
  const { albumCode } = req.params;
  const viewThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds

  try {
    const user = await User.findOne(
      { "albums.code": albumCode },
      { "albums.$": 1 }
    );

    if (!user) {
      return res.status(404).json({ error: "Album not found" });
    }

    const album = user.albums[0];
    const currentTime = new Date();

    if (
      !album.lastViewedAt ||
      currentTime - new Date(album.lastViewedAt) > viewThreshold
    ) {
      // Update the views and last viewed timestamp
      await User.findOneAndUpdate(
        { "albums.code": albumCode },
        {
          $inc: { "albums.$.views": 1 },
          $set: { "albums.$.lastViewedAt": currentTime },
        },
        { new: true }
      );
      res.json({ message: "View incremented" });
    } else {
      res.json({ message: "View increment threshold not reached" });
    }
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to increment album views", details: e.message });
  }
};

const addLikeToAlbum = async (req, res) => {
  const { albumCode } = req.params;
  const { token } = req.cookies;

  try {
    // Verify the token and get the user's ID
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    // Find the user and the album
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user has already liked this album
    const hasLiked = user.likedAlbums.includes(albumCode);
    if (hasLiked) {
      // User has already liked the album, so unlike it
      await User.findOneAndUpdate(
        { "albums.code": albumCode },
        {
          $inc: { "albums.$.likes": -1 }, // Decrement like count
          $pull: { "albums.$.likesByUsers": userId }, // Remove user ID from likesByUsers
        }
      );

      // Remove the album from the user's likedAlbums
      await User.findByIdAndUpdate(userId, {
        $pull: { likedAlbums: albumCode },
      });

      res.json({ message: "Like removed from album" });
    } else {
      // User has not liked the album, so add a like
      await User.findOneAndUpdate(
        { "albums.code": albumCode },
        {
          $inc: { "albums.$.likes": 1 }, // Increment like count
          $push: { "albums.$.likesByUsers": userId }, // Add user ID to likesByUsers
        }
      );

      // Add the album to the user's likedAlbums
      await User.findByIdAndUpdate(userId, {
        $push: { likedAlbums: albumCode },
      });

      res.json({ message: "Like added to album" });
    }
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res
        .status(500)
        .json({ error: "Failed to update like", details: e.message });
    }
  }
};

const saveAlbum = async (req, res) => {
  const { albumCode } = req.params;
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let update;
    if (user.savedAlbums.includes(albumCode)) {
      // If the album is already saved, remove it
      update = { $pull: { savedAlbums: albumCode } };
    } else {
      // If the album is not saved, add it
      update = { $addToSet: { savedAlbums: albumCode } };
    }

    // Update the user's savedAlbums
    const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ error: "User update failed" });
    }

    res.json({ 
      message: updatedUser.savedAlbums.includes(albumCode) ? "Album saved successfully" : "Album unsaved successfully" 
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res.status(500).json({ error: "Failed to update album saved status", details: error.message });
  }
};

const repostAlbum = async (req, res) => {
  const { albumCode } = req.params;
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;
    const currentUser = await User.findById(userId);

    // Find the original album and its owner
    const originalOwner = await User.findOne({ "albums.code": albumCode });
    if (!originalOwner) {
      return res.status(404).json({ error: "Original album not found" });
    }

    const originalAlbum = originalOwner.albums.find(album => album.code === albumCode);
    if (!originalAlbum) {
      return res.status(404).json({ error: "Original album not found" });
    }

    // Check if the current user already reposted the album
    if (originalAlbum.repostsByUsers.includes(userId)) {
      return res.status(400).json({ error: "You have already reposted this album" });
    }

    // Increment the repost count and add the current user to repostsByUsers
    originalAlbum.reposts += 1;
    originalAlbum.repostsByUsers.push(userId);
    await originalOwner.save();

    // Create a new album object for reposting
    const repostedAlbum = {
      ...originalAlbum.toObject(),
      _id: new mongoose.Types.ObjectId(), // Generate a new ID
      originalOwnerName: originalOwner.name // Add the original owner's name
    };

    // Add the reposted album to the current user's albums
    currentUser.albums.push(repostedAlbum);
    await currentUser.save();

    res.json({ message: "Album reposted successfully" });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res.status(500).json({ error: "Failed to repost album", details: error.message });
  }
};


const checkIfAlbumRepostedByUser = async (req, res) => {
  const { albumCode } = req.params; // Get the album code from the request parameters
  const { token } = req.cookies; // Get the token from cookies

  if (!token) {
      return res.status(401).json({ error: "No token provided" });
  }

  try {
      // Decode the token to get the user's ID
      const decoded = jwt.verify(token, jwtSecret);
      const userId = decoded.id;

      // Find the album by its code
      const album = await User.findOne({ "albums.code": albumCode }, { "albums.$": 1 });

      if (!album || album.albums.length === 0) {
          return res.status(404).json({ error: "Album not found" });
      }

      // Check if the user's ID is in the repostsByUsers array
      const isReposted = album.albums[0].repostsByUsers.includes(userId);

      res.json({ isReposted });
  } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
          return res.status(401).json({ error: "Invalid token" });
      }
      res.status(500).json({ error: "Failed to check repost status", details: error.message });
  }
};




const getSavedAlbums = async (req, res) => {
  const { token } = req.cookies; // Assuming the user's token is stored in cookies

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // Decode the token to get the user ID
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    // Find the user and get their savedAlbums
    const user = await User.findById(userId).select('savedAlbums name image');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Retrieve albums based on the savedAlbums codes
    const usersWithSavedAlbums = await User.find(
      { "albums.code": { $in: user.savedAlbums } },
      { "albums.$": 1 }
    ).lean();

    // Prepare the array of saved albums to return
    const albums = usersWithSavedAlbums.reduce((acc, u) => {
      const userAlbums = u.albums.map((album) => ({
        ...album,
        userName: user.name, // Add the userName for each album
        userImage: user.image // Add the userImage for each album
      }));
      acc.push(...userAlbums);
      return acc;
    }, []);

    res.json({ userName: user.name, userImage: user.image, savedAlbums: albums });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res.status(500).json({ error: "Failed to retrieve saved albums", details: error.message });
  }
};

const isAlbumSaved = async (req, res) => {
  const { albumCode } = req.params;
  const { token } = req.cookies;

  if (!token) {
      return res.status(401).json({ error: "No token provided" });
  }

  try {
      const decoded = jwt.verify(token, jwtSecret);
      const userId = decoded.id;

      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ error: "User not found" });
      }

      const isSaved = user.savedAlbums.includes(albumCode);

      res.json({ isSaved });
  } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
          return res.status(401).json({ error: "Invalid token" });
      }
      res.status(500).json({ error: "Failed to check if album is saved", details: error.message });
  }
};


const findUserByToken = async (req, res) => {
  const { idsArray } = req.body;
  const { token } = req.cookies;

  try {
    // Decode the token
    const decoded = jwt.verify(token, jwtSecret);
    const userID = decoded.id;

    // Check if the user ID is in the provided array
    if (idsArray.includes(userID)) {
      res.json(userID);
    } else {
      return res.status(404).json({ error: "User not found in Array" });
    }
  } catch (e) {
    console.error("Error in findUserByToken:", e.message);
    return null;
  }
};

const addCommentToAlbum = async (req, res) => {
  const { albumCode } = req.params;
  const { comment } = req.body;
  const { token } = req.cookies;

  if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
  }

  try {
      // Verify the token and get the user's ID
      const decoded = jwt.verify(token, jwtSecret);
      const userId = decoded.id;

      // Find the album and add the comment
      const user = await User.findOneAndUpdate(
          { "albums.code": albumCode },
          {
              $push: {
                  "albums.$.comments": {
                      user: userId,
                      text: comment,
                      commentDate: new Date(),
                  },
              },
          },
          { new: true }
      );

      if (!user) {
          return res.status(404).json({ error: "Album not found" });
      }

      // Extract the specific album
      const album = user.albums.find((album) => album.code === albumCode);

      // Find all users who commented on this album in the last 24 hours
      const timeLimit = new Date(new Date().getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago
      const notifiedUsers = new Set();

      const recentComments = album.comments.filter(comment => new Date(comment.commentDate) > timeLimit);
      recentComments.forEach(comment => {
          if (comment.user.toString() !== userId.toString()) {
              notifiedUsers.add(comment.user.toString());
          }
      });

      // Send notifications to these users
      for (const otherUserId of notifiedUsers) {
        console.log(otherUserId)
        await addNotification(
            otherUserId, 
            'comment', 
            `New comment on the post  ${album.title.toUpperCase()}`, 
            albumCode,
            album.title, // Pass the album title
            userId // Pass the ID of the user who made the comment
        );
    }

      res.json({ message: "Comment added successfully" });
  } catch (e) {
      if (e instanceof jwt.JsonWebTokenError) {
          res.status(401).json({ error: "Invalid token" });
      } else {
          res.status(500).json({ error: "Failed to add comment", details: e.message });
      }
  }
};

const addNotification = async (userId, type, message, albumCode, albumTitle, commentingUserId) => {
  try {
      await User.findByIdAndUpdate(userId, {
          $push: { notifications: { 
              type, 
              message, 
              albumCode, 
              albumTitle, // The title of the album
              commentingUserId // The ID of the user who made the comment
          }},
      });
  } catch (error) {
      console.error("Error adding notification:", error);
  }
};




const getAlbumComments = async (req, res) => {
  const { albumCode } = req.params;

  try {
    // Find the user who owns the album with the specified code
    const user = await User.findOne({ "albums.code": albumCode });

    if (!user) {
      return res.status(404).json({ error: "Album not found" });
    }

    // Extract the specific album
    const album = user.albums.find((album) => album.code === albumCode);

    if (!album) {
      return res.status(404).json({ error: "Album not found" });
    }

    // Check if comments are hidden for this album
    console.log("album:" , album);
    if (album.hideComments) {
      return res.status(403).json({ error: "Comments are hidden for this album" });
    }

    // Fetch usernames for each comment
    const commentsWithUsernames = await Promise.all(
      album.comments.map(async (comment) => {
        const userWhoCommented = await User.findById(comment.user);
        return {
          ...comment._doc,
          username: userWhoCommented ? userWhoCommented.name : "Unknown User",
        };
      })
    );

    // Return the comments of the album with usernames
    res.json(commentsWithUsernames);
  } catch (e) {
    res.status(500).json({ error: "Failed to retrieve comments", details: e.message });
  }
};


const hideAllComments = async (req, res) =>  {
  const { token } = req.cookies; // Assuming the current user's ID is in a token

  try {
    // Verify the token and get the current user's ID
    const decoded = jwt.verify(token, jwtSecret);
    const currentUserId = decoded.id;

    // Retrieve the current user
    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Toggle hideComments field for each album
    user.albums.forEach(album => {
      album.hideComments = !album.hideComments;
    });

    // Save the updated user
    await user.save();

    res.json({ message: "Comment visibility toggled successfully" });

  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      // Log the error for debugging purposes
      console.error(e);
      res.status(500).json({
        error: "Failed to toggle comment visibility",
        details: e.message,
      });
    }
  }
};

const editProfileOptions = async (req, res) => {
  const { token } = req.cookies; // Assuming the current user's ID is in a token

  try {
    // Verify the token and get the current user's ID
    const decoded = jwt.verify(token, jwtSecret);
    const currentUserId = decoded.id;

    // Retrieve the current user
    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if any album has hideComments set to true
    const anyHidden = user.albums.some(album => album.hideComments);

    // Also check if the user's account is private
    const isPrivate = user.isPrivate;

    res.json({ 
      hidden: anyHidden,
      isPrivate: isPrivate
    });

  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      // Log the error for debugging purposes
      console.error(e);
      res.status(500).json({
        error: "Failed to check albums and privacy status",
        details: e.message,
      });
    }
  }
};



const followUser = async (req, res) => {
  const { usernameToFollow } = req.body;
  const { token } = req.cookies;

  try {
    // Verify the token and get the user's ID
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    // Check if the users exist
    const currentUser = await User.findById(userId);
    const userToFollow = await User.findOne({ name: usernameToFollow });

    if (!currentUser || !userToFollow) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the currentUser is trying to follow themselves
    if (currentUser._id.equals(userToFollow._id)) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    // Check if already following
    if (currentUser.following.includes(userToFollow._id)) {
      // Unfollow the user
      await User.findByIdAndUpdate(userId, {
        $pull: { following: userToFollow._id },
      });
      await User.findByIdAndUpdate(userToFollow._id, {
        $pull: { followers: userId },
      });

      res.json({ message: "Unfollowed the user successfully" });
    } else {
      // Follow the user
      await User.findByIdAndUpdate(userId, {
        $addToSet: { following: userToFollow._id },
      });
      await User.findByIdAndUpdate(userToFollow._id, {
        $addToSet: { followers: userId },
      });

      res.json({ message: "Followed the user successfully" });
    }
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res
        .status(500)
        .json({ error: "Failed to follow/unfollow user", details: e.message });
    }
  }
};

const checkIfFollowingAlbumOwner = async (req, res) => {
  const { albumCode } = req.params; // or however you get the album identifier
  const { token } = req.cookies; // assuming the current user's ID is in a token

  try {
    // Verify the token and get the current user's ID
    const decoded = jwt.verify(token, jwtSecret);
    const currentUserId = decoded.id;

    // Find the current user
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ error: "Current user not found" });
    }

    // Find the album and its owner
    const albumOwner = await User.findOne({ "albums.code": albumCode });
    if (!albumOwner) {
      return res.status(404).json({ error: "Album owner not found" });
    }

    // Check if the current user is following the album's owner
    const isFollowing = currentUser.following.includes(albumOwner._id);

    res.json({ isFollowing });
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res
        .status(500)
        .json({
          error: "Failed to check following status",
          details: e.message,
        });
    }
  }
};

const getFollowingInfo = async (req, res) => {
  const username = req.params.userId; // Now using username as a URL path parameter
  console.log(req.params.userId);

  try {
    // Find the user by username
    const user = await User.findOne({ name: username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Use aggregation to fetch the required data
    const followingInfo = await User.aggregate([
      {
        $match: { _id: { $in: user.following } },
      },
      {
        $project: {
          name: 1,
          albumsCount: { $size: "$albums" },
          views: { $sum: "$albums.views" },
          followersCount: { $size: "$followers" },
          followingCount: { $size: "$following" },
        },
      },
    ]);

    res.json(followingInfo);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to retrieve following information",
        details: error.message,
      });
  }
};

const getUserStats = async (req, res) => {
  const { username } = req.params;

  try {
    // Find the user by username
    const user = await User.findOne({ name: username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Count the number of followers and following
    const followersCount = user.followers.length;
    const followingCount = user.following.length;
    const image = user.image;
    const name = user.name;
    res.json({ followersCount, followingCount, image, name });
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to retrieve user follow stats",
        details: error.message,
      });
  }
};

// Add this function in your controller file



module.exports = {
  register,
  login,
  getGoogle,
  handleGoogleCallback,
  getReddit,
  handleRedditCallback,
  getTwitter,
  handleTwitterCallback,
  loginSuccess,
  loginFailed,
  forgotPassword,
  resetPassword,
  sendEmailChange,
  changeEmail,
  togglePrivacy,
  profile,
  removeProfileImage,
  uploadProfileImage,
  getCurrentUserInfo,
  updateUserProfile,
  logout,
  upload,
  getMedia,
  getMediaByUserName,
  getLikedAlbums,
  getMediaAll,
  getNotifications,
  getMediaFromFollowing,
  getAlbumByCode,
  getMoreAlbums,
  searchAlbums,
  incrementAlbumViews,
  addLikeToAlbum,
  saveAlbum,
  repostAlbum,
  checkIfAlbumRepostedByUser,
  getSavedAlbums,
  isAlbumSaved,
  findUserByToken,
  addCommentToAlbum,
  getAlbumComments,
  hideAllComments,
  editProfileOptions,
  followUser,
  checkIfFollowingAlbumOwner,
  getFollowingInfo,
  getUserStats,
  updateUserPassword,
  addNotification,
  test,
};
