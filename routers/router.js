const express = require("express");
const controller = require("../controllers/controller");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
});

router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/recover",controller.forgotPassword)
router.post("/reset-password/:id/:token", controller.resetPassword)
router.post("/change-email",controller.sendEmailChange);
router.post("/reset-email/:id/:token", controller.changeEmail);
router.get("/disconnect", controller.logout);
router.get("/profile", controller.profile);
router.get("/mainInfo",controller.getCurrentUserInfo)
router.put("/updateDetails",controller.updateUserProfile)
router.put("/updatePassword",controller.updateUserPassword)
router.post("/upload", upload.array("file", 100), controller.upload);
router.get("/getMedia", controller.getMedia);
router.get("/getMediaFromFollowing", controller.getMediaFromFollowing);
router.get("/userAlbums/:username", controller.getMediaByUserName);
router.get("/getLikedAlbums",controller.getLikedAlbums)
router.get("/getMediaAll", controller.getMediaAll);
router.get('/notifications', controller.getNotifications);
router.get("/albums/:albumCode", controller.getAlbumByCode);
router.get("/test", controller.test);
router.get("/search", controller.searchAlbums);
router.get("/album/view/:albumCode", controller.incrementAlbumViews);
router.post("/addLikeToAlbum/:albumCode", controller.addLikeToAlbum);
router.post("/addComment/:albumCode", controller.addCommentToAlbum);
router.get("/getComments/:albumCode", controller.getAlbumComments);
router.post("/followUser", controller.followUser);
router.get(
  "/albums/:albumCode/follow-check",
  controller.checkIfFollowingAlbumOwner
);
router.post("/album/whoLiked", controller.findUserByToken);
router.post("/user/:userId/following", controller.getFollowingInfo);
router.post("/user/:username", controller.getUserStats);
router.get("/getMoreAlbums/:currentAlbumCode", controller.getMoreAlbums);

module.exports = router;
