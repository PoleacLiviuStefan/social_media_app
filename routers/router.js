const express = require('express');
const controller = require('../controllers/controller')
const router = express.Router();
const multer = require("multer");
const path = require('path')
const storage = multer.diskStorage({
    destination: (req,file, cb) => {
        cb(null, 'public/uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({
    storage:storage
})



router.post("/register", controller.register);
router.post("/login",controller.login);
router.get("/disconnect",controller.logout)
router.get("/profile",controller.profile);
router.post("/upload",upload.array('file', 100),controller.upload);
router.get("/getMedia",controller.getMedia);
router.get("/getMediaAll",controller.getMediaAll);
router.get("/albums/:albumCode",controller.getAlbumByCode);
router.get("/test",controller.test);
router.get("/search", controller.searchAlbums);

module.exports = router;