const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

const tiktokDl = async (url) => {
    try {
        let data = [];
        let domain = 'https://www.tikwm.com/api/';

        let response = await axios.post(domain, {}, {
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Origin': 'https://www.tikwm.com',
                'Referer': 'https://www.tikwm.com/',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest'
            },
            params: {
                url: url,
                count: 12,
                cursor: 0,
                web: 1,
                hd: 1
            }
        });

        let res = response.data.data;
        let result = {
            nickname: res.author.nickname,
            nama: res.author.unique_id,
            region: res.region,
            soundTitle: res.music_info.title,
            soundAuthor: res.music_info.author,
            penonton: res.play_count,
            like: res.digg_count,
            komen: res.comment_count,
            favorit: res.collect_count,
            bagikan: res.share_count,
            unduh: res.download_count,
            kapan: res.create_time,
            videoLinks: {
                watermark: 'https://www.tikwm.com' + res.wmplay,
                nowatermark: 'https://www.tikwm.com' + res.play,
                nowatermark_hd: 'https://www.tikwm.com' + res.hdplay
            }
        };
        return result;
    } catch (error) {
        throw new Error('Gagal mengambil data TikTok.');
    }
};

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
        const [videoData, tikwmData] = await Promise.all([
            tiksave.getData(url),
            tiktokDl(url)
        ]);
        const audioUrl = videoData.downloadLinks.find(link => link.label === 'Download MP3')?.link;
        return { videoData, tikwmData, audioUrl };
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
        const { videoData, tikwmData, audioUrl } = await tiksave.download(url);
        res.status(200).json({
            success: true,
            tikwmData,
            tiksaveData: videoData,
            audioUrl
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

