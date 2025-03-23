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

  const query = `
    query {
      viewer {
        zones(filter: {zoneTag: "${zoneTag}"}) {
          # 🔹 HTTP Traffic, Security y Performance
          httpRequests1dGroups(limit: 7) {
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

          # 🔹 DNS Analytics
          dnsAnalyticsGroups(limit: 7) {
            sum {
              queries
              responseCodes {
                name
                count
              }
            }
            dimensions {
              date
            }
          }
          
          # 🔹 Performance Metrics (Web Vitals)
          webVitalsTimeseries(limit: 7) {
            sum {
              firstContentfulPaint
              firstInputDelay
              cumulativeLayoutShift
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

    const zoneData = data?.data?.viewer?.zones?.[0];
    
    if (!zoneData) {
      return res.status(500).json({ error: "No se encontraron datos en la respuesta de Cloudflare." });
    }

    const httpRequests = zoneData.httpRequests1dGroups?.map(entry => ({
      date: entry.dimensions.date,
      requests: entry.sum.requests || 0,
      bytes: entry.sum.bytes || 0,
      cachedRequests: entry.sum.cachedRequests || 0,
      cachedBytes: entry.sum.cachedBytes || 0,
      threats: entry.sum.threats || 0
    })) || [];

    const dnsAnalytics = zoneData.dnsAnalyticsGroups?.map(entry => ({
      date: entry.dimensions.date,
      queries: entry.sum.queries || 0,
      responseCodes: entry.sum.responseCodes || []
    })) || [];

    const webVitals = zoneData.webVitalsTimeseries?.map(entry => ({
      date: entry.dimensions.date,
      firstContentfulPaint: entry.sum.firstContentfulPaint || 0,
      firstInputDelay: entry.sum.firstInputDelay || 0,
      cumulativeLayoutShift: entry.sum.cumulativeLayoutShift || 0
    })) || [];

    res.json({ httpRequests, dnsAnalytics, webVitals });

  } catch (error) {
    console.error('Error al obtener datos de Cloudflare:', error);
    res.status(500).json({ error: 'Error en el servidor al consultar Cloudflare' });
  }
});

app.listen(3000, () => {
  console.log('✅ Servidor corriendo en http://localhost:3000');
});
