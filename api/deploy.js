const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Set CORS headers untuk public access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  try {
    // 1. Ambil file dari request
    if (!req.body || !req.body.html) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tidak ada file HTML' 
      });
    }

    // 2. Token Vercel dari environment variable
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    if (!VERCEL_TOKEN) {
      return res.status(500).json({ 
        success: false, 
        error: 'Token Vercel tidak ditemukan' 
      });
    }

    // 3. Generate nama project unik
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const projectName = `html-${randomId}-${timestamp}`;

    // 4. Siapkan payload untuk Vercel API
    const deploymentData = {
      name: projectName,
      files: [
        {
          file: 'index.html',
          data: req.body.html // Base64 encoded HTML
        }
      ],
      projectSettings: {
        framework: null // Static site
      },
      target: 'production'
    };

    // 5. Kirim ke Vercel API
    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deploymentData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Vercel API Error:', data);
      throw new Error(data.error?.message || 'Gagal mendeploy ke Vercel');
    }

    // 6. Kirim URL kembali ke user
    const deploymentUrl = `https://${data.url}`;
    
    res.status(200).json({
      success: true,
      url: deploymentUrl,
      projectId: data.id,
      name: projectName
    });

  } catch (error) {
    console.error('Deployment error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Terjadi kesalahan',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
