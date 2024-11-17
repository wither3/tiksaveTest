const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

const tiksave = {
  getData: async (url) => {
    const apiUrl = 'https://tiksave.io/api/ajaxSearch';
    const data = qs.stringify({
      q: url,
      lang: 'id'
    });
    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'User-Agent': 'MyApp/1.0',
        'Referer': 'https://tiksave.io/en',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };

    const response = await axios.post(apiUrl, data, config);
    const html = response.data.data;
    const $ = cheerio.load(html);

    const thumbnail = $('.thumbnail img').attr('src');
    const title = $('.tik-left h3').text().trim();
    const downloadLinks = [];

    $('.dl-action a').each((index, element) => {
      const link = $(element).attr('href');
      const label = $(element).text().trim();
      downloadLinks.push({ label, link });
    });

    return {
      thumbnail,
      title,
      downloadLinks
    };
  },
  download: async (url) => {
    const videoData = await tiksave.getData(url);
    if (videoData && videoData.downloadLinks.length) {
      const audioUrl = videoData.downloadLinks.find(link => link.label === 'Download MP3')?.link;
      return { videoData, audioUrl };
    }
    throw new Error('Tidak ada link unduhan yang tersedia.');
  }
};

module.exports = async (req, res) => {
  const { url } = req.query;

  // Menangani permintaan CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // CORS Pre-flight response
  }

  if (!url) {
    return res.status(400).json({ success: false, message: 'URL tidak boleh kosong.' });
  }

  try {
    const { videoData, audioUrl } = await tiksave.download(url);
    res.status(200).json({
      success: true,
      data: videoData,
      audioUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
