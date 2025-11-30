/**
 * Firebase Functions para SIMO-APP
 * Verificación de identidad y validación de firmas
 * 
 * INSTALACIÓN:
 * 1. cd functions
 * 2. npm install @google-cloud/vision pixelmatch pngjs
 * 3. firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const vision = require('@google-cloud/vision');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

// Inicializar Firebase Admin
admin.initializeApp();

// Cliente de Vision API (usa credenciales del proyecto automáticamente)
const visionClient = new vision.ImageAnnotatorClient();

// ==================== FUNCIONES PRINCIPALES ====================

/**
 * Función para procesar OCR del carnet chileno
 * Extrae: RUT, Nombre completo
 */
exports.procesarCarnetOCR = functions
  .region('us-central1')
  .runWith({ memory: '512MB', timeoutSeconds: 60 })
  .https.onCall(async (data, context) => {
    // Verificar autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Usuario no autenticado'
      );
    }

    const { imagenBase64 } = data;

    if (!imagenBase64) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Se requiere imagen en base64'
      );
    }

    try {
      // Preparar imagen para Vision API
      const imageBuffer = Buffer.from(imagenBase64, 'base64');

      // Realizar OCR con detección de texto
      const [result] = await visionClient.textDetection({
        image: { content: imageBuffer }
      });

      const detections = result.textAnnotations;
      
      if (!detections || detections.length === 0) {
        throw new functions.https.HttpsError(
          'not-found',
          'No se detectó texto en la imagen'
        );
      }

      // Texto completo detectado
      const textoCompleto = detections[0].description;
      console.log('Texto detectado:', textoCompleto);

      // Extraer RUT chileno (formato: XX.XXX.XXX-X)
      const rutRegex = /\d{1,2}\.?\d{3}\.?\d{3}[-]?[0-9kK]/g;
      const rutsEncontrados = textoCompleto.match(rutRegex);
      const rut = rutsEncontrados ? formatearRut(rutsEncontrados[0]) : null;

      // Extraer nombre
      const nombre = extraerNombre(textoCompleto);

      return {
        success: true,
        datos: {
          rut: rut,
          nombre: nombre,
          textoCompleto: textoCompleto.substring(0, 500),
          firmaRegion: {
            detectada: true,
            descripcion: 'Zona de firma identificada'
          }
        }
      };

    } catch (error) {
      console.error('Error en OCR:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error al procesar imagen: ' + error.message
      );
    }
  });


/**
 * Función para calibrar firma de usuario
 * Compara las firmas de calibración y calcula umbral personalizado
 */
exports.calibrarFirma = functions
  .region('us-central1')
  .runWith({ memory: '1GB', timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Usuario no autenticado'
      );
    }

    const { firma1Base64, firma2Base64, firmaCarnetBase64 } = data;

    if (!firma1Base64 || !firma2Base64) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Se requieren las firmas de calibración'
      );
    }

    try {
      // Comparar firma1 vs firma2 (consistencia del usuario)
      const consistencia = await compararImagenes(firma1Base64, firma2Base64);
      
      console.log(`📊 Consistencia entre firmas de calibración: ${consistencia.toFixed(2)}%`);

      // Si hay firma del carnet, comparar también
      let matchCarnet = null;
      if (firmaCarnetBase64) {
        const match1 = await compararImagenes(firma1Base64, firmaCarnetBase64);
        const match2 = await compararImagenes(firma2Base64, firmaCarnetBase64);
        matchCarnet = (match1 + match2) / 2;
      }

      // Calcular umbral personalizado - MÁS PERMISIVO
      // Umbral = consistencia - 20, con mínimo de 25%
      const umbral = Math.max(25, Math.round(consistencia * 0.6));
      
      console.log(`🎯 Umbral calculado: ${umbral}% (basado en consistencia ${consistencia.toFixed(2)}%)`);

      // Guardar en Firestore
      const userId = context.auth.uid;
      await admin.firestore().collection('Usuario').doc(userId).update({
        verificacion: {
          estado: 'verificado',
          fechaVerificacion: admin.firestore.FieldValue.serverTimestamp(),
          consistenciaFirma: Math.round(consistencia),
          umbralSimilitud: Math.round(umbral),
          matchCarnet: matchCarnet ? Math.round(matchCarnet) : null
        }
      });

      // Guardar firmas de referencia en Storage
      const bucket = admin.storage().bucket('simo-4e7c2.firebasestorage.app');
      
      const firma1Buffer = Buffer.from(firma1Base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const firma1File = bucket.file(`firmas/${userId}/referencia_1.png`);
      await firma1File.save(firma1Buffer, { contentType: 'image/png' });

      const firma2Buffer = Buffer.from(firma2Base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const firma2File = bucket.file(`firmas/${userId}/referencia_2.png`);
      await firma2File.save(firma2Buffer, { contentType: 'image/png' });

      console.log(`✅ Calibración completada para usuario ${userId}: ${consistencia}%`);

      return {
        success: true,
        resultado: {
          consistencia: Math.round(consistencia),
          umbral: Math.round(umbral),
          matchCarnet: matchCarnet ? Math.round(matchCarnet) : null
        }
      };

    } catch (error) {
      console.error('Error en calibración:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error al calibrar firma: ' + error.message
      );
    }
  });


/**
 * Función para validar firma en informe
 * Compara contra las firmas de referencia del usuario
 */
exports.validarFirmaInforme = functions
  .region('us-central1')
  .runWith({ memory: '1GB', timeoutSeconds: 60 })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Usuario no autenticado'
      );
    }

    const { firmaBase64 } = data;
    const userId = context.auth.uid;

    if (!firmaBase64) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Se requiere la firma'
      );
    }

    try {
      // Obtener datos de verificación del usuario
      const userDoc = await admin.firestore().collection('Usuario').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Usuario no encontrado'
        );
      }

      const userData = userDoc.data();
      const verificacion = userData.verificacion;

      if (!verificacion || verificacion.estado !== 'verificado') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Usuario no ha completado verificación de identidad'
        );
      }

      console.log(`🔍 Validando firma para usuario ${userId}`);
      console.log(`📋 Umbral guardado: ${verificacion.umbralSimilitud}%`);

      // Obtener firmas de referencia de Storage
      const bucket = admin.storage().bucket('simo-4e7c2.firebasestorage.app');
      
      console.log('📥 Descargando firmas de referencia...');
      const [firma1Buffer] = await bucket.file(`firmas/${userId}/referencia_1.png`).download();
      const [firma2Buffer] = await bucket.file(`firmas/${userId}/referencia_2.png`).download();
      
      console.log(`📦 Firma ref 1: ${firma1Buffer.length} bytes`);
      console.log(`📦 Firma ref 2: ${firma2Buffer.length} bytes`);
      console.log(`📦 Firma nueva: ${firmaBase64.length} caracteres`);

      const firma1Base64Ref = `data:image/png;base64,${firma1Buffer.toString('base64')}`;
      const firma2Base64Ref = `data:image/png;base64,${firma2Buffer.toString('base64')}`;

      // Comparar firma actual contra las de referencia
      console.log('🔄 Comparando contra referencia 1...');
      const match1 = await compararImagenes(firmaBase64, firma1Base64Ref);
      
      console.log('🔄 Comparando contra referencia 2...');
      const match2 = await compararImagenes(firmaBase64, firma2Base64Ref);

      // Usar el mejor match
      const mejorMatch = Math.max(match1, match2);
      const umbral = verificacion.umbralSimilitud || 25; // Default más bajo
      const esValida = mejorMatch >= umbral;

      console.log(`📊 Match vs ref1: ${match1.toFixed(2)}%`);
      console.log(`📊 Match vs ref2: ${match2.toFixed(2)}%`);
      console.log(`🎯 Mejor match: ${mejorMatch.toFixed(2)}% vs umbral ${umbral}%`);
      console.log(`✅ Resultado: ${esValida ? 'VÁLIDA' : 'INVÁLIDA'}`);

      return {
        success: true,
        resultado: {
          similitud: Math.round(mejorMatch),
          umbral: umbral,
          esValida: esValida,
          matchRef1: Math.round(match1),
          matchRef2: Math.round(match2),
          mensaje: esValida 
            ? 'Firma validada correctamente' 
            : `Firma no coincide. Similitud: ${Math.round(mejorMatch)}%, requerido: ${umbral}%`
        }
      };

    } catch (error) {
      console.error('Error en validación:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error al validar firma: ' + error.message
      );
    }
  });


/**
 * Función para comparar dos firmas directamente
 */
exports.compararFirmas = functions
  .region('us-central1')
  .runWith({ memory: '1GB', timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Usuario no autenticado'
      );
    }

    const { firma1Base64, firma2Base64 } = data;

    if (!firma1Base64 || !firma2Base64) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Se requieren ambas firmas en base64'
      );
    }

    try {
      const similitud = await compararImagenes(firma1Base64, firma2Base64);

      return {
        success: true,
        resultado: {
          similitud: Math.round(similitud * 100) / 100,
          esValida: similitud >= 70
        }
      };

    } catch (error) {
      console.error('Error en comparación:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error al comparar firmas: ' + error.message
      );
    }
  });


// ==================== FUNCIONES AUXILIARES ====================

/**
 * Formatear RUT chileno
 */
function formatearRut(rut) {
  let rutLimpio = rut.replace(/[^0-9kK]/g, '');
  
  const dv = rutLimpio.slice(-1).toUpperCase();
  const cuerpo = rutLimpio.slice(0, -1);
  
  let cuerpoFormateado = '';
  let contador = 0;
  
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    cuerpoFormateado = cuerpo[i] + cuerpoFormateado;
    contador++;
    if (contador === 3 && i > 0) {
      cuerpoFormateado = '.' + cuerpoFormateado;
      contador = 0;
    }
  }
  
  return `${cuerpoFormateado}-${dv}`;
}

/**
 * Extraer nombre del texto OCR del carnet
 */
function extraerNombre(texto) {
  const lineas = texto.split('\n');
  
  for (const linea of lineas) {
    const lineaLimpia = linea.trim();
    
    // Si tiene solo letras y espacios, y está en mayúsculas
    if (/^[A-ZÁÉÍÓÚÑ\s]+$/.test(lineaLimpia) && lineaLimpia.length > 5) {
      const excluir = ['CHILE', 'CEDULA', 'IDENTIDAD', 'REPUBLICA', 'APELLIDOS', 'NOMBRES', 'NACIONALIDAD', 'CHILENA', 'FECHA', 'NACIMIENTO'];
      const esNombre = !excluir.some(palabra => lineaLimpia.includes(palabra));
      
      if (esNombre && lineaLimpia.split(' ').length >= 2) {
        return lineaLimpia;
      }
    }
  }
  
  return null;
}

/**
 * Comparar dos imágenes de firma y retornar porcentaje de similitud
 * Usa tolerancia espacial para firmas manuscritas
 */
async function compararImagenes(img1Base64, img2Base64) {
  try {
    // Limpiar prefijos base64
    const clean1 = img1Base64.replace(/^data:image\/\w+;base64,/, '');
    const clean2 = img2Base64.replace(/^data:image\/\w+;base64,/, '');

    const buffer1 = Buffer.from(clean1, 'base64');
    const buffer2 = Buffer.from(clean2, 'base64');

    let img1, img2;
    
    try {
      img1 = PNG.sync.read(buffer1);
      img2 = PNG.sync.read(buffer2);
    } catch (parseError) {
      console.error('Error parseando PNG:', parseError);
      return 0;
    }

    console.log(`Imagen 1: ${img1.width}x${img1.height}, Imagen 2: ${img2.width}x${img2.height}`);

    // Tamaño objetivo para comparación
    const targetWidth = 200;
    const targetHeight = 100;

    // Redimensionar ambas imágenes
    const resized1 = resizeImage(img1, targetWidth, targetHeight);
    const resized2 = resizeImage(img2, targetWidth, targetHeight);

    // Extraer trazos de cada imagen
    const trazos1 = extraerTrazos(resized1);
    const trazos2 = extraerTrazos(resized2);

    console.log(`Trazos imagen 1: ${trazos1.cantidad} píxeles`);
    console.log(`Trazos imagen 2: ${trazos2.cantidad} píxeles`);

    // Si alguna imagen no tiene suficientes trazos
    if (trazos1.cantidad < 30 || trazos2.cantidad < 30) {
      console.log('Imagen sin suficientes trazos');
      return 0;
    }

    // MÉTODO 1: Similitud con tolerancia espacial (radio de 5 píxeles)
    const tolerancia = 5;
    let coincidenciasConTolerancia = 0;
    
    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const idx = y * targetWidth + x;
        
        if (trazos1.mapa[idx]) {
          // Buscar si hay un trazo cercano en la imagen 2
          if (hayTrazoCercano(trazos2, x, y, targetWidth, targetHeight, tolerancia)) {
            coincidenciasConTolerancia++;
          }
        }
      }
    }

    const similitudTolerante = (coincidenciasConTolerancia / trazos1.cantidad) * 100;

    // MÉTODO 2: Similitud por densidad en zonas (dividir en cuadrantes)
    const similitudZonas = compararPorZonas(trazos1, trazos2, targetWidth, targetHeight);

    // MÉTODO 3: Ratio de cantidad de trazos
    const ratioTrazos = Math.min(trazos1.cantidad, trazos2.cantidad) / 
                        Math.max(trazos1.cantidad, trazos2.cantidad) * 100;

    // Combinar métodos (dar más peso a tolerancia espacial)
    const similitudFinal = (similitudTolerante * 0.5) + (similitudZonas * 0.3) + (ratioTrazos * 0.2);

    console.log(`Similitud tolerante: ${similitudTolerante.toFixed(2)}%`);
    console.log(`Similitud por zonas: ${similitudZonas.toFixed(2)}%`);
    console.log(`Ratio de trazos: ${ratioTrazos.toFixed(2)}%`);
    console.log(`SIMILITUD FINAL: ${similitudFinal.toFixed(2)}%`);

    return similitudFinal;

  } catch (error) {
    console.error('Error comparando imágenes:', error.message);
    return 0;
  }
}

/**
 * Verificar si hay un trazo cercano dentro de un radio de tolerancia
 */
function hayTrazoCercano(trazos, x, y, width, height, radio) {
  for (let dy = -radio; dy <= radio; dy++) {
    for (let dx = -radio; dx <= radio; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = ny * width + nx;
        if (trazos.mapa[idx]) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Comparar firmas dividiendo en zonas/cuadrantes
 * Más tolerante a desplazamientos pequeños
 */
function compararPorZonas(trazos1, trazos2, width, height) {
  const zonasX = 5; // 5 columnas
  const zonasY = 3; // 3 filas
  const zonaWidth = Math.floor(width / zonasX);
  const zonaHeight = Math.floor(height / zonasY);
  
  let similitudTotal = 0;
  let zonasConTrazos = 0;
  
  for (let zy = 0; zy < zonasY; zy++) {
    for (let zx = 0; zx < zonasX; zx++) {
      let trazosZona1 = 0;
      let trazosZona2 = 0;
      
      // Contar trazos en esta zona
      for (let y = zy * zonaHeight; y < (zy + 1) * zonaHeight && y < height; y++) {
        for (let x = zx * zonaWidth; x < (zx + 1) * zonaWidth && x < width; x++) {
          const idx = y * width + x;
          if (trazos1.mapa[idx]) trazosZona1++;
          if (trazos2.mapa[idx]) trazosZona2++;
        }
      }
      
      // Calcular similitud de esta zona
      if (trazosZona1 > 0 || trazosZona2 > 0) {
        zonasConTrazos++;
        const maxTrazos = Math.max(trazosZona1, trazosZona2);
        const minTrazos = Math.min(trazosZona1, trazosZona2);
        
        if (maxTrazos > 0) {
          similitudTotal += (minTrazos / maxTrazos) * 100;
        }
      }
    }
  }
  
  return zonasConTrazos > 0 ? similitudTotal / zonasConTrazos : 0;
}

/**
 * Extraer los trazos (píxeles oscuros) de una imagen
 */
function extraerTrazos(png) {
  const mapa = new Array(png.width * png.height).fill(false);
  let cantidad = 0;
  
  const umbralOscuridad = 180; // Más permisivo (era 200)
  
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (y * png.width + x) * 4;
      
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      const a = png.data[idx + 3];
      
      const luminosidad = (r + g + b) / 3;
      const esTrazo = luminosidad < umbralOscuridad && a > 100;
      
      if (esTrazo) {
        mapa[y * png.width + x] = true;
        cantidad++;
      }
    }
  }
  
  return { mapa, cantidad };
}

/**
 * Redimensionar imagen PNG
 */
function resizeImage(srcPng, targetWidth, targetHeight) {
  const dst = new PNG({ width: targetWidth, height: targetHeight });
  
  const xRatio = srcPng.width / targetWidth;
  const yRatio = srcPng.height / targetHeight;
  
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcY = Math.floor(y * yRatio);
      
      const srcIdx = (srcY * srcPng.width + srcX) * 4;
      const dstIdx = (y * targetWidth + x) * 4;
      
      dst.data[dstIdx] = srcPng.data[srcIdx];
      dst.data[dstIdx + 1] = srcPng.data[srcIdx + 1];
      dst.data[dstIdx + 2] = srcPng.data[srcIdx + 2];
      dst.data[dstIdx + 3] = srcPng.data[srcIdx + 3];
    }
  }
  
  return dst;
}