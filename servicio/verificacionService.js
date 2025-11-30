/**
 * Servicio de Verificación de Identidad
 * Conecta con Firebase Functions para OCR y comparación de firmas
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from './firebase-config';

// Inicializar Functions (región us-central1)
const functions = getFunctions(undefined, 'us-central1');
const storage = getStorage();

/**
 * Procesar imagen del carnet con OCR
 * @param {string} imagenBase64 - Imagen del carnet en base64
 * @returns {Promise<Object>} - Datos extraídos: rut, nombre, firmaRegion
 */
export const procesarCarnetOCR = async (imagenBase64) => {
  try {
    const procesarCarnet = httpsCallable(functions, 'procesarCarnetOCR');
    
    // Limpiar prefijo si existe
    const base64Limpio = imagenBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const resultado = await procesarCarnet({ imagenBase64: base64Limpio });
    
    if (resultado.data.success) {
      return {
        success: true,
        datos: resultado.data.datos
      };
    } else {
      throw new Error('Error en procesamiento OCR');
    }
  } catch (error) {
    console.error('Error en procesarCarnetOCR:', error);
    return {
      success: false,
      error: error.message || 'Error al procesar carnet'
    };
  }
};

/**
 * Calibrar firma del usuario
 * Envía las dos firmas de calibración al backend
 * @param {string} firma1Base64 - Primera firma de calibración
 * @param {string} firma2Base64 - Segunda firma de calibración
 * @param {string|null} firmaCarnetBase64 - Firma extraída del carnet (opcional)
 * @returns {Promise<Object>} - Resultado: consistencia, umbral, matchCarnet
 */
export const calibrarFirma = async (firma1Base64, firma2Base64, firmaCarnetBase64 = null) => {
  try {
    const calibrar = httpsCallable(functions, 'calibrarFirma');
    
    const resultado = await calibrar({
      firma1Base64,
      firma2Base64,
      firmaCarnetBase64
    });
    
    if (resultado.data.success) {
      return {
        success: true,
        resultado: resultado.data.resultado
      };
    } else {
      throw new Error('Error en calibración');
    }
  } catch (error) {
    console.error('Error en calibrarFirma:', error);
    return {
      success: false,
      error: error.message || 'Error al calibrar firma'
    };
  }
};

/**
 * Validar firma de un informe
 * Compara la firma capturada contra las de referencia
 * @param {string} firmaBase64 - Firma a validar
 * @returns {Promise<Object>} - Resultado: similitud, esValida, mensaje
 */
export const validarFirmaInforme = async (firmaBase64) => {
  try {
    const validar = httpsCallable(functions, 'validarFirmaInforme');
    
    const resultado = await validar({ firmaBase64 });
    
    if (resultado.data.success) {
      return {
        success: true,
        resultado: resultado.data.resultado
      };
    } else {
      throw new Error('Error en validación');
    }
  } catch (error) {
    console.error('Error en validarFirmaInforme:', error);
    return {
      success: false,
      error: error.message || 'Error al validar firma'
    };
  }
};

/**
 * Comparar dos firmas directamente
 * @param {string} firma1Base64 - Primera firma
 * @param {string} firma2Base64 - Segunda firma
 * @returns {Promise<Object>} - Resultado: similitud, esValida
 */
export const compararFirmas = async (firma1Base64, firma2Base64) => {
  try {
    const comparar = httpsCallable(functions, 'compararFirmas');
    
    const resultado = await comparar({ firma1Base64, firma2Base64 });
    
    if (resultado.data.success) {
      return {
        success: true,
        resultado: resultado.data.resultado
      };
    } else {
      throw new Error('Error en comparación');
    }
  } catch (error) {
    console.error('Error en compararFirmas:', error);
    return {
      success: false,
      error: error.message || 'Error al comparar firmas'
    };
  }
};

/**
 * Subir imagen del carnet a Firebase Storage
 * @param {string} imagenBase64 - Imagen en base64
 * @returns {Promise<string>} - URL de descarga
 */
export const subirImagenCarnet = async (imagenBase64) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Usuario no autenticado');

    // Convertir base64 a blob
    const base64Limpio = imagenBase64.replace(/^data:image\/\w+;base64,/, '');
    const byteCharacters = atob(base64Limpio);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    // Subir a Storage
    const storageRef = ref(storage, `carnets/${userId}/carnet_${Date.now()}.png`);
    await uploadBytes(storageRef, blob);

    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;

  } catch (error) {
    console.error('Error subiendo imagen:', error);
    throw error;
  }
};

/**
 * Verificación completa del perfil
 * Proceso de 3 pasos: OCR + Calibración + Guardar
 */
export const verificacionCompleta = async ({
  imagenCarnetBase64,
  firma1Base64,
  firma2Base64
}) => {
  try {
    // Paso 1: OCR del carnet
    console.log('📋 Paso 1: Procesando OCR del carnet...');
    const ocrResult = await procesarCarnetOCR(imagenCarnetBase64);
    
    if (!ocrResult.success) {
      return {
        success: false,
        paso: 1,
        error: ocrResult.error || 'Error en OCR del carnet'
      };
    }

    // Paso 2: Subir imagen del carnet
    console.log('📤 Paso 2: Subiendo imagen del carnet...');
    const carnetUrl = await subirImagenCarnet(imagenCarnetBase64);

    // Paso 3: Calibrar firmas
    console.log('✍️ Paso 3: Calibrando firmas...');
    const calibracionResult = await calibrarFirma(
      firma1Base64,
      firma2Base64,
      null // firmaCarnetBase64 - opcional, si se extrae del carnet
    );

    if (!calibracionResult.success) {
      return {
        success: false,
        paso: 3,
        error: calibracionResult.error || 'Error en calibración de firma'
      };
    }

    // Todo exitoso
    return {
      success: true,
      datos: {
        carnet: ocrResult.datos,
        carnetUrl: carnetUrl,
        calibracion: calibracionResult.resultado
      }
    };

  } catch (error) {
    console.error('Error en verificación completa:', error);
    return {
      success: false,
      error: error.message || 'Error en verificación'
    };
  }
};

// ==================== MODO OFFLINE ====================

/**
 * Guardar datos de verificación localmente para uso offline
 * @param {Object} datosVerificacion - Datos del usuario verificado
 */
export const guardarVerificacionLocal = async (datosVerificacion) => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Usuario no autenticado');

    await AsyncStorage.setItem(
      `verificacion_${userId}`,
      JSON.stringify({
        ...datosVerificacion,
        fechaCache: new Date().toISOString()
      })
    );

    console.log('✅ Verificación guardada localmente');
  } catch (error) {
    console.error('Error guardando verificación local:', error);
  }
};

/**
 * Obtener datos de verificación desde cache local
 * @returns {Promise<Object|null>} - Datos de verificación o null
 */
export const obtenerVerificacionLocal = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    const userId = auth.currentUser?.uid;
    if (!userId) return null;

    const datos = await AsyncStorage.getItem(`verificacion_${userId}`);
    return datos ? JSON.parse(datos) : null;

  } catch (error) {
    console.error('Error obteniendo verificación local:', error);
    return null;
  }
};

/**
 * Guardar firmas de referencia localmente (para validación offline)
 * @param {string} firma1Base64 - Primera firma de referencia
 * @param {string} firma2Base64 - Segunda firma de referencia
 */
export const guardarFirmasReferenciaLocal = async (firma1Base64, firma2Base64) => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Usuario no autenticado');

    await AsyncStorage.setItem(
      `firmas_ref_${userId}`,
      JSON.stringify({
        firma1: firma1Base64,
        firma2: firma2Base64,
        fechaCache: new Date().toISOString()
      })
    );

    console.log('✅ Firmas de referencia guardadas localmente');
  } catch (error) {
    console.error('Error guardando firmas localmente:', error);
  }
};

/**
 * Obtener firmas de referencia desde cache local
 * @returns {Promise<Object|null>} - Firmas de referencia o null
 */
export const obtenerFirmasReferenciaLocal = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    const userId = auth.currentUser?.uid;
    if (!userId) return null;

    const datos = await AsyncStorage.getItem(`firmas_ref_${userId}`);
    return datos ? JSON.parse(datos) : null;

  } catch (error) {
    console.error('Error obteniendo firmas locales:', error);
    return null;
  }
};