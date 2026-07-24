const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// 📌 CONFIGURACIÓN DE APPSHEET
const APPSHEET_APP_ID = "5bbfec63-58d6-44d9-9d06-432ddce96ba2"; 
const APPSHEET_APP_NAME = "GestióndeVentaseInventarioApp-655115683"; 
const APPSHEET_ACCESS_KEY = "V2-NPz2u-A6My7-g7waS-LA9Pw-Pi1jQ-nAEJ4-ecTB0-Y5Wyz"; // 👈 Tu Access Key real
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
  
  // Si AppSheet lo envía como objeto JSON directo
  if (typeof linkCampo === 'object' && linkCampo.Url) {
    return linkCampo.Url;
  }
  
  // Si AppSheet lo envía como un texto JSON '{"Url":"https://..."}'
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
      color: p.Color || "Negro",
      talles: p.Talles || "1, 2, 3, 4, 5",
      imagen: resolverUrlImagen(p.Foto),
      // 🔗 Extrae de forma limpia el enlace real a Tienda Nube
      linkTiendaNube: extraerUrlReal(p.Link || p["Link"])
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