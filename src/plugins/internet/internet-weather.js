import { canvas } from "#canvas/weather.js";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(
            `Usage: ${usedPrefix + command} <city>\n› Example: ${usedPrefix + command} Osaka`
        );
    }

    try {
        await global.loading(m, conn);

        const url = `https://api.nekolabs.web.id/discovery/accuweather/search?city=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.result) {
            throw new Error("Invalid API response");
        }
        
        const weatherData = data.result;
        const forecasts = weatherData.forecastData.DailyForecasts;

        if (!forecasts || forecasts.length === 0) {
            return m.reply(`No weather data found for "${text}".`);
        }

        const imageBuffer = await canvas(weatherData);
        
        const location = weatherData.location;
        await conn.sendMessage(m.chat, {
            image: imageBuffer,
            caption: `*Weather Forecast for ${location.name}, ${location.country}*`,
        }, { quoted: m });
        
    } catch (e) {
        global.logger.error(e);
        m.reply(`Error: ${e.message}\nPlease check if the city name is correct.`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["weather"];
handler.tags = ["internet"];
handler.command = /^(weather)$/i;

export default handler;