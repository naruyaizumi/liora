import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { join } from "path";

GlobalFonts.registerFromPath(join(process.cwd(), "lib", "Cobbler-SemiBold.ttf"),
    "Cobbler");

function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function getWeatherBackground(phrase) {
    const lower = phrase.toLowerCase();
    
    if (lower.includes('rain') || lower.includes('shower') || lower.includes(
            'drizzle')) {
        return {
            gradient: ['#2C3E50', '#34495E', '#4A5F7F'],
            type: 'rain'
        };
    } else if (lower.includes('thunder') || lower.includes('storm')) {
        return {
            gradient: ['#141E30', '#243B55', '#2C3E50'],
            type: 'storm'
        };
    } else if (lower.includes('cloud') || lower.includes('overcast') || lower
        .includes('dreary')) {
        return {
            gradient: ['#606C88', '#7D8CA3', '#99A8BC'],
            type: 'cloudy'
        };
    } else if (lower.includes('clear') || lower.includes('sunny')) {
        return {
            gradient: ['#4A90E2', '#5CA2E9', '#74B9FF'],
            type: 'sunny'
        };
    } else {
        return {
            gradient: ['#667EEA', '#7E91EE', '#9BA8F2'],
            type: 'default'
        };
    }
}

function drawWeatherEffect(ctx, w, h, type) {
    ctx.save();
    
    if (type === 'rain') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const len = 20 + Math.random() * 20;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 3, y + len);
            ctx.stroke();
        }
    } else if (type === 'storm') {
        ctx.fillStyle = 'rgba(255, 255, 100, 0.05)';
        ctx.fillRect(0, 0, w, h / 3);
    } else if (type === 'sunny') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 3;
        const cx = w - 150;
        const cy = 150;
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const x1 = cx + Math.cos(angle) * 80;
            const y1 = cy + Math.sin(angle) * 80;
            const x2 = cx + Math.cos(angle) * 120;
            const y2 = cy + Math.sin(angle) * 120;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    } else if (type === 'cloudy') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 5; i++) {
            const cx = Math.random() * w;
            const cy = Math.random() * h / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 40, 0, Math.PI * 2);
            ctx.arc(cx + 30, cy - 10, 50, 0, Math.PI * 2);
            ctx.arc(cx + 60, cy, 40, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    ctx.restore();
}

async function drawWeatherIcon(ctx, x, y, size, phrase) {
    const lower = phrase.toLowerCase();
    let iconUrl = '';
    
    if (lower.includes('sunny') || lower.includes('clear')) {
        iconUrl = 'https://img.icons8.com/office/80/sun--v1.png';
    } else if (lower.includes('rain') || lower.includes('shower')) {
        iconUrl = 'https://img.icons8.com/office/80/downpour.png';
    } else if (lower.includes('thunder') || lower.includes('storm')) {
        iconUrl = 'https://img.icons8.com/office/80/storm.png';
    } else if (lower.includes('snow')) {
        iconUrl = 'https://img.icons8.com/office/80/snow.png';
    } else if (lower.includes('cloud')) {
        iconUrl = 'https://img.icons8.com/office/80/clouds.png';
    } else if (lower.includes('hot')) {
        iconUrl = 'https://img.icons8.com/office/80/thermometer.png';
    } else {
        iconUrl = 'https://img.icons8.com/office/80/windsock.png';
    }
    
    try {
        const icon = await loadImage(iconUrl);
        ctx.drawImage(icon, x, y, size, size);
    } catch {
        ctx.fillStyle = '#FFA726';
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function generateHourlyTemperatures(minTemp, maxTemp) {
    const hours = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    for (let i = 0; i < 24; i++) {
        let temp;
        const hour = (currentHour + i) % 24;
        
        const hourOfDay = hour;
        
        if (hourOfDay >= 23 || hourOfDay < 5) {
            temp = minTemp + Math.random();
        } else if (hourOfDay >= 5 && hourOfDay < 9) {
            temp = minTemp + 1 + Math.random() * 2;
        } else if (hourOfDay >= 9 && hourOfDay < 12) {
            temp = minTemp + (maxTemp - minTemp) * 0.4 + Math.random() * 2;
        } else if (hourOfDay >= 12 && hourOfDay < 15) {
            temp = maxTemp - Math.random();
        } else if (hourOfDay >= 15 && hourOfDay < 18) {
            temp = maxTemp - 2 - Math.random() * 2;
        } else {
            temp = minTemp + (maxTemp - minTemp) * 0.2 + Math.random() * 2;
        }
        
        temp += (Math.random() - 0.5) * 1.5;
        
        hours.push({
            hour: hour,
            temperature: Math.round(temp)
        });
    }
    
    return hours;
}

function drawHourlyChart(ctx, x, y, w, h, minTemp, maxTemp) {
    const hourlyData = generateHourlyTemperatures(minTemp, maxTemp);
    
    const dataMinTemp = Math.min(...hourlyData.map(d => d.temperature));
    const dataMaxTemp = Math.max(...hourlyData.map(d => d.temperature));
    
    const chartMinTemp = Math.floor(dataMinTemp - 2);
    const chartMaxTemp = Math.ceil(dataMaxTemp + 8);
    
    const tempRange = chartMaxTemp - chartMinTemp;
    const yPadding = 50;
    const xPadding = 80;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    roundRect(ctx, x, y, w, h, 15);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
        const gridY = y + yPadding + (h - yPadding * 2) / 4 * i;
        ctx.beginPath();
        ctx.moveTo(x + xPadding, gridY);
        ctx.lineTo(x + w - 30, gridY);
        ctx.stroke();
    }
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px Cobbler';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i <= 4; i++) {
        const gridY = y + yPadding + (h - yPadding * 2) / 4 * i;
        const tempValue = Math.round(chartMaxTemp - (tempRange / 4) * i);
        ctx.fillText(`${tempValue}°C`, x + xPadding - 15, gridY);
    }
    
    const points = [];
    const availableWidth = w - xPadding - 30;
    
    for (let i = 0; i < 12; i++) {
        const dataIndex = i * 2;
        const data = hourlyData[dataIndex];
        const pointX = x + xPadding + (availableWidth / 11) * i;
        
        const normalizedTemp = (data.temperature - chartMinTemp) / tempRange;
        const pointY = y + yPadding + (h - yPadding * 2) * (1 - normalizedTemp);
        
        points.push({
            x: pointX,
            y: pointY,
            temperature: data.temperature,
            hour: data.hour
        });
    }
    
    if (points.length > 1) {
        const areaGradient = ctx.createLinearGradient(points[0].x, y, points[
            points.length - 1].x, y + h);
        areaGradient.addColorStop(0, 'rgba(79, 195, 247, 0.6)');
        areaGradient.addColorStop(0.5, 'rgba(79, 195, 247, 0.3)');
        areaGradient.addColorStop(1, 'rgba(79, 195, 247, 0.1)');
        
        ctx.fillStyle = areaGradient;
        ctx.beginPath();
        
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = i > 0 ? points[i - 1] : points[i];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = i < points.length - 2 ? points[i + 2] : p2;
            
            const tension = 0.3;
            const cp1x = p1.x + (p2.x - p0.x) * tension;
            const cp1y = p1.y + (p2.y - p0.y) * tension;
            const cp2x = p2.x - (p3.x - p1.x) * tension;
            const cp2y = p2.y - (p3.y - p1.y) * tension;
            
            if (i === 0) {
                ctx.moveTo(p1.x, p1.y);
            }
            
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
        
        ctx.lineTo(points[points.length - 1].x, y + h - yPadding);
        ctx.lineTo(points[0].x, y + h - yPadding);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#4FC3F7';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = i > 0 ? points[i - 1] : points[i];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = i < points.length - 2 ? points[i + 2] : p2;
            
            const tension = 0.3;
            const cp1x = p1.x + (p2.x - p0.x) * tension;
            const cp1y = p1.y + (p2.y - p0.y) * tension;
            const cp2x = p2.x - (p3.x - p1.x) * tension;
            const cp2y = p2.y - (p3.y - p1.y) * tension;
            
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
        
        ctx.stroke();
    }
    
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        
        ctx.shadowColor = '#4FC3F7';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#4FC3F7';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '14px Cobbler';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const hourStr = point.hour.toString().padStart(2, '0') + ':00';
        ctx.fillText(hourStr, point.x, y + h - 30);
        
        if (point.y > y + yPadding + 20) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 16px Cobbler';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${point.temperature}°`, point.x, point.y - 12);
        }
    }
    
    ctx.shadowBlur = 0;
}

export async function canvas(weatherData) {
    const HD_SCALE = 2;
    const BASE_WIDTH = 1400;
    const BASE_HEIGHT = 900;
    
    const W = BASE_WIDTH * HD_SCALE;
    const H = BASE_HEIGHT * HD_SCALE;
    
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    
    ctx.antialias = 'default';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.textDrawingMode = 'glyph';
    
    ctx.scale(HD_SCALE, HD_SCALE);
    
    const allForecasts = weatherData.forecastData.DailyForecasts;
    const location = weatherData.location;
    
    const today = new Date();
    const todayString = today.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
    });
    
    let todayIndex = -1;
    for (let i = 0; i < allForecasts.length; i++) {
        const forecastDate = allForecasts[i].Date;
        if (forecastDate === todayString) {
            todayIndex = i;
            break;
        }
    }
    
    if (todayIndex === -1) {
        todayIndex = 0;
    }
    
    const startIndex = todayIndex;
    const endIndex = Math.min(startIndex + 4, allForecasts.length);
    const forecasts = allForecasts.slice(startIndex, endIndex);
    
    if (forecasts.length < 4) {
        const needed = 4 - forecasts.length;
        for (let i = 0; i < Math.min(needed, allForecasts.length); i++) {
            if (!forecasts.includes(allForecasts[i])) {
                forecasts.push(allForecasts[i]);
            }
        }
    }
    
    const todayForecast = forecasts[0];
    
    const bgData = getWeatherBackground(todayForecast.Day.IconPhrase);
    
    const bgGradient = ctx.createLinearGradient(0, 0, BASE_WIDTH, BASE_HEIGHT);
    bgGradient.addColorStop(0, bgData.gradient[0]);
    bgGradient.addColorStop(0.5, bgData.gradient[1]);
    bgGradient.addColorStop(1, bgData.gradient[2]);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    
    drawWeatherEffect(ctx, BASE_WIDTH, BASE_HEIGHT, bgData.type);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '14px Cobbler';
    ctx.textAlign = 'right';
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    ctx.fillText(`Generated ${dateStr} • Powered by AccuWeather`, BASE_WIDTH - 20,
        30);
    
    const padding = 40;
    
    const mainCardW = 450;
    const mainCardH = 520;
    const mainCardX = padding;
    const mainCardY = 40;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    roundRect(ctx, mainCardX, mainCardY, mainCardW, mainCardH, 25);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '18px Cobbler';
    ctx.textAlign = 'left';
    ctx.fillText(now.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        weekday: 'long'
    }), mainCardX + 30, mainCardY + 40);
    
    ctx.font = '16px Cobbler';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    }), mainCardX + 30, mainCardY + 65);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Cobbler';
    ctx.fillText(location.name, mainCardX + 30, mainCardY + 120);
    
    ctx.font = '18px Cobbler';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(location.country, mainCardX + 30, mainCardY + 150);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 96px Cobbler';
    ctx.fillText(
        `${Math.round(parseFloat(todayForecast.Temperature.Max))}°`,
        mainCardX + 30,
        mainCardY + 260);
    
    await drawWeatherIcon(ctx, mainCardX + 310, mainCardY + 180, 80,
        todayForecast.Day.IconPhrase);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '20px Cobbler';
    ctx.fillText(todayForecast.Day.IconPhrase, mainCardX + 30, mainCardY +
        300);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '18px Cobbler';
    ctx.fillText(
        `${Math.round(parseFloat(todayForecast.Temperature.Min))}°C`,
        mainCardX + 30,
        mainCardY + 330);
    
    const statsY = mainCardY + 380;
    
    const airAndPollen = todayForecast.AirAndPollen || {};
    const statIcons = [
        {
            url: 'https://img.icons8.com/office/80/windy-weather--v1.png',
            label: 'Wind',
            value: `${todayForecast.Day.Wind.Speed} km/h`
        },
        {
            url: 'https://img.icons8.com/office/80/cloud.png',
            label: 'Cloud Cover',
            value: `${todayForecast.Day.CloudCover}%`
        },
        {
            url: 'https://img.icons8.com/office/80/wind--v1.png',
            label: 'Air quality',
            value: airAndPollen.AirQuality || 'N/A'
        },
        {
            url: 'https://img.icons8.com/office/80/dry.png',
            label: 'UV index',
            value: airAndPollen.UVIndex || 'N/A'
        },
        {
            url: 'https://img.icons8.com/office/80/grass.png',
            label: 'Grass',
            value: airAndPollen.Grass || 'N/A'
        },
        {
            url: 'https://img.icons8.com/color-glass/96/mold.png',
            label: 'Mold',
            value: airAndPollen.Mold || 'N/A'
        },
        {
            url: 'https://img.icons8.com/external-filled-color-icons-papa-vector/78/external-allergic-allergy-color-filled-filled-color-icons-papa-vector.png',
            label: 'Ragweed',
            value: airAndPollen.Ragweed || 'N/A'
        },
        {
            url: 'https://img.icons8.com/color/96/deciduous-tree.png',
            label: 'Tree',
            value: airAndPollen.Tree || 'N/A'
        }
    ];
    
    for (let i = 0; i < 8; i++) {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const x = mainCardX + 30 + col * 100;
        const y = statsY + row * 60;
        
        try {
            const icon = await loadImage(statIcons[i].url);
            ctx.drawImage(icon, x, y, 28, 28);
        } catch {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x, y, 28, 28);
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '11px Cobbler';
        ctx.textAlign = 'left';
        ctx.fillText(statIcons[i].label, x + 36, y + 10);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Cobbler';
        ctx.fillText(statIcons[i].value, x + 36, y + 28);
    }
    
    const forecastX = mainCardX + mainCardW + 40;
    const forecastY = 40;
    const dayCardW = 280;
    const dayCardH = 140;
    const dayGap = 20;
    
    for (let i = 1; i < forecasts.length; i++) {
        const forecast = forecasts[i];
        const y = forecastY + (i - 1) * (dayCardH + dayGap);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        roundRect(ctx, forecastX, y, dayCardW, dayCardH, 20);
        ctx.fill();
        
        const date = new Date(forecast.Date);
        const dayName = date.toLocaleDateString(
            'en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        const monthName = date.toLocaleDateString(
            'en-US', { month: 'short' });
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Cobbler';
        ctx.fillText(dayName, forecastX + 25, y + 35);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '16px Cobbler';
        ctx.fillText(`${monthName} ${dayNum}`, forecastX + 25, y + 60);
        
        await drawWeatherIcon(ctx, forecastX + 25, y + 75, 50, forecast.Day
            .IconPhrase);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 32px Cobbler';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(parseFloat(forecast.Temperature.Max))}°`,
            forecastX +
            dayCardW - 25, y + 50);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '18px Cobbler';
        ctx.fillText(`${Math.round(parseFloat(forecast.Temperature.Min))}°`,
            forecastX +
            dayCardW - 25, y + 75);
        
        let phrase = forecast.Day.IconPhrase;
        if (phrase.length > 25) phrase = phrase.substring(0, 23) + '..';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '14px Cobbler';
        ctx.textAlign = 'left';
        ctx.fillText(phrase, forecastX + 90, y + 115);
    }
    
    const chartY = mainCardY + mainCardH + 30;
    const chartW = BASE_WIDTH - padding * 2;
    const chartH = 280;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Cobbler';
    ctx.textAlign = 'center';
    ctx.fillText('Temperature Forecast', padding + chartW / 2,
        chartY - 10);
    
    drawHourlyChart(ctx, padding, chartY, chartW, chartH,
        Math.round(parseFloat(todayForecast.Temperature.Min)),
        Math.round(parseFloat(todayForecast.Temperature.Max)));
    
    return canvas.toBuffer("image/png", {
        compressionLevel: 0,
        filters: canvas.PNG_ALL_FILTERS
    });
}