/**
 * Servicio de Firebase Storage
 * Maneja la subida de imágenes (evidencias, firmas, carnets)
 */

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from './firebase-config';
import * as FileSystem from 'expo-file-system/legacy';

const storage = getStorage();

/**
 * Subir imagen desde URI local a Firebase Storage
 * @param {string} uri - URI local de la imagen
 * @param {string} carpeta - Carpeta destino (evidencias, firmas, carnets)
 * @param {string} nombreArchivo - Nombre del archivo (opcional)
 * @returns {Promise<string>} - URL de descarga
 */
export const subirImagenStorage = async (uri, carpeta = 'evidencias', nombreArchivo = null) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Usuario no autenticado');

    // Generar nombre único si no se proporciona
    const timestamp = Date.now();
    const nombre = nombreArchivo || `img_${timestamp}.jpg`;
    
    // Crear referencia en Storage
    const storageRef = ref(storage, `${carpeta}/${userId}/${nombre}`);

    // Leer archivo como base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convertir base64 a Blob
    const response = await fetch(`data:image/jpeg;base64,${base64}`);
    const blob = await response.blob();

    // Subir a Storage
    const snapshot = await uploadBytes(storageRef, blob);
    console.log('✅ Imagen subida:', snapshot.metadata.fullPath);

    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;

  } catch (error) {
    console.error('❌ Error subiendo imagen a Storage:', error);
    throw error;
  }
};

/**
 * Subir imagen en formato base64 (para firmas)
 * @param {string} base64Data - Imagen en base64 (con o sin prefijo data:image)
 * @param {string} carpeta - Carpeta destino
 * @param {string} nombreArchivo - Nombre del archivo
 * @returns {Promise<string>} - URL de descarga
 */
export const subirBase64Storage = async (base64Data, carpeta = 'firmas', nombreArchivo = null) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Usuario no autenticado');

    // Generar nombre único si no se proporciona
    const timestamp = Date.now();
    const nombre = nombreArchivo || `firma_${timestamp}.png`;
    
    // Crear referencia en Storage
    const storageRef = ref(storage, `${carpeta}/${userId}/${nombre}`);

    // Limpiar prefijo base64 si existe
    const base64Limpio = base64Data.replace(/^data:image\/\w+;base64,/, '');

    // Convertir base64 a Blob
    const response = await fetch(`data:image/png;base64,${base64Limpio}`);
    const blob = await response.blob();

    // Subir a Storage
    const snapshot = await uploadBytes(storageRef, blob);
    console.log('✅ Base64 subido:', snapshot.metadata.fullPath);

    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;

  } catch (error) {
    console.error('❌ Error subiendo base64 a Storage:', error);
    throw error;
  }
};

/**
 * Subir múltiples imágenes de evidencia
 * @param {Array<string>} uris - Array de URIs locales
 * @param {string} informeId - ID del informe para organizar
 * @returns {Promise<Array<string>>} - Array de URLs de descarga
 */
export const subirEvidenciasStorage = async (uris, informeId = null) => {
  const urls = [];
  const carpeta = informeId ? `evidencias/${informeId}` : 'evidencias';

  for (let i = 0; i < uris.length; i++) {
    try {
      const url = await subirImagenStorage(uris[i], carpeta, `evidencia_${i + 1}_${Date.now()}.jpg`);
      urls.push(url);
    } catch (error) {
      console.error(`Error subiendo evidencia ${i + 1}:`, error);
      // Mantener URI local como fallback
      urls.push(uris[i]);
    }
  }

  return urls;
};

/**
 * Subir firmas del informe
 * @param {Object} firmas - Objeto con firmas en base64
 * @param {string} informeId - ID del informe
 * @returns {Promise<Object>} - Objeto con URLs de las firmas
 */
export const subirFirmasStorage = async (firmas, informeId = null) => {
  const urlsFirmas = {};
  const carpeta = informeId ? `firmas_informes/${informeId}` : 'firmas_informes';

  for (const [key, dataUri] of Object.entries(firmas)) {
    if (dataUri && dataUri.startsWith('data:image')) {
      try {
        const url = await subirBase64Storage(dataUri, carpeta, `${key}_${Date.now()}.png`);
        urlsFirmas[key] = url;
      } catch (error) {
        console.error(`Error subiendo firma ${key}:`, error);
        urlsFirmas[key] = dataUri; // Mantener base64 como fallback
      }
    } else {
      urlsFirmas[key] = dataUri;
    }
  }

  return urlsFirmas;
};

/**
 * Procesar imagen para modo offline/online
 * Reemplaza la función de Cloudinary
 * @param {string} uri - URI local de la imagen
 * @returns {Promise<{url: string, tipo: string}>}
 */
export const procesarImagenParaStorage = async (uri) => {
  try {
    // Intentar subir a Storage
    const url = await subirImagenStorage(uri, 'evidencias');
    return {
      url: url,
      tipo: 'cloud'
    };
  } catch (error) {
    console.log('⚠️ No se pudo subir a Storage, guardando localmente');
    // Si falla, retornar URI local
    return {
      url: uri,
      tipo: 'local'
    };
  }
};