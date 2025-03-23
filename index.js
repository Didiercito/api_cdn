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

  const query = `
  query {
    viewer {
      zones(filter: {zoneTag: "${zoneTag}"}) {
        httpRequests1dGroups(limit: 1) {
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
      res.status(500).json({ error: 'Error en la consulta de Cloudflare', details: data.errors });
    } else {
      const result = {
        requests: data.data.viewer.zones[0].httpRequests1dGroups[0].sum.requests,
        bytes: data.data.viewer.zones[0].httpRequests1dGroups[0].sum.bytes,
        cachedRequests: data.data.viewer.zones[0].httpRequests1dGroups[0].sum.cachedRequests,
        cachedBytes: data.data.viewer.zones[0].httpRequests1dGroups[0].sum.cachedBytes,
        threats: data.data.viewer.zones[0].httpRequests1dGroups[0].sum.threats
      };
      res.json(result);
    }
  } catch (error) {
    console.error('Error al obtener datos de Cloudflare:', error);
    res.status(500).json({ error: 'Error en el servidor al consultar Cloudflare' });
  }
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});