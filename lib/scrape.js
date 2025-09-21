import * as cheerio from "cheerio";
import https from "https";

async function xhentai() {
    let page = Math.floor(Math.random() * 1153);
    let url = `https://sfmcompile.club/page/${page}`;
    let html = await new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => resolve(data));
            })
            .on("error", reject);
    });
    let $ = cheerio.load(html);
    let hasil = [];
    $("#primary > div > div > ul > li > article").each((_, b) => {
        hasil.push({
            title: $(b).find("header > h2").text(),
            link: $(b).find("header > h2 > a").attr("href"),
            category: $(b)
                .find("header > div.entry-before-title > span > span")
                .text()
                .replace("in ", ""),
            share_count: $(b).find("header > div.entry-after-title > p > span.entry-shares").text(),
            views_count: $(b).find("header > div.entry-after-title > p > span.entry-views").text(),
            type: $(b).find("source").attr("type") || "image/jpeg",
            video_1: $(b).find("source").attr("src") || $(b).find("img").attr("data-src"),
            video_2: $(b).find("video > a").attr("href") || "",
        });
    });
    return hasil;
}

async function otakudesu(mode, query) {
    function get(url) {
        return new Promise((resolve, reject) => {
            https
                .get(url, { headers: { "user-agent": "Mozilla/5.0" } }, (res) => {
                    let data = "";
                    res.on("data", (chunk) => (data += chunk));
                    res.on("end", () => resolve(data));
                })
                .on("error", reject);
        });
    }
    if (mode === "search") {
        let html = await get(
            `https://otakudesu.cloud/?s=${encodeURIComponent(query)}&post_type=anime`
        );
        const $ = cheerio.load(html);
        let results = [];
        $(".chivsrc li").each((_, el) => {
            let title = $(el).find("h2 > a").text();
            let link = $(el).find("h2 > a").attr("href");
            let image = $(el).find("img").attr("src");
            let genres = [];
            $(el)
                .find('.set:contains("Genres") a')
                .each((i, g) => genres.push($(g).text()));
            let status = $(el).find('.set:contains("Status")').text().split(":")[1]?.trim();
            let rating =
                $(el).find('.set:contains("Rating")').text().split(":")[1]?.trim() || "N/A";
            results.push({ title, link, image, genres, status, rating });
        });
        return results;
    }

    if (mode === "detail") {
        let html = await get(query);
        const $ = cheerio.load(html);
        let link_eps = [];
        $("#venkonten .episodelist ul li").each((_, el) => {
            link_eps.push({
                episode: $(el).find("span > a").text(),
                upload_at: $(el).find("span.zeebr").text(),
                link: $(el).find("span > a").attr("href"),
            });
        });
        return {
            title: {
                indonesia: $("#venkonten .jdlrx > h1").text(),
                anonym: $("#venkonten .infozin > p:nth-child(1) > span")
                    .text()
                    .replace("Judul: ", ""),
                japanese: $("#venkonten .infozin > p:nth-child(2) > span")
                    .text()
                    .replace("Japanese: ", ""),
            },
            thumbnail: $(".fotoanime > img").attr("src"),
            score: $("#venkonten .infozin > p:nth-child(3) > span").text().replace("Skor: ", ""),
            producer: $("#venkonten .infozin > p:nth-child(4) > span")
                .text()
                .replace("Produser: ", ""),
            type: $("#venkonten .infozin > p:nth-child(5) > span").text().replace("Tipe: ", ""),
            status: $("#venkonten .infozin > p:nth-child(6) > span").text().replace("Status: ", ""),
            total_eps: $("#venkonten .infozin > p:nth-child(7) > span")
                .text()
                .replace("Total Episode: ", ""),
            duration: $("#venkonten .infozin > p:nth-child(8) > span")
                .text()
                .replace("Durasi: ", ""),
            release: $("#venkonten .infozin > p:nth-child(9) > span")
                .text()
                .replace("Tanggal Rilis: ", ""),
            studio: $("#venkonten .infozin > p:nth-child(10) > span")
                .text()
                .replace("Studio: ", ""),
            genre: $("#venkonten .infozin > p:nth-child(11) > span").text().replace("Genre: ", ""),
            synopsis: $("#venkonten .sinopc > p").text(),
            link_eps,
        };
    }
    if (mode === "ongoing") {
        let html = await get("https://otakudesu.cloud/ongoing-anime/");
        const $ = cheerio.load(html);
        let results = [];
        $(".venz ul li").each((_, el) => {
            results.push({
                episode: $(el).find(".epz").text().trim(),
                day: $(el).find(".epztipe").text().trim(),
                date: $(el).find(".newnime").text().trim(),
                title: $(el).find(".jdlflm").text().trim(),
                link: $(el).find(".thumb a").attr("href"),
                image: $(el).find(".thumbz img").attr("src"),
            });
        });
        return results;
    }

    throw new Error("Mode tidak dikenal. Gunakan: search, detail, ongoing");
}

export { otakudesu, xhentai };
