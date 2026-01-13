import * as cheerio from "cheerio";
import axios from "axios";
import { google } from "googleapis";
import ytSearch from 'yt-search';
import fs from "fs/promises";
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const TRUSTED_CHANNELS = [
    'vizmedia', 'Crunchyroll',
    'MAPPA CHANNEL', 'Aniplex USA',
    'Netflix Anime', 'Neobrane'
];

async function scrapeSongsFromMAL(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const processTable = (selector) => {
            const songs = [];
            $(selector).find('table tbody tr').each((i, elem) => {
                const tdCol2 = $(elem).find('td').eq(1);
                const fullText = tdCol2.text().trim();

                const regex = /^(?:\d+:\s*)?"?(.+?)"?\s*by\s*([^(]+)(?:\s*\((?:eps\s*)?([\d-].*?)\))?/;
                const match = fullText.match(regex);

                if (match) {

                    const numeroText = $(elem).find('.theme-song-index').text().trim().replace(':', '');
                    const numero = numeroText ? Number(numeroText) : (i + 1);

                    songs.push({
                        numero: numero,
                        titulo: match[1].trim(),
                        artista: match[2].trim(),
                        episodios: match[3] ? match[3].trim() : "All"
                    });
                }
            });
            return songs;
        };

        const openings = processTable('.theme-songs.opnening, .theme-songs.opnsl');
        const endings = processTable('.theme-songs.ending, .theme-songs.ednsl');

        return { openings, endings };
    } catch (e) {
        console.error("Error scraping songs from MAL:", e);
        return { openings: [], endings: [] };
    }
}

import yts from 'yt-search';

async function getYoutubeUrl(query, keywords = '') {
    try {

        const r = await yts(query + ' ' + keywords);


        const topResults = r.videos.slice(0, 10);

        const video = topResults.find(v => TRUSTED_CHANNELS.some(channel => v.author.name.toLowerCase().includes(channel.toLowerCase())));

        if (video) {
            console.log(`✅ Encontrado: ${video.title} (${video.timestamp})`);
            return video.url;
        }
        const bestAlternative = topResults.find(v =>
            (v.seconds > 75 && v.seconds < 115) && // Rango un poco más amplio por si acaso
            (v.title.toLowerCase().includes('creditless') ||
                v.title.toLowerCase().includes('tv size') ||
                v.title.toLowerCase().includes('clean'))
        );

        const finalVideo = bestAlternative || topResults[0];
        console.log(`✅ Seleccionado por relevancia: ${finalVideo.title}`);
        return finalVideo.url;


    } catch (e) {
        console.error("❌ Error con yt-search:", e.message);
        return null;
    }
}

async function pedirDatos() {
    const rl = readline.createInterface({ input, output });
    try {
        let anilistId = (await rl.question('Introduce el ID de Anilist: ')).trim();
        let animeName = (await rl.question('Introduce el nombre del anime: ')).trim();
        let animationType = (await rl.question('Introduce el tipo de animación (por defecto "anime_japones"): ')).trim() || "anime_japones";
        let malUrl = (await rl.question('Introduce la URL de MyAnimeList: ')).trim();
        let palabrasClave = (await rl.question('Introduce palabras clave adicionales para la búsqueda en YouTube (opcional): ')).trim();
        while (!anilistId || !animeName || !malUrl) {
            console.error("❌ Error: 'anilistId', 'animeName' y 'malUrl' son obligatorios. Intenta de nuevo.");
            anilistId = (await rl.question('Introduce el ID de Anilist: ')).trim();
            animeName = (await rl.question('Introduce el nombre del anime: ')).trim();

            malUrl = (await rl.question('Introduce la URL de MyAnimeList: ')).trim();
        }

        rl.close();
        return { anilistId, animeName, animationType, malUrl, palabrasClave };

    } catch (e) {
        console.error("Error pidiendo datos:", e);
        try { rl.close(); } catch { }
    }

}

async function saveData(data) {
    try {
        await fs.mkdir('./data', {recursive: true});
        const fileName = `./data/anime_${data.anilist_id}.json`;
        await fs.writeFile(fileName, JSON.stringify(data, null, 2));
        console.log(`✅ Datos guardados en ${fileName}`);
    } catch (e) {
        console.error("Error guardando datos:", e);
    }
}

async function main() {
    console.log('Web scraping for animebeats');
    const { anilistId, animeName, animationType, malUrl, palabrasClave } = await pedirDatos();
    console.log(`🚀 Iniciando proceso para ${animeName} (ID: ${anilistId})`);
    const rawSongs = await scrapeSongsFromMAL(malUrl);
    const finalData = {
        anilist_id: Number(anilistId),
        titulo_anime: animeName,
        tipo_animacion: animationType,
        openings: [],
        endings: []
    };


    const processList = async (list, type) => {
        const results = [];
        for (const song of list) {
            const searchTitle = `${animeName} ${type}${song.numero} | ${song.titulo}`;
            console.log(`🔍 Buscando ${type}: ${song.titulo}`);

            const videoUrl = await getYoutubeUrl(searchTitle, palabrasClave);
            results.push({ ...song, enlace_youtube: videoUrl });
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        return results;
    };

    finalData.openings = await processList(rawSongs.openings, "opening");
    finalData.endings = await processList(rawSongs.endings, "ending");
    await saveData(finalData);
    console.log("✅ RESULTADO FINAL PARA MONGODB:");
    console.log(JSON.stringify(finalData, null, 2));
}

// Ejecución
main();