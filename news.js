const { json } = require("express");
const { bbcBn } = require("./datamap");
const axios = require('axios').default
const dotenv = require('dotenv');
dotenv.config();

const URL = process.env.URL
const URL2 = process.env.URL2

exports.bbcBanglaCategory = (req, res) => {
  let category = req.params.id;
axios.get(URL + bbcBn[category])
.then(response => {
    const data = response.data
    let dataArr = data.split('<div data-testid="curation-grid-normal">')[1].split('</ul>')[0].split('picture')
    let newsData = []
    let image;
    let title;
    let link;
    let time;
    for(let i=1; i<dataArr.length-1; i++) {
        if(i%2!=0) {
            image = dataArr[i]
            image = image.split(',')
            image = image[image.length-3].split('"')[0].split(" ")[1]
        } else {
            title = dataArr[i]
            title = title.split('>')
            link = title[6].split('"')[1]
            time = title[10].split('<')[0]
            title = title[7].split("<")[0].replace(/&#x27;/g, '');
            newsData.push({image, title, link})
        }
    }
    res.send({author: "Faisal Shohag", data: newsData})
})
.catch(err=> {
    res.send({err})
}).finally(()=>{

})

};



exports.bbcBanglaAll = (req, res) => {
    axios.get(URL)
.then(response => {
    const data = response.data
    let dataArr = data.split('"curations":')[1]
    let all_news = dataArr.split('}]}}]')[0].replace(/{width}/g, "660")
    all_news = JSON.parse(all_news+'}]}}]')
    
    let news_data = {
        "main": all_news[0].summaries,
        "selected": all_news[1].summaries,
        "bangladesh": all_news[2].summaries,
        "india": all_news[3].summaries,
        "world": all_news[4].summaries,
        "health": all_news[5].summaries,
        "video": all_news[6].summaries,
        "others": all_news[7].summaries,
        "most_read": all_news[8].mostRead.items

    }

    res.send({madewithloveby: "Faisal Shohag", data:news_data})
    res.send()
})
.catch(err=> {
    res.send({err})
}).finally(()=>{

})
}


exports.bbcEnglishAll = (req, res) => {
    axios.get(URL2)
.then(response => {
    const data = response.data
    let dataArr = data.split('"curations":')[1]
    let all_news = dataArr.split('}]}}]')[0].replace(/{width}/g, "660")
    all_news = JSON.parse(all_news+'}]}}]')
    
    let news_data = {
        "main": all_news[0].summaries,
        "selected": all_news[1].summaries,
        "bangladesh": all_news[2].summaries,
        "india": all_news[3].summaries,
        "world": all_news[4].summaries,
        "health": all_news[5].summaries,
        "video": all_news[6].summaries,
        "others": all_news[7].summaries,
        "most_read": all_news[8].mostRead.items

    }

    res.send({madewithloveby: "Faisal Shohag", data:news_data})
    res.send()
})
.catch(err=> {
    res.send({err})
}).finally(()=>{

})
}


/*
exports.bbcMain = (req, res) => {
    axios.get(URL)
.then(response => {
    const data = response.data
    let dataArr = data.split('প্রধান-খবর')
    trending = dataArr[2]
    dataArr = dataArr[2].split('নির্বাচিত-খবর')[0]
    dataArr = dataArr.split('প্রধান খবর')[1]
    dataArr = dataArr.split('picture')
    let newsData = []
    let image;
    let title;
    let link;
    let time;
    let short_description;
    for(let i=1; i<dataArr.length-1; i++) {
        if(i%2!=0) {
            image = dataArr[i]
            image = image.split(',')
            image = image[image.length-3].split('"')[0].split(" ")[1]
        } else {
            title = dataArr[i]
            title = title.split('>')
            link = title[6].split('"')[1]
            time = title[12].split('<')[0]
            short_description = title[10].split('\n')[0].replace(/<\/p/g, '');
            title = title[7].split("<")[0].replace(/&#x27;/g, '');
            newsData.push({image, title, link, time, short_description})
        }
    }
    res.send({trending, data: newsData})
})
.catch(err=> {
    res.send({err})
}).finally(()=>{

})
}
*/

