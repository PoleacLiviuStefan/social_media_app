const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Album = require("../models/Album");
const multer = require("multer");
const nodemailer = require("nodemailer");
const passport = require("passport");
const mongoose = require("mongoose"); // Add this line

dotenv.config();

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = process.env.JWT_SECRET || "defaultSecret";

const serverURL = "https://www.api.waygital.ro"; //http://localhost:3001
const clientURL = "https://nextjs-ssr-123-ce410f2237c9.herokuapp.com"  //http://localhost:4789

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
  passport.authenticate("google", { scope: ["profile", "email"] })(
    req,
    res,
    next
  );
};

const handleGoogleCallback = (req, res) => {
  // Successful authentication
  res.redirect(`${serverURL}/api/login/success`);
};

const getReddit = (req, res, next) => {
  passport.authenticate('reddit', {
    duration: 'permanent',
  })(req, res, next);
};

const handleRedditCallback = (req, res, next) => {
  passport.authenticate('reddit', {
    successRedirect: '/',
    failureRedirect: '/login'
  })(req, res, next);
};

const getTwitter = (req, res, next) => {
  passport.authenticate("twitter")(
    req,
    res,
    next
  );
};

const handleTwitterCallback = (req, res) => {
  // Successful authentication
  res.redirect(`${serverURL}/api/login/success`);
};

const loginSuccess = (req, res) => {  
  console.log("Req este:", req);
  if (!req.user) {
    return res.status(401).json({ error: "User not authenticated" });
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
      res.cookie("token", token, {
        httpOnly: false,
        maxAge: 3600000 * 5,
        secure: true,
        sameSite: "none",
      });

      // Redirect to the desired URL
      res.redirect(clientURL);  
    }
  );
};


const loginFailed = (req, res) => {
  res.status(401).json({ message: "Log In failure" });
};

const forgotPassword = (req, res) => {
  const { email } = req.body;

  User.findOne({ email: email }).then((user) => {
    if (!user) {
      return res.send({ Status: "User not existed" });
    }

    const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: "1d" });
    var transporter = nodemailer.createTransport({
      host: "mail.thler.com",
      port: 465,
      secure:true,
      auth: {
        user: "contact@thler.com",
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    var mailOptions = {
      from: "contact@thler.com",
      to: email,
      subject: "Reset your password",
      text: `${clientURL}/reset-password/${user._id}/${token}`,
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
      host: "mail.thler.com",
      port: 465,
      secure:true,
      auth: {
        user: "contact@thler.com",
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    var mailOptions = {
      from: "contact@thler.com",
      to: email,
      subject: "Reset your password",
      text: `${clientURL}/reset-email/${user._id}/${token}`,
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
  const { id } = req.params; // Keep getting the id from the params
  const { email } = req.body;
  const { token } = req.cookies; // Get the token from the cookies

  // You can add a check here to ensure the token exists
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  // Verify the token (similar to what you have in the profile function)
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Ensure the user id from the token matches the id from the params
    if (userData.id !== id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      const updatedUser = await User.findByIdAndUpdate(
        { _id: id },
        { email: email },
        { new: true } // to return the updated document
      );
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ message: "Email updated successfully" });
    } catch (e) {
      res
        .status(500)
        .json({ error: "Email update failed", details: e.message });
    }
  });
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
      res
        .status(500)
        .json({
          error: "Failed to update privacy setting",
          details: error.message,
        });
    }
  }
};

const profile = (req, res) => {
  const { token } = req.cookies;
  console.log("toate coockie-urile", req.cookies);
  console.log("token din profile", token);
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

    const user = await User.findById(userId).select("email bio name image isCommentDisabled isDownloadDisabled");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      email: user.email,
      bio: user.bio,
      name: user.name,
      image: user.image,
      isCommentDisabled: user.isCommentDisabled,
      isDownloadDisabled: user.isDownloadDisabled,
    });
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

    // Find the user and update their profile
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (newUsername) {
      user.name = newUsername;
      // Update originalOwnerName in all albums
      user.albums.forEach(album => {
      album.originalOwnerName = newUsername;
      });
      }
      if (newBio) user.bio = newBio;await user.save();

      res.json({ message: "Profile updated successfully", user: user });
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

const removeProfileImage = async (req, res) => {
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
      res
        .status(404)
        .json({ error: "User not found or image already removed" });
    }
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res
        .status(500)
        .json({ error: "Failed to remove profile image", details: e.message });
    }
  }
};
const deleteAlbum = async (req, res) => {
  const { token } = req.cookies;
  const { albumCode } = req.params; // Change albumId to albumCode for clarity

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

    // Find the album index using the album code instead of _id
    const albumIndex = user.albums.findIndex(album => album.code === albumCode);
    if (albumIndex === -1) {
      return res.status(404).json({ error: "Album not found" });
    }

    // Remove the album from the user's albums array
    user.albums.splice(albumIndex, 1);
    await user.save();

    res.json({ message: "Album deleted successfully" });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res.status(500).json({
      error: "Failed to delete album",
      details: error.message
    });
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

    // Find the user and update their profile image
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the user's profile image
    currentUser.image = multerFilename;

    // Update the originalOwnerImage for each album owned by the user
    currentUser.albums.forEach(album => {
      album.originalOwnerImage = multerFilename;
    });

    await currentUser.save();

    res.json({
      message: "Profile image and albums updated successfully",
      filename: multerFilename,
    });
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res
        .status(500)
        .json({ error: "Failed to upload profile image", details: e.message });
    }
  }
};



const logout = (req, res) => {
  res
    .clearCookie("token", {
      httpOnly: false,
      maxAge: 3600000 * 5,
      secure: true,
      sameSite: "none",
    })
    .json("Logout successful");
    
};

const upload = (req, res) => {
  const uploadedFiles = req.files.map((file) => ({
    name: file.filename,
    code: uuidv4(),
    likes: 0,
    likesByUsers: [],
  }));

  const albumTitle = req.body.albumTitle;
  const { token } = req.cookies;
  console.log(uploadedFiles);
  
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
          files: req.files.map((file) => file.filename),
          originalOwnerName: user.name, // Numele proprietarului original
          originalOwnerImage: user.image, // Imaginea de profil a proprietarului original
          code: albumCode,
          content: uploadedFiles,
        };

        user.albums.push(album);
        await user.save();

        res
          .status(200)
          .json({ message: "Album created successfully", albumCode });
      } catch (e) {
        res
          .status(500)
          .json({ error: "Failed to create album", details: e.message });
      }
    });
  } else {
    res.status(401).json({ error: "No token provided" });
  }
};

const getMedia = (req, res) => {
  console.log("da");
  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      try {
        const user = await User.findById(userData.id).select(
          "albums repostedAlbums"
        );
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json({
          albums: user.albums,
          repostedAlbums: user.repostedAlbums,
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
    const user = await User.findOne({ name: username }).select(
      "albums repostedAlbums"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Sending the albums and reposted albums to the client
    res.status(200).json({
      albums: user.albums,
      repostedAlbums: user.repostedAlbums,
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
    if (!currentUser || !currentUser.likedAlbums || currentUser.likedAlbums.length === 0) {
      return res.status(404).json({ error: "User has no liked albums" });
    }

    // Search all users' albums to find matches
    const usersWithLikedAlbums = await User.find(
      { "albums.code": { $in: currentUser.likedAlbums } },
      "name image albums" // Include the image field in the projection
    );

    let likedAlbums = [];
    usersWithLikedAlbums.forEach((user) => {
      user.albums.forEach((album) => {
        if (currentUser.likedAlbums.includes(album.code)) {
          const images = album.content.filter((file) =>
            file.name.match(/\.(png|jpg|jpeg)$/i));
          const videos = album.content.filter((file) =>
            file.name.match(/\.(mp4)$/i));
          likedAlbums.push({
            code: album.code,
            thumbnail: [...images, ...videos],
            userName: user.name,
            userImage: user.image, // Include the owner's profile image
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
    res.status(500).json({
      error: "Failed to retrieve liked albums",
      details: error.message,
    });
  }
};


const getMediaAll = async (req, res) => {
  try {
    // Fetch all users with selected fields
    const users = await User.find({}, "name image albums").exec();

    // Process the data to exclude repostedAlbums
    const allAlbums = users.reduce((acc, user) => {
      const userAlbums = user.albums.map((album) => ({
        ...album._doc,
        userName: user.name,
        userImage: user.image,
      }));
      acc.push(...userAlbums);
      return acc;
    }, []);

    res.status(200).json({ albums: allAlbums });
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to retrieve albums", details: e.message });
  }
};

const getRandomAlbums = async (req, res) => {
  try {
    // Fetch all users with selected fields
    const users = await User.find({}, "name image albums").exec();

    // Flatten the array of user albums
    let allAlbums = users.reduce((acc, user) => {
      const userAlbums = user.albums.map((album) => ({
        ...album._doc,
        userName: user.name,
        userImage: user.image,
      }));
      acc.push(...userAlbums);
      return acc;
    }, []);

    // Shuffle the albums array
    for (let i = allAlbums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allAlbums[i], allAlbums[j]] = [allAlbums[j], allAlbums[i]];
    }

    res.status(200).json({ albums: allAlbums });
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to retrieve albums", details: e.message });
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

    const enhancedNotifications = await Promise.all(
      user.notifications.map(async (notification) => {
        // Find the user who made the comment
        const commentingUser = await User.findById(
          notification.commentingUserId
        ).select("name");

        return {
          ...notification._doc,
          commentingUserName: commentingUser
            ? commentingUser.name
            : "Unknown User",
        };
      })
    );

    res.json(enhancedNotifications);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res
      .status(500)
      .json({
        error: "Failed to retrieve notifications",
        details: error.message,
      });
  }
};

const deleteAccount = async (req, res) => {
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

    // Delete the user
    await User.deleteOne({ _id: userId });

    // Optionally, you could also handle any cleanup like deleting user-related data
    // For example, deleting user's albums, notifications, etc.

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res
        .status(500)
        .json({
          error: "Failed to delete account",
          details: error.message,
        });
    }
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

    console.log(followingAlbums);

    res.status(200).json({ albums: followingAlbums });
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res.status(500).json({
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
      // Extract the codes of all files in the content field of the album
      const fileCodes = user.albums[0].content.map(
        (mediaItem) => mediaItem.code
      );

      // Include the userName and fileCodes in the response along with the album data
      res.json({
        userName: user.name,
        userImage: user.image,
        album: user.albums[0],
        fileCodes: fileCodes,
      });
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

const getMediaItem = async (req, res) => {
  const { albumCode, mediaCode } = req.params;

  try {
    const user = await User.findOne({ "albums.code": albumCode });
    if (!user) {
      return res.status(404).json({ error: "Album not found" });
    }

    const album = user.albums.find((album) => album.code === albumCode);
    if (!album) {
      return res.status(404).json({ error: "Album not found" });
    }

    let mediaIndex = -1;
    const mediaItem = album.content.find((item, index) => {
      if (item.code === mediaCode) {
        mediaIndex = index;
        return true;
      }
      return false;
    });

    if (!mediaItem) {
      return res
        .status(404)
        .json({ error: "Media item not found in the album" });
    }

    // Extract codes of all media items in the content array
    const contentCodes = album.content.map((item) => item.code);

    // Return the media item, its index, the album code, and codes of all content
    res.json({ mediaItem, mediaIndex, albumCode, contentCodes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

const likeMediaItem = async (req, res) => {
  const { albumCode, mediaCode } = req.params;
  const token = req.cookies.token; // Assuming the token is stored under the key 'token'

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, jwtSecret);
    const currentUserId = decoded.id; // Replace 'id' with the appropriate field in your token payload

    const user = await User.findOne({ "albums.code": albumCode });
    if (!user) {
      return res.status(404).json({ error: "Album not found" });
    }

    const album = user.albums.find(album => album.code === albumCode);
    if (!album) {
      return res.status(404).json({ error: "Album not found" });
    }

    const mediaItem = album.content.find(item => item.code === mediaCode);
    if (!mediaItem) {
      return res.status(404).json({ error: "Media item not found in the album" });
    }
    const userIdIndex = mediaItem.likesByUsers.indexOf(currentUserId);
    console.log(userIdIndex);
if (userIdIndex === -1) {
  // User hasn't liked the media item yet, so like it
  mediaItem.likes += 1;
  mediaItem.likesByUsers.push(currentUserId);
} else {
  // User has already liked the media item, so unlike it
  mediaItem.likes -= 1;
  mediaItem.likesByUsers.splice(userIdIndex, 1);
}

await user.save();

res.status(200).json({ message: "Media item like status updated successfully" });
} catch (error) {
  console.error(error);
  if (error.name === "JsonWebTokenError") {
  return res.status(401).json({ error: "Invalid token" });
  } else {
  return res.status(500).json({ error: "Server error" });
  }
  }
  };
  

  const checkIfLiked = async (req, res) => {
    const { albumCode, mediaCode } = req.params;
    const token = req.cookies.token; // Assuming the token is stored under the key 'token'
  
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
  
    try {
      const decoded = jwt.verify(token, jwtSecret);
      const currentUserId = decoded.id; // Replace 'id' with the appropriate field in your token payload
  
      const user = await User.findOne({ "albums.code": albumCode });
      if (!user) {
        return res.status(404).json({ error: "Album not found" });
      }
  
      const album = user.albums.find(album => album.code === albumCode);
      if (!album) {
        return res.status(404).json({ error: "Album not found" });
      }
  
      const mediaItem = album.content.find(item => item.code === mediaCode);
      if (!mediaItem) {
        return res.status(404).json({ error: "Media item not found in the album" });
      }
  
      const hasLiked = mediaItem.likesByUsers.includes(currentUserId);
      
      res.status(200).json({ hasLiked });
    } catch (error) {
      console.error(error);
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Invalid token" });
      } else {
        return res.status(500).json({ error: "Server error" });
      }
    }
  };


  const checkIfAlbumLiked = async (req, res) => {
    const { albumCode } = req.params; // Get album code from request parameters
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
  
      const isLiked = user.likedAlbums.includes(albumCode);
  
      res.json({ isLiked });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: "Invalid token" });
      }
      res.status(500).json({
        error: "Failed to check if album is liked",
        details: error.message,
      });
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

    // Search for the album across all users
    let albumDetails = null;
    const allUsersWithAlbum = await User.aggregate([
      { $match: { "albums.code": albumCode } },
      { $unwind: "$albums" },
      { $match: { "albums.code": albumCode } },
      { $limit: 1 },
      { $project: { "albums.originalOwnerName": 1, "albums.originalOwnerImage": 1 } }
    ]);
      console.log(allUsersWithAlbum);
    if (allUsersWithAlbum.length > 0) {
      const album = allUsersWithAlbum[0].albums;
      albumDetails = {
        originalOwnerName: album.originalOwnerName,
        originalOwnerImage: album.originalOwnerImage
      };
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
    await User.findByIdAndUpdate(userId, update, { new: true });

    res.json({
      message: user.savedAlbums.includes(albumCode)
        ? "Album unsaved successfully"
        : "Album saved successfully",
      albumDetails,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res.status(500).json({
      error: "Failed to update album saved status",
      details: error.message,
    });
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

    const originalAlbum = originalOwner.albums.find(
      (album) => album.code === albumCode
    );
    if (!originalAlbum) {
      return res.status(404).json({ error: "Original album not found" });
    }

    // Check if the current user is the original owner of the album
    if (originalOwner._id.toString() === userId) {
      return res
        .status(400)
        .json({ error: "You cannot repost your own album" });
    }

    // Check if the current user already reposted the album
    if (originalAlbum.repostsByUsers.includes(userId)) {
      return res
        .status(400)
        .json({ error: "You have already reposted this album" });
    }

    // Increment the repost count and add the current user to repostsByUsers
    originalAlbum.reposts += 1;
    originalAlbum.repostsByUsers.push(userId);
    await originalOwner.save();

    // Create a new album object for reposting
    const repostedAlbum = {
      ...originalAlbum.toObject(),
      _id: new mongoose.Types.ObjectId(), // Generate a new ID
      originalOwnerName: originalOwner.name, // Add the original owner's name
    };

    // Add the reposted album to the current user's albums
    currentUser.albums.push(repostedAlbum);
    await currentUser.save();

    res.json({ message: "Album reposted successfully" });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res
      .status(500)
      .json({ error: "Failed to repost album", details: error.message });
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
    const album = await User.findOne(
      { "albums.code": albumCode },
      { "albums.$": 1 }
    );

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
    res
      .status(500)
      .json({ error: "Failed to check repost status", details: error.message });
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
    const user = await User.findById(userId).select("savedAlbums name image");
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
        userImage: user.image, // Add the userImage for each album
      }));
      acc.push(...userAlbums);
      return acc;
    }, []);

    res.json({
      userName: user.name,
      userImage: user.image,
      savedAlbums: albums,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res
      .status(500)
      .json({
        error: "Failed to retrieve saved albums",
        details: error.message,
      });
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
    res
      .status(500)
      .json({
        error: "Failed to check if album is saved",
        details: error.message,
      });
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

const getTopUsersByViews = async (req, res) => {
  try {
    const topUsers = await User.aggregate([
      // Unwind the albums array to process each album individually
      { $unwind: "$albums" },
      // Group by user and sum their album views
      {
        $group: {
          _id: "$_id",
          totalViews: { $sum: "$albums.views" },
          name: { $first: "$name" },
          userImage: { $first: "$image" }, // Include the user image
        }
      },
      // Sort by totalViews in descending order
      { $sort: { totalViews: -1 } },
      // Limit to top 10
      { $limit: 12 },
      // Project the desired fields
      {
        $project: {
          _id: 0, // Exclude the _id field
          name: 1, // Include the name field
          userImage: 1, // Include the user image field
          totalViews: 1, // Include the totalViews field
        }
      }
    ]);

    res.json(topUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
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
    const timeLimit = new Date(new Date().getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    const notifiedUsers = new Set();

    const recentComments = album.comments.filter(
      (comment) => new Date(comment.commentDate) > timeLimit
    );
    recentComments.forEach((comment) => {
      if (comment.user.toString() !== userId.toString()) {
        notifiedUsers.add(comment.user.toString());
      }
    });

    // Send notifications to these users
    for (const otherUserId of notifiedUsers) {
      console.log(otherUserId);
      await addNotification(
        otherUserId,
        "comment",
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
      res
        .status(500)
        .json({ error: "Failed to add comment", details: e.message });
    }
  }
};

const addNotification = async (
  userId,
  type,
  message,
  albumCode,
  albumTitle,
  commentingUserId
) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $push: {
        notifications: {
          type,
          message,
          albumCode,
          albumTitle, // The title of the album
          commentingUserId, // The ID of the user who made the comment
        },
      },
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
    console.log("album:", album);
    if (album.hideComments) {
      return res
        .status(403)
        .json({ error: "Comments are hidden for this album" });
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
    res
      .status(500)
      .json({ error: "Failed to retrieve comments", details: e.message });
  }
};

const hideAllComments = async (req, res) => {
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

    // Toggle isCommentDisabled field for the user
    user.isCommentDisabled = !user.isCommentDisabled;

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

const disableAlbumDownload = async (req, res) => {
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

    // Toggle isDownloadDisabled field for the user
    user.isDownloadDisabled = !user.isDownloadDisabled;

    // Save the updated user
    await user.save();

    res.json({ message: "Download album toggled successfully" });
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      // Log the error for debugging purposes
      console.error(e);
      res.status(500).json({
        error: "Failed to toggle download album",
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
    const anyHidden = user.albums.some((album) => album.hideComments);

    // Also check if the user's account is private
    const isPrivate = user.isPrivate;

    res.json({
      hidden: anyHidden,
      isPrivate: isPrivate,
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
      res.status(500).json({
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

    // Use aggregation

const followingInfo = await User.aggregate([
{
$match: { _id: { $in: user.following } },
},
{
$project: {
name: 1,
image: 1, // Include the profile image field
albumsCount: { $size: "$albums" },
views: { $sum: "$albums.views" },
followersCount: { $size: "$followers" },
followingCount: { $size: "$following" },
},
},
]);res.json(followingInfo);
} catch (error) {
res.status(500).json({
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
    res.status(500).json({
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
  deleteAlbum,
  uploadProfileImage,
  getCurrentUserInfo,
  updateUserProfile,
  logout,
  upload,
  getMedia,
  getMediaByUserName,
  getLikedAlbums,
  getMediaAll,
  getRandomAlbums,
  getNotifications,
  deleteAccount,
  getMediaFromFollowing,
  getAlbumByCode,
  getMoreAlbums,
  getMediaItem,
  likeMediaItem,
  checkIfLiked,
  checkIfAlbumLiked,
  searchAlbums,
  incrementAlbumViews,
  addLikeToAlbum,
  saveAlbum,
  repostAlbum,
  checkIfAlbumRepostedByUser,
  getSavedAlbums,
  isAlbumSaved,
  findUserByToken,
  getTopUsersByViews,
  addCommentToAlbum,
  getAlbumComments,
  hideAllComments,
  disableAlbumDownload,
  editProfileOptions,
  followUser,
  checkIfFollowingAlbumOwner,
  getFollowingInfo,
  getUserStats,
  updateUserPassword,
  addNotification,
  test,
};
