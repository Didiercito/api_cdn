const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors({
  origin: 'https://blog.margaritaydidi.xyz',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.set('trust proxy', true);

app.get('/get-cloudflare-data', async (req, res) => {
  const url = "https://api.cloudflare.com/client/v4/graphql";

  const apiKey = process.env.CLOUDFLARE_API_KEY;
  const zoneTag = process.env.ZONE_TAG;

  if (!apiKey || !zoneTag) {
    return res.status(500).json({ error: "Faltan las credenciales de Cloudflare en las variables de entorno." });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formattedDate = yesterday.toISOString().split('T')[0];

  const query = `
    query {
      viewer {
        zones(filter: {zoneTag: "${zoneTag}"}) {
          httpRequests1dGroups(limit: 1, filter: {date_gt: "${formattedDate}"}) {
            sum {
              requests
              bytes
              cachedRequests
              cachedBytes
              threats
            }
            dimensions {
              date
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (data.errors) {
      return res.status(500).json({ error: 'Error en la consulta de Cloudflare', details: data.errors });
    }

    const zoneData = data?.data?.viewer?.zones[0]?.httpRequests1dGroups?.[0];
    if (!zoneData) {
      return res.status(500).json({ error: "No se encontraron datos en la respuesta de Cloudflare." });
    }

    const result = {
      date: zoneData.dimensions.date,
      requests: zoneData.sum.requests || 0,
      bytes: zoneData.sum.bytes || 0,
      cachedRequests: zoneData.sum.cachedRequests || 0,
      cachedBytes: zoneData.sum.cachedBytes || 0,
      threats: zoneData.sum.threats || 0
    };

    res.json(result);
  } catch (error) {
    console.error('Error al obtener datos de Cloudflare:', error);
    res.status(500).json({ error: 'Error en el servidor al consultar Cloudflare' });
  }
});

app.listen(3000, () => {
  console.log('✅ Servidor corriendo en http://localhost:3000');
});
