const cheerio = require('cheerio');
const {Router }= require('express')
const axios = require('axios');

const router = Router()

router.get('/api/categories', async(req, res) => {
    try {
        const url = 'https://www.bbc.com/bengali';
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NewsCrawler/1.0)'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);
        const categories = []
        const excludes = ['bengali', 'read', 'ভিডিও', 'cxy7jg418e7t']

        $('header nav div[data-e2e="dropdown-nav"] ul li a').each((index, element) => {
             const title = $(element).text().trim()
             let link = $(element).attr('href');
             let id = link.split('/')
             id = id[id.length-1]
             if(!excludes.includes(id)) {
                categories.push({id, title})
             }
        })

        
        $('section h2 a').each((index, element) => {
            const title = $(element).text().trim()
            let link = $(element).attr('href');
            let id = link.split('/')
            id = id[id.length-1]
            if(!excludes.includes(id)) {
               categories.push({id, title})
            }
       })

        res.status(200).json({
            success: true,
            count: categories.length,
            categories
        });
    } catch (error) {
        console.error('Error fetching popular news:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch news categories.'
        });
    }
})

router.get('/api/news', async (req, res) => {
    // console.log("news")
    try {
        const url = 'https://www.bbc.com/bengali';
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NewsCrawler/1.0)'
            }
        });
        
        const html = response.data;
        const $ = cheerio.load(html);
        const newsArticles = [];

        // Target the specific container and list items
        $('main ul li').each((index, element) => {
            const titleElement = $(element).find('h3 a');
            const title = titleElement.text().trim();
            let link = titleElement.attr('href');
            let id = link.split('/')
            id = id[id.length-1]
            // Ensure full URL
            link = link?.startsWith('http') ? link : `https://www.bbc.com${link}`;
            
            const description = $(element).find('p.promo-paragraph').text().trim();
            const timestamp = $(element).find('time.promo-timestamp').text().trim();
            
            // Get image URL from the largest available size
             // Extract image information
             const imgElement = $(element).find('source');
             const imgElement2 = $(element).find('img');
             const imgSrc = imgElement2.attr('src');
             const imgSrcset = imgElement.attr('srcset');
             const imgAlt = imgElement2.attr('alt');
             
             // Parse srcset into array of objects with resolution and URL
             let srcset = [];
             if (imgSrcset) {
                 srcset = imgSrcset.split(', ').map(item => {
                     const [url, resolution] = item.split(' ');
                     return {
                         resolution,
                         url
                     };
                 });
             }
             
             // Add base image to srcset if it exists
             if (imgSrc) {
                 srcset.unshift({
                     resolution: 'base',
                     url: imgSrc
                 });
             }

            if (title) {
                newsArticles.push({
                    id,
                    title,
                    link,
                    description: description || 'No description available',
                    timestamp,
                    image: {
                        alt: imgAlt,
                        srcset: srcset
                    },
                    scrapedAt: new Date().toISOString()
                });
            }
        });

        if (newsArticles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No articles found'
            });
        }

        res.json({
            success: true,
            count: newsArticles.length,
            articles: newsArticles
        });

    } catch (error) {
        console.error('Error fetching news:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch news articles'
        });
    }
});

router.get('/api/categories/:id', async (req, res) => {
    const categoryId = req.params.id;
    const url = `https://www.bbc.com/bengali/topics/${categoryId}`;

    try {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NewsCrawler/1.0)'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Find the curation grid container
        const gridContainer = $('div[data-testid="curation-grid-normal"]');
        
        // Initialize array to store extracted items
        const articles = [];

        // Iterate through each list item in the grid
        gridContainer.find('li.bbc-t44f9r').each((index, element) => {
            const article = $(element);
            
            // Extract title and link
            const titleElement = article.find('h2 a');
            const title = titleElement.text().trim();
            const link = titleElement.attr('href');
            
            // Extract time
            const time = article.find('time.promo-timestamp').text().trim();
            const datetime = article.find('time.promo-timestamp').attr('datetime');
            
            // Extract image information
            const imgElement = article.find('img');
            const imgSrc = imgElement.attr('src');
            const imgSrcset = imgElement.attr('srcset');
            const imgAlt = imgElement.attr('alt');
            
            // Parse srcset into array of objects with resolution and URL
            let srcset = [];
            if (imgSrcset) {
                srcset = imgSrcset.split(', ').map(item => {
                    const [url, resolution] = item.split(' ');
                    return {
                        resolution,
                        url
                    };
                });
            }
            
            // Add base image to srcset if it exists
            if (imgSrc) {
                srcset.unshift({
                    resolution: 'base',
                    url: imgSrc
                });
            }
            
            // Push extracted data to articles array
            articles.push({
                title,
                link,
                time,
                datetime,
                image: {
                    alt: imgAlt,
                    srcset: srcset
                }
            });
        });

        res.json({
            success: true,
            count: articles.length,
            articles
        });

    } catch (error) {
        console.error('Error fetching article:', error.message);
        res.status(error.response?.status === 404 ? 404 : 500).json({
            success: false,
            error: error.message || 'Failed to fetch article'
        });
    }
});

router.get('/api/news/:id', async (req, res) => {
    const articleId = req.params.id;
    const url = articleId.includes('news') ? `https://www.bbc.com/bengali/${articleId}` : `https://www.bbc.com/bengali/articles/${articleId}`

    try {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NewsCrawler/1.0)'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);
        
        // Extract title using h1 within main
        const title = $('main h1').text().trim();
        
        if (!title) {
            return res.status(404).json({
                success: false,
                message: 'Article not found'
            });
        }

        // Extract timestamp (first time element in div with dir="ltr")
        const timestamp = $('main div[dir="ltr"] time').first().text().trim();

        // Extract content (all p elements in div with dir="ltr" within main)
        const content = [];
        $('main div[dir="ltr"] p').each((index, element) => {
            const text = $(element).text().trim();
            if (text) content.push(text);
        });

        // Extract images (all img within figure in main)
        const images = [];
        $('main figure img').each((index, element) => {
            const imageUrl = $(element).attr('src');
            // Caption is in the next p element after img within figure
            const caption = $(element).parent().next('p').text().trim();
            
            images.push({
                url: imageUrl,
                caption: caption || 'No caption available'
            });
        });

        // Article object
        const article = {
            id: articleId,
            title,
            url,
            timestamp,
            content,
            images,
            scrapedAt: new Date().toISOString()
        };

        res.json({
            success: true,
            article
        });

    } catch (error) {
        console.error('Error fetching article:', error.message);
        res.status(error.response?.status === 404 ? 404 : 500).json({
            success: false,
            error: error.message || 'Failed to fetch article'
        });
    }
});

router.get('/api/popular', async (req, res) => {
    try {
        const url = 'https://www.bbc.com/bengali/popular/read';
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NewsCrawler/1.0)'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);
        const popularArticles = [];

        // Using only main, ol, and a tags
        $('main ol a').each((index, element) => {
            const title = $(element).text().trim();
            let link = $(element).attr('href');
            const rank = index + 1; // Assuming rank is the order in the list
            let id = link.split('/')
            id = id[id.length-1]
            link = link?.startsWith('http') ? link : `https://www.bbc.com${link}`;

            if (title) {
                popularArticles.push({
                    rank,
                    id,
                    title,
                    link,
                    scrapedAt: new Date().toISOString()
                });
            }
        });

        if (popularArticles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No popular articles found'
            });
        }

        res.json({
            success: true,
            count: popularArticles.length,
            articles: popularArticles
        });

    } catch (error) {
        console.error('Error fetching popular news:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch popular news articles'
        });
    }
});


module.exports = router