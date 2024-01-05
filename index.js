const express= require("express");
const app =express();
const cors= require("cors");
const router = require('./routers/router');
const dotenv = require("dotenv")
const mongoose= require('mongoose')
const multer = require('multer');
dotenv.config();
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(express.static('public'))
const port=process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(
    cors({
      credentials: true,
      origin: "http://localhost:5173",
    })
  );
app.listen(port,()=>{
    console.log(`Server listening on port ${port}`)
})


app.use(express.json());



app.use('/api',router)