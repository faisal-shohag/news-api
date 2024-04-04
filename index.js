const express = require('express')
const news = require('./news')
const app = express()
const path = require('path');
const PORT = 3000
app.use(express.static('public'))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname+'/index.html'));
})

app.get('/bbc/bangla/:id', news.bbcBanglaCategory)
app.get('/bbc/bangla', news.bbcBanglaAll)
app.get('/bbc/english', news.bbcEnglishAll)

app.listen(PORT, () => {
    console.log(`App is running on PORT ${PORT}!`)
})

