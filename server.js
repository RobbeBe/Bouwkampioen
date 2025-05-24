import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import OpenAI from 'openai';

const app = express();
// Laat Render de poort kiezen, lokaal nog steeds op 3000
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Zet je API key hier rechtstreeks in de code (niet veilig voor productie!)
const openai = new OpenAI({
  apiKey: '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',
});

app.post('/api/generate', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Geen URL meegegeven.' });
    }

    const prompt = `Analyseer de productpagina van deze URL: ${url}
Geef een JSON object met *enkel* deze velden, zonder extra tekst of uitleg:
attributeSet, productName, urlHandle, price, color, sku, unitType, searchTerms (array van minstens 25 strings), merk, quantity, categories, description, advantages (een array van precies 3 voordelen, elk als string), thumbnail, technischeFiche, metaTitle, metaDescription, reviews (array van 5 objecten met name en text).

Let erop dat 'advantages' een array moet zijn, bijvoorbeeld:
["Kant-en-klaar, eenvoudig aan te mengen",
 "Corrosiewerende bescherming van wapening",
 "Uitstekende hechting op beton en staal"]

De rest van de velden ook zoals in de specificaties hierboven. Geef duidelijke, relevante data en correcte afbeeldingslinken en prijs zoals op de URL.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 900,
    });

    let responseText = completion.choices[0].message.content;

    // Strip eventuele markdown backticks en 'json' tag eraf
    responseText = responseText.trim()
      .replace(/^```json\s*/, '')
      .replace(/```$/, '');

    console.log("Cleaned AI response text:", responseText);

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      console.error("JSON parse error:", e.message);
      return res.status(500).json({ 
        error: "Fout bij parsen van AI respons", 
        parseError: e.message,
        aiResponse: responseText 
      });
    }

    if (parsed.advantages && !Array.isArray(parsed.advantages)) {
      if (typeof parsed.advantages === 'string') {
        const stripped = parsed.advantages
          .replace(/<\/?ul[^>]*>/g, '')
          .split(/<\/li>/)
          .map(item => item.replace(/<li>/g, '').trim())
          .filter(Boolean);
        parsed.advantages = stripped.length > 0 ? stripped : [parsed.advantages];
      } else {
        parsed.advantages = [String(parsed.advantages)];
      }
    }

    res.json(parsed);

  } catch (error) {
    console.error("API fout:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// Root route om server check mogelijk te maken (voor Render)
app.get("/", (req, res) => {
  res.send("Server is up and running!");
});

app.listen(port, () => {
  console.log(`Server draait op poort ${port}`);
});
