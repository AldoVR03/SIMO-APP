const uploadImage = async (uri) => {
  const data = new FormData();
  
  // Detectar si es una data URI (base64) o una URI normal
  if (uri.startsWith('data:image')) {
    // Es una firma en base64
    // Extraer el base64 puro y el tipo MIME
    const [header, base64Data] = uri.split(',');
    const mimeType = header.match(/:(.*?);/)[1]; // extrae "image/png" o "image/jpeg"
    
    // Convertir base64 a blob para React Native
    // En React Native necesitamos usar fetch para convertir data URI a blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    data.append("file", {
      uri: uri,
      type: mimeType,
      name: `firma_${Date.now()}.png`,
    });
  } else {
    // Es una URI normal (foto de galería o cámara)
    data.append("file", {
      uri,
      type: uri.endsWith(".png") ? "image/png" : "image/jpeg",
      name: `evidencia_${Date.now()}.jpg`,
    });
  }
  
  data.append("upload_preset", "SIMO-APP-Evidencia-Firma");
  data.append("cloud_name", "due9nyqmr");

  try {
    const res = await fetch("https://api.cloudinary.com/v1_1/due9nyqmr/image/upload", {
      method: "POST",
      body: data,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const json = await res.json();

    if (json.secure_url) {
      console.log("✅ Subida exitosa:", json.secure_url);
      return json.secure_url;
    } else {
      console.error("❌ Error en respuesta Cloudinary:", json);
      return null;
    }
  } catch (err) {
    console.error("❌ Error subiendo:", err);
    return null;
  }
};

export default uploadImage;