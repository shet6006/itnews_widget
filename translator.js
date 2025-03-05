const axios = require("axios");

async function translateText(text, targetLang = "ko") {
    try {
        const response = await axios.post("https://translate.googleapis.com/translate_a/single", null, {
            params: {
                client: "gtx",
                sl: "en",
                tl: targetLang,
                dt: "t",
                q: text,
            },
        });

        return response.data[0][0][0];
    } catch (error) {
        console.error("Translation failed:", error);
        return text;
    }
}

module.exports = { translateText };
