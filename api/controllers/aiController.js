
const { GoogleGenAI, Type } = require("@google/genai");

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.planTrip = async (req, res) => {
    try {
        const { startPoint, duration, wishes, language } = req.body;
        
        const model = 'gemini-2.5-flash';
        const prompt = `
            Act as "OrbiTrip Guide". Create a driving route in Georgia starting from ${startPoint}.
            Duration: ${duration}.
            User Wishes: ${wishes}.
            Language: ${language} (Return text in this language).
            
            Return ONLY valid JSON complying with this structure:
            {
                "stops": [
                    { "name": "Stop Name", "coordinates": { "lat": 41.0, "lng": 44.0 }, "description": "Short description", "type": "NATURE|CULTURE|FOOD" }
                ],
                "totalDistance": 150,
                "totalDuration": "4 hours",
                "summary": "A brief summary of the trip"
            }
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const jsonStr = response.text.replace(/```json\n?|\n?```/g, "").trim();
        const data = JSON.parse(jsonStr);
        
        res.json(data);
    } catch (error) {
        console.error("AI Plan Error:", error);
        res.status(500).json({ error: "Failed to generate plan", details: error.message });
    }
};

exports.getTravelAdvice = async (req, res) => {
    try {
        const { from, to } = req.body;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Suggest 3 interesting stops between ${from} and ${to} in Georgia.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    suggestions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          place: { type: Type.STRING },
                          description: { type: Type.STRING }
                        }
                      }
                    }
                  }
                }
            }
        });
        
        const jsonStr = response.text.replace(/```json\n?|\n?```/g, "").trim();
        res.json(JSON.parse(jsonStr));
    } catch (error) {
        res.status(500).json({ suggestions: [] });
    }
};

exports.analyzeImage = async (req, res) => {
    try {
        const { imageBase64, mimeType, language } = req.body;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { data: imageBase64, mimeType: mimeType } },
                    { text: `Identify this place in Georgia. Provide name and short description in ${language}.` }
                ]
            }
        });

        res.json({ text: response.text });
    } catch (error) {
        console.error("Vision Error:", error);
        res.status(500).json({ error: "Failed to analyze image" });
    }
};
