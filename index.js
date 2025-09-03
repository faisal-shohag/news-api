const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
// const rateLimit = require('express-rate-limit'); // Add rate limiting package
const PORT = 3000;

app.use(express.static('public'));
const crawl = require('./api/bbc.js');
const dummy = require('./api/dummy.js');

app.use(cors());


// const globalLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 mins
//     max: 300, 
//     message: {
//         success: false,
//         error: 'Too many requests from this IP, please try again after 15 minutes.'
//     },
//     standardHeaders: true, 
//     legacyHeaders: false, 
// });


// app.use(globalLimiter);

// const apiLimiter = rateLimit({
//     windowMs: 60 * 1000, // 1 min
//     max: 15, 
//     message: {
//         success: false,
//         error: 'Too many API requests, please wait a minute and try again.'
//     },
//     standardHeaders: true,
//     legacyHeaders: false,
// });

// app.use('/api', apiLimiter);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.use(crawl);
app.use(dummy);

app.listen(PORT, () => {
    console.log(`App is running on PORT ${PORT}!`);
});