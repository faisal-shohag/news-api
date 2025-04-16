const { Router } = require('express');
const router = Router();

// Dummy data
const categories = [
    { id: 1, name: 'World News' },
    { id: 2, name: 'Technology' },
    { id: 3, name: 'Sports' },
    { id: 4, name: 'Health' },
    { id: 5, name: 'Entertainment' },
    { id: 6, name: 'Business' }
  ];
  
  const newsByCategory = {
    1: [
      {
        id: 101,
        categoryId: 1,
        title: 'Global Summit 2025 Held in Geneva',
        summary: 'Leaders from around the world gathered to discuss climate change.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 102,
        categoryId: 1,
        title: 'Conflict Escalates in Eastern Europe',
        summary: 'Tensions rise amid border disputes between nations.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 103,
        categoryId: 1,
        title: 'New Peace Treaty Signed in Middle East',
        summary: 'Historic agreement ends decade-long conflict in the region.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 104,
        categoryId: 1,
        title: 'UN Announces Global Poverty Reduction Plan',
        summary: null,
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 105,
        categoryId: 1,
        title: 'Record Voter Turnout in Global Elections',
        summary: 'Democratic participation reaches all-time high worldwide.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 106,
        categoryId: 1,
        title: 'Global Space Agency Formed',
        summary: 'Nations unite to create international space exploration body.',
        thumbnail: 'https://via.placeholder.com/150'
      }
    ],
    2: [
      {
        id: 201,
        categoryId: 2,
        title: 'AI Takes Over Manual Tasks in 2025',
        summary: 'Automation is replacing repetitive jobs rapidly.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 202,
        categoryId: 2,
        title: 'Quantum Computing Hits Breakthrough',
        summary: 'New algorithm boosts quantum processing speeds.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 203,
        categoryId: 2,
        title: 'Flying Cars Get Regulatory Approval',
        summary: 'First commercial flying car models cleared for urban use.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 204,
        categoryId: 2,
        title: 'Neural Interface Devices Go Mainstream',
        summary: 'Brain-computer interfaces now available for consumer purchase.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 205,
        categoryId: 2,
        title: '6G Network Rollout Begins in Asia',
        summary: 'Next-gen wireless technology promises 100x faster speeds.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 206,
        categoryId: 2,
        title: 'Biodegradable Electronics Developed',
        summary: 'New eco-friendly tech dissolves after use period.',
        thumbnail: 'https://via.placeholder.com/150'
      }
    ],
    3: [
      {
        id: 301,
        categoryId: 3,
        title: 'Olympics 2025 Wraps Up in Tokyo',
        summary: 'Historic moments as records are broken.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 302,
        categoryId: 3,
        title: 'World Cup Finals Set Record Viewership',
        summary: 'Over 5 billion tuned in for championship match.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 303,
        categoryId: 3,
        title: 'New Extreme Sport Gains Popularity',
        summary: 'Skyrunning combines mountain climbing with marathon running.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 304,
        categoryId: 3,
        title: 'Esports Added to College Athletic Programs',
        summary: null,
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 305,
        categoryId: 3,
        title: 'Female Athletes Break Gender Barriers',
        summary: 'Women compete in traditionally male-dominated sports.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 306,
        categoryId: 3,
        title: 'Robot Athletes Challenge Human Records',
        summary: 'AI-powered machines demonstrate physical capabilities.',
        thumbnail: 'https://via.placeholder.com/150'
      }
    ],
    4: [
      {
        id: 401,
        categoryId: 4,
        title: 'New Superfood Discovered in Amazon',
        summary: 'Scientists hail it as a game-changer for nutrition.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 402,
        categoryId: 4,
        title: 'Breakthrough in Cancer Treatment',
        summary: 'New therapy shows 95% success rate in early trials.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 403,
        categoryId: 4,
        title: 'Global Life Expectancy Reaches 80',
        summary: 'Medical advances contribute to longer lifespans.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 404,
        categoryId: 4,
        title: 'Mental Health Apps Prove Effective',
        summary: 'Digital tools reduce anxiety and depression symptoms.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 405,
        categoryId: 4,
        title: 'Pandemic Preparedness Plan Unveiled',
        summary: 'WHO announces global response strategy.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 406,
        categoryId: 4,
        title: 'Gene Editing Approved for More Conditions',
        summary: 'Ethical guidelines updated for CRISPR technology.',
        thumbnail: 'https://via.placeholder.com/150'
      }
    ],
    5: [
      {
        id: 501,
        categoryId: 5,
        title: 'Virtual Reality Concerts Break Records',
        summary: 'Millions attend live performances from home.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 502,
        categoryId: 5,
        title: 'Streaming Services Merge for Mega Platform',
        summary: 'Three major companies combine content libraries.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 503,
        categoryId: 5,
        title: 'AI-Generated Films Win Awards',
        summary: 'Computer-created scripts and actors gain recognition.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 504,
        categoryId: 5,
        title: 'Global Music Festival Goes Carbon Neutral',
        summary: 'Event sets new sustainability standards.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 505,
        categoryId: 5,
        title: 'Classic Novels Get Interactive Adaptations',
        summary: 'Readers can now choose story paths in digital versions.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 506,
        categoryId: 5,
        title: 'Holographic Performers Tour Worldwide',
        summary: 'Digital recreations of deceased artists go on tour.',
        thumbnail: 'https://via.placeholder.com/150'
      }
    ],
    6: [
      {
        id: 601,
        categoryId: 6,
        title: 'Cryptocurrency Regulation Framework Finalized',
        summary: 'Global standards set for digital currency markets.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 602,
        categoryId: 6,
        title: 'Four-Day Work Week Becomes Standard',
        summary: 'Productivity studies show benefits of shorter weeks.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 603,
        categoryId: 6,
        title: 'Global Minimum Corporate Tax Implemented',
        summary: 'Nations unite to prevent tax haven exploitation.',
        thumbnail: 'https://via.placeholder.com/150'
      },
      {
        id: 604,
        categoryId: 6,
        title: 'Space Tourism Industry Booms',
        summary: null,
        thumbnail: 'https://via.placeholder.com/150'
      },
    ]
  };
  
  const newsDetails = {
    101: {
      id: 101,
      title: 'Global Summit 2025 Held in Geneva',
      content: 'Leaders from over 100 countries assembled to discuss the urgent climate issues facing our planet. The week-long summit resulted in several landmark agreements, including a commitment to reduce carbon emissions by 50% by 2030 and a global fund to support developing nations in transitioning to renewable energy sources.',
      date: '2025-04-10',
      author: 'John Doe',
      tags: ['climate', 'summit', 'world'],
    },
    102: {
      id: 102,
      title: 'Conflict Escalates in Eastern Europe',
      content: 'Tensions have reached a boiling point in Eastern Europe as border disputes turn violent. Diplomatic efforts have so far failed to de-escalate the situation, with both sides mobilizing military forces. The UN Security Council has called for an emergency session to address the crisis.',
      date: '2025-04-15',
      author: 'Sarah Johnson',
      tags: ['conflict', 'politics'],
    },
    103: {
      id: 103,
      title: 'New Peace Treaty Signed in Middle East',
      content: 'After years of negotiations, rival factions in the Middle East have signed a comprehensive peace agreement. The treaty, brokered by international mediators, includes provisions for power-sharing, economic cooperation, and mutual security guarantees. Celebrations erupted across the region as the news spread.',
      date: '2025-03-28',
      author: 'Ahmed Hassan',
      tags: ['peace', 'Middle East', 'diplomacy'],
    },
    104: {
      id: 104,
      title: 'UN Announces Global Poverty Reduction Plan',
      content: 'The United Nations has unveiled an ambitious 10-year plan to lift 500 million people out of extreme poverty. The strategy focuses on education, healthcare access, and sustainable economic development. Funding will come from both public and private sources worldwide.',
      date: '2025-04-05',
      author: 'Maria Gonzalez',
      tags: ['poverty', 'UN', 'development'],
    },
    105: {
      id: 105,
      title: 'Record Voter Turnout in Global Elections',
      content: 'This year\'s wave of national elections has seen unprecedented participation, with some countries reporting over 90% voter turnout. Analysts attribute this to increased civic engagement campaigns and the widespread adoption of mobile voting technologies that make participation easier.',
      date: '2025-03-20',
      author: 'David Wilson',
      tags: ['elections', 'democracy', 'voting', 'others'],
    },
    106: {
      id: 106,
      title: 'Global Space Agency Formed',
      content: 'Twenty-eight nations have signed a treaty establishing the Global Space Agency (GSA), a collaborative body for space exploration and research. The GSA will pool resources and expertise to accelerate missions to Mars and beyond, while promoting peaceful uses of outer space.',
      date: '2025-04-12',
      author: 'Emma Chen',
      tags: ['space', 'science', 'international'],
    },
    201: {
      id: 201,
      title: 'AI Takes Over Manual Tasks in 2025',
      content: 'Automation has reached new heights as AI systems now perform 60% of repetitive manual tasks in manufacturing and service industries. While productivity has increased, governments are implementing retraining programs to help displaced workers transition to new roles in the evolving economy.',
      date: '2025-04-08',
      author: 'Jane Smith',
      tags: ['AI', 'automation', ],

    },
    202: {
      id: 202,
      title: 'Quantum Computing Hits Breakthrough',
      content: 'A team at MIT developed an advanced algorithm for quantum processors that solves complex problems in seconds that would take traditional supercomputers years. This breakthrough has immediate applications in medicine, materials science, and cryptography, potentially revolutionizing multiple industries.',
      date: '2025-04-05',
      author: 'Jane Smith',
      tags: [],
    },
    203: {
      id: 203,
      title: 'Flying Cars Get Regulatory Approval',
      content: 'The first commercial flying car models have received regulatory approval for urban use in several countries. These vehicles, which can transition between road and air travel, are expected to alleviate traffic congestion while incorporating advanced collision avoidance systems for safety.',
      date: '2025-03-30',
      author: 'Robert Kim',
      tags: ['transportation', 'innovation', 'flying cars'],

    },
    204: {
      id: 204,
      title: 'Neural Interface Devices Go Mainstream',
      content: 'After years of development, consumer-grade brain-computer interfaces are now commercially available. These devices allow users to control digital systems with their thoughts, offering revolutionary accessibility options for people with disabilities and new ways to interact with technology.',
      date: '2025-04-01',
      author: 'Lisa Wong',
      tags: [],

    },
    205: {
      id: 205,
      title: '6G Network Rollout Begins in Asia',
      content: 'Several Asian nations have launched the first 6G networks, offering speeds up to 100 times faster than 5G with near-zero latency. The new technology enables advanced applications like real-time holographic communication and seamless augmented reality integration in daily life.',
      date: '2025-03-25',
      author: 'Kenji Tanaka',
      tags: ['6G', 'telecom', 'technology'],

    },
    206: {
      id: 206,
      title: 'Biodegradable Electronics Developed',
      content: 'Scientists have created fully functional electronic devices that dissolve harmlessly after their useful life. Made from organic compounds, these eco-friendly electronics could significantly reduce e-waste while maintaining performance comparable to traditional components.',
      date: '2025-04-10',
      author: 'Elena Petrova',
      tags: ['sustainability', 'electronics', 'environment'],

    },
    301: {
      id: 301,
      title: 'Olympics 2025 Wraps Up in Tokyo',
      content: 'The 2025 Summer Olympics concluded with spectacular closing ceremonies in Tokyo, featuring technological marvels that blended physical and virtual elements. Athletes from small nations made history with unexpected medals, while new sports like breakdancing and esports drew massive audiences.',
      date: '2025-04-15',
      author: 'Michael Brown',
      tags: ['Olympics', 'sports', 'international'],

    },
    302: {
      id: 302,
      title: 'World Cup Finals Set Record Viewership',
      content: 'The FIFA World Cup final match attracted over 5 billion viewers worldwide, setting a new record for sports broadcasting. The thrilling match went into overtime before being decided by penalty kicks, with underdog team Morocco taking home the trophy for the first time.',
      date: '2025-03-28',
      author: 'Carlos Mendez',
      tags: ['football', 'World Cup', 'records'],

    },
    303: {
      id: 303,
      title: 'New Extreme Sport Gains Popularity',
      content: 'Skyrunning, which combines mountain climbing with marathon running at high altitudes, has exploded in popularity. Competitions now occur on every continent, pushing athletes to their physical limits while requiring specialized gear and training to handle the extreme conditions.',
      date: '2025-04-05',
      author: 'Anna Kournikova',
      tags: [ 'athletics', 'adventure'],

    },
    304: {
      id: 304,
      title: 'Esports Added to College Athletic Programs',
      content: 'Over 200 universities worldwide have added esports to their official athletic programs, offering scholarships to top players. Competitive gaming is now recognized as requiring similar dedication and skill as traditional sports, with teams practicing daily and competing in packed arenas.',
      date: '2025-03-20',
      author: 'David Lee',
      tags: ['esports', 'gaming', 'education'],
  
    },
    305: {
      id: 305,
      title: 'Female Athletes Break Gender Barriers',
      content: 'Women are competing and excelling in sports traditionally dominated by men, from wrestling to weightlifting to motorsports. This shift comes after rule changes and cultural acceptance, with female athletes setting new performance standards and inspiring the next generation.',
      date: '2025-04-12',
      author: 'Serena Williams',
      tags: ['gender equality', 'sports', 'breaking barriers'],

    },
    306: {
      id: 306,
      title: 'Robot Athletes Challenge Human Records',
      content: 'AI-powered humanoid robots are competing in athletic events, with some surpassing human capabilities in specific disciplines. While not yet matching overall human athleticism, these machines demonstrate remarkable progress in robotics, balance, and energy efficiency.',
      date: '2025-04-08',
      author: 'Dr. Hiroshi Ishiguro',
      tags: ['robotics', 'AI', 'sports technology'],

    },
    401: {
      id: 401,
      title: 'New Superfood Discovered in Amazon',
      content: 'Scientists have identified a previously unknown fruit in the Amazon rainforest that contains unprecedented levels of nutrients and antioxidants. Indigenous tribes have used it for centuries, and now researchers confirm its potential to address malnutrition while being sustainably cultivated.',
      date: '2025-04-05',
      author: 'Dr. Maria Silva',
      tags: ['nutrition', 'discovery', 'Amazon'],

    },
    402: {
      id: 402,
      title: 'Breakthrough in Cancer Treatment',
      content: 'A new immunotherapy treatment has shown remarkable 95% success rates in early clinical trials for multiple cancer types. The treatment reprograms the patient\'s own immune cells to specifically target and destroy cancer cells while leaving healthy tissue unharmed.',
      date: '2025-03-30',
      author: 'Dr. James Wilson',
      tags: ['cancer', 'medical breakthrough', 'immunotherapy'],

    },
    403: {
      id: 403,
      title: 'Global Life Expectancy Reaches 80',
      content: 'For the first time in history, global average life expectancy has reached 80 years, thanks to medical advances, improved sanitation, and better nutrition. The gap between developed and developing nations has narrowed significantly, though challenges remain in certain regions.',
      date: '2025-04-01',
      author: 'Dr. Li Wei',
      tags: ['longevity', 'public health', 'statistics'],

    },
    404: {
      id: 404,
      title: 'Mental Health Apps Prove Effective',
      content: 'Clinical studies confirm that digital mental health tools significantly reduce symptoms of anxiety and depression. These apps use AI to personalize therapy techniques, provide 24/7 support, and help users track their progress, making mental healthcare more accessible worldwide.',
      date: '2025-03-25',
      author: 'Dr. Emma Johnson',
      tags: ['mental health', 'technology', 'therapy'],

    },
    405: {
      id: 405,
      title: 'Pandemic Preparedness Plan Unveiled',
      content: 'The World Health Organization has released a comprehensive global pandemic preparedness strategy. The plan includes early warning systems, vaccine development protocols, and coordinated response measures to prevent future outbreaks from becoming catastrophic pandemics.',
      date: '2025-04-10',
      author: 'Dr. Tedros Adhanom',
      tags: ['public health', 'pandemic', 'preparedness'],

    },
    406: {
      id: 406,
      title: 'Gene Editing Approved for More Conditions',
      content: 'Ethical guidelines have been updated to allow CRISPR gene editing for additional genetic disorders after successful trials. Strict oversight remains, but the technology is now approved to treat sickle cell anemia, certain cancers, and a growing list of inherited conditions.',
      date: '2025-04-15',
      author: 'Dr. Jennifer Doudna',
      tags: ['genetics', 'CRISPR', 'medical ethics'],
  
    },
    501: {
      id: 501,
      title: 'Virtual Reality Concerts Break Records',
      content: 'Virtual reality concerts have attracted millions of simultaneous attendees, with fans from around the world gathering in digital venues. Artists can perform as hyper-realistic avatars or in fantastical environments impossible in physical spaces, revolutionizing live entertainment.',
      date: '2025-03-28',
      author: 'Taylor Swift',
      tags: ['VR', 'music', 'technology'],
  
    },
    502: {
      id: 502,
      title: 'Streaming Services Merge for Mega Platform',
      content: 'Three major streaming companies have merged their content libraries into a single mega-platform offering over 100,000 titles. The service uses AI to personalize recommendations while maintaining separate brand identities for original content production.',
      date: '2025-04-05',
      author: 'Reed Hastings',
      tags: ['streaming', 'entertainment', 'merger'],

    },
    503: {
      id: 503,
      title: 'AI-Generated Films Win Awards',
      content: 'For the first time, films with AI-generated scripts and synthetic actors have won major awards. While controversial, these productions demonstrate remarkable creative potential, with algorithms capable of generating unique stories and photorealistic performances.',
      date: '2025-03-20',
      author: 'Christopher Nolan',
      tags: ['AI', 'film', 'innovation'],
 
    },
    504: {
      id: 504,
      title: 'Global Music Festival Goes Carbon Neutral',
      content: 'The world\'s largest music festival has achieved complete carbon neutrality through renewable energy, waste reduction, and carbon offset programs. The event sets new sustainability standards for live entertainment while maintaining its legendary scale and energy.',
      date: '2025-04-12',
      author: 'Billie Eilish',
      tags: ['sustainability', 'music', 'environment'],

    },
    505: {
      id: 505,
      title: 'Classic Novels Get Interactive Adaptations',
      content: 'Beloved literary classics are being reimagined as interactive digital experiences where readers can choose story paths. These adaptations maintain the original texts while adding branching narratives, multimedia elements, and alternative endings approved by authors\' estates.',
      date: '2025-04-08',
      author: 'Margaret Atwood',
      tags: ['literature', 'digital', 'innovation'],

    },
    506: {
      id: 506,
      title: 'Holographic Performers Tour Worldwide',
      content: 'Digital recreations of deceased music legends are touring as holograms, performing with live bands to sold-out arenas. The technology uses archival footage, AI, and voice synthesis to create eerily realistic performances that delight fans and spark ethical debates.',
      date: '2025-04-15',
      author: 'Elvis Presley Hologram',
      tags: ['hologram', 'music', 'technology'],

    },
    601: {
      id: 601,
      title: 'Cryptocurrency Regulation Framework Finalized',
      content: 'After years of debate, a comprehensive global framework for cryptocurrency regulation has been adopted. The standards address consumer protection, anti-money laundering, and stability concerns while fostering innovation in blockchain technology and digital assets.',
      date: '2025-03-30',
      author: 'Janet Yellen',
      tags: ['crypto', 'regulation', 'finance'],

    },
    602: {
      id: 602,
      title: 'Four-Day Work Week Becomes Standard',
      content: 'The four-day work week has become standard practice in over 50 countries, with studies showing increased productivity and employee wellbeing. Businesses report lower turnover and higher job satisfaction, while workers enjoy better work-life balance without salary reductions.',
      date: '2025-04-01',
      author: 'Richard Branson',
      tags: ['work', 'productivity', 'business'],

    },
    603: {
      id: 603,
      title: 'Global Minimum Corporate Tax Implemented',
      content: 'Over 130 nations have implemented a global minimum corporate tax rate to prevent tax haven exploitation by multinational companies. The agreement aims to create fairer competition while generating billions in additional revenue for public services worldwide.',
      date: '2025-03-25',
      author: 'Kristalina Georgieva',
      tags: ['tax', 'global', 'business'],

    },
    604: {
      id: 604,
      title: 'Space Tourism Industry Booms',
      content: 'Commercial space flights have become a weekly occurrence, with multiple companies offering suborbital and orbital experiences. Prices have dropped significantly, making space tourism accessible to thousands, while safety standards continue to improve with each launch.',
      date: '2025-04-10',
      author: 'Elon Musk',
      tags: ['space', 'tourism', 'innovation'],
    }
}

// Categories Route
router.get('/dummy/news/categories', (req, res) => {
  res.json({
    status: true,
    message: 'successfully fetched all news categories',
    data: categories
  });
});

// News by Category Route
router.get('/dummy/news-by-cat/:id', (req, res) => {
  const catId = req.params.id;
  const data = newsByCategory[catId] || [];
  res.json({
    status: true,
    message: 'successfully fetched all news by category',
    data
  });
});

// News Details Route
router.get('/dummy/news-details/:id', (req, res) => {
  const newsId = req.params.id;
  const data = newsDetails[newsId];
  if (data) {
    res.json({
      status: true,
      message: 'successfully fetched a news details',
      data
    });
  } else {
    res.status(404).json({
      status: false,
      message: 'News not found'
    });
  }
});

module.exports = router;
