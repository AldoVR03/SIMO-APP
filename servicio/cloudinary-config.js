const uploadImage = async (uri) => {
  const data = new FormData();
  data.append("file", {
    uri,
    type: uri.endsWith(".png") ? "image/png" : "image/jpeg", // soporta png/jpg
    name: "evidencia.jpg",
  });
  data.append("upload_preset", "SIMO-APP-Evidencia-Firma"); // preset unsigned
  data.append("cloud_name", "due9nyqmr"); // ⚡ obligatorio en algunos casos

  try {
    const res = await fetch("https://api.cloudinary.com/v1_1/due9nyqmr/image/upload", {
      method: "POST",
      body: data,
    });

    const json = await res.json();

    if (json.secure_url) {
      console.log("✅ Subida exitosa:", json.secure_url);
      return json.secure_url; // URL pública lista
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

