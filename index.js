const express = require("express");
const app = express();
const http = require('http');
const socketIo = require('socket.io');
const cors = require("cors");
const router = require('./routers/router');
const dotenv = require("dotenv");
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session'); // Assuming you're using express-session
const passport = require('./src/passport'); // Your Passport configuration
dotenv.config();

// Configure CORS
const corsOptions = {
    credentials: true,
    origin: "https://thler.com", // Update as per your client URL http://localhost:5173
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.enable('trust proxy')
// Session configuration here (before passport.session())
app.use(session({
    secret: process.env.SESSION_SECRET, // Replace with your own secret key
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 604800000, //one week(1000*60*60*24*7)
    path:"/",
    sameSite: "none",
    secure : true
   }, 
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static('public'));
app.use('/api', router);
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

passport.debug = true;
// MongoDB connection
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

// Socket.IO setup
const server = http.createServer(app);
const io = socketIo(server, { cors: corsOptions });

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
    // More Socket.IO events here
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
