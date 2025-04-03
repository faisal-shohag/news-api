const express = require('express')
const app = express()
const path = require('path');
const cors = require('cors');
const PORT = 3000
app.use(express.static('public'))
const crawl = require('./crawl')

app.use(cors())

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname+'/index.html'));
})
app.use(crawl)
app.listen(PORT, () => {
    console.log(`App is running on PORT ${PORT}!`)
})

