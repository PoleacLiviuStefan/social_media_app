const express = require("express");
const controller = require("../controllers/controller");
const router = express.Router();
const multer = require("multer");
const multerS3 = require("multer-s3");
const AWS = require("aws-sdk")
const path = require("path");
const passport =require("passport");
const customId = require("custom-id");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = customId({
      
    }); // Unique identifier
    cb(
      null,
      file.fieldname + "_" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
});

router.post("/register", controller.register);
router.post("/login", controller.login);
router.get("/google", controller.getGoogle)
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login/failed' }),
  controller.handleGoogleCallback
);
router.get('/reddit', controller.getReddit);
router.get('/reddit/callback', controller.handleRedditCallback);
router.get('/twitter', controller.getTwitter);
router.get('/twitter/callback', 
passport.authenticate('twitter', { failureRedirect: '/login/failed' }),
controller.handleTwitterCallback);
router.get("/login/success",controller.loginSuccess);
router.get("/login/failed",controller.loginFailed);
router.post("/recover",controller.forgotPassword)
router.post("/reset-password/:id/:token", controller.resetPassword)
router.post("/change-email",controller.sendEmailChange);
router.post("/reset-email/:id/:token", controller.changeEmail);
router.post('/togglePrivacy', controller.togglePrivacy);
router.get("/disconnect", controller.logout);
router.post("/profile", controller.profile);
router.post("/removeProfileImage",controller.removeProfileImage);
router.delete('/album/:albumCode', controller.deleteAlbum);
router.post('/uploadProfileImage', upload.single('image'), controller.uploadProfileImage);
router.get("/mainInfo",controller.getCurrentUserInfo)
router.put("/updateDetails",controller.updateUserProfile)
router.put("/updatePassword",controller.updateUserPassword)
router.post("/upload", upload.array("file", 100), controller.upload);
router.get("/getMedia", controller.getMedia);
router.get("/getMediaFromFollowing", controller.getMediaFromFollowing);
router.get("/userAlbums/:username", controller.getMediaByUserName);
router.get("/getLikedAlbums",controller.getLikedAlbums)
router.get("/:albumCode/:mediaCode/isLiked",controller.checkIfLiked)
router.get('/checkIfAlbumLiked/:albumCode', controller.checkIfAlbumLiked);
router.get("/hideAllComents", controller.hideAllComments);
router.get("/disableAlbumDownloads", controller.disableAlbumDownload);
router.get("/checkOptions", controller.editProfileOptions);
router.get("/getMediaAll", controller.getMediaAll);
router.get("/getRandomAlbum", controller.getRandomAlbums)
router.get("/getSavedAlbums", controller.getSavedAlbums);
router.get('/isAlbumSaved/:albumCode', controller.isAlbumSaved);
router.get('/notifications', controller.getNotifications);
router.post("/deleteAccount", controller.deleteAccount);
router.get("/albums/:albumCode", controller.getAlbumByCode);
router.get("/test", controller.test);
router.get("/search", controller.searchAlbums);
router.get("/getSearchHistory",controller.getSearchHistory);
router.delete('/searchHistory/:itemId', controller.deleteSearchHistoryItem);
router.get("/album/view/:albumCode", controller.incrementAlbumViews);
router.post("/addLikeToAlbum/:albumCode", controller.addLikeToAlbum);
router.post("/addSaveToAlbum/:albumCode", controller.saveAlbum);
router.post('/repostAlbum/:albumCode', controller.repostAlbum);
router.get("/repostedByUser/:albumCode", controller.checkIfAlbumRepostedByUser);
router.post("/addComment/:albumCode", controller.addCommentToAlbum);
router.get("/getComments/:albumCode", controller.getAlbumComments);
router.post("/followUser", controller.followUser);
router.get(
  "/albums/:albumCode/follow-check",
  controller.checkIfFollowingAlbumOwner
);
router.post("/album/whoLiked", controller.findUserByToken);
router.get("/getTopUsers",controller.getTopUsersByViews)
router.post("/user/:userId/following", controller.getFollowingInfo);
router.post("/user/:username", controller.getUserStats);
router.get("/getMoreAlbums/:currentAlbumCode", controller.getMoreAlbums);
router.get('/:albumCode/:mediaCode', controller.getMediaItem);
router.post("/:albumCode/likeMedia/:mediaCode" ,controller.likeMediaItem);
module.exports = router;
