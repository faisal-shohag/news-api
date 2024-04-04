const express = require('express')
const news = require('./news')
const app = express()

const PORT = 3000

app.get('/', (req, res) => {
    res.send({"status": "success"})
})

app.get('/bbc/bangla/:id', news.bbcBangla)
app.get('/bbc/bangla', news.bbc_all)

app.listen(PORT, () => {
    console.log(`App is running on PORT ${PORT}!`)
})

