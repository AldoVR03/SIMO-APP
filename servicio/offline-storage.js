import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// ===== CLAVES DE ALMACENAMIENTO =====
const KEYS = {
  PLANTILLAS: '@simo_plantillas',
  MANTENIMIENTOS_PENDIENTES: '@simo_mantenimientos_pendientes',
  MANTENIMIENTOS_OFFLINE: '@simo_mantenimientos_offline',
  IMAGENES_CACHE: '@simo_imagenes_cache',
  ULTIMA_SINCRONIZACION: '@simo_ultima_sync',
};

// ===== PLANTILLAS (equipos) =====
export const guardarPlantillas = async (plantillas) => {
  try {
    await AsyncStorage.setItem(KEYS.PLANTILLAS, JSON.stringify(plantillas));
    console.log('✅ Plantillas guardadas offline');
  } catch (error) {
    console.error('❌ Error guardando plantillas:', error);
  }
};

export const obtenerPlantillas = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.PLANTILLAS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('❌ Error obteniendo plantillas:', error);
    return {};
  }
};

// ===== MANTENIMIENTOS PENDIENTES =====
export const guardarMantenimientosPendientes = async (mantenimientos) => {
  try {
    await AsyncStorage.setItem(
      KEYS.MANTENIMIENTOS_PENDIENTES,
      JSON.stringify(mantenimientos)
    );
    console.log('✅ Mantenimientos pendientes guardados offline');
  } catch (error) {
    console.error('❌ Error guardando mantenimientos pendientes:', error);
  }
};

export const obtenerMantenimientosPendientes = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.MANTENIMIENTOS_PENDIENTES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('❌ Error obteniendo mantenimientos pendientes:', error);
    return [];
  }
};

// ===== MANTENIMIENTOS COMPLETADOS OFFLINE =====
export const guardarMantenimientoOffline = async (mantenimiento) => {
  try {
    const mantenimientosOffline = await obtenerMantenimientosOffline();
    mantenimientosOffline.push({
      ...mantenimiento,
      timestamp_offline: new Date().toISOString(),
    });
    await AsyncStorage.setItem(
      KEYS.MANTENIMIENTOS_OFFLINE,
      JSON.stringify(mantenimientosOffline)
    );
    console.log('✅ Mantenimiento guardado offline');
    return true;
  } catch (error) {
    console.error('❌ Error guardando mantenimiento offline:', error);
    return false;
  }
};

export const obtenerMantenimientosOffline = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.MANTENIMIENTOS_OFFLINE);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('❌ Error obteniendo mantenimientos offline:', error);
    return [];
  }
};

export const limpiarMantenimientosOffline = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.MANTENIMIENTOS_OFFLINE);
    console.log('✅ Mantenimientos offline limpiados');
  } catch (error) {
    console.error('❌ Error limpiando mantenimientos offline:', error);
  }
};

// ===== IMÁGENES EN CACHÉ =====
export const guardarImagenLocal = async (uri, nombreArchivo) => {
  try {
    const directorioCache = `${FileSystem.documentDirectory}imagenes_cache/`;
    
    const dirInfo = await FileSystem.getInfoAsync(directorioCache);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(directorioCache, { intermediates: true });
    }

    const rutaLocal = `${directorioCache}${nombreArchivo}`;
    await FileSystem.copyAsync({
      from: uri,
      to: rutaLocal,
    });

    console.log('✅ Imagen guardada localmente:', rutaLocal);
    return rutaLocal;
  } catch (error) {
    console.error('❌ Error guardando imagen local:', error);
    return null;
  }
};

export const obtenerImagenLocal = async (nombreArchivo) => {
  try {
    const rutaLocal = `${FileSystem.documentDirectory}imagenes_cache/${nombreArchivo}`;
    const info = await FileSystem.getInfoAsync(rutaLocal);
    
    if (info.exists) {
      return rutaLocal;
    }
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo imagen local:', error);
    return null;
  }
};

// ===== ÚLTIMA SINCRONIZACIÓN =====
export const guardarUltimaSincronizacion = async () => {
  try {
    await AsyncStorage.setItem(
      KEYS.ULTIMA_SINCRONIZACION,
      new Date().toISOString()
    );
  } catch (error) {
    console.error('❌ Error guardando última sincronización:', error);
  }
};

export const obtenerUltimaSincronizacion = async () => {
  try {
    const fecha = await AsyncStorage.getItem(KEYS.ULTIMA_SINCRONIZACION);
    return fecha ? new Date(fecha) : null;
  } catch (error) {
    console.error('❌ Error obteniendo última sincronización:', error);
    return null;
  }
};

// ===== LIMPIAR TODO =====
export const limpiarAlmacenamientoOffline = async () => {
  try {
    await AsyncStorage.multiRemove([
      KEYS.PLANTILLAS,
      KEYS.MANTENIMIENTOS_PENDIENTES,
      KEYS.MANTENIMIENTOS_OFFLINE,
      KEYS.IMAGENES_CACHE,
      KEYS.ULTIMA_SINCRONIZACION,
    ]);
    
    const directorioCache = `${FileSystem.documentDirectory}imagenes_cache/`;
    const dirInfo = await FileSystem.getInfoAsync(directorioCache);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(directorioCache);
    }
    
    console.log('✅ Almacenamiento offline limpiado');
  } catch (error) {
    console.error('❌ Error limpiando almacenamiento offline:', error);
  }
};