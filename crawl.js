const cheerio = require('cheerio');
const {Router }= require('express')
const axios = require('axios');

const router = Router()
router.get('/api/news', async (req, res) => {
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
        $('div[data-testid="hierarchical-grid"] ul[data-testid="topic-promos"] li').each((index, element) => {
            const titleElement = $(element).find('h3 a');
            const title = titleElement.text().trim();
            let link = titleElement.attr('href');
            
            // Ensure full URL
            link = link?.startsWith('http') ? link : `https://www.bbc.com${link}`;
            
            const description = $(element).find('p.promo-paragraph').text().trim();
            const timestamp = $(element).find('time.promo-timestamp').text().trim();
            
            // Get image URL from the largest available size
            const imageUrl = $(element).find('img').attr('src') || 
                           $(element).find('source[type="image/webp"]').first().attr('srcset')?.split(' ')[0];

            if (title) {
                newsArticles.push({
                    title,
                    link,
                    description: description || 'No description available',
                    timestamp,
                    imageUrl: imageUrl || 'No image available',
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

router.get('/api/news/:id', async (req, res) => {
    const articleId = req.params.id;
    const url = `https://www.bbc.com/bengali/articles/${articleId}`;

    try {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NewsCrawler/1.0)'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);
        
        // Extract article details
        const title = $('h1.article-heading').text().trim();
        
        if (!title) {
            return res.status(404).json({
                success: false,
                message: 'Article not found'
            });
        }

        const author = $('section[role="region"] li:first-child span:nth-child(2)').text().trim();
        const role = $('section[role="region"] li:nth-child(2) span:nth-child(2)').text().trim();
        const timestamp = $('section[role="region"] time').text().trim();

        // Extract all paragraphs
        const content = [];
        $('main div.bbc-19j92fr p.bbc-12k5sdr').each((index, element) => {
            content.push($(element).text().trim());
        });

        // Extract all images
        const images = [];
        $('figure.bbc-1qn0xuy').each((index, element) => {
            const imageUrl = $(element).find('img').attr('src');
            const caption = $(element).find('figcaption span[data-testid="caption-paragraph"]').text().trim();
            const source = $(element).find('p.bbc-19g7urm span:nth-child(2)').text().trim();
            
            images.push({
                url: imageUrl,
                caption: caption || 'No caption available',
                source: source || 'No source available'
            });
        });

        // Article object
        const article = {
            id: articleId,
            title,
            url,
            author: author || 'Unknown',
            role: role || 'Unknown',
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


module.exports = router