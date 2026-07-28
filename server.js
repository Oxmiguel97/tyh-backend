require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// 📌 CONFIGURACIÓN DE APPSHEET
const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID;
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY; 
const APPSHEET_APP_NAME = "GestióndeVentaseInventarioApp-655115683"; 
const NOMBRE_TABLA = "Producto"; 

const APPSHEET_URL = `https://api.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${NOMBRE_TABLA}/Action`;

// 📸 CONVERTIDOR DE IMÁGENES
function resolverUrlImagen(foto) {
  if (!foto) return "images/PalazoLineasNegro.jpg";
  if (foto.startsWith('http') || foto.startsWith('Galeria-TyH/') || foto.startsWith('images/')) {
    return foto;
  }
  return `https://www.appsheet.com/template/gettablefileurl?appName=${encodeURIComponent(APPSHEET_APP_NAME)}&tableName=${encodeURIComponent(NOMBRE_TABLA)}&fileName=${encodeURIComponent(foto)}`;
}

// 🔗 LIMPIADOR DE LINKS DE TIENDA NUBE
function extraerUrlReal(linkCampo) {
  if (!linkCampo) return "#";
  
  if (typeof linkCampo === 'object' && linkCampo.Url) {
    return linkCampo.Url;
  }
  
  if (typeof linkCampo === 'string') {
    if (linkCampo.startsWith('http')) return linkCampo;
    try {
      const objeto = JSON.parse(linkCampo);
      if (objeto && objeto.Url) return objeto.Url;
    } catch (e) {
      return linkCampo;
    }
  }
  
  return "#";
}

// 🏠 RUTA RAÍZ (Para evitar "Cannot GET /" y probar rápidamente que el servidor está online)
app.get('/', (req, res) => {
  res.send('🚀 Servidor TyH Backend en Render funcionando correctamente');
});

// 📦 RUTA DE PRODUCTOS
app.get('/api/productos', async (req, res) => {
  try {
    const respuesta = await fetch(APPSHEET_URL, {
      method: 'POST',
      headers: {
        'ApplicationAccessKey': APPSHEET_ACCESS_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Action: "Find",
        Properties: { Locale: "es-AR" },
        Rows: []
      })
    });

    const datos = await respuesta.json();

    if (datos.Error) {
      return res.status(400).json({ errorAppSheet: datos.Error });
    }

    const listaProductos = Array.isArray(datos) ? datos : (datos.Rows || []);

    const productosFormateados = listaProductos.map(p => ({
      sku: p.SKU || "Sin SKU",
      nombre: p["Nombre Producto"] || p["Producto Categoria"] || "Sin Nombre",
      precio: Number(p.Precio) || 0,
      instagram: extraerUrlReal(p.Instagram || p["Instagram"] || p.instagram || p["Link Instagram"]),
      talles: p.Talles || "-",
      imagen: resolverUrlImagen(p.Foto),
      linkTiendaNube: extraerUrlReal(p.Link || p["Link"]),
      cintura: p.Cintura || p["Cintura"] || "-",
      cadera: p.Cadera || p["Cadera"] || "-",
      largo: p.Largo || p["Largo"] || "-"
    }));

    res.json(productosFormateados);

  } catch (error) {
    console.error("❌ Error Detallado:", error);
    res.status(500).json({ 
      mensaje: "Ocurrió un error en la conexión",
      detalleError: error.message 
    });
  }
});

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
  console.log(`🚀 Servidor ejecutándose en el puerto ${PUERTO}`);
});